import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '~/lib/firebase';
import type { Category } from '~/types';

export interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
}

export function useCategories(projectId: string | undefined): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setCategories([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'projects', projectId, 'categories'),
      orderBy('code'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCategories(snap.docs.map((d) => ({ ...(d.data() as Category), id: d.id })));
        setLoading(false);
      },
      (err) => {
        console.warn('[categories] snapshot error', err);
        setLoading(false);
      },
    );
    return unsub;
  }, [projectId]);

  return { categories, loading };
}
