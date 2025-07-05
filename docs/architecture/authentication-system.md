# 認証システム ドキュメント

## 概要

showgeki2の認証システムは、Supabase Authを基盤として構築されており、セキュアなユーザー認証とセッション管理を提供します。また、後方互換性のためにレガシーシステムのUID認証もサポートしています。

## アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Next.js App    │────▶│ Supabase Auth   │────▶│  PostgreSQL     │
│  (Client)       │     │  (Service)      │     │  (Database)     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Auth Context   │     │  JWT Tokens     │     │  RLS Policies   │
│  (Frontend)     │     │  (Session)      │     │  (Security)     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 認証フロー

### 1. 新規登録フロー

```typescript
// サインアップ処理
async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        // カスタムメタデータ
        display_name: email.split('@')[0],
      }
    }
  });
  
  if (error) throw error;
  
  // ワークスペースの自動作成
  if (data.user) {
    await createDefaultWorkspace(data.user.id);
  }
  
  return data;
}
```

### 2. ログインフロー

```typescript
// ログイン処理
async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  
  // セッション情報の保存
  localStorage.setItem('auth-token', data.session.access_token);
  
  return data;
}
```

### 3. ソーシャルログイン

```typescript
// Google認証
async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'profile email'
    }
  });
  
  if (error) throw error;
}
```

## セッション管理

### 1. セッション監視

```typescript
// contexts/AuthContext.tsx
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    
    // セッション変更の監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 2. トークンリフレッシュ

```typescript
// 自動トークンリフレッシュ
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Access token refreshed');
    // 新しいトークンでAPIクライアントを更新
    updateApiClientToken(session?.access_token);
  }
});
```

## API認証

### 1. 認証ミドルウェア

```typescript
// lib/auth.ts
export function withAuth<T>(
  handler: (
    req: NextRequest,
    auth: AuthContext,
    context: T
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: T) => {
    // Bearerトークンの取得
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // 後方互換性: x-uidヘッダーをチェック
      const uid = req.headers.get('x-uid');
      if (uid && isValidLegacyUid(uid)) {
        return handler(req, { uid, isLegacy: true }, context);
      }
      
      return NextResponse.json(
        { error: 'Unauthorized', type: ErrorType.AUTHENTICATION },
        { status: 401 }
      );
    }
    
    // トークン検証
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid token', type: ErrorType.AUTHENTICATION },
        { status: 401 }
      );
    }
    
    return handler(req, { uid: user.id, email: user.email }, context);
  };
}
```

### 2. 使用例

```typescript
// app/api/stories/route.ts
export const GET = withAuth(async (
  request: NextRequest,
  auth: AuthContext
) => {
  // 認証済みユーザーのストーリーを取得
  const { data: stories, error } = await supabase
    .from('stories')
    .select('*')
    .eq('uid', auth.uid)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  
  return NextResponse.json({
    success: true,
    data: stories
  });
});
```

## 後方互換性（レガシーUID）

### 1. 8桁ID形式

```typescript
// レガシーシステムとの互換性維持
interface LegacyAuth {
  uid: string;  // 8桁の数字文字列
  isLegacy: true;
}

// 8桁ID生成
function generateLegacyId(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// バリデーション
function isValidLegacyUid(uid: string): boolean {
  return /^\d{8}$/.test(uid);
}
```

### 2. マイグレーション戦略

```typescript
// UID移行ヘルパー
async function migrateLegacyUser(legacyUid: string, email: string) {
  // 新規Supabaseユーザー作成
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      legacy_uid: legacyUid
    }
  });
  
  if (authError) throw authError;
  
  // データ移行
  await migrateUserData(legacyUid, authData.user.id);
  
  return authData.user;
}
```

## セキュリティ対策

### 1. CSRF対策

```typescript
// CSRFトークン生成
function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// APIミドルウェアでの検証
function verifyCsrfToken(req: NextRequest): boolean {
  const token = req.headers.get('x-csrf-token');
  const sessionToken = req.cookies.get('csrf-token')?.value;
  
  return token === sessionToken;
}
```

### 2. レート制限

```typescript
// 認証試行のレート制限
const authRateLimiter = new Map<string, number[]>();

function checkAuthRateLimit(identifier: string): boolean {
  const now = Date.now();
  const attempts = authRateLimiter.get(identifier) || [];
  
  // 直近5分間の試行をフィルタ
  const recentAttempts = attempts.filter(
    time => now - time < 5 * 60 * 1000
  );
  
  if (recentAttempts.length >= 5) {
    return false; // レート制限
  }
  
  authRateLimiter.set(identifier, [...recentAttempts, now]);
  return true;
}
```

### 3. パスワードポリシー

```typescript
// パスワード強度検証
function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('パスワードは8文字以上必要です');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('大文字を含める必要があります');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('小文字を含める必要があります');
  }
  
  if (!/\d/.test(password)) {
    errors.push('数字を含める必要があります');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

## 認証状態の永続化

### 1. クライアントサイド

```typescript
// hooks/useAuth.ts
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // セッション復元
    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUser(session.user);
      }
      
      setLoading(false);
    };
    
    restoreSession();
  }, []);
  
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  };
  
  return { user, loading, signOut };
}
```

### 2. サーバーサイド

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // セッションクッキーの確認
  const supabase = createMiddlewareClient({ req: request, res: response });
  const { data: { session } } = await supabase.auth.getSession();
  
  // 保護されたルートの確認
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard');
  
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return response;
}
```

## エラーハンドリング

### 1. 認証エラー

```typescript
interface AuthError {
  code: string;
  message: string;
}

function handleAuthError(error: AuthError): string {
  const errorMessages: Record<string, string> = {
    'invalid_credentials': 'メールアドレスまたはパスワードが正しくありません',
    'user_not_found': 'ユーザーが見つかりません',
    'email_not_confirmed': 'メールアドレスの確認が必要です',
    'weak_password': 'パスワードが弱すぎます',
    'user_already_exists': 'このメールアドレスは既に使用されています',
  };
  
  return errorMessages[error.code] || 'エラーが発生しました';
}
```

### 2. セッションエラー

```typescript
// セッション期限切れの処理
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    // ローカルデータのクリア
    clearLocalStorage();
    
    // ログインページへリダイレクト
    window.location.href = '/login';
  }
  
  if (event === 'PASSWORD_RECOVERY') {
    // パスワードリセットページへ
    window.location.href = '/reset-password';
  }
});
```

## 監視とログ

### 1. 認証イベントログ

```typescript
// 認証イベントの記録
async function logAuthEvent(event: AuthEvent) {
  await supabase.from('auth_logs').insert({
    user_id: event.userId,
    event_type: event.type,
    ip_address: event.ipAddress,
    user_agent: event.userAgent,
    created_at: new Date().toISOString()
  });
}
```

### 2. セキュリティアラート

```typescript
// 異常な認証パターンの検知
async function detectAnomalousAuth(userId: string, ipAddress: string) {
  const recentLogins = await getRecentLogins(userId);
  
  // 異なるIPからの短時間での複数ログイン
  const uniqueIps = new Set(recentLogins.map(l => l.ip_address));
  if (uniqueIps.size > 3) {
    await sendSecurityAlert(userId, 'Multiple IP addresses detected');
  }
}
```

## 今後の改善案

1. **多要素認証（MFA）**
   - TOTP対応
   - SMS認証

2. **シングルサインオン（SSO）**
   - SAML対応
   - OAuth追加プロバイダー

3. **高度なセキュリティ**
   - デバイス認証
   - 生体認証対応

4. **監査機能**
   - 詳細なアクセスログ
   - コンプライアンス対応