import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// TODO: 請在 Firebase Console 建立專案後，將設定填入以下內容
// 1. 前往 https://console.firebase.google.com/
// 2. 建立新專案或選擇現有專案
// 3. 在專案設定中找到「您的應用程式」，選擇網頁應用程式
// 4. 複製 firebaseConfig 設定到下方
// 注意：只需要 Firestore，不需要 Storage（圖片會壓縮後存入 Firestore）

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
};

// 檢查是否已設定 Firebase
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey !== "YOUR_API_KEY" &&
         firebaseConfig.projectId !== "YOUR_PROJECT_ID";
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export default app;
