import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSSクラスをマージするユーティリティ関数
 * clsxで条件付きクラスを処理し、tailwind-mergeで重複を解決
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * デバウンス関数
 * 指定された遅延時間後に関数を実行
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * スロットル関数
 * 指定された時間内に1回だけ関数を実行
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 値が定義されているかチェック
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * 空文字列かチェック
 */
export function isEmpty(value: string | undefined | null): boolean {
  return !value || value.trim().length === 0;
}

/**
 * 日付フォーマット
 */
export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'short') {
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
  
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

/**
 * ファイルサイズフォーマット
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 文字列を切り詰める
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * オブジェクトから指定されたキーを除外
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

/**
 * オブジェクトから指定されたキーのみを抽出
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * 配列をチャンクに分割
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 非同期処理の遅延
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * エラーメッセージを取得
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}

/**
 * URLパラメータをオブジェクトに変換
 */
export function parseQueryParams(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * オブジェクトをURLパラメータに変換
 */
export function stringifyQueryParams(params: Record<string, string | number | boolean>): string {
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (isDefined(value)) {
      urlParams.set(key, String(value));
    }
  });
  return urlParams.toString();
}