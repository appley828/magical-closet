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
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { OutfitWithPositions, OutfitItem } from '../types';

const COLLECTION_NAME = 'outfits';

export function useOutfits() {
  const [outfits, setOutfits] = useState<OutfitWithPositions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setError('Firebase 尚未設定，請先設定 Firebase 配置');
      setLoading(false);
      return;
    }

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
    async (data: { name: string; items: OutfitItem[]; occasion?: string }) => {
      if (!isFirebaseConfigured()) {
        throw new Error('Firebase 尚未設定');
      }

      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        createdAt: Timestamp.now(),
      });

      return docRef.id;
    },
    []
  );

  const updateOutfit = useCallback(
    async (
      id: string,
      data: Partial<{ name: string; items: OutfitItem[]; occasion?: string }>
    ) => {
      if (!isFirebaseConfigured()) {
        throw new Error('Firebase 尚未設定');
      }

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, data);
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
