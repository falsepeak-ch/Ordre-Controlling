import { type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, ButtonAnchor } from '~/components/ui/Button';
import { Icon } from '~/components/ui/Icon';
import { Progress } from '~/components/ui/Progress';
import { Pill } from '~/components/ui/Pill';
import { SEOHead } from '~/components/SEOHead';
import type { IconName } from '~/icons/manifest';
import { eur } from '~/lib/format';
import './LandingPage.css';

const BILLING_ENABLED = import.meta.env.VITE_BILLING_ENABLED === 'true';

const STEPS: Array<{ key: 'commit' | 'approve' | 'reconcile'; icon: IconName }> = [
  { key: 'commit', icon: 'receipt-fill' },
  { key: 'approve', icon: 'shield-fill-check' },
  { key: 'reconcile', icon: 'check-circle-fill' },
];

const FEATURES: Array<{ key: string; icon: IconName }> = [
  { key: 'suppliers', icon: 'building-fill' },
  { key: 'categories', icon: 'clipboard-fill' },
  { key: 'roles', icon: 'person-circle-fill' },
  { key: 'approvals', icon: 'shield-fill-check' },
  { key: 'invoices', icon: 'receipt-fill' },
  { key: 'reports', icon: 'bar-chart-fill' },
  { key: 'i18n', icon: 'envelope-fill' },
  { key: 'darkMode', icon: 'moon-fill' },
];

const FAQ_KEYS = ['data', 'pricing', 'cancel', 'multi', 'security', 'import'] as const;

const TESTIMONIAL_KEYS = ['verdera', 'tallerpol', 'escenic'] as const;

