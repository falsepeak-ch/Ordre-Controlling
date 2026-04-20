import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/ui/Modal';
import { Button } from '~/components/ui/Button';
import { Icon } from '~/components/ui/Icon';
import { useSubscription } from '~/hooks/useSubscription';
import { useToast } from '~/hooks/useToast';
import type { Offering } from '@revenuecat/purchases-js';

interface Props {
  open: boolean;
  onClose: () => void;
  offering?: Offering;
}

export function UpgradeModal({ open, onClose, offering }: Props) {
  const { t } = useTranslation();
  const { enabled, presentPaywall } = useSubscription();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleUpgrade() {
    if (!enabled) {
      push({ message: t('paywall.disabledNotice'), icon: 'x-circle-fill', tone: 'error' });
      return;
    }
    setBusy(true);
    try {
      const purchased = await presentPaywall(offering);
      if (purchased) {
        push({ message: t('paywall.purchasedToast'), icon: 'check-circle-fill' });
        onClose();
      } else {
        push({ message: t('paywall.dismissedToast'), icon: 'clock-fill' });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      size="md"
      title={t('paywall.unlockProjectsTitle')}
      subtitle={t('paywall.unlockProjectsBody')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('paywall.cancel')}
          </Button>
          <Button variant="primary" onClick={handleUpgrade} isLoading={busy}>
            {t('paywall.upgradeCta')}
          </Button>
        </>
      }
    >
      <ul
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <li
            key={n}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: 'var(--fg-deep)' }}
          >
            <Icon name="check-circle-fill" size={14} />
            <span>{t(`pricing.featurePro${n}`)}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
