import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Topbar } from '~/components/layout/Topbar';
import { Card } from '~/components/ui/Card';
import { Icon } from '~/components/ui/Icon';
import { Button } from '~/components/ui/Button';
import { RolePill } from '~/components/ui/RolePill';
import { Spinner } from '~/components/ui/Spinner';
import { useCurrentProject } from '~/hooks/useCurrentProject';
import { useProjectData } from '~/hooks/useProjectData';
import { useAuth } from '~/hooks/useAuth';
import { projectMetrics } from '~/lib/reconcile';
import { canEdit, canManage } from '~/lib/roles';
import { eur } from '~/lib/format';
import type { IconName } from '~/icons/manifest';
import './DashboardPage.css';

export function DashboardPage() {
  const { t } = useTranslation();
  const { project, role } = useCurrentProject();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { suppliers, purchaseOrders, loading } = useProjectData(project.id);

  const metrics = useMemo(
    () => projectMetrics(purchaseOrders, suppliers.length),
    [purchaseOrders, suppliers],
  );

  const isEmpty = metrics.poCount === 0 && metrics.supplierCount === 0;
  const firstName = (user?.displayName ?? '').split(' ')[0] ?? '';

  const goSuppliers = () => navigate(`/app/p/${project.id}/suppliers`);
  const goPOs = () => navigate(`/app/p/${project.id}/purchase-orders`);

  return (
    <>
      <Topbar
        title={t('nav.dashboard')}
        subtitle={
          <span className="dashboard-subtitle">
            <span>{project.name}</span>
            <RolePill role={role} size="sm" />
          </span>
        }
        actions={
          canEdit(role) ? (
            <Button
              variant="primary"
              size="sm"
              leading={<Icon name="plus" size={13} />}
              onClick={goPOs}
            >
              {t('dashboard.emptyState.newPO')}
            </Button>
          ) : null
        }
      />

      <div className="dashboard-page">
        <section className="dashboard-hero reveal">
          <span className="eyebrow">{t('nav.dashboard')}</span>
          <h1 className="display-xl">
            {firstName
              ? t('dashboard.welcome', { name: firstName })
              : t('dashboard.welcomeAnonymous')}
          </h1>
          <p className="dashboard-hero-sub">{t('dashboard.subtitle', { project: project.name })}</p>
        </section>

        <section className="dashboard-metrics reveal reveal-d1">
          <MetricCard
            label={t('dashboard.metricCommitted')}
            value={isEmpty ? '—' : eur(metrics.committed)}
            icon="receipt-fill"
            note={isEmpty ? t('dashboard.emptyMetricNote') : null}
            loading={loading}
          />
          <MetricCard
            label={t('dashboard.metricInvoiced')}
            value={isEmpty ? '—' : eur(metrics.invoiced)}
            icon="file-earmark-text-fill"
            note={
              isEmpty
                ? t('dashboard.emptyMetricNote')
                : `${Math.round((metrics.invoiced / Math.max(1, metrics.committed)) * 100)}%`
            }
            loading={loading}
          />
          <MetricCard
            label={t('dashboard.metricRemaining')}
            value={isEmpty ? '—' : eur(metrics.remaining)}
            icon="check-circle-fill"
            note={isEmpty ? t('dashboard.emptyMetricNote') : null}
            loading={loading}
          />
          <MetricCard
            label={t('dashboard.metricPending')}
            value={isEmpty ? '—' : String(metrics.pendingApprovals)}
            icon="shield-fill-check"
            note={isEmpty ? t('dashboard.emptyMetricNote') : null}
            loading={loading}
          />
        </section>

        <section className="dashboard-secondary reveal reveal-d2">
          <SmallCard
            label={t('dashboard.metricSuppliers')}
            value={metrics.supplierCount}
            icon="building-fill"
          />
          <SmallCard
            label={t('dashboard.metricPOs')}
            value={metrics.poCount}
            icon="receipt-fill"
          />
          <SmallCard
            label={t('nav.members')}
            value={Object.keys(project.members).length}
            icon="person-circle-fill"
          />
        </section>

        {isEmpty ? (
          <EmptyPanel
            canEdit={canEdit(role)}
            canManage={canManage(role)}
            onAddSupplier={goSuppliers}
            onNewPO={goPOs}
            projectId={project.id}
          />
        ) : (
          <section className="dashboard-split reveal reveal-d3">
            <Card size="md">
              <div className="dashboard-block-head">
                <h3 className="display-sm mb-0">{t('dashboard.recentActivityTitle')}</h3>
              </div>
              <div className="dashboard-empty-inline">
                <Icon name="clock-fill" size={18} />
                <span className="muted">{t('dashboard.stubNotice')}</span>
              </div>
            </Card>

            <Card size="md">
              <div className="dashboard-block-head">
                <h3 className="display-sm mb-0">{t('dashboard.approvalsTitle')}</h3>
              </div>
              <div className="dashboard-empty-inline">
                <Icon name="check-circle-fill" size={18} />
                <span className="muted">{t('dashboard.approvalsEmpty')}</span>
              </div>
            </Card>
          </section>
        )}
      </div>
    </>
  );
}

function MetricCard({
  label,
  value,
  icon,
  note,
  loading,
}: {
  label: string;
  value: string;
  icon: IconName;
  note: string | null;
  loading: boolean;
}) {
  return (
    <article className="metric-card">
      <header className="metric-card-head">
        <span className="eyebrow">{label}</span>
        <span className="metric-card-icon">
          <Icon name={icon} size={14} />
        </span>
      </header>
      <div className="metric-card-value">{loading ? <Spinner size={18} /> : value}</div>
      {note ? <span className="metric-card-note">{note}</span> : null}
    </article>
  );
}

function SmallCard({ label, value, icon }: { label: string; value: number; icon: IconName }) {
  return (
    <article className="small-metric">
      <span className="small-metric-icon">
        <Icon name={icon} size={14} />
      </span>
      <div>
        <span className="small-metric-value num">{value}</span>
        <span className="small-metric-label">{label}</span>
      </div>
    </article>
  );
}

function EmptyPanel({
  canEdit: can,
  canManage: manage,
  onAddSupplier,
  onNewPO,
  projectId,
}: {
  canEdit: boolean;
  canManage: boolean;
  onAddSupplier: () => void;
  onNewPO: () => void;
  projectId: string;
}) {
  const { t } = useTranslation();
  return (
    <section className="dashboard-empty reveal reveal-d3">
      <div className="dashboard-empty-inner">
        <h2 className="display-md">{t('dashboard.emptyState.title')}</h2>
        <p>{t('dashboard.emptyState.body')}</p>
        <div className="dashboard-empty-ctas">
          <Button
            variant="primary"
            leading={<Icon name="plus" size={13} />}
            onClick={onNewPO}
            disabled={!can}
          >
            {t('dashboard.emptyState.newPO')}
          </Button>
          <Button
            variant="ghost"
            leading={<Icon name="building-fill" size={13} />}
            onClick={onAddSupplier}
            disabled={!can}
          >
            {t('dashboard.emptyState.addSupplier')}
          </Button>
          {manage ? (
            <InviteButton projectId={projectId} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function InviteButton({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  return (
    <Button
      variant="ghost"
      leading={<Icon name="person-circle-fill" size={13} />}
      onClick={() => {
        window.location.href = `/app/p/${projectId}/members`;
      }}
    >
      {t('dashboard.emptyState.inviteMember')}
    </Button>
  );
}
