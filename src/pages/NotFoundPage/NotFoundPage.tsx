import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '~/components/ui/Logo';
import { ButtonAnchor } from '~/components/ui/Button';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--s-8)',
        background: 'var(--surface)',
      }}
    >
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <Logo variant="stacked" size="lg" />
        <h1 className="display-xl" style={{ margin: '16px 0 4px' }}>{t('notFound.title')}</h1>
        <p className="muted" style={{ fontSize: 15 }}>{t('notFound.body')}</p>
        <ButtonAnchor href="/" variant="primary" size="md">
          {t('notFound.cta')}
        </ButtonAnchor>
        <Link to="/login" className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          {t('nav.login')}
        </Link>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          {t('notFound.contact')}{' '}
          <a href="mailto:help@ordrecontrolling.com" style={{ color: 'inherit' }}>
            help@ordrecontrolling.com
          </a>
        </p>
      </div>
    </div>
  );
}
