import { Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '~/components/ui/Logo';
import { ThemeToggle } from '~/components/ui/ThemeToggle';
import { LocaleToggle } from '~/components/ui/LocaleToggle';
import { ButtonAnchor } from '~/components/ui/Button';
import './PublicLayout.css';

export function PublicLayout() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <div className="public-shell">
      <header className="public-nav">
        <Link to="/" className="public-nav-brand" aria-label="Ordre">
          <Logo size="md" />
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
          <Logo size="sm" />
          <span className="public-footer-copy">{t('landing.footerCopy', { year })}</span>
          <span className="public-footer-note">{t('landing.footerNote')}</span>
          <div className="public-footer-spacer" />
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </footer>
    </div>
  );
}
