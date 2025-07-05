# セキュリティガイド

## 概要

showgeki2システムのセキュリティベストプラクティスとセキュリティ実装ガイドです。アプリケーション、インフラストラクチャ、データ保護の各層でのセキュリティ対策を包括的に説明します。

## セキュリティ原則

### Defense in Depth（多層防御）
- 複数のセキュリティレイヤーを実装
- 単一障害点の排除
- 最小権限の原則の適用

### Security by Design
- 設計段階からセキュリティを考慮
- セキュアなデフォルト設定
- 継続的なセキュリティ評価

## 1. 認証・認可

### 1.1 Supabase Auth実装

```typescript
// lib/auth/secure-auth.ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function getAuthenticatedUser() {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  
  // セッションの検証
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session || session.expires_at < Date.now() / 1000) {
    throw new Error('Session expired');
  }
  
  return user;
}

// MFA（多要素認証）の実装
export async function enableMFA(userId: string) {
  const supabase = createServerComponentClient({ cookies });
  
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp'
  });
  
  if (error) throw error;
  
  return {
    qrCode: data.totp.qr_code,
    secret: data.totp.secret
  };
}
```

### 1.2 Row Level Security (RLS)

```sql
-- すべてのテーブルでRLSを有効化
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can only access own data" ON stories
  FOR ALL USING (uid = auth.uid());

-- 管理者ロールの実装
CREATE POLICY "Admins can access all data" ON stories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 読み取り専用の公開データ
CREATE POLICY "Public stories are readable by all" ON stories
  FOR SELECT USING (is_public = true);
```

### 1.3 APIキー管理

```typescript
// lib/api/api-key-manager.ts
import crypto from 'crypto';

export class APIKeyManager {
  // APIキーの生成
  static generateAPIKey(): string {
    return `sk_${crypto.randomBytes(32).toString('hex')}`;
  }
  
  // APIキーのハッシュ化
  static hashAPIKey(apiKey: string): string {
    return crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');
  }
  
  // APIキーの検証
  static async validateAPIKey(apiKey: string): Promise<boolean> {
    const hashedKey = this.hashAPIKey(apiKey);
    
    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', hashedKey)
      .eq('is_active', true)
      .single();
      
    if (!data) return false;
    
    // 使用回数の記録
    await supabase
      .from('api_key_usage')
      .insert({
        key_id: data.id,
        used_at: new Date().toISOString()
      });
      
    return true;
  }
}
```

## 2. データ保護

### 2.1 暗号化

```typescript
// lib/crypto/encryption.ts
import crypto from 'crypto';

export class DataEncryption {
  private static algorithm = 'aes-256-gcm';
  private static secretKey = process.env.ENCRYPTION_KEY!;
  
  // データの暗号化
  static encrypt(text: string): {
    encrypted: string;
    iv: string;
    authTag: string;
  } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      Buffer.from(this.secretKey, 'hex'),
      iv
    );
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  // データの復号化
  static decrypt(encryptedData: {
    encrypted: string;
    iv: string;
    authTag: string;
  }): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(this.secretKey, 'hex'),
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// PII（個人識別情報）の暗号化
export async function encryptPII(userId: string, data: any) {
  const encrypted = DataEncryption.encrypt(JSON.stringify(data));
  
  await supabase
    .from('encrypted_user_data')
    .insert({
      user_id: userId,
      encrypted_data: encrypted.encrypted,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag
    });
}
```

### 2.2 入力検証とサニタイゼーション

