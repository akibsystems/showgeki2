import { NextRequest, NextResponse } from 'next/server';
import { isValidUid } from './schemas';
import { ErrorType } from '@/types';

// ================================================================
// Types
// ================================================================

export interface AuthContext {
  uid: string;
  isAuthenticated: boolean;
}

export interface AuthResult {
  success: boolean;
  uid?: string;
  error?: string;
}

export interface AuthMiddlewareOptions {
  required?: boolean; // UIDが必須かどうか
  headerName?: string; // カスタムヘッダー名
  queryParam?: string; // カスタムクエリパラメータ名
}

// ================================================================
// Constants
// ================================================================

const DEFAULT_HEADER_NAME = 'x-uid';
const DEFAULT_QUERY_PARAM = 'uid';
const BEARER_PREFIX = 'Bearer ';

// ================================================================
// UID Extraction Functions
// ================================================================

/**
 * リクエストヘッダーからUIDを抽出
 */
function extractUidFromHeader(
  request: NextRequest, 
  headerName: string = DEFAULT_HEADER_NAME
): string | null {
  const headerValue = request.headers.get(headerName);
  
  if (!headerValue) return null;
  
  // Bearer トークン形式もサポート
  if (headerValue.startsWith(BEARER_PREFIX)) {
    return headerValue.slice(BEARER_PREFIX.length);
  }
  
  return headerValue;
}

/**
 * クエリパラメータからUIDを抽出
 */
function extractUidFromQuery(
  request: NextRequest,
  queryParam: string = DEFAULT_QUERY_PARAM
): string | null {
  return request.nextUrl.searchParams.get(queryParam);
}

/**
 * CookieからUID を抽出
 */
