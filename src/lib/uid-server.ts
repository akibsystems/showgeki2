import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isValidUid } from './schemas';

const COOKIE_NAME = 'showgeki_uid';

/**
 * サーバーサイドでUIDを取得
 * 優先順位:
 * 1. 認証ユーザーID（ログインしている場合）
 * 2. X-User-UIDヘッダー（APIリクエストで明示的に指定された場合）
 * 3. CookieのUID
 * 4. 新規生成
 */
export async function getOrCreateUid(request?: NextRequest): Promise<string | null> {
  try {
    // 1. まず認証ユーザーをチェック
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user?.id) {
      // 認証ユーザーがいる場合は、そのIDをUIDとして使用
      return user.id;
    }
    
    // 2. X-User-UIDヘッダーをチェック（requestが渡された場合）
    if (request) {
      const headerUid = request.headers.get('X-User-UID');
      if (headerUid && isValidUid(headerUid)) {
        console.log(`🆔 Using UID from X-User-UID header: ${headerUid}`);
        return headerUid;
      }
    }
    
    // 3. 認証ユーザーがいない場合は、CookieからUID取得
    const cookieStore = await cookies();
    const uidCookie = cookieStore.get(COOKIE_NAME);
    
    if (uidCookie?.value && isValidUid(uidCookie.value)) {
      return uidCookie.value;
    }
    
    // 4. どちらもない場合は新規生成
    const newUid = crypto.randomUUID();
    await setUid(newUid);
    return newUid;
  } catch (error) {
    console.error('Error getting UID:', error);
    return null;
  }
}

/**
 * サーバーサイドでUIDを設定
 * CookieにUIDを保存
 */
export async function setUid(uid: string): Promise<void> {
  if (!isValidUid(uid)) {
    throw new Error('Invalid UID format');
  }
  
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, uid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });
}