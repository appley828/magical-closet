import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  deleteField,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { OutfitWithPositions, OutfitItem } from '../types';

const COLLECTION_NAME = 'outfits';

export function useOutfits() {
  const [outfits, setOutfits] = useState<OutfitWithPositions[]>([]);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(() =>
    isFirebaseConfigured() ? null : 'Firebase 尚未設定，請先設定 Firebase 配置'
  );

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const outfitsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as OutfitWithPositions[];
        setOutfits(outfitsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching outfits:', err);
        setError('讀取搭配資料時發生錯誤');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addOutfit = useCallback(
    async (data: { name: string; items: OutfitItem[]; occasion?: string; stageVersion?: number }) => {
      if (!isFirebaseConfigured()) {
        throw new Error('Firebase 尚未設定');
      }

      // Firestore 不接受 undefined／空場合，沒選就不寫這個欄位
      const { occasion, ...rest } = data;
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...rest,
        ...(occasion ? { occasion } : {}),
        createdAt: Timestamp.now(),
      });

      return docRef.id;
    },
    []
  );

  const updateOutfit = useCallback(
    async (
      id: string,
      data: Partial<{ name: string; items: OutfitItem[]; occasion?: string; stageVersion?: number }>
    ) => {
      if (!isFirebaseConfigured()) {
        throw new Error('Firebase 尚未設定');
      }

      const docRef = doc(db, COLLECTION_NAME, id);
      // updateDoc 是合併更新：場合清空時要明確刪掉舊值
      const { occasion, ...rest } = data;
      await updateDoc(docRef, {
        ...rest,
        ...('occasion' in data ? { occasion: occasion || deleteField() } : {}),
      });
    },
    []
  );

  const deleteOutfit = useCallback(async (id: string) => {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase 尚未設定');
    }

    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }, []);

  const getOutfitById = useCallback(
    (id: string): OutfitWithPositions | undefined => {
      return outfits.find((o) => o.id === id);
    },
    [outfits]
  );

  return {
    outfits,
    loading,
    error,
    addOutfit,
    updateOutfit,
    deleteOutfit,
    getOutfitById,
    isConfigured: isFirebaseConfigured(),
  };
}