export function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const previewLines = [
    { key: 'previewLine1', committed: 480, invoiced: 460 },
    { key: 'previewLine2', committed: 250, invoiced: 250 },
    { key: 'previewLine3', committed: 180, invoiced: 180 },
    { key: 'previewLine4', committed: 190, invoiced: 0 },
  ];

  const totalCommitted = previewLines.reduce((s, l) => s + l.committed, 0);
  const totalInvoiced = previewLines.reduce((s, l) => s + l.invoiced, 0);
  const totalRemaining = totalCommitted - totalInvoiced;

  return (
    <>
      <SEOHead
        title={t('landing.meta.title')}
        description={t('landing.meta.description')}
        canonical="https://ordre.app/"
      />

      {/* ===== Hero ===== */}
      <section className="landing-hero">
        <div className="landing-hero-gradient" aria-hidden="true" />
        <div className="landing-hero-inner">
          <span className="landing-eyebrow">{t('landing.heroEyebrow')}</span>
          <h1 className="landing-hero-title display-hero">{t('landing.heroTitle')}</h1>
          <p className="landing-hero-sub">{t('landing.heroSubtitle')}</p>
          <div className="landing-hero-ctas">
            <Button variant="primary" size="lg" onClick={() => navigate('/signup')}>
              {t('landing.ctaPrimary')}
            </Button>
            <Button variant="ghost" size="lg" onClick={() => navigate('/login')}>
              {t('landing.ctaSecondary')}
            </Button>
          </div>
          <ul className="landing-hero-bullets">
            <li><Icon name="check-circle-fill" size={13} />{t('landing.heroBullet1')}</li>
            <li><Icon name="check-circle-fill" size={13} />{t('landing.heroBullet2')}</li>
            <li><Icon name="check-circle-fill" size={13} />{t('landing.heroBullet3')}</li>
          </ul>
        </div>
        <div className="landing-hero-preview" aria-hidden="true">
          <LandingPreviewCard
            committed={totalCommitted}
            invoiced={totalInvoiced}
            remaining={totalRemaining}
            lines={previewLines}
          />
        </div>
      </section>

      {/* ===== Social proof strip ===== */}
      <section className="landing-logos" aria-label={t('landing.logosLabel')}>
        <p className="landing-logos-label">{t('landing.logosLabel')}</p>
        <ul className="landing-logos-row">
          {['verdera', 'tallerpol', 'escenic', 'martianomusic', 'berlinfilm'].map((slug) => (
            <li key={slug} className="landing-logos-item">
              {t(`landing.logos.${slug}`)}
            </li>
          ))}
        </ul>
      </section>

      {/* ===== Problem → Solution ===== */}
      <section className="landing-contrast">
        <div className="landing-contrast-inner">
          <article className="landing-contrast-card landing-contrast-before">
            <span className="landing-contrast-kicker">{t('landing.contrast.beforeKicker')}</span>
            <h3 className="display-md">{t('landing.contrast.beforeTitle')}</h3>
            <ul>
              {[1, 2, 3, 4].map((n) => (
                <li key={n}>
                  <Icon name="x-circle-fill" size={14} />
                  <span>{t(`landing.contrast.beforeItem${n}`)}</span>
                </li>
              ))}
            </ul>
          </article>
          <div className="landing-contrast-arrow" aria-hidden="true">
            <Icon name="arrow-right" size={18} />
          </div>
          <article className="landing-contrast-card landing-contrast-after">
            <span className="landing-contrast-kicker">{t('landing.contrast.afterKicker')}</span>
            <h3 className="display-md">{t('landing.contrast.afterTitle')}</h3>
            <ul>
              {[1, 2, 3, 4].map((n) => (
                <li key={n}>
                  <Icon name="check-circle-fill" size={14} />
                  <span>{t(`landing.contrast.afterItem${n}`)}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section className="landing-how">
        <div className="landing-how-head">
          <span className="eyebrow">{t('landing.howEyebrow')}</span>
          <h2 className="display-xl">{t('landing.howTitle')}</h2>
          <p className="landing-how-sub">{t('landing.howSubtitle')}</p>
        </div>
        <div className="landing-how-grid">
          {STEPS.map((p, i) => (
            <article key={p.key} className="landing-step reveal reveal-d1">
              <div className="landing-step-head">
                <span className="landing-step-num">0{i + 1}</span>
                <span className="landing-step-icon">
                  <Icon name={p.icon} size={20} />
                </span>
              </div>
              <h3 className="display-md">{t(`landing.pillar${cap(p.key)}Title`)}</h3>
              <p>{t(`landing.pillar${cap(p.key)}Body`)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ===== Feature grid ===== */}
      <section className="landing-features">
        <div className="landing-features-head">
          <span className="eyebrow">{t('landing.featuresEyebrow')}</span>
          <h2 className="display-xl">{t('landing.featuresTitle')}</h2>
          <p className="landing-features-sub">{t('landing.featuresSubtitle')}</p>
        </div>
        <div className="landing-features-grid">
          {FEATURES.map((f) => (
            <article key={f.key} className="landing-feature">
              <span className="landing-feature-icon">
                <Icon name={f.icon} size={18} />
              </span>
              <h3 className="landing-feature-title">{t(`landing.features.${f.key}.title`)}</h3>
              <p>{t(`landing.features.${f.key}.body`)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ===== Testimonials ===== */}
      <section className="landing-quotes">
        <div className="landing-quotes-head">
          <span className="eyebrow">{t('landing.quotesEyebrow')}</span>
          <h2 className="display-xl">{t('landing.quotesTitle')}</h2>
        </div>
        <div className="landing-quotes-grid">
          {TESTIMONIAL_KEYS.map((key) => (
            <figure key={key} className="landing-quote">
              <blockquote>{t(`landing.quotes.${key}.body`)}</blockquote>
              <figcaption>
                <span className="landing-quote-name">{t(`landing.quotes.${key}.name`)}</span>
                <span className="landing-quote-role">{t(`landing.quotes.${key}.role`)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ===== Pricing ===== */}
      <LandingPricing />

      {/* ===== FAQ ===== */}
      <section className="landing-faq">
        <div className="landing-faq-head">
          <span className="eyebrow">{t('landing.faqEyebrow')}</span>
          <h2 className="display-xl">{t('landing.faqTitle')}</h2>
        </div>
        <div className="landing-faq-list">
          {FAQ_KEYS.map((key) => (
            <FaqItem
              key={key}
              question={t(`landing.faq.${key}.q`)}
              answer={t(`landing.faq.${key}.a`)}
            />
          ))}
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2 className="display-hero">{t('landing.finalCtaTitle')}</h2>
          <p className="landing-cta-sub">{t('landing.finalCtaBody')}</p>
          <div className="landing-cta-buttons">
            <Button variant="primary" size="lg" onClick={() => navigate('/signup')}>
              {t('landing.ctaPrimary')}
            </Button>
            <Link to="/terms" className="landing-cta-link">
              {t('footer.terms')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="landing-faq-item">
      <summary className="landing-faq-question">
        <span>{question}</span>
        <span className="landing-faq-chevron" aria-hidden="true">
          <Icon name="chevron-down" size={14} />
        </span>
      </summary>
      <div className="landing-faq-answer">{answer}</div>
    </details>
  );
}

function LandingPricing() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="landing-pricing" id="pricing">
      <div className="landing-pricing-inner">
        <div className="landing-pricing-head">
          <span className="eyebrow">{t('pricing.eyebrow')}</span>
          <h2 className="display-xl">{t('pricing.title')}</h2>
          <p className="landing-pricing-sub">{t('pricing.subtitle')}</p>
        </div>

        <div className="landing-pricing-grid">
          {/* ---- Free ---- */}
          <article className="pricing-card pricing-card-free reveal reveal-d1">
            <header className="pricing-card-head">
              <h3 className="display-md">{t('pricing.plans.freeTitle')}</h3>
              <p className="pricing-card-subtitle">{t('pricing.plans.freeSubtitle')}</p>
            </header>
            <div className="pricing-card-price">
              <span className="pricing-card-amount">{t('pricing.plans.freePrice')}</span>
              <span className="pricing-card-period">{t('pricing.plans.freePeriod')}</span>
            </div>
            <ul className="pricing-card-features">
              {[1, 2, 3, 4].map((n) => (
                <li key={n}>
                  <Icon name="check-circle-fill" size={13} />
                  <span>{t(`pricing.featureFree${n}`)}</span>
                </li>
              ))}
            </ul>
            <ButtonAnchor
              href="/signup"
              variant="ghost"
              size="lg"
              fullWidth
            >
              {t('pricing.ctaFree')}
            </ButtonAnchor>
          </article>

          {/* ---- Pro ---- */}
          <article className="pricing-card pricing-card-pro reveal reveal-d2">
            <header className="pricing-card-head">
              <div className="pricing-card-head-row">
                <h3 className="display-md">{t('pricing.plans.proTitle')}</h3>
                {BILLING_ENABLED ? (
                  <span className="pricing-card-tag">{t('pricing.annualSavings')}</span>
                ) : (
                  <span className="pricing-card-tag">{t('pricing.betaTag')}</span>
                )}
              </div>
              <p className="pricing-card-subtitle">{t('pricing.plans.proSubtitle')}</p>
            </header>

            {BILLING_ENABLED ? (
              <PricingProToggle />
            ) : (
              <div className="pricing-card-price">
                <span className="pricing-card-amount">{t('pricing.inviteOnly')}</span>
                <span className="pricing-card-period">{t('pricing.inviteOnlyNote')}</span>
              </div>
            )}

            <ul className="pricing-card-features">
              {[1, 2, 3, 4, 5].map((n) => (
                <li key={n}>
                  <Icon name="check-circle-fill" size={13} />
                  <span>{t(`pricing.featurePro${n}`)}</span>
                </li>
              ))}
            </ul>

            {BILLING_ENABLED ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => navigate('/signup')}
              >
                {t('pricing.ctaPro')}
              </Button>
            ) : (
              <a
                href="mailto:pro@ordrecontrolling.com?subject=Ordre%20Pro%20invite%20request"
                style={{ textDecoration: 'none' }}
              >
                <Button variant="primary" size="lg" fullWidth>
                  {t('paywall.requestInviteCta')}
                </Button>
              </a>
            )}

            {BILLING_ENABLED ? (
              <p className="pricing-card-footnote">{t('pricing.fallbackNote')}</p>
            ) : null}
          </article>
        </div>
      </div>
    </section>
  );
}

function PricingProToggle(): ReactNode {
  const { t } = useTranslation();
  const monthlyPrice = t('pricing.plans.proMarketingMonthly');
  const annualPrice = t('pricing.plans.proMarketingYearly');
  return (
    <div className="pricing-card-toggle">
      <div className="pricing-toggle">
        <div className="pricing-toggle-option">
          <span className="pricing-toggle-label">{t('pricing.annualBadge')}</span>
          <span className="pricing-toggle-price num">{annualPrice}</span>
          <span className="pricing-toggle-meta">{t('pricing.billedAnnually')}</span>
        </div>
        <div className="pricing-toggle-sep" />
        <div className="pricing-toggle-option">
          <span className="pricing-toggle-label">{t('pricing.monthlyBadge')}</span>
          <span className="pricing-toggle-price num">{monthlyPrice}</span>
          <span className="pricing-toggle-meta">{t('pricing.billedMonthly')}</span>
        </div>
      </div>
    </div>
  );
}

function LandingPreviewCard({
  committed,
  invoiced,
  remaining,
  lines,
}: {
  committed: number;
  invoiced: number;
  remaining: number;
  lines: Array<{ key: string; committed: number; invoiced: number }>;
}) {
  const { t } = useTranslation();
  const pct = committed ? Math.min(100, Math.round((invoiced / committed) * 100)) : 0;

  return (
    <div className="landing-preview-card">
      <div className="landing-preview-head">
        <div className="landing-preview-head-left">
          <span className="landing-preview-num mono">PO-2026-0042</span>
          <Pill status="approved">{t('nav.purchaseOrders')}</Pill>
        </div>
        <div className="landing-preview-head-right">
          <Icon name="receipt-fill" size={14} />
          <span className="muted" style={{ fontSize: 12 }}>Mobiliari Sant Martí</span>
        </div>
      </div>

      <h4 className="landing-preview-title">{t('landing.previewTitle')}</h4>

      <div className="landing-preview-totals">
        <div>
          <span className="landing-preview-label">{t('landing.previewCommitted')}</span>
          <span className="landing-preview-value num">{eur(committed)}</span>
        </div>
        <div>
          <span className="landing-preview-label">{t('landing.previewInvoiced')}</span>
          <span className="landing-preview-value num">{eur(invoiced)}</span>
        </div>
        <div>
          <span className="landing-preview-label">{t('landing.previewRemaining')}</span>
          <span className="landing-preview-value num">{eur(remaining)}</span>
        </div>
      </div>

      <div className="landing-preview-overall">
        <div className="landing-preview-overall-row">
          <span className="landing-preview-label">{t('landing.previewProgress')}</span>
          <span className="num" style={{ fontSize: 12, fontWeight: 500 }}>{pct}%</span>
        </div>
        <Progress value={pct} size="default" tone="solid" />
      </div>

      <ul className="landing-preview-lines">
        {lines.map((l) => {
          const lpct = l.committed ? Math.min(100, Math.round((l.invoiced / l.committed) * 100)) : 0;
          const full = l.committed > 0 && l.invoiced === l.committed;
          return (
            <li key={l.key} className="landing-preview-line">
              <div className="landing-preview-line-row">
                <span className="landing-preview-line-title">{t(`landing.${l.key}`)}</span>
                <span className="landing-preview-line-amount num">{eur(l.committed)}</span>
              </div>
              <div className="landing-preview-line-row sub">
                <Progress value={lpct} size="thin" tone={full ? 'solid' : 'striped'} />
                <span className="num" style={{ fontSize: 10.5, minWidth: 32, textAlign: 'right', color: 'var(--fg-muted)' }}>
                  {lpct}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <Link to="/signup" className="landing-preview-cta">
        {t('landing.ctaPrimary')} →
      </Link>
    </div>
  );
}

function cap<S extends string>(s: S): Capitalize<S> {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as Capitalize<S>;
}
