import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CustomerInfo, Offerings, Offering } from '@revenuecat/purchases-js';
import {
  ensureUser,
  getCustomerInfoSafe,
  getOfferingsSafe,
  getManagementUrl,
  hasPro,
  isRevenueCatEnabled,
  presentPaywall as sdkPresentPaywall,
  PRO_ENTITLEMENT,
} from '~/lib/revenuecat';
import { useAuth } from '~/hooks/useAuth';

interface SubscriptionContextValue {
  ready: boolean;
  loading: boolean;
  enabled: boolean;
  info: CustomerInfo | null;
  offerings: Offerings | null;
  isPro: boolean;
  managementUrl: string | null;
  presentPaywall: (offering?: Offering) => Promise<boolean>;
  refresh: () => Promise<void>;
  proEntitlement: string;
}

export const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [info, setInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const reqIdRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!isRevenueCatEnabled) {
      setReady(true);
      setLoading(false);
      return;
    }
    const myReq = ++reqIdRef.current;
    try {
      const [nextInfo, nextOfferings] = await Promise.all([
        getCustomerInfoSafe(),
        getOfferingsSafe('EUR'),
      ]);
      if (myReq !== reqIdRef.current) return;
      setInfo(nextInfo);
      setOfferings(nextOfferings);
      setReady(true);
    } finally {
      if (myReq === reqIdRef.current) setLoading(false);
    }
  }, []);

  // Track the last configured user so we only init / change-user on transitions.
  const lastConfiguredRef = useRef<string | null | 'anonymous'>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isRevenueCatEnabled) {
      setReady(true);
      setLoading(false);
      return;
    }

    const target: string | null = user ? user.uid : null;
    const key = target ?? 'anonymous';
    if (lastConfiguredRef.current === key) return;
    lastConfiguredRef.current = key;

    setLoading(true);
    void (async () => {
      try {
        await ensureUser(target);
        await refresh();
      } catch (err) {
        console.warn('[subscription] init failed', err);
        setLoading(false);
      }
    })();
  }, [user, authLoading, refresh]);

  const presentPaywallCb = useCallback<SubscriptionContextValue['presentPaywall']>(
    async (offering) => {
      if (!isRevenueCatEnabled) return false;
      const params: { offering?: Offering; customerEmail?: string } = {};
      if (offering) params.offering = offering;
      if (user?.email) params.customerEmail = user.email;
      const result = await sdkPresentPaywall(params);
      if (result.info) setInfo(result.info);
      // Even if the user cancelled we may still want to re-read customer info
      // in case entitlements changed from another surface (e.g. mobile).
      void refresh();
      return result.purchased;
    },
    [user?.email, refresh],
  );

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      ready,
      loading,
      enabled: isRevenueCatEnabled,
      info,
      offerings,
      isPro: hasPro(info),
      managementUrl: getManagementUrl(info),
      presentPaywall: presentPaywallCb,
      refresh,
      proEntitlement: PRO_ENTITLEMENT,
    }),
    [ready, loading, info, offerings, presentPaywallCb, refresh],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}