```typescript
// lib/validation/input-validator.ts
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// スキーマ定義
export const StorySchema = z.object({
  title: z.string()
    .min(1, 'タイトルは必須です')
    .max(200, 'タイトルは200文字以内にしてください')
    .refine(val => !/<[^>]*>/g.test(val), 'HTMLタグは使用できません'),
  
  text_raw: z.string()
    .min(10, '本文は10文字以上必要です')
    .max(5000, '本文は5000文字以内にしてください'),
  
  beats: z.number()
    .int()
    .min(1)
    .max(20),
    
  workspace_id: z.string().uuid('無効なワークスペースIDです')
});

// XSS対策
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
}

// SQLインジェクション対策（Supabaseが自動的に処理）
export async function safeQuery(tableName: string, filters: Record<string, any>) {
  // Supabaseクライアントは自動的にパラメータをエスケープ
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .match(filters);
    
  return { data, error };
}

// ファイルアップロード検証
export function validateFileUpload(file: File): boolean {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
  const maxSize = 500 * 1024 * 1024; // 500MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('許可されていないファイル形式です');
  }
  
  if (file.size > maxSize) {
    throw new Error('ファイルサイズが大きすぎます');
  }
  
  // ファイル名のサニタイゼーション
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  return true;
}
```

### 2.3 環境変数の保護

```typescript
// lib/config/secure-config.ts
export class SecureConfig {
  private static requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'OPENAI_API_KEY',
    'ENCRYPTION_KEY'
  ];
  
  // 環境変数の検証
  static validateEnvironment() {
    const missing = this.requiredEnvVars.filter(
      varName => !process.env[varName]
    );
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // 本番環境でのセキュリティチェック
    if (process.env.NODE_ENV === 'production') {
      // HTTPSの強制
      if (!process.env.FORCE_SSL) {
        console.warn('FORCE_SSL is not enabled in production');
      }
      
      // デバッグモードの無効化
      if (process.env.DEBUG === 'true') {
        throw new Error('DEBUG mode must be disabled in production');
      }
    }
  }
  
  // シークレットのローテーション
  static async rotateSecrets() {
    // Google Secret Managerを使用
    const secretManager = new SecretManagerServiceClient();
    
    const secrets = ['openai-api-key', 'supabase-service-key'];
    
    for (const secretName of secrets) {
      const [version] = await secretManager.addSecretVersion({
        parent: `projects/showgeki2/secrets/${secretName}`,
        payload: {
          data: Buffer.from(generateNewSecret(), 'utf8')
        }
      });
      
      console.log(`Rotated secret: ${secretName}`);
    }
  }
}
```

## 3. インフラストラクチャセキュリティ

### 3.1 Cloud Run セキュリティ設定

```yaml
# cloud-run-security.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: showgeki2-auto-process
  annotations:
    run.googleapis.com/ingress: internal-and-cloud-load-balancing
spec:
  template:
    metadata:
      annotations:
        # Binary Authorization
        binaryauthorization.grafeas.io/break-glass: "false"
        
        # サービスアカウント
        run.googleapis.com/service-account: showgeki2-processor@showgeki2.iam.gserviceaccount.com
        
        # VPC接続（プライベートネットワーク）
        run.googleapis.com/vpc-access-connector: projects/showgeki2/locations/asia-northeast1/connectors/showgeki2-connector
        run.googleapis.com/vpc-access-egress: private-ranges-only
    spec:
      containers:
      - image: gcr.io/showgeki2/showgeki2-auto-process:latest
        env:
        - name: NODE_ENV
          value: production
        # シークレットの使用
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: openai-api-key
              key: latest
        # 読み取り専用ファイルシステム
        securityContext:
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          allowPrivilegeEscalation: false
          capabilities:
            drop:
              - ALL
```

### 3.2 ネットワークセキュリティ

```typescript
// lib/security/rate-limiter.ts
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';

// レート制限の実装
export class SecurityRateLimiter {
  private static instances = new Map<string, RateLimiterMemory>();
  
  // API エンドポイント用
  static getAPILimiter() {
    if (!this.instances.has('api')) {
      this.instances.set('api', new RateLimiterMemory({
        points: 100, // リクエスト数
        duration: 60, // 秒
        blockDuration: 60 * 5, // ブロック時間（5分）
      }));
    }
    return this.instances.get('api')!;
  }
  
  // ログイン試行用
  static getLoginLimiter() {
    if (!this.instances.has('login')) {
      this.instances.set('login', new RateLimiterMemory({
        points: 5,
        duration: 60 * 15, // 15分
        blockDuration: 60 * 60, // 1時間
      }));
    }
    return this.instances.get('login')!;
  }
  
  // ミドルウェア
  static async middleware(req: Request, type: 'api' | 'login' = 'api') {
    const limiter = type === 'api' ? this.getAPILimiter() : this.getLoginLimiter();
    const key = req.headers.get('x-forwarded-for') || 'unknown';
    
    try {
      await limiter.consume(key);
    } catch (rateLimiterRes) {
      const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
      throw new Error(`Rate limit exceeded. Try again in ${secs} seconds.`);
    }
  }
}

// CORS設定
export const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://showgeki2.vercel.app']
    : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining']
};
```

