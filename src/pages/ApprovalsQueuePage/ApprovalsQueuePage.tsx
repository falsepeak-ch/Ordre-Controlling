import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Topbar } from '~/components/layout/Topbar';
import { Card } from '~/components/ui/Card';
import { Icon } from '~/components/ui/Icon';
import { Button } from '~/components/ui/Button';
import { Pill } from '~/components/ui/Pill';
import { Spinner } from '~/components/ui/Spinner';
import { PODecisionModal } from '~/components/PODecisionModal';
import { useCurrentProject } from '~/hooks/useCurrentProject';
import { useAuth } from '~/hooks/useAuth';
import { useApprovalsQueue, type QueueEntry } from '~/hooks/useApprovalsQueue';
import { useSuppliers } from '~/hooks/useSuppliers';
import { poTotals } from '~/lib/reconcile';
import { eur, formatDate, relDate } from '~/lib/format';
import type { PurchaseOrder } from '~/types';
import './ApprovalsQueuePage.css';

type Tab = 'pending' | 'decided';

export function ApprovalsQueuePage() {
  const { t } = useTranslation();
  const { project, role } = useCurrentProject();
  const { user } = useAuth();
  const { pending, decided, loading } = useApprovalsQueue(project.id, user?.uid);
  const { suppliers } = useSuppliers(project.id);

  const [tab, setTab] = useState<Tab>('pending');
  const [decisionEntry, setDecisionEntry] = useState<{
    entry: QueueEntry;
    mode: 'approve' | 'reject';
  } | null>(null);

  function supplierFor(po: PurchaseOrder) {
    return suppliers.find((s) => s.id === po.supplierId);
  }

  const entries = tab === 'pending' ? pending : decided;

  return (
    <>
      <Topbar
        title={t('approvalsQueue.pageTitle')}
        subtitle={
          <span className="muted" style={{ fontSize: 13 }}>
            {pending.length === 1
              ? t('approvalsQueue.pendingOne')
              : t('approvalsQueue.pendingOther', { count: pending.length })}
          </span>
        }
      />

      <div className="approvals-page">
        <section className="approvals-hero reveal">
          <span className="eyebrow">{t('nav.approvals')}</span>
          <h1 className="display-xl">{t('approvalsQueue.pageTitle')}</h1>
          <p className="approvals-hero-sub">
            {t('approvalsQueue.heroSubtitle', { project: project.name })}
          </p>
        </section>

        <section className="approvals-tabs reveal reveal-d1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'pending'}
            className={['approvals-tab', tab === 'pending' ? 'is-active' : null]
              .filter(Boolean).join(' ')}
            onClick={() => setTab('pending')}
          >
            {t('approvalsQueue.filter.waiting')}
            <span className="approvals-tab-count">{pending.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'decided'}
            className={['approvals-tab', tab === 'decided' ? 'is-active' : null]
              .filter(Boolean).join(' ')}
            onClick={() => setTab('decided')}
          >
            {t('approvalsQueue.filter.decided')}
            <span className="approvals-tab-count">{decided.length}</span>
          </button>
        </section>

        {loading ? (
          <div className="approvals-loader"><Spinner size={22} /></div>
        ) : entries.length === 0 ? (
          <Card size="lg" tone="muted" className="approvals-empty">
            {tab === 'pending' ? (
              <>
                <Icon name="check-circle-fill" size={24} />
                <h3 className="display-md">{t('approvalsQueue.allCaughtUpTitle')}</h3>
                <p className="muted">{t('approvalsQueue.allCaughtUpBody')}</p>
              </>
            ) : (
              <>
                <Icon name="clock-fill" size={24} />
                <p className="muted">{t('approvalsQueue.noDecisions')}</p>
              </>
            )}
          </Card>
        ) : (
          <section className="approvals-list reveal reveal-d2">
            {entries.map((entry) => {
              const s = supplierFor(entry.po);
              const totals = poTotals(entry.po);
              const myApprovals = entry.approvals.filter((a) => a.approverUid === user?.uid);
              const lastMyApproval = myApprovals.at(-1) ?? null;
              return (
                <article key={entry.po.id} className="approvals-card">
                  <div className="approvals-card-head">
                    <Link
                      to={`/app/p/${project.id}/purchase-orders/${entry.po.id}`}
                      className="approvals-card-number mono"
                    >
                      {entry.po.number}
                    </Link>
                    <Pill status={entry.po.status}>
                      {t(`pos.statusLabel.${entry.po.status}`)}
                    </Pill>
                  </div>

                  <div className="approvals-card-supplier">
                    <div className="supplier-monogram approvals-card-monogram">
                      {s?.monogram ?? '··'}
                    </div>
                    <div className="approvals-card-supplier-text">
                      <span className="approvals-card-supplier-name">
                        {s?.tradeName ?? entry.po.supplierId}
                      </span>
                      <span className="approvals-card-supplier-meta muted">
                        {entry.po.lines.length === 1
                          ? t('pos.table.linesOne')
                          : t('pos.table.linesOther', { count: entry.po.lines.length })}{' '}
                        · {t('approvalsQueue.requestedBy', { name: entry.po.createdBy })}
                      </span>
                    </div>
                    <div className="approvals-card-amount num">{eur(totals.committed)}</div>
                  </div>

                  {entry.po.notes ? (
                    <p className="approvals-card-notes muted">{entry.po.notes}</p>
                  ) : null}

                  {tab === 'pending' ? (
                    <div className="approvals-card-actions">
                      <div className="approvals-card-actions-left">
                        <span className="approvals-card-time muted">
                          {relDate(entry.po.submittedAt ?? entry.po.createdAt)}
                        </span>
                        {entry.iHaveActed ? (
                          <span className="approvals-card-acted muted">
                            <Icon name="check-circle-fill" size={12} />
                            {t('approvalsQueue.youActed')}
                          </span>
                        ) : null}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDecisionEntry({ entry, mode: 'reject' })}
                          leading={<Icon name="x-circle-fill" size={13} />}
                        >
                          {t('poActions.rejectCta')}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setDecisionEntry({ entry, mode: 'approve' })}
                          leading={<Icon name="check-circle-fill" size={13} />}
                        >
                          {t('poActions.approveCta')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="approvals-card-decision">
                      <span style={{ fontSize: 13, color: 'var(--fg-deep)' }}>
                        {lastMyApproval?.decision === 'approved'
                          ? t('poActions.approveCta')
                          : t('poActions.rejectCta')}{' '}
                        ·{' '}
                        <span className="muted">
                          {formatDate(lastMyApproval?.decidedAt ?? null)}
                          {lastMyApproval?.amount
                            ? ` · ${eur(lastMyApproval.amount)}`
                            : ''}
                        </span>
                      </span>
                      {lastMyApproval?.comment ? (
                        <span className="muted" style={{ fontSize: 12.5, marginLeft: 'auto', maxWidth: '55%', textAlign: 'right' }}>
                          &ldquo;{lastMyApproval.comment}&rdquo;
                        </span>
                      ) : null}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>

      {decisionEntry && user ? (
        <PODecisionModal
          open={true}
          mode={decisionEntry.mode}
          po={decisionEntry.entry.po}
          projectId={project.id}
          approverUid={user.uid}
          approverDisplayName={user.displayName ?? user.email ?? 'You'}
          approverRole={role}
          onClose={() => setDecisionEntry(null)}
          onDecided={() => setDecisionEntry(null)}
        />
      ) : null}
    </>
  );
}
