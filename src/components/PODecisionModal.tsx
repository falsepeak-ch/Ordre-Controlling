import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/ui/Modal';
import { Button } from '~/components/ui/Button';
import { Textarea } from '~/components/ui/Input';
import { useToast } from '~/hooks/useToast';
import { approvePO, rejectPO } from '~/lib/purchaseOrders';
import type { PurchaseOrder } from '~/types';

interface Props {
  open: boolean;
  mode: 'approve' | 'reject';
  po: PurchaseOrder;
  projectId: string;
  approverUid: string;
  onClose: () => void;
  onDecided?: () => void;
}

export function PODecisionModal({
  open,
  mode,
  po,
  projectId,
  approverUid,
  onClose,
  onDecided,
}: Props) {
  const { t } = useTranslation();
  const { push } = useToast();
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setComment('');
  }, [open]);

  async function submit() {
    setBusy(true);
    try {
      if (mode === 'approve') {
        await approvePO(projectId, po, approverUid, comment);
        push({ message: t('poActions.approvedToast'), icon: 'check-circle-fill' });
      } else {
        await rejectPO(projectId, po, approverUid, comment);
        push({ message: t('poActions.rejectedToast'), icon: 'x-circle-fill' });
      }
      onDecided?.();
      onClose();
    } catch {
      push({ message: t('poForm.error'), icon: 'x-circle-fill', tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      size="md"
      title={t(mode === 'approve' ? 'poActions.approveTitle' : 'poActions.rejectTitle', {
        number: po.number,
      })}
      subtitle={t(mode === 'approve' ? 'poActions.approveSubtitle' : 'poActions.rejectSubtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={submit} isLoading={busy}>
            {t(mode === 'approve' ? 'poActions.approveCta' : 'poActions.rejectCta')}
          </Button>
        </>
      }
    >
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder={t('poActions.commentPlaceholder')}
        maxLength={400}
      />
    </Modal>
  );
}
