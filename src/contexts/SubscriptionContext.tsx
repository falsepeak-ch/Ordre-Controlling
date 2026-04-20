import {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '~/lib/firebase';
import { useAuth } from '~/hooks/useAuth';

type Plan = 'monthly' | 'annual';

interface SubscriptionContextValue {
  ready: boolean;
  loading: boolean;
  isPro: boolean;
  subscriptionStatus: string | null;
  subscriptionPlan: Plan | null;
  redirectToCheckout: (plan: Plan) => Promise<void>;
  redirectToPortal: () => Promise<void>;
}

export const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<Plan | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Tear down any previous listener.
    unsubRef.current?.();
    unsubRef.current = null;

    if (authLoading) return;

    if (!user) {
      setSubscriptionStatus(null);
      setSubscriptionPlan(null);
      setReady(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        const data = snap.data() ?? {};
        const status = (data.subscriptionStatus as string | null | undefined) ?? null;
        const plan = (data.subscriptionPlan as Plan | null | undefined) ?? null;
        setSubscriptionStatus(status);
        setSubscriptionPlan(plan);
        setReady(true);
        setLoading(false);
      },
      (err) => {
        console.warn('[subscription] snapshot error', err);
        setReady(true);
        setLoading(false);
      },
    );

    unsubRef.current = unsub;
    return () => {
      unsub();
      unsubRef.current = null;
    };
  }, [user, authLoading]);

  const isPro =
    subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      ready,
      loading,
      isPro,
      subscriptionStatus,
      subscriptionPlan,
      redirectToCheckout: async () => { throw new Error('Checkout unavailable'); },
      redirectToPortal: async () => { throw new Error('Portal unavailable'); },
    }),
    [ready, loading, isPro, subscriptionStatus, subscriptionPlan],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}
