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
import { compressImageToBase64 } from '../lib/imageUtils';
import type { Clothing } from '../types';

const COLLECTION_NAME = 'clothing';

export function useClothing() {
  const [clothes, setClothes] = useState<Clothing[]>([]);
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
        const clothesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Clothing[];
        setClothes(clothesData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching clothes:', err);
        setError('讀取衣服資料時發生錯誤');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addClothing = useCallback(
    async (data: Omit<Clothing, 'id' | 'createdAt'>, imageFile?: File) => {
      if (!isFirebaseConfigured()) {
        throw new Error('Firebase 尚未設定');
      }

      let imageUrl = data.imageUrl;
      if (imageFile) {
        const hasTransparency = imageFile.type === 'image/png';
        imageUrl = await compressImageToBase64(imageFile, { preserveTransparency: hasTransparency });
      }

      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        imageUrl,
        createdAt: Timestamp.now(),
      });

      return docRef.id;
    },
    []
  );

  const updateClothing = useCallback(
    async (
      id: string,
      data: Partial<Omit<Clothing, 'id' | 'createdAt'>>,
      imageFile?: File
    ) => {
      if (!isFirebaseConfigured()) {
        throw new Error('Firebase 尚未設定');
      }

      const updateData = { ...data };
      if (imageFile) {
        const hasTransparency = imageFile.type === 'image/png';
        updateData.imageUrl = await compressImageToBase64(imageFile, { preserveTransparency: hasTransparency });
      }

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, updateData);
    },
    []
  );

  const deleteClothing = useCallback(async (id: string) => {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase 尚未設定');
    }

    // 直接刪除文檔（圖片是 Base64，不需要另外刪除）
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }, []);

  const getClothingById = useCallback(
    (id: string): Clothing | undefined => {
      return clothes.find((c) => c.id === id);
    },
    [clothes]
  );

  return {
    clothes,
    loading,
    error,
    addClothing,
    updateClothing,
    deleteClothing,
    getClothingById,
    isConfigured: isFirebaseConfigured(),
  };
}
