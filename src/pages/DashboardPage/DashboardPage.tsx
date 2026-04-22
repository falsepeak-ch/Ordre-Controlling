import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Topbar } from '~/components/layout/Topbar';
import { Card } from '~/components/ui/Card';
import { Icon } from '~/components/ui/Icon';
import { Button } from '~/components/ui/Button';
import { RolePill } from '~/components/ui/RolePill';
import { Spinner } from '~/components/ui/Spinner';
import { useCurrentProject } from '~/hooks/useCurrentProject';
import { useProjectData } from '~/hooks/useProjectData';
import { projectMetrics, poTotals } from '~/lib/reconcile';
import { canApprove, canEdit, canManage } from '~/lib/roles';
import { eur, relDate } from '~/lib/format';
import type { IconName } from '~/icons/manifest';
import type { PurchaseOrder } from '~/types';
import '~/theme/page-layout.css';
import './DashboardPage.css';

interface ActivityEntry {
  id: string;
  timestamp: string;
  icon: IconName;
  titleKey: string;
  titleValues: Record<string, string | number>;
  href: string;
}

const ACTIVITY_LIMIT = 5;
const APPROVAL_QUEUE_LIMIT = 5;

export function DashboardPage() {
  const { t } = useTranslation();
  const { project, role } = useCurrentProject();
  const navigate = useNavigate();
  const { suppliers, purchaseOrders, loading } = useProjectData(project.id);

  const metrics = useMemo(
    () => projectMetrics(purchaseOrders, suppliers.length),
    [purchaseOrders, suppliers],
  );

  const activity = useMemo(() => buildActivity(purchaseOrders, project.id), [purchaseOrders, project.id]);
  const myQueue = useMemo(
    () => buildApprovalQueue(purchaseOrders, project.id),
    [purchaseOrders, project.id],
  );
  const showApprovalQueue = canApprove(role);

  const isEmpty = metrics.poCount === 0 && metrics.supplierCount === 0;

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

      <div className="dashboard-page page-container">
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
                {activity.length > 0 ? (
                  <Link to={`/app/p/${project.id}/purchase-orders`} className="dashboard-block-more">
                    {t('dashboard.seeAll')}
                  </Link>
                ) : null}
              </div>
              {activity.length === 0 ? (
                <div className="dashboard-empty-inline">
                  <Icon name="clock-fill" size={18} />
                  <span className="muted">{t('dashboard.activityEmpty')}</span>
                </div>
              ) : (
                <ul className="dashboard-activity">
                  {activity.map((entry) => (
                    <li key={entry.id} className="dashboard-activity-item">
                      <span className="dashboard-activity-icon">
                        <Icon name={entry.icon} size={14} />
                      </span>
                      <div className="dashboard-activity-body">
                        <Link to={entry.href} className="dashboard-activity-text">
                          {t(entry.titleKey, entry.titleValues)}
                        </Link>
                        <span className="muted dashboard-activity-time">
                          {relDate(entry.timestamp)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card size="md">
              <div className="dashboard-block-head">
                <h3 className="display-sm mb-0">{t('dashboard.approvalsTitle')}</h3>
                {showApprovalQueue && myQueue.length > 0 ? (
                  <Link to={`/app/p/${project.id}/approvals`} className="dashboard-block-more">
                    {t('dashboard.seeAll')}
                  </Link>
                ) : null}
              </div>
              {!showApprovalQueue ? (
                <div className="dashboard-empty-inline">
                  <Icon name="shield-fill-check" size={18} />
                  <span className="muted">{t('dashboard.approvalsNotApprover')}</span>
                </div>
              ) : myQueue.length === 0 ? (
                <div className="dashboard-empty-inline">
                  <Icon name="check-circle-fill" size={18} />
                  <span className="muted">{t('dashboard.approvalsAllCaughtUp')}</span>
                </div>
              ) : (
                <ul className="dashboard-queue">
                  {myQueue.map((po) => {
                    const totals = poTotals(po);
                    return (
                      <li key={po.id} className="dashboard-queue-item">
                        <Link to={`/app/p/${project.id}/purchase-orders/${po.id}`} className="dashboard-queue-row">
                          <span className="mono dashboard-queue-num">{po.number}</span>
                          <span className="dashboard-queue-by muted">
                            {po.createdBy}
                          </span>
                          <span className="num dashboard-queue-amount">
                            {eur(totals.committed)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
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
      {note ? <span className="metric-card-note">{note}</span> : null}
      <div className="metric-card-value">{loading ? <Spinner size={18} /> : value}</div>
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
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      leading={<Icon name="person-circle-fill" size={13} />}
      onClick={() => navigate(`/app/p/${projectId}/members`)}
    >
      {t('dashboard.emptyState.inviteMember')}
    </Button>
  );
}

/**
 * Synthesise a recent-activity feed from the PO objects in the store.
 * Each PO contributes up to six events: created, submitted, closed,
 * approved (per approval log entry), rejected, invoice uploaded,
 * invoice paid. We sort by timestamp desc and take the top N.
 */
function buildActivity(pos: PurchaseOrder[], projectId: string): ActivityEntry[] {
  const events: ActivityEntry[] = [];
  for (const po of pos) {
    const href = `/app/p/${projectId}/purchase-orders/${po.id}`;
    if (po.createdAt) {
      events.push({
        id: `${po.id}-created`,
        timestamp: po.createdAt,
        icon: 'plus',
        titleKey: 'dashboard.activity.created',
        titleValues: { number: po.number, name: po.createdBy ?? '' },
        href,
      });
    }
    if (po.submittedAt) {
      events.push({
        id: `${po.id}-submitted`,
        timestamp: po.submittedAt,
        icon: 'upload-fill',
        titleKey: 'dashboard.activity.submitted',
        titleValues: { number: po.number },
        href,
      });
    }
    if (po.closedAt) {
      events.push({
        id: `${po.id}-closed`,
        timestamp: po.closedAt,
        icon: 'check-circle-fill',
        titleKey: 'dashboard.activity.closed',
        titleValues: { number: po.number },
        href,
      });
    }
    for (const ap of po.approvals ?? []) {
      if (!ap.decidedAt) continue;
      events.push({
        id: `${po.id}-ap-${ap.id}`,
        timestamp: ap.decidedAt,
        icon: ap.decision === 'approved' ? 'shield-fill-check' : 'x-circle-fill',
        titleKey:
          ap.decision === 'approved'
            ? 'dashboard.activity.approved'
            : 'dashboard.activity.rejected',
        titleValues: { number: po.number, name: ap.approver ?? '' },
        href,
      });
    }
    for (const inv of po.invoices ?? []) {
      if (inv.uploadedAt) {
        events.push({
          id: `${po.id}-inv-${inv.id}`,
          timestamp: inv.uploadedAt,
          icon: 'file-earmark-text-fill',
          titleKey: 'dashboard.activity.invoice',
          titleValues: { number: po.number, invoice: inv.number ?? '' },
          href,
        });
      }
      if (inv.paidAt) {
        events.push({
          id: `${po.id}-paid-${inv.id}`,
          timestamp: inv.paidAt,
          icon: 'check-circle-fill',
          titleKey: 'dashboard.activity.paid',
          titleValues: { invoice: inv.number ?? '' },
          href,
        });
      }
    }
  }
  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return events.slice(0, ACTIVITY_LIMIT);
}

/**
 * POs that are pending approval and haven't been decided yet. For
 * the owner / approver role, this is the personal queue surfaced on
 * the dashboard. No per-user acted-filter — a cluttered personal
 * queue is less useful than "what still needs someone".
 */
function buildApprovalQueue(pos: PurchaseOrder[], _projectId: string): PurchaseOrder[] {
  return pos
    .filter((po) => po.status === 'pending_approval')
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))
    .slice(0, APPROVAL_QUEUE_LIMIT);
}
