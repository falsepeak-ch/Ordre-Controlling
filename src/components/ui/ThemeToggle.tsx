import { useTranslation } from 'react-i18next';
import { useTheme } from '~/hooks/useTheme';
import { Icon } from './Icon';
import './ThemeToggle.css';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={isDark ? t('common.lightMode') : t('common.darkMode')}
      title={isDark ? t('common.lightMode') : t('common.darkMode')}
    >
      <span className="theme-toggle-icon">
        <Icon name={isDark ? 'sun-fill' : 'moon-fill'} size={15} />
      </span>
    </button>
  );
}
