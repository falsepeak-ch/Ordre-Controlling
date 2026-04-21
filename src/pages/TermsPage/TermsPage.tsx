import { useTranslation } from 'react-i18next';
import { SEOHead } from '~/components/SEOHead';
import './LegalPage.css';

export function TermsPage() {
  const { t } = useTranslation();

  return (
    <>
      <SEOHead
        title={t('terms.metaTitle')}
        description={t('terms.metaDescription')}
        canonical="https://ordre.app/terms"
      />
      <article className="legal-page">
        <header className="legal-head">
          <span className="eyebrow">{t('terms.eyebrow')}</span>
          <h1 className="display-xl">{t('terms.title')}</h1>
          <p className="muted legal-updated">{t('terms.lastUpdated')}</p>
        </header>

        <section className="legal-section">
          <h2 className="display-sm">{t('terms.sections.acceptance.title')}</h2>
          <p>{t('terms.sections.acceptance.body')}</p>
        </section>

        <section className="legal-section">
          <h2 className="display-sm">{t('terms.sections.account.title')}</h2>
          <p>{t('terms.sections.account.body')}</p>
        </section>

        <section className="legal-section">
          <h2 className="display-sm">{t('terms.sections.plans.title')}</h2>
          <p>{t('terms.sections.plans.body')}</p>
        </section>

        <section className="legal-section">
          <h2 className="display-sm">{t('terms.sections.content.title')}</h2>
          <p>{t('terms.sections.content.body')}</p>
        </section>

        <section className="legal-section">
          <h2 className="display-sm">{t('terms.sections.acceptableUse.title')}</h2>
          <p>{t('terms.sections.acceptableUse.body')}</p>
        </section>

        <section className="legal-section">
          <h2 className="display-sm">{t('terms.sections.termination.title')}</h2>
          <p>{t('terms.sections.termination.body')}</p>
        </section>

        <section className="legal-section">
          <h2 className="display-sm">{t('terms.sections.liability.title')}</h2>
          <p>{t('terms.sections.liability.body')}</p>
        </section>

        <section className="legal-section">
          <h2 className="display-sm">{t('terms.sections.governing.title')}</h2>
          <p>{t('terms.sections.governing.body')}</p>
        </section>

        <section className="legal-section">
          <h2 className="display-sm">{t('terms.sections.contact.title')}</h2>
          <p>
            {t('terms.sections.contact.body')}{' '}
            <a href="mailto:help@ordrecontrolling.com">help@ordrecontrolling.com</a>
          </p>
        </section>
      </article>
    </>
  );
}
