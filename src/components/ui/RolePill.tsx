import { useTranslation } from 'react-i18next';
import type { Role } from '~/types';
import './RolePill.css';

interface RolePillProps {
  role: Role;
  size?: 'sm' | 'md';
}

export function RolePill({ role, size = 'md' }: RolePillProps) {
  const { t } = useTranslation();
  return (
    <span className={['role-pill', `role-pill-${role}`, `role-pill-${size}`].join(' ')}>
      <span className="role-pill-glyph" aria-hidden="true" />
      {t(`projects.roles.${role}`)}
    </span>
  );
}
