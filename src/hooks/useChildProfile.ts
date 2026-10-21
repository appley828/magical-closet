import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { FigureImage } from '../lib/imageUtils';

/** 小孩全身照（去背後的 data URL），搭配畫布用來取代人台 */
const PROFILE_DOC = ['settings', 'childProfile'] as const;

export function useChildProfile() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [neckRatio, setNeckRatio] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    const unsubscribe = onSnapshot(
      doc(db, ...PROFILE_DOC),
      (snapshot) => {
        const data = snapshot.data();
        setPhotoUrl((data?.photoUrl as string | undefined) ?? null);
        setNeckRatio(data?.neckRatio as number | undefined);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching child profile:', err);
        setError('讀取小孩照片時發生錯誤');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const savePhoto = useCallback(async ({ dataUrl, neckRatio }: FigureImage) => {
    await setDoc(doc(db, ...PROFILE_DOC), { photoUrl: dataUrl, neckRatio, updatedAt: Timestamp.now() });
  }, []);

  const removePhoto = useCallback(async () => {
    await deleteDoc(doc(db, ...PROFILE_DOC));
  }, []);

  return { photoUrl, neckRatio, loading, error, savePhoto, removePhoto };
}