### 3.3 監査ログ

```typescript
// lib/security/audit-logger.ts
export class AuditLogger {
  static async log(event: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    ip?: string;
    userAgent?: string;
    result: 'success' | 'failure';
    metadata?: Record<string, any>;
  }) {
    const auditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user_id: event.userId,
      action: event.action,
      resource: event.resource,
      resource_id: event.resourceId,
      ip_address: event.ip,
      user_agent: event.userAgent,
      result: event.result,
      metadata: event.metadata
    };
    
    // データベースに記録
    await supabase
      .from('audit_logs')
      .insert(auditEntry);
      
    // 重要なイベントは即座にアラート
    if (this.isCriticalEvent(event)) {
      await this.sendSecurityAlert(auditEntry);
    }
  }
  
  private static isCriticalEvent(event: any): boolean {
    const criticalActions = [
      'admin_access',
      'data_export',
      'user_deletion',
      'permission_change',
      'failed_login_attempts'
    ];
    
    return criticalActions.includes(event.action) || 
           event.result === 'failure';
  }
  
  private static async sendSecurityAlert(auditEntry: any) {
    // Slack/Email通知
    await sendSlackAlert({
      severity: 'critical',
      title: 'Security Alert',
      message: `Critical action detected: ${auditEntry.action}`,
      details: auditEntry
    });
  }
}
```

## 4. コンテンツセキュリティ

### 4.1 Content Security Policy (CSP)

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // CSPヘッダーの設定
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();
  
  response.headers.set('Content-Security-Policy', cspHeader);
  
  // その他のセキュリティヘッダー
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS（HTTPSの強制）
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  return response;
}

export const config = {
  matcher: '/:path*',
};
```

### 4.2 動画コンテンツの保護

```typescript
// lib/security/content-protection.ts
export class ContentProtection {
  // 署名付きURLの生成
  static async generateSignedUrl(
    videoPath: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from('videos')
      .createSignedUrl(videoPath, expiresIn);
      
    if (error) throw error;
    
    // アクセスログの記録
    await AuditLogger.log({
      userId: getCurrentUserId(),
      action: 'generate_signed_url',
      resource: 'video',
      resourceId: videoPath,
      result: 'success'
    });
    
    return data.signedUrl;
  }
  
  // ウォーターマーク追加
  static async addWatermark(videoPath: string): Promise<string> {
    const command = `
      ffmpeg -i ${videoPath} \
        -i watermark.png \
        -filter_complex "overlay=W-w-10:H-h-10" \
        -codec:a copy \
        output_watermarked.mp4
    `;
    
    // 実行とエラーハンドリング
    try {
      await exec(command);
      return 'output_watermarked.mp4';
    } catch (error) {
      console.error('Watermark failed:', error);
      throw error;
    }
  }
}
```

## 5. 脆弱性対策

### 5.1 依存関係の管理

```json
// package.json
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "check:deps": "npm-check-updates",
    "update:deps": "npm-check-updates -u && npm install"
  },
  "devDependencies": {
    "npm-check-updates": "^16.0.0"
  }
}
```

```bash
# GitHub Actions セキュリティスキャン
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0' # 週次実行

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
          
      - name: Run CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        
      - name: Run OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'showgeki2'
          path: '.'
          format: 'HTML'
```

### 5.2 セキュリティテスト

```typescript
// tests/security/security.test.ts
import { describe, it, expect } from 'vitest';

