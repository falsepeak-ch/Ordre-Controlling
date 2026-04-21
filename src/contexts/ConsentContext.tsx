/* ==========================================================================
   Cookie / tracking consent. Two categories:
     - necessary — always on (auth sessions, theme, locale prefs)
     - analytics — Firebase Analytics + PostHog, gated on opt-in

   State persisted to localStorage so the banner only appears on the
   user's first visit. Other modules subscribe via `useConsent()` and
   react by calling `opt_in_capturing` / `opt_out_capturing` on the
   underlying SDKs.
   ========================================================================== */

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'ordre.consent.v1';

export interface ConsentState {
  necessary: true;
  analytics: boolean;
}

export type ConsentCategory = 'necessary' | 'analytics';

interface StoredConsent extends ConsentState {
  /** ISO timestamp of when the user last saved preferences. */
  decidedAt: string;
}

interface ConsentContextValue {
  ready: boolean;
  state: ConsentState;
  /** True when the banner should still be shown (no persisted decision yet). */
  pending: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  setPreferences: (prefs: Partial<ConsentState>) => void;
  /** Re-open the banner (e.g. from the Privacy page). */
  reopen: () => void;
}

const DEFAULT_STATE: ConsentState = {
  necessary: true,
  analytics: false,
};

export const ConsentContext = createContext<ConsentContextValue | null>(null);

function load(): StoredConsent | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    if (typeof parsed.analytics !== 'boolean') return null;
    return {
      necessary: true,
      analytics: parsed.analytics,
      decidedAt: typeof parsed.decidedAt === 'string' ? parsed.decidedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function persist(state: ConsentState): void {
  if (typeof localStorage === 'undefined') return;
  const stored: StoredConsent = { ...state, decidedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* storage quota / private mode — fall through */
  }
}

function broadcast(state: ConsentState): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('ordre:consent', { detail: state }));
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConsentState>(DEFAULT_STATE);
  const [pending, setPending] = useState(true);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    const loaded = load();
    if (loaded) {
      setState({ necessary: true, analytics: loaded.analytics });
      setPending(false);
    }
    setReady(true);
  }, []);

  // Broadcast every change so side-effectful consumers (analytics SDKs)
  // can react without re-rendering the whole tree.
  useEffect(() => {
    if (!ready) return;
    broadcast(state);
  }, [state, ready]);

  const save = useCallback((next: ConsentState) => {
    setState(next);
    setPending(false);
    persist(next);
  }, []);

  const acceptAll = useCallback(() => save({ necessary: true, analytics: true }), [save]);

  const rejectNonEssential = useCallback(
    () => save({ necessary: true, analytics: false }),
    [save],
  );

  const setPreferences = useCallback(
    (prefs: Partial<ConsentState>) =>
      save({
        necessary: true,
        analytics: prefs.analytics ?? state.analytics,
      }),
    [save, state.analytics],
  );

  const reopen = useCallback(() => setPending(true), []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      ready,
      state,
      pending,
      acceptAll,
      rejectNonEssential,
      setPreferences,
      reopen,
    }),
    [ready, state, pending, acceptAll, rejectNonEssential, setPreferences, reopen],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

/**
 * Synchronous read outside of React (for init-time code in main.tsx).
 * Returns `null` when no decision has been made yet — callers should
 * treat that as "analytics off until the user opts in".
 */
export function readStoredConsent(): ConsentState | null {
  const stored = load();
  if (!stored) return null;
  return { necessary: true, analytics: stored.analytics };
}
