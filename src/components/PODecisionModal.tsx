import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/ui/Modal';
import { Button } from '~/components/ui/Button';
import { Field, Textarea } from '~/components/ui/Input';
import { useToast } from '~/hooks/useToast';
import { approvePO, rejectPO } from '~/lib/purchaseOrders';
import { poTotals } from '~/lib/reconcile';
import { eur } from '~/lib/format';
import type { PurchaseOrder, Role } from '~/types';
import './PODecisionModal.css';

interface Props {
  open: boolean;
  mode: 'approve' | 'reject';
  po: PurchaseOrder;
  projectId: string;
  approverUid: string;
  approverDisplayName: string;
  approverRole: Role;
  onClose: () => void;
  onDecided?: () => void;
}

export function PODecisionModal({
  open,
  mode,
  po,
  projectId,
  approverUid,
  approverDisplayName,
  approverRole,
  onClose,
  onDecided,
}: Props) {
  const { t } = useTranslation();
  const { push } = useToast();
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setComment('');
  }, [open]);

  const totals = useMemo(() => poTotals(po), [po]);
  const remaining = Math.max(0, totals.committed - totals.invoiced);

  async function submitApprove() {
    setBusy(true);
    try {
      await approvePO(projectId, po, {
        approverUid,
        approverDisplayName,
        approverRoleLabel: capitalise(approverRole),
        comment,
      });
      push({ message: t('poActions.approvedToast'), icon: 'check-circle-fill' });
      onDecided?.();
      onClose();
    } catch (err) {
      console.warn('[poDecision] approve failed', err);
      push({ message: t('poForm.error'), icon: 'x-circle-fill', tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function submitReject() {
    setBusy(true);
    try {
      await rejectPO(
        projectId,
        po,
        approverUid,
        approverDisplayName,
        capitalise(approverRole),
        comment,
      );
      push({ message: t('poActions.rejectedToast'), icon: 'x-circle-fill' });
      onDecided?.();
      onClose();
    } catch {
      push({ message: t('poForm.error'), icon: 'x-circle-fill', tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const isApprove = mode === 'approve';

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      size="md"
      title={t(isApprove ? 'poDecision.approveTitle' : 'poActions.rejectTitle', {
        number: po.number,
      })}
      subtitle={t(isApprove ? 'poDecision.approveSubtitle' : 'poActions.rejectSubtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={isApprove ? submitApprove : submitReject}
            isLoading={busy}
          >
            {t(isApprove ? 'poDecision.approveCta' : 'poActions.rejectCta')}
          </Button>
        </>
      }
    >
      {isApprove ? (
        <div className="po-decision">
          <section className="po-decision-summary">
            <div className="po-decision-summary-row">
              <span className="po-decision-summary-label">{t('poDecision.committed')}</span>
              <span className="num">{eur(totals.committed)}</span>
            </div>
            <div className="po-decision-summary-row">
              <span className="po-decision-summary-label">{t('poDecision.alreadyInvoiced')}</span>
              <span className="num">{eur(totals.invoiced)}</span>
            </div>
            <div className="po-decision-summary-row po-decision-summary-remaining">
              <span className="po-decision-summary-label">{t('poDecision.remainingAfter')}</span>
              <span className="num">{eur(remaining)}</span>
            </div>
          </section>

          <Field label={t('poActions.commentPlaceholder')}>
            <Textarea
              autoFocus
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={400}
            />
          </Field>
        </div>
      ) : (
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={t('poActions.commentPlaceholder')}
          maxLength={400}
        />
      )}
    </Modal>
  );
}

function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
