import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '~/lib/firebase';
import type { POAttachment } from '~/types';

export interface UsePOAttachmentsResult {
  attachments: POAttachment[];
  loading: boolean;
}

export function usePOAttachments(
  projectId: string | undefined,
  poId: string | undefined,
): UsePOAttachmentsResult {
  const [attachments, setAttachments] = useState<POAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !poId) {
      setAttachments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'projects', projectId, 'purchaseOrders', poId, 'attachments'),
      orderBy('uploadedAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAttachments(snap.docs.map((d) => ({ ...(d.data() as POAttachment), id: d.id })));
        setLoading(false);
      },
      (err) => {
        console.warn('[poAttachments] snapshot error', err);
        setLoading(false);
      },
    );
    return unsub;
  }, [projectId, poId]);

  return { attachments, loading };
}
