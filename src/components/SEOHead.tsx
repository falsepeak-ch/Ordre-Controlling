import { useEffect } from 'react';

interface Props {
  /** Full `<title>` text for this route. Falls back to the default in index.html. */
  title?: string;
  /** Page-specific meta description. */
  description?: string;
  /** Absolute or root-relative URL for the OG/Twitter image. */
  image?: string;
  /** Canonical URL for this route. If omitted, the current location is used. */
  canonical?: string;
  /** Extra meta tags, each rendered as a separate meta element. */
  meta?: Array<{ name?: string; property?: string; content: string }>;
  /** Hide the page from search engines. */
  noIndex?: boolean;
}

/**
 * Mutates `<head>` tags per-route. Intentionally tiny — we don't need
 * react-helmet for a handful of public routes. Tags are set on mount
 * and restored (title only) on unmount so a back-navigation doesn't
 * leak the previous page's title.
 */
export function SEOHead({ title, description, image, canonical, meta, noIndex }: Props) {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) document.title = title;

    const tags: HTMLElement[] = [];

    function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        tags.push(el);
      }
      el.setAttribute('content', content);
    }

    function upsertLink(rel: string, href: string) {
      let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
        tags.push(el);
      }
      el.setAttribute('href', href);
    }

    if (description) {
      upsertMeta('name', 'description', description);
      upsertMeta('property', 'og:description', description);
      upsertMeta('name', 'twitter:description', description);
    }
    if (title) {
      upsertMeta('property', 'og:title', title);
      upsertMeta('name', 'twitter:title', title);
    }
    if (image) {
      upsertMeta('property', 'og:image', image);
      upsertMeta('name', 'twitter:image', image);
    }
    if (canonical) {
      upsertLink('canonical', canonical);
      upsertMeta('property', 'og:url', canonical);
    }
    if (noIndex) {
      upsertMeta('name', 'robots', 'noindex,nofollow');
    }
    for (const tag of meta ?? []) {
      if (tag.name) upsertMeta('name', tag.name, tag.content);
      if (tag.property) upsertMeta('property', tag.property, tag.content);
    }

    return () => {
      if (title) document.title = previousTitle;
    };
  }, [title, description, image, canonical, noIndex, meta]);

  return null;
}
