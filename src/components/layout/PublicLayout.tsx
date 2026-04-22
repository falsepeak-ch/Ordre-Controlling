import { Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '~/components/ui/Logo';
import { ThemeToggle } from '~/components/ui/ThemeToggle';
import { LocaleToggle } from '~/components/ui/LocaleToggle';
import { ButtonAnchor } from '~/components/ui/Button';
import { useConsent } from '~/hooks/useConsent';
import './PublicLayout.css';

export function PublicLayout() {
  const { t } = useTranslation();
  const { reopen } = useConsent();
  const year = new Date().getFullYear();

  return (
    <div className="public-shell">
      <header className="public-nav">
        <Link to="/" className="public-nav-brand" aria-label="Ordre">
          <Logo variant="wordmark" size="md" />
        </Link>
        <nav className="public-nav-actions">
          <LocaleToggle />
          <ThemeToggle />
          <Link to="/login" className="public-nav-link">{t('nav.login')}</Link>
          <ButtonAnchor href="/signup" variant="primary" size="md">
            {t('nav.signup')}
          </ButtonAnchor>
        </nav>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="public-footer-inner">
          <Logo variant="mark" size="sm" />
          <span className="public-footer-copy">{t('landing.footerCopy', { year })}</span>
          <span className="public-footer-note">{t('landing.footerNote')}</span>
          <div className="public-footer-spacer" />
          <Link to="/terms" className="public-footer-link">{t('footer.terms')}</Link>
          <Link to="/privacy" className="public-footer-link">{t('footer.privacy')}</Link>
          <button
            type="button"
            className="public-footer-link public-footer-linklike"
            onClick={reopen}
          >
            {t('footer.cookies')}
          </button>
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </footer>
    </div>
  );
}
