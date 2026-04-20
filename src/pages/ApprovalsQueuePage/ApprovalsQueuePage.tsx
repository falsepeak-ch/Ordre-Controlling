import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Topbar } from '~/components/layout/Topbar';
import { Card } from '~/components/ui/Card';
import { Icon } from '~/components/ui/Icon';
import { Button } from '~/components/ui/Button';
import { Pill } from '~/components/ui/Pill';
import { Avatar } from '~/components/ui/Avatar';
import { Spinner } from '~/components/ui/Spinner';
import { PODecisionModal } from '~/components/PODecisionModal';
import { useCurrentProject } from '~/hooks/useCurrentProject';
import { useAuth } from '~/hooks/useAuth';
import { useApprovalsQueue, type QueueEntry } from '~/hooks/useApprovalsQueue';
import { useSuppliers } from '~/hooks/useSuppliers';
import { poTotals } from '~/lib/reconcile';
import { eur, eurFull, formatDate, relDate } from '~/lib/format';
import type { PurchaseOrder } from '~/types';
import './ApprovalsQueuePage.css';

type Tab = 'waiting' | 'decided';

export function ApprovalsQueuePage() {
  const { t } = useTranslation();
  const { project } = useCurrentProject();
  const { user } = useAuth();
  const { waitingForMe, decidedByMe, loading } = useApprovalsQueue(project.id, user?.uid);
  const { suppliers } = useSuppliers(project.id);

  const [tab, setTab] = useState<Tab>('waiting');
  const [decisionEntry, setDecisionEntry] = useState<{
    entry: QueueEntry;
    mode: 'approve' | 'reject';
  } | null>(null);

  function supplierFor(po: PurchaseOrder) {
    return suppliers.find((s) => s.id === po.supplierId);
  }

  const entries = tab === 'waiting' ? waitingForMe : decidedByMe;

  return (
    <>
      <Topbar
        title={t('approvalsQueue.pageTitle')}
        subtitle={
          <span className="muted" style={{ fontSize: 13 }}>
            {waitingForMe.length === 1
              ? t('approvalsQueue.pendingOne')
              : t('approvalsQueue.pendingOther', { count: waitingForMe.length })}
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
            aria-selected={tab === 'waiting'}
            className={['approvals-tab', tab === 'waiting' ? 'is-active' : null]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setTab('waiting')}
          >
            {t('approvalsQueue.filter.waiting')}
            <span className="approvals-tab-count">{waitingForMe.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'decided'}
            className={['approvals-tab', tab === 'decided' ? 'is-active' : null]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setTab('decided')}
          >
            {t('approvalsQueue.filter.decided')}
            <span className="approvals-tab-count">{decidedByMe.length}</span>
          </button>
        </section>

        {loading ? (
          <div className="approvals-loader">
            <Spinner size={22} />
          </div>
        ) : entries.length === 0 ? (
          <Card size="lg" tone="muted" className="approvals-empty">
            {tab === 'waiting' ? (
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
              const pendingPeers = entry.approvals.filter(
                (a) => a.decision === 'pending' && a.approverUid !== user?.uid,
              );
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

                  {tab === 'waiting' ? (
                    <>
                      {pendingPeers.length > 0 ? (
                        <div className="approvals-card-peers">
                          <span className="muted" style={{ fontSize: 11.5 }}>
                            {t('approvalsQueue.waitingFor', {
                              list: pendingPeers.map((p) => p.approver).join(', '),
                            })}
                          </span>
                        </div>
                      ) : null}

                      <div className="approvals-card-actions">
                        <span className="approvals-card-time muted">
                          {relDate(entry.po.submittedAt ?? entry.po.createdAt)}
                        </span>
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
                    </>
                  ) : (
                    <div className="approvals-card-decision">
                      <Avatar
                        name={entry.myApproval?.approver ?? user?.displayName ?? undefined}
                        size="sm"
                      />
                      <span style={{ fontSize: 13, color: 'var(--fg-deep)' }}>
                        {entry.myDecision === 'approved'
                          ? t('poActions.approveCta')
                          : t('poActions.rejectCta')}{' '}
                        ·{' '}
                        <span className="muted">
                          {formatDate(entry.myApproval?.decidedAt ?? null)} ·{' '}
                          {eurFull(totals.committed)}
                        </span>
                      </span>
                      {entry.myApproval?.comment ? (
                        <span
                          className="muted"
                          style={{ fontSize: 12.5, marginLeft: 'auto', maxWidth: '55%', textAlign: 'right' }}
                        >
                          “{entry.myApproval.comment}”
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
          onClose={() => setDecisionEntry(null)}
        />
      ) : null}
    </>
  );
}
