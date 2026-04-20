/* ==========================================================================
   RevenueCat Web SDK wrapper.

   All interactions with `@revenuecat/purchases-js` go through this module so
   components stay decoupled from the SDK and degrade gracefully when the API
   key isn't set (e.g. when running against the emulator or a preview build).
   ========================================================================== */

import {
  Purchases,
  type CustomerInfo,
  type Offering,
  type Offerings,
  type Package,
} from '@revenuecat/purchases-js';

const API_KEY = import.meta.env.VITE_REVENUECAT_PUBLIC_API_KEY as string | undefined;
export const PRO_ENTITLEMENT =
  (import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID as string | undefined) || 'Ordre Pro';

export const isRevenueCatEnabled = Boolean(API_KEY);

// ----- Module state -----
let configured = false;
let currentAppUserId: string | null = null;

function instance() {
  return Purchases.getSharedInstance();
}

/**
 * Configure on first call; reuse the instance on subsequent calls.
 *
 * Pass the Firebase UID when the user is signed in, or `null` when
 * unauthenticated — we'll mint a stable anonymous app-user ID in that case so
 * the landing page can still load offerings.
 */
export async function ensureUser(userId: string | null): Promise<void> {
  if (!isRevenueCatEnabled || !API_KEY) return;

  const target = userId ?? readOrCreateAnonymousId();
  if (!configured) {
    Purchases.configure({ apiKey: API_KEY, appUserId: target });
    configured = true;
    currentAppUserId = target;
    return;
  }
  if (currentAppUserId === target) return;

  try {
    await instance().changeUser(target);
  } catch (err) {
    console.warn('[revenuecat] changeUser failed, re-configuring', err);
    // Some SDK versions don't expose changeUser as an instance method — fall
    // back to re-configuring. The static config call replaces the instance.
    Purchases.configure({ apiKey: API_KEY, appUserId: target });
  }
  currentAppUserId = target;
}

function readOrCreateAnonymousId(): string {
  try {
    const stored = localStorage.getItem('ordre.rcAnonId');
    if (stored) return stored;
    const fresh = Purchases.generateRevenueCatAnonymousAppUserId();
    localStorage.setItem('ordre.rcAnonId', fresh);
    return fresh;
  } catch {
    return Purchases.generateRevenueCatAnonymousAppUserId();
  }
}

// ----- Customer info -----
export async function getCustomerInfoSafe(): Promise<CustomerInfo | null> {
  if (!isRevenueCatEnabled || !configured) return null;
  try {
    return await instance().getCustomerInfo();
  } catch (err) {
    console.warn('[revenuecat] getCustomerInfo failed', err);
    return null;
  }
}

// ----- Offerings -----
export async function getOfferingsSafe(
  currency: string | undefined = 'EUR',
): Promise<Offerings | null> {
  if (!isRevenueCatEnabled || !configured) return null;
  try {
    return await instance().getOfferings(currency ? { currency } : undefined);
  } catch (err) {
    console.warn('[revenuecat] getOfferings failed', err);
    return null;
  }
}

// ----- Entitlement check -----
export function hasPro(info: CustomerInfo | null): boolean {
  if (!info) return false;
  return PRO_ENTITLEMENT in info.entitlements.active;
}

// ----- Paywall / purchase -----
export interface PresentPaywallOptions {
  offering?: Offering;
  customerEmail?: string;
}

export interface PaywallOutcome {
  purchased: boolean;
  info: CustomerInfo | null;
}

export async function presentPaywall(opts: PresentPaywallOptions = {}): Promise<PaywallOutcome> {
  if (!isRevenueCatEnabled || !configured) return { purchased: false, info: null };
  try {
    const params: {
      offering?: Offering;
      customerEmail?: string;
    } = {};
    if (opts.offering) params.offering = opts.offering;
    if (opts.customerEmail) params.customerEmail = opts.customerEmail;

    const result = await instance().presentPaywall(params);
    return { purchased: hasPro(result.customerInfo), info: result.customerInfo };
  } catch (err) {
    // Dismissing the paywall throws; treat it as "no purchase" instead of an
    // error state so callers can simply keep the user in the unpaid flow.
    console.info('[revenuecat] paywall dismissed or errored', err);
    return { purchased: false, info: null };
  }
}

export async function purchasePackageSafe(
  pkg: Package,
  opts: { customerEmail?: string } = {},
): Promise<PaywallOutcome> {
  if (!isRevenueCatEnabled || !configured) return { purchased: false, info: null };
  try {
    const params: {
      rcPackage: Package;
      customerEmail?: string;
    } = { rcPackage: pkg };
    if (opts.customerEmail) params.customerEmail = opts.customerEmail;
    const result = await instance().purchase(params);
    return { purchased: hasPro(result.customerInfo), info: result.customerInfo };
  } catch (err) {
    console.info('[revenuecat] purchase dismissed or errored', err);
    return { purchased: false, info: null };
  }
}

// ----- Management URL (a.k.a. Customer Center link) -----
export function getManagementUrl(info: CustomerInfo | null): string | null {
  return info?.managementURL ?? null;
}

// ----- Offering lookup helpers -----
export function getMonthly(offerings: Offerings | null): Package | null {
  return offerings?.current?.monthly ?? null;
}

export function getAnnual(offerings: Offerings | null): Package | null {
  return offerings?.current?.annual ?? null;
}
