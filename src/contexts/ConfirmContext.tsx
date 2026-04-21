import { createContext, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/ui/Modal';
import { Button } from '~/components/ui/Button';

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

export const ConfirmContext = createContext<ConfirmContextValue | null>(null);

interface PendingState extends ConfirmOptions {
  resolve: (result: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingState | null>(null);
  const pendingRef = useRef<PendingState | null>(null);
  pendingRef.current = pending;

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const finish = useCallback((result: boolean) => {
    const current = pendingRef.current;
    setPending(null);
    current?.resolve(result);
  }, []);

  const value = useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={pending !== null}
        onClose={() => finish(false)}
        size="sm"
        title={pending?.title ?? ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => finish(false)}>
              {pending?.cancelLabel ?? t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={() => finish(true)}>
              {pending?.confirmLabel ?? t('common.confirm')}
            </Button>
          </>
        }
      >
        {pending?.body ? (
          <p style={{ margin: 0, color: 'var(--fg-deep)', fontSize: 14, lineHeight: 1.55 }}>
            {pending.body}
          </p>
        ) : null}
      </Modal>
    </ConfirmContext.Provider>
  );
}
