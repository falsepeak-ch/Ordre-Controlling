import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/Button';
import { Modal } from '~/components/ui/Modal';
import { useConsent } from '~/hooks/useConsent';
import './ConsentBanner.css';

export function ConsentBanner() {
  const { t } = useTranslation();
  const { pending, ready, state, acceptAll, rejectNonEssential, setPreferences } = useConsent();
  const [customising, setCustomising] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState<boolean>(state.analytics);

  if (!ready || !pending) return null;

  function save() {
    setPreferences({ analytics: analyticsChoice });
    setCustomising(false);
  }

  return (
    <>
      <div
        role="dialog"
        aria-label={t('consent.bannerLabel')}
        aria-modal="false"
        className="consent-banner"
      >
        <div className="consent-banner-inner">
          <div className="consent-banner-copy">
            <strong className="consent-banner-title">{t('consent.title')}</strong>
            <p>{t('consent.body')}</p>
          </div>
          <div className="consent-banner-actions">
            <Button variant="ghost" size="sm" onClick={rejectNonEssential}>
              {t('consent.reject')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAnalyticsChoice(state.analytics);
                setCustomising(true);
              }}
            >
              {t('consent.customise')}
            </Button>
            <Button variant="primary" size="sm" onClick={acceptAll}>
              {t('consent.acceptAll')}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={customising}
        onClose={() => setCustomising(false)}
        size="md"
        title={t('consent.customiseTitle')}
        subtitle={t('consent.customiseBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCustomising(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={save}>
              {t('consent.savePrefs')}
            </Button>
          </>
        }
      >
        <ul className="consent-prefs">
          <li>
            <div className="consent-pref-head">
              <span className="consent-pref-name">{t('consent.necessary.name')}</span>
              <span className="consent-pref-state muted">{t('consent.alwaysOn')}</span>
            </div>
            <p>{t('consent.necessary.body')}</p>
          </li>
          <li>
            <div className="consent-pref-head">
              <label className="consent-pref-toggle">
                <input
                  type="checkbox"
                  checked={analyticsChoice}
                  onChange={(e) => setAnalyticsChoice(e.target.checked)}
                />
                <span className="consent-pref-name">{t('consent.analytics.name')}</span>
              </label>
            </div>
            <p>{t('consent.analytics.body')}</p>
          </li>
        </ul>
      </Modal>
    </>
  );
}
