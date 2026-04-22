import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '~/components/ui/Logo';
import { Avatar } from '~/components/ui/Avatar';
import { Icon } from '~/components/ui/Icon';
import { Button } from '~/components/ui/Button';
import { ProBadge } from '~/components/ui/ProBadge';
import { ProjectSwitcher } from './ProjectSwitcher';
import { UpgradeModal } from '~/components/UpgradeModal';
import { useAuth } from '~/hooks/useAuth';
import { useCurrentProject } from '~/hooks/useCurrentProject';
import { useSubscription } from '~/hooks/useSubscription';
import { useToast } from '~/hooks/useToast';
import type { IconName } from '~/icons/manifest';
import './Sidebar.css';

interface Item {
  key: string;
  labelKey: string;
  to: string;
  icon: IconName;
  disabled?: boolean;
  ownerOnly?: boolean;
}

export function Sidebar() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { project, role } = useCurrentProject();
  const { push } = useToast();
  const { isPro } = useSubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const base = `/app/p/${project.id}`;
  const primary: Item[] = [
    { key: 'dashboard', labelKey: 'nav.dashboard', to: base, icon: 'grid-fill' },
    { key: 'orders', labelKey: 'nav.purchaseOrders', to: `${base}/purchase-orders`, icon: 'receipt-fill' },
    { key: 'approvals', labelKey: 'nav.approvals', to: `${base}/approvals`, icon: 'shield-fill-check' },
    { key: 'suppliers', labelKey: 'nav.suppliers', to: `${base}/suppliers`, icon: 'building-fill' },
    { key: 'categories', labelKey: 'nav.categories', to: `${base}/categories`, icon: 'clipboard-fill' },
  ];

  const secondary: Item[] = [
    { key: 'members', labelKey: 'nav.members', to: `${base}/members`, icon: 'person-circle-fill' },
    { key: 'invoices', labelKey: 'nav.invoices', to: `${base}/invoices`, icon: 'file-earmark-text-fill' },
    { key: 'reports', labelKey: 'nav.reports', to: `${base}/reports`, icon: 'bar-chart-fill' },
    { key: 'settings', labelKey: 'nav.settings', to: `${base}/settings`, icon: 'gear-fill', ownerOnly: true },
  ];

  async function handleSignOut() {
    await signOut();
    push({ message: t('nav.logout'), icon: 'box-arrow-right-fill' });
  }

  function renderItem(it: Item) {
    const blocked = it.disabled || (it.ownerOnly && role !== 'owner');
    return (
      <li key={it.key}>
        <NavLink
          to={it.to}
          end={it.to === base}
          className={({ isActive }) =>
            ['sidebar-item', isActive ? 'is-active' : null, blocked ? 'is-disabled' : null]
              .filter(Boolean)
              .join(' ')
          }
          onClick={(e) => {
            if (blocked) {
              e.preventDefault();
              push({ message: t('app.stubTitle'), icon: 'clock-fill' });
            }
          }}
        >
          <span className="sidebar-item-icon">
            <Icon name={it.icon} size={15} />
          </span>
          <span className="sidebar-item-label">{t(it.labelKey)}</span>
        </NavLink>
      </li>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Logo variant="wordmark" size="md" />
      </div>

      <ProjectSwitcher current={project} />

      <nav className="sidebar-nav">
        <ul>{primary.map(renderItem)}</ul>
        <div className="sidebar-section-label">Finance</div>
        <ul>{secondary.map(renderItem)}</ul>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <Avatar name={user?.displayName ?? undefined} photoURL={user?.photoURL} size="md" />
          <div className="sidebar-user-meta">
            <span className="sidebar-user-name">
              {user?.displayName ?? '—'}{' '}
              <ProBadge variant={isPro ? 'pro' : 'free'} size="sm" />
            </span>
            <span className="sidebar-user-email">{user?.email ?? ''}</span>
          </div>
        </div>

        {!isPro && (
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={() => setUpgradeOpen(true)}
            leading={<Icon name="shield-fill-check" size={13} />}
          >
            {t('subscription.upgrade')}
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          fullWidth
          leading={<Icon name="box-arrow-right-fill" size={13} />}
        >
          {t('nav.logout')}
        </Button>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </aside>
  );
}
