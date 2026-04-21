import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/ui/Modal';
import { Button } from '~/components/ui/Button';
import { Icon } from '~/components/ui/Icon';
import { useSubscription } from '~/hooks/useSubscription';
import { useToast } from '~/hooks/useToast';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Plan = 'monthly' | 'annual';

const BILLING_ENABLED = import.meta.env.VITE_BILLING_ENABLED === 'true';
const PRO_CONTACT_EMAIL = 'help@ordrecontrolling.com';

export function UpgradeModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { redirectToCheckout } = useSubscription();
  const { push } = useToast();
  const [plan, setPlan] = useState<Plan>('annual');
  const [busy, setBusy] = useState(false);

  async function handleUpgrade() {
    setBusy(true);
    try {
      await redirectToCheckout(plan);
    } catch {
      push({ message: t('paywall.disabledNotice'), icon: 'x-circle-fill', tone: 'error' });
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      size="md"
      title={t('paywall.unlockProjectsTitle')}
      subtitle={
        BILLING_ENABLED
          ? t('paywall.unlockProjectsBody')
          : t('paywall.betaBody')
      }
      footer={
        BILLING_ENABLED ? (
          <>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              {t('paywall.cancel')}
            </Button>
            <Button variant="primary" onClick={handleUpgrade} isLoading={busy}>
              {t('paywall.upgradeCta')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('paywall.cancel')}
            </Button>
            <a
              href={`mailto:${PRO_CONTACT_EMAIL}?subject=${encodeURIComponent('Ordre Pro invite request')}`}
              onClick={onClose}
              style={{ textDecoration: 'none' }}
            >
              <Button variant="primary">
                {t('paywall.requestInviteCta')}
              </Button>
            </a>
          </>
        )
      }
    >
      {BILLING_ENABLED ? (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 20,
          }}
        >
          {(['annual', 'monthly'] as Plan[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlan(p)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: plan === p ? '1.5px solid var(--fg-base)' : '1.5px solid var(--border-subtle)',
                background: plan === p ? 'var(--fg-base)' : 'transparent',
                color: plan === p ? 'var(--bg-base)' : 'var(--fg-muted)',
                fontSize: 13,
                fontWeight: plan === p ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {p === 'annual'
                ? `${t('pricing.annualBadge')} · ${t('pricing.plans.proMarketingYearly')}`
                : `${t('pricing.monthlyBadge')} · ${t('pricing.plans.proMarketingMonthly')}`}
            </button>
          ))}
        </div>
      ) : null}

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