describe('Security Tests', () => {
  it('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE stories; --";
    
    const result = await request(app)
      .post('/api/stories')
      .send({ title: maliciousInput })
      .expect(400);
      
    // テーブルが削除されていないことを確認
    const { data } = await supabase
      .from('stories')
      .select('count');
      
    expect(data).toBeDefined();
  });
  
  it('should prevent XSS attacks', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    
    const result = await request(app)
      .post('/api/stories')
      .send({ title: xssPayload })
      .expect(400);
      
    expect(result.body.error).toContain('HTMLタグは使用できません');
  });
  
  it('should enforce rate limiting', async () => {
    // 100リクエストを送信
    const requests = Array(101).fill(null).map(() => 
      request(app).get('/api/stories')
    );
    
    const results = await Promise.all(requests);
    const rateLimited = results.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

## 6. インシデント対応

### 6.1 セキュリティインシデント対応計画

```typescript
// lib/security/incident-response.ts
export class IncidentResponse {
  static async handleSecurityIncident(incident: {
    type: 'data_breach' | 'unauthorized_access' | 'dos_attack' | 'malware';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }) {
    // 1. インシデントの記録
    const incidentId = await this.logIncident(incident);
    
    // 2. 即座の対応
    switch (incident.type) {
      case 'data_breach':
        await this.handleDataBreach(incidentId);
        break;
      case 'unauthorized_access':
        await this.handleUnauthorizedAccess(incidentId);
        break;
      case 'dos_attack':
        await this.handleDosAttack(incidentId);
        break;
    }
    
    // 3. 通知
    await this.notifyStakeholders(incident);
    
    // 4. 証拠の保全
    await this.preserveEvidence(incidentId);
  }
  
  private static async handleDataBreach(incidentId: string) {
    // 影響を受けたユーザーの特定
    const affectedUsers = await this.identifyAffectedUsers();
    
    // アクセスの一時停止
    await this.suspendAccess(affectedUsers);
    
    // パスワードリセットの強制
    await this.forcePasswordReset(affectedUsers);
    
    // 監査ログの保存
    await this.exportAuditLogs(incidentId);
  }
}
```

### 6.2 バックアップとリカバリ

```bash
#!/bin/bash
# scripts/security-backup.sh

# 暗号化されたバックアップの作成
backup_database() {
  DATE=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="backup_${DATE}.sql"
  
  # データベースダンプ
  pg_dump $DATABASE_URL > $BACKUP_FILE
  
  # 暗号化
  openssl enc -aes-256-cbc -salt -in $BACKUP_FILE -out ${BACKUP_FILE}.enc -k $BACKUP_PASSWORD
  
  # 元ファイルの削除
  rm $BACKUP_FILE
  
  # クラウドストレージへアップロード
  gsutil cp ${BACKUP_FILE}.enc gs://showgeki2-backups/
  
  # ローカルコピーの削除
  rm ${BACKUP_FILE}.enc
}

# 定期実行
backup_database
```

## セキュリティチェックリスト

### 開発時
- [ ] 入力検証の実装
- [ ] 出力エスケープの確認
- [ ] 認証・認可の実装
- [ ] セキュアな通信（HTTPS）
- [ ] エラーメッセージの適切な処理

### デプロイ前
- [ ] 依存関係の脆弱性スキャン
- [ ] セキュリティヘッダーの設定
- [ ] 環境変数の確認
- [ ] アクセス権限の最小化
- [ ] ログ設定の確認

### 運用中
- [ ] 定期的なセキュリティスキャン
- [ ] ログの監視
- [ ] アクセスパターンの分析
- [ ] インシデント対応訓練
- [ ] セキュリティアップデートの適用

## まとめ

セキュリティは継続的なプロセスです：
1. **予防**: セキュアな設計と実装
2. **検出**: 監視とログ分析
3. **対応**: インシデント対応計画
4. **改善**: 脆弱性の修正と強化

関連ドキュメント：
- [認証システム](./authentication-system.md)
- [監視・ログ管理](./monitoring-logging.md)
- [トラブルシューティング](./troubleshooting-guide.md)