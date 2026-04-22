import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/Button';
import { GoogleMark } from '~/components/ui/GoogleMark';
import { Spinner } from '~/components/ui/Spinner';
import { useAuth } from '~/hooks/useAuth';
import '../AuthLayout.css';

export function LoginPage() {
  const { t } = useTranslation();
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/app';
    return <Navigate to={from} replace />;
  }

  async function onGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      navigate('/app', { replace: true });
    } catch {
      setError(t('login.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <aside className="auth-copy">
        <p className="auth-eyebrow">{t('brand.tagline')}</p>
        <h1 className="auth-title">{t('login.title')}</h1>
        <p className="auth-sub">{t('login.subtitle')}</p>
        <ul className="auth-bullets">
          <li>{t('auth.bullet1')}</li>
          <li>{t('auth.bullet2')}</li>
          <li>{t('auth.bullet3')}</li>
        </ul>
        <a
          className="auth-photo-credit"
          href="https://www.pexels.com/photo/37178298/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Photo by Fidan Nazim qizi / Pexels
        </a>
      </aside>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-head">
            <h2 className="auth-card-headline">{t('nav.login')}</h2>
          </div>

          {error ? <div className="auth-error" role="alert">{error}</div> : null}

          <Button
            variant="ghost"
            size="lg"
            onClick={onGoogle}
            fullWidth
            isLoading={busy}
            leading={busy ? <Spinner size={14} /> : <span className="auth-google-glyph"><GoogleMark size={14} /></span>}
            className="auth-google-btn"
          >
            {busy ? t('common.signingIn') : t('common.continueWithGoogle')}
          </Button>

          <div className="auth-footer-row">
            <span>{t('login.noAccount')}</span>
            <Link to="/signup">{t('login.createAccount')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
