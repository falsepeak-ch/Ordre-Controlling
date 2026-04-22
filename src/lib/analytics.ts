/* ==========================================================================
   Analytics + product-event tracking + error capture.

   Two providers run side-by-side:
     - Firebase Analytics (GA4) — free, landed traffic / funnels.
     - PostHog (EU cloud) — product analytics + exception autocapture.

   Both are gated on the user's cookie-consent decision. Nothing loads
   until the user accepts the analytics category. When consent flips we
   either boot the SDKs (opt-in) or ask them to stop capturing (opt-out).
   ========================================================================== */

import type { PostHog } from 'posthog-js';
import { logEvent, setUserId, isSupported, getAnalytics, type Analytics } from 'firebase/analytics';
import { analytics as firebaseAnalyticsRef, app, setAnalyticsInstance } from './firebase';
import { readStoredConsent, type ConsentState } from '~/contexts/ConsentContext';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';
const IS_DEV = import.meta.env.DEV;

let posthog: PostHog | null = null;
let posthogBooted = false;
let firebaseAnalyticsBooted = false;
let pendingUser: { uid: string; email?: string | null } | null = null;

async function ensureFirebaseAnalytics(): Promise<Analytics | null> {
  if (firebaseAnalyticsBooted && firebaseAnalyticsRef) return firebaseAnalyticsRef;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    const instance = getAnalytics(app);
    setAnalyticsInstance(instance);
    firebaseAnalyticsBooted = true;
    return instance;
  } catch (err) {
    console.warn('[analytics] Firebase Analytics unavailable', err);
    return null;
  }
}

async function bootPosthog(): Promise<void> {
  if (posthogBooted) return;
  if (!POSTHOG_KEY) {
    if (!IS_DEV) {
      console.error('[analytics] VITE_POSTHOG_KEY missing in production build.');
    } else {
      console.warn('[analytics] VITE_POSTHOG_KEY not set — PostHog disabled (dev).');
    }
    return;
  }
  const { default: ph } = await import('posthog-js');
  ph.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    autocapture: true,
    // Auto-capture thrown errors and unhandled rejections. This is
    // how we replaced Sentry — one SDK for analytics + error telemetry.
    capture_exceptions: true,
    // Only load when the user has already opted in. When consent is
    // pending or denied we load the module but stay in opt-out state,
    // and flip it on via `opt_in_capturing()` when the user accepts.
    opt_out_capturing_by_default: true,
    loaded: (instance) => {
      if (IS_DEV) instance.debug(false);
    },
  });
  posthog = ph;
  posthogBooted = true;
}

async function applyConsent(state: ConsentState): Promise<void> {
  if (state.analytics) {
    // PostHog
    await bootPosthog();
    if (posthog) {
      try {
        posthog.opt_in_capturing();
        if (pendingUser) {
          posthog.identify(pendingUser.uid, pendingUser.email ? { email: pendingUser.email } : {});
        }
      } catch (err) {
        console.warn('[analytics] posthog opt-in failed', err);
      }
    }
    // Firebase Analytics
    void ensureFirebaseAnalytics();
  } else {
    if (posthog) {
      try {
        posthog.opt_out_capturing();
      } catch { /* ignore */ }
    }
    // Firebase Analytics has no runtime opt-out; we gate it by deferring
    // init. Once booted the SDK respects `window['ga-disable-<id>']`, which
    // we set from `window` as a belt-and-braces.
    const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
    if (measurementId && typeof window !== 'undefined') {
      (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] = true;
    }
  }
}

/**
 * Boot the analytics stack. Safe to call once from `main.tsx`. Reads the
 * persisted consent state synchronously and applies it; further changes
 * come in via the `ordre:consent` CustomEvent broadcast by the context.
 */
export function initAnalytics(): void {
  const stored = readStoredConsent();
  if (stored) void applyConsent(stored);

  if (typeof window !== 'undefined') {
    window.addEventListener('ordre:consent', (event) => {
      const detail = (event as CustomEvent<ConsentState>).detail;
      if (detail) void applyConsent(detail);
    });
  }
}

/** Attach a user identity after sign-in. No-op when analytics is disabled. */
export function identifyAnalyticsUser(user: { uid: string; email?: string | null } | null): void {
  pendingUser = user;
  if (!user) {
    if (posthog) {
      try { posthog.reset(); } catch { /* ignore */ }
    }
    return;
  }

  if (posthog && posthog.has_opted_in_capturing?.()) {
    try {
      posthog.identify(user.uid, user.email ? { email: user.email } : {});
    } catch { /* ignore */ }
  }

  if (firebaseAnalyticsRef) {
    try {
      setUserId(firebaseAnalyticsRef, user.uid);
    } catch { /* ignore */ }
  }
}

/** Fire-and-forget product event. No-op when analytics is off. */
export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (posthog && posthog.has_opted_in_capturing?.()) {
    try { posthog.capture(name, props); } catch { /* ignore */ }
  }
  if (firebaseAnalyticsRef) {
    try { logEvent(firebaseAnalyticsRef, name, props as Record<string, unknown>); } catch { /* ignore */ }
  }
}

/**
 * Report an error. Routes through PostHog's exception capture when the
 * user has opted in, otherwise logs to the console so dev and no-consent
 * prod failures stay visible somewhere.
 */
export function captureAnalyticsError(err: unknown, context?: Record<string, unknown>): void {
  if (posthog && posthog.has_opted_in_capturing?.()) {
    try {
      posthog.captureException(err, context);
      return;
    } catch { /* fall through to console */ }
  }
  console.error('[analytics] captureError', err, context);
}
