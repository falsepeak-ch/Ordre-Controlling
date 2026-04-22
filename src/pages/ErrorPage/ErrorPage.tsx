import { isRouteErrorResponse, Link, useNavigate, useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '~/components/ui/Logo';
import { Button, ButtonAnchor } from '~/components/ui/Button';

export function ErrorPage() {
  const error = useRouteError();
  const { t } = useTranslation();
  const navigate = useNavigate();

  let title = t('errorPage.title');
  let body = t('errorPage.body');
  let detail: string | undefined;

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    body = typeof error.data === 'string' ? error.data : t('errorPage.body');
  } else if (error instanceof Error) {
    detail = error.message;
  }

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
      <div
        style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          alignItems: 'center',
          maxWidth: 440,
        }}
      >
        <Logo variant="stacked" size="lg" />
        <h1 className="display-xl" style={{ margin: '16px 0 4px' }}>{title}</h1>
        <p className="muted" style={{ fontSize: 15 }}>{body}</p>
        {detail ? (
          <pre
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              background: 'var(--surface-muted)',
              color: 'var(--fg-muted)',
              padding: '10px 14px',
              borderRadius: 'var(--r-10)',
              boxShadow: 'inset 0 0 0 1px var(--ring-border)',
              maxWidth: '100%',
              overflow: 'auto',
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {detail}
          </pre>
        ) : null}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Button variant="ghost" size="md" onClick={() => navigate(-1)}>
            {t('errorPage.back')}
          </Button>
          <ButtonAnchor href="/" variant="primary" size="md">
            {t('errorPage.home')}
          </ButtonAnchor>
        </div>
        <Link to="/app" className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          {t('errorPage.projects')}
        </Link>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          {t('errorPage.contact')}{' '}
          <a href="mailto:help@ordrecontrolling.com" style={{ color: 'inherit' }}>
            help@ordrecontrolling.com
          </a>
        </p>
      </div>
    </div>
  );
}
