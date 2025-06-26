import { isValidUid } from './schemas';
import { LOCAL_STORAGE_KEYS } from '@/types';

// ================================================================
// Constants
// ================================================================

const UID_KEY = LOCAL_STORAGE_KEYS.UID;
const COOKIE_NAME = 'showgeki_uid';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

// ================================================================
// Browser Detection
// ================================================================

/**
 * ブラウザ環境かどうかを判定
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/**
 * localStorage が利用可能かどうかを判定
 */
function isLocalStorageAvailable(): boolean {
  if (!isBrowser()) return false;
  
  try {
    const testKey = '__localStorage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * クッキーが利用可能かどうかを判定
 */
function isCookieAvailable(): boolean {
  if (!isBrowser()) return false;
  
  try {
    document.cookie = '__cookie_test__=test; max-age=1';
    const hasTestCookie = document.cookie.includes('__cookie_test__=test');
    if (hasTestCookie) {
      document.cookie = '__cookie_test__=; max-age=0'; // Clean up
    }
    return hasTestCookie;
  } catch {
    return false;
  }
}

// ================================================================
// Storage Operations
// ================================================================

/**
 * localStorage からUIDを取得
 */
function getUidFromLocalStorage(): string | null {
  if (!isLocalStorageAvailable()) return null;
  
  try {
    const uid = window.localStorage.getItem(UID_KEY);
    return uid && isValidUid(uid) ? uid : null;
  } catch {
    return null;
  }
}

/**
 * localStorage にUIDを保存
 */
function setUidToLocalStorage(uid: string): boolean {
  if (!isLocalStorageAvailable()) return false;
  
  try {
    window.localStorage.setItem(UID_KEY, uid);
    return true;
  } catch {
    return false;
  }
}

/**
 * localStorage からUIDを削除
 */
function removeUidFromLocalStorage(): boolean {
  if (!isLocalStorageAvailable()) return false;
  
  try {
    window.localStorage.removeItem(UID_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cookie からUIDを取得
 */
function getUidFromCookie(): string | null {
  if (!isCookieAvailable()) return null;
  
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    const uid = match ? decodeURIComponent(match[1]) : null;
    return uid && isValidUid(uid) ? uid : null;
  } catch {
    return null;
  }
}

/**
 * Cookie にUIDを保存
 */
function setUidToCookie(uid: string): boolean {
  if (!isCookieAvailable()) return false;
  
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(uid)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax${secure}`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Cookie からUIDを削除
 */
function removeUidFromCookie(): boolean {
  if (!isCookieAvailable()) return false;
  
  try {
    document.cookie = `${COOKIE_NAME}=; max-age=0; path=/`;
    return true;
  } catch {
    return false;
  }
}

// ================================================================
// UUID Generation
// ================================================================

/**
 * UUIDv4を生成
 */
function generateUuid(): string {
  if (isBrowser() && typeof crypto !== 'undefined' && crypto.randomUUID) {
    // Modern browsers
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ================================================================
// Main UID Management Functions
// ================================================================

/**
 * 既存のUIDを取得するか、存在しない場合は新しいUIDを生成
 * 
 * @returns {string} UID文字列
 */
export function getOrCreateUid(): string {
  // SSR環境では空文字列を返す
  if (!isBrowser()) {
    return '';
  }
  
  // まずlocalStorageから取得を試行
  let uid = getUidFromLocalStorage();
  
  // localStorageにない場合はCookieから取得を試行
  if (!uid) {
    uid = getUidFromCookie();
    // Cookieから取得できた場合はlocalStorageにも保存
    if (uid) {
      setUidToLocalStorage(uid);
    }
  }
  
  // どちらからも取得できない場合は新しいUIDを生成
  if (!uid) {
    uid = generateUuid();
    
    // 両方の保存方法を試行
    const localStorageSuccess = setUidToLocalStorage(uid);
    const cookieSuccess = setUidToCookie(uid);
    
    // どちらも失敗した場合は警告をログに出力
    if (!localStorageSuccess && !cookieSuccess) {
      console.warn('Failed to persist UID. User will get a new UID on next visit.');
    }
  }
  
  return uid;
}

/**
 * 現在のUIDを取得（存在しない場合は null を返す）
 * 
 * @returns {string | null} UID文字列または null
 */
export function getCurrentUid(): string | null {
  if (!isBrowser()) return null;
  
  const uid = getUidFromLocalStorage() || getUidFromCookie();
  return uid && isValidUid(uid) ? uid : null;
}

/**
 * UIDを削除（ログアウト相当）
 * 
 * @returns {boolean} 削除が成功したかどうか
 */
export function clearUid(): boolean {
  if (!isBrowser()) return false;
  
  const localStorageSuccess = removeUidFromLocalStorage();
  const cookieSuccess = removeUidFromCookie();
  
  return localStorageSuccess || cookieSuccess;
}

/**
 * 指定されたUIDを保存
 * 
 * @param {string} uid - 保存するUID
 * @returns {boolean} 保存が成功したかどうか
 */
export function setUid(uid: string): boolean {
  if (!isBrowser() || !isValidUid(uid)) return false;
  
  const localStorageSuccess = setUidToLocalStorage(uid);
  const cookieSuccess = setUidToCookie(uid);
  
  return localStorageSuccess || cookieSuccess;
}

/**
 * UIDが有効かどうかを検証
 * 
 * @param {string} uid - 検証するUID
 * @returns {boolean} UIDが有効かどうか
 */
export function validateUid(uid: string): boolean {
  return isValidUid(uid);
}

/**
 * ストレージの状況を確認
 * 
 * @returns {object} ストレージの可用性情報
 */
export function getStorageInfo(): {
  browser: boolean;
  localStorage: boolean;
  cookie: boolean;
  currentUid: string | null;
} {
  const browser = isBrowser();
  const localStorage = isLocalStorageAvailable();
  const cookie = isCookieAvailable();
  const currentUid = getCurrentUid();
  
  return {
    browser,
    localStorage,
    cookie,
    currentUid,
  };
}

/**
 * UIDの移行処理（異なるストレージ間での同期）
 * 
 * @returns {boolean} 移行が実行されたかどうか
 */
export function migrateUid(): boolean {
  if (!isBrowser()) return false;
  
  const localStorageUid = getUidFromLocalStorage();
  const cookieUid = getUidFromCookie();
  
  // 両方にUIDが存在し、異なる場合はlocalStorageを優先
  if (localStorageUid && cookieUid && localStorageUid !== cookieUid) {
    setUidToCookie(localStorageUid);
    return true;
  }
  
  // localStorageにのみ存在する場合はCookieにコピー
  if (localStorageUid && !cookieUid) {
    setUidToCookie(localStorageUid);
    return true;
  }
  
  // Cookieにのみ存在する場合はlocalStorageにコピー
  if (!localStorageUid && cookieUid) {
    setUidToLocalStorage(cookieUid);
    return true;
  }
  
  return false;
}

// ================================================================
// React Hook Utility
// ================================================================

/**
 * React コンポーネント内でUIDを管理するためのユーティリティ
 * このファイルをインポートした後、カスタムフックで使用可能
 */
export const uidManager = {
  getOrCreate: getOrCreateUid,
  getCurrent: getCurrentUid,
  clear: clearUid,
  set: setUid,
  validate: validateUid,
  getStorageInfo,
  migrate: migrateUid,
} as const;