function extractUidFromCookie(request: NextRequest): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  
  try {
    const match = cookieHeader.match(/(?:^|; )showgeki_uid=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * リクエストボディからUIDを抽出（JSONボディの場合）
 */
async function extractUidFromBody(request: NextRequest): Promise<string | null> {
  try {
    // bodyを読み取ると消費されるため、複製を作成
    const clonedRequest = request.clone();
    const contentType = clonedRequest.headers.get('content-type');
    
    if (!contentType?.includes('application/json')) return null;
    
    const body = await clonedRequest.json();
    return body?.uid || null;
  } catch {
    return null;
  }
}

// ================================================================
// Main Authentication Functions
// ================================================================

/**
 * リクエストからUIDを抽出（複数のソースから試行）
 * 
 * 優先順位:
 * 1. ヘッダー (x-uid または Authorization Bearer)
 * 2. クエリパラメータ
 * 3. Cookie
 * 4. リクエストボディ（POST等の場合）
 */
export async function extractUid(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<string | null> {
  const { headerName, queryParam } = options;
  
  // 1. ヘッダーから抽出
  let uid = extractUidFromHeader(request, headerName);
  if (uid && isValidUid(uid)) return uid;
  
  // 2. クエリパラメータから抽出
  uid = extractUidFromQuery(request, queryParam);
  if (uid && isValidUid(uid)) return uid;
  
  // 3. Cookieから抽出
  uid = extractUidFromCookie(request);
  if (uid && isValidUid(uid)) return uid;
  
  // 4. リクエストボディから抽出（POST/PUT等の場合）
  if (request.method !== 'GET' && request.method !== 'DELETE') {
    uid = await extractUidFromBody(request);
    if (uid && isValidUid(uid)) return uid;
  }
  
  return null;
}

/**
 * UID の検証
 */
export function validateUidAuth(uid: string | null): AuthResult {
  if (!uid) {
    return {
      success: false,
      error: 'UID is required',
    };
  }
  
  if (!isValidUid(uid)) {
    return {
      success: false,
      error: 'Invalid UID format',
    };
  }
  
  return {
    success: true,
    uid,
  };
}

/**
 * 認証コンテキストを作成
 */
export function createAuthContext(uid: string | null): AuthContext {
  return {
    uid: uid || '',
    isAuthenticated: !!uid && isValidUid(uid),
  };
}

// ================================================================
// Middleware Functions
// ================================================================

/**
 * API Route用認証ミドルウェア
 * 
 * 使用例:
 * ```
 * export async function GET(request: NextRequest) {
 *   const authResult = await authMiddleware(request);
 *   if (!authResult.success) {
 *     return NextResponse.json({ error: authResult.error }, { status: 401 });
 *   }
 *   
 *   const uid = authResult.uid!;
 *   // ... API logic
 * }
 * ```
 */
export async function authMiddleware(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<AuthResult> {
  const { required = true } = options;
  
  try {
    const uid = await extractUid(request, options);
    
    if (required && !uid) {
      return {
        success: false,
        error: 'Authentication required. Please provide a valid UID.',
      };
    }
    
    if (uid && !isValidUid(uid)) {
      return {
        success: false,
        error: 'Invalid UID format. Must be a valid UUID.',
      };
    }
    
    return {
      success: true,
      uid: uid || undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Authentication failed due to server error.',
    };
  }
}

/**
 * 認証エラーレスポンスを作成
 */
export function createAuthErrorResponse(
  error: string,
  statusCode: number = 401
): NextResponse {
  return NextResponse.json(
    {
      error,
      type: ErrorType.AUTHENTICATION,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * 認証必須のAPI Route ハンドラーをラップする高階関数
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await authMiddleware(request, options);
    
    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error!);
    }
    
    const authContext = createAuthContext(authResult.uid!);
    return handler(request, authContext, ...args);
  };
}

/**
 * 認証オプショナルのAPI Route ハンドラーをラップする高階関数
 */
export function withOptionalAuth<T extends any[]>(
  handler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<NextResponse>,
  options: Omit<AuthMiddlewareOptions, 'required'> = {}
) {
  return withAuth(handler, { ...options, required: false });
}

// ================================================================
// Utility Functions
// ================================================================

/**
 * リクエストの認証状況を確認（実際の検証は行わず、情報のみ取得）
 */
export async function getAuthInfo(request: NextRequest): Promise<{
  hasUidInHeader: boolean;
  hasUidInQuery: boolean;
  hasUidInCookie: boolean;
  extractedUid: string | null;
  isValidFormat: boolean;
}> {
  const uidFromHeader = extractUidFromHeader(request);
  const uidFromQuery = extractUidFromQuery(request);
  const uidFromCookie = extractUidFromCookie(request);
  const extractedUid = await extractUid(request);
  
  return {
    hasUidInHeader: !!uidFromHeader,
    hasUidInQuery: !!uidFromQuery,
    hasUidInCookie: !!uidFromCookie,
    extractedUid,
    isValidFormat: extractedUid ? isValidUid(extractedUid) : false,
  };
}

/**
 * 開発・デバッグ用の認証状況ログ出力
 */
export async function logAuthStatus(request: NextRequest): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return;
  
  const authInfo = await getAuthInfo(request);
  const path = request.nextUrl.pathname;
  
  console.log(`[Auth Debug] ${request.method} ${path}:`, {
    ...authInfo,
    userAgent: request.headers.get('user-agent')?.slice(0, 50),
  });
}

// ================================================================
// Export commonly used patterns
// ================================================================

// よく使用されるパターンをエクスポート
export const authPatterns = {
  // 標準的な認証必須
  required: (handler: (req: NextRequest, auth: AuthContext) => Promise<NextResponse>) =>
    withAuth(handler),
  
  // 認証オプショナル
  optional: (handler: (req: NextRequest, auth: AuthContext) => Promise<NextResponse>) =>
    withOptionalAuth(handler),
  
  // カスタムヘッダー名での認証
  customHeader: (headerName: string) => (
    handler: (req: NextRequest, auth: AuthContext) => Promise<NextResponse>
  ) => withAuth(handler, { headerName }),
} as const;