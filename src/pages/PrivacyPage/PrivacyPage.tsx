import { useTranslation } from 'react-i18next';
import { SEOHead } from '~/components/SEOHead';
import { Button } from '~/components/ui/Button';
import { useConsent } from '~/hooks/useConsent';
import '~/theme/page-layout.css';
import './LegalPage.css';

export function PrivacyPage() {
  const { t } = useTranslation();
  const { reopen } = useConsent();

  return (
    <>
      <SEOHead
        title={t('privacy.metaTitle')}
        description={t('privacy.metaDescription')}
        canonical="https://ordre.app/privacy"
      />
      <article className="legal-page page-container page-container--compact">
        <header className="legal-head">
          <span className="eyebrow">{t('privacy.eyebrow')}</span>
          <h1 className="display-xl">{t('privacy.title')}</h1>
          <p className="muted legal-updated">{t('privacy.lastUpdated')}</p>
        </header>

        <section className="legal-section">
          <h2 className="display-sm">{t('privacy.sections.controller.title')}</h2>
          <p>{t('privacy.sections.controller.body')}</p>
        </section>

        <section className="legal-section">
          <h2 className="display-sm">{t('privacy.sections.data.title')}</h2>
          <p>{t('privacy.sections.data.body')}</p>
        </section>

        <section className="legal-section">
          <h2 className="display-sm">{t('privacy.sections.purpose.title')}</h2>
          <p>{t('privacy.sections.purpose.body')}</p>
        </section>

        <section className="legal-section">
          <h2 className="display-sm">{t('privacy.sections.sharing.title')}</h2>
          <p>{t('privacy.sections.sharing.body')}</p>
        </section>

        <section className="legal-section">
          <h2 className="display-sm">{t('privacy.sections.storage.title')}</h2>
          <p>{t('privacy.sections.storage.body')}</p>
        </section>

        <section className="legal-section">
          <h2 className="display-sm">{t('privacy.sections.rights.title')}</h2>
          <p>{t('privacy.sections.rights.body')}</p>
        </section>

        <section className="legal-section">
          <h2 className="display-sm">{t('privacy.sections.cookies.title')}</h2>
          <p>{t('privacy.sections.cookies.body')}</p>
          <div>
            <Button variant="ghost" size="sm" onClick={reopen}>
              {t('consent.reopenCta')}
            </Button>
          </div>
        </section>

        <section className="legal-section">
          <h2 className="display-sm">{t('privacy.sections.contact.title')}</h2>
          <p>
            {t('privacy.sections.contact.body')}{' '}
            <a href="mailto:help@ordrecontrolling.com">help@ordrecontrolling.com</a>
          </p>
        </section>
      </article>
    </>
  );
}
