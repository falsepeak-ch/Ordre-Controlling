import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/ui/Modal';
import { AttachmentsList, type AttachmentItem } from '~/components/AttachmentsList';
import { useSupplierDocs } from '~/hooks/useSupplierDocs';
import { useAuth } from '~/hooks/useAuth';
import { useToast } from '~/hooks/useToast';
import { useConfirm } from '~/hooks/useConfirm';
import { addSupplierDoc, deleteSupplierDoc } from '~/lib/supplierDocs';
import { StorageQuotaExceededError } from '~/lib/attachments';
import type { Supplier } from '~/types';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  supplier: Supplier;
  canEdit: boolean;
}

export function SupplierDocsModal({ open, onClose, projectId, supplier, canEdit }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { push } = useToast();
  const confirm = useConfirm();
  const { docs } = useSupplierDocs(projectId, supplier.id);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      await addSupplierDoc(projectId, supplier.id, {
        file,
        kind: null,
        uploadedBy: user?.displayName ?? user?.email ?? 'You',
      });
      push({ message: t('attachments.addedToast'), icon: 'check-circle-fill' });
    } catch (err) {
      console.warn('[supplierDocs] upload failed', err);
      if ((err as { code?: string }).code === 'storage/unauthorized') {
        console.error('[supplierDocs] storage/unauthorized — check Storage rules deployment and project member role');
      }
      const message = err instanceof StorageQuotaExceededError
        ? t('attachments.quotaExceeded')
        : t('attachments.uploadError');
      push({ message, icon: 'x-circle-fill', tone: 'error' });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(item: AttachmentItem) {
    if (!item.id) return;
    const ok = await confirm({
      title: t('attachments.deleteConfirm'),
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    try {
      await deleteSupplierDoc(projectId, supplier.id, {
        id: item.id,
        storagePath: item.storagePath,
      });
      push({ message: t('attachments.deletedToast'), icon: 'check-circle-fill' });
    } catch {
      push({ message: t('attachments.uploadError'), icon: 'x-circle-fill', tone: 'error' });
    }
  }

  // Merge live docs with legacy seed-only docs (no `id` + no `storagePath`
  // means they're seed-only — show them but hide delete/replace).
  const legacy = (supplier.docs ?? []).filter((d) => !d.id);
  const allItems: AttachmentItem[] = [...docs, ...legacy];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={t('supplierDocs.modalTitle', { supplier: supplier.tradeName || supplier.legalName })}
      subtitle={t('supplierDocs.modalSubtitle')}
    >
      <AttachmentsList
        items={allItems}
        canEdit={canEdit}
        uploading={uploading}
        onUpload={handleUpload}
        onDelete={handleDelete}
      />
    </Modal>
  );
}
