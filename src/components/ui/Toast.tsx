import { useToast } from '~/hooks/useToast';
import { Icon } from './Icon';
import './Toast.css';

export function ToastStack() {
  const { toasts, dismiss } = useToast();
  if (!toasts.length) return null;
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={['toast', t.tone === 'error' ? 'toast-error' : null].filter(Boolean).join(' ')}
          role="status"
        >
          <span className="toast-icon">
            <Icon name={t.icon ?? 'check-circle-fill'} size={16} />
          </span>
          <span className="toast-message">{t.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
          >
            <Icon name="x" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
