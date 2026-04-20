import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/Button';
import { Logo } from '~/components/ui/Logo';
import { GoogleMark } from '~/components/ui/GoogleMark';
import { Spinner } from '~/components/ui/Spinner';
import { useAuth } from '~/hooks/useAuth';
import '../AuthLayout.css';

export function SignupPage() {
  const { t } = useTranslation();
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) return <Navigate to="/app" replace />;

  async function onGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      navigate('/app', { replace: true });
    } catch {
      setError(t('signup.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <aside className="auth-copy">
        <Logo size="md" />
        <h1 className="auth-title">{t('signup.title')}</h1>
        <p className="auth-sub">{t('signup.subtitle')}</p>
      </aside>

      <div className="auth-card">
        <div className="auth-card-head">
          <h2 className="auth-card-headline">{t('nav.signup')}</h2>
        </div>

        {error ? <div className="auth-error" role="alert">{error}</div> : null}

        <Button
          variant="primary"
          size="lg"
          onClick={onGoogle}
          fullWidth
          isLoading={busy}
          leading={busy ? <Spinner size={14} /> : <span className="auth-google-glyph"><GoogleMark size={14} /></span>}
          className="auth-google-btn"
        >
          {busy ? t('common.signingIn') : t('common.continueWithGoogle')}
        </Button>

        <p className="auth-terms">{t('signup.terms')}</p>

        <div className="auth-footer-row">
          <span>{t('signup.haveAccount')}</span>
          <Link to="/login">{t('signup.doLogin')}</Link>
        </div>
      </div>
    </div>
  );
}
