// 登入白名單：只有這些 email 可以使用魔法衣櫃
// 之後要開放新帳號：在這裡加一行，並同步更新 Firestore 安全規則的 email 清單
export const ALLOWED_EMAILS = [
  'appley828@gmail.com',
  'aurora20150807@gmail.com',
];

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.trim().toLowerCase());
}
