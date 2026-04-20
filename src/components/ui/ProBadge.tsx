import { useTranslation } from 'react-i18next';
import './ProBadge.css';

interface ProBadgeProps {
  variant?: 'pro' | 'free';
  size?: 'sm' | 'md';
}

export function ProBadge({ variant = 'pro', size = 'md' }: ProBadgeProps) {
  const { t } = useTranslation();
  return (
    <span className={['pro-badge', `pro-badge-${variant}`, `pro-badge-${size}`].join(' ')}>
      {variant === 'pro'
        ? t('subscription.proBadge')
        : t('subscription.freeBadge')}
    </span>
  );
}
