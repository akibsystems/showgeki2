import { Page, expect } from '@playwright/test';
import { BasePage } from '../fixtures/base-page';

/**
 * ホームページのページオブジェクトモデル
 */
export class HomePage extends BasePage {
  // セレクター定義
  private readonly selectors = {
    // ナビゲーション
    createStoryButton: '[data-testid="create-story-button"]',
    watchVideoButton: '[data-testid="watch-video-button"]',
    dashboardLink: '[data-testid="dashboard-link"]',
    
    // メインコンテンツ
    heroTitle: '[data-testid="hero-title"]',
    heroDescription: '[data-testid="hero-description"]',
    featuresSection: '[data-testid="features-section"]',
    
    // サンプル動画
    sampleVideoSection: '[data-testid="sample-video-section"]',
    playVideoButton: '[data-testid="play-video-button"]',
    
    // フッター
    footerLinks: '[data-testid="footer-links"]',
    
    // 汎用セレクター（data-testidがない場合の代替）
    mainContent: 'main',
    navigationBar: 'nav',
    headerTitle: 'h1',
  };

  constructor(page: Page) {
    super(page, '/');
  }

  /**
   * ページが正しく表示されているかチェック
   */
  async verifyPageLoaded() {
    await this.waitForPageLoad();
    
    // メインコンテンツの存在確認
    await expect(this.page.locator(this.selectors.mainContent)).toBeVisible();
    
    // ページタイトルの確認
    const title = await this.getTitle();
    expect(title).toContain('Showgeki2');
  }

  /**
   * ヒーローセクションの内容を確認
   */
  async verifyHeroSection() {
    // ヒーロータイトルの確認
    const heroTitle = this.page.locator(this.selectors.heroTitle);
    await expect(heroTitle).toBeVisible();
    
    // ヒーロー説明文の確認
    const heroDescription = this.page.locator(this.selectors.heroDescription);
    await expect(heroDescription).toBeVisible();
    
    // 説明文に期待するキーワードが含まれているかチェック
    const descriptionText = await heroDescription.textContent();
    expect(descriptionText).toMatch(/(AI|動画|ストーリー|シェイクスピア)/);
  }

  /**
   * ナビゲーションメニューを確認
   */
  async verifyNavigation() {
    // 「ストーリーを作成」ボタンの確認
    const createButton = this.page.locator(this.selectors.createStoryButton);
    if (await createButton.count() > 0) {
      await expect(createButton).toBeVisible();
    }
    
    // 「動画を見る」ボタンの確認
    const watchButton = this.page.locator(this.selectors.watchVideoButton);
    if (await watchButton.count() > 0) {
      await expect(watchButton).toBeVisible();
    }
  }

  /**
   * 「ストーリーを作成」ページに移動
   */
  async goToCreateStory() {
    const createButton = this.page.locator(this.selectors.createStoryButton);
    
    if (await createButton.count() > 0) {
      await createButton.click();
    } else {
      // data-testidがない場合のフォールバック
      await this.page.click('a[href="/create"], a[href*="create"], button:has-text("作成"), button:has-text("Create")');
    }
    
    // ページ遷移の完了を待機
    await this.page.waitForURL('**/create**');
  }

  /**
   * 「動画を見る」ページに移動
   */
  async goToWatch() {
    const watchButton = this.page.locator(this.selectors.watchVideoButton);
    
    if (await watchButton.count() > 0) {
      await watchButton.click();
    } else {
      // data-testidがない場合のフォールバック
      await this.page.click('a[href="/watch"], a[href*="watch"], button:has-text("見る"), button:has-text("Watch")');
    }
    
    // ページ遷移の完了を待機
    await this.page.waitForURL('**/watch**');
  }

  /**
   * ダッシュボードページに移動
   */
  async goToDashboard() {
    const dashboardLink = this.page.locator(this.selectors.dashboardLink);
    
    if (await dashboardLink.count() > 0) {
      await dashboardLink.click();
    } else {
      // data-testidがない場合のフォールバック
      await this.page.click('a[href="/dashboard"], a[href*="dashboard"], button:has-text("ダッシュボード"), button:has-text("Dashboard")');
    }
    
    // ページ遷移の完了を待機
    await this.page.waitForURL('**/dashboard**');
  }

  /**
   * フィーチャーセクションの確認
   */
  async verifyFeatures() {
    const featuresSection = this.page.locator(this.selectors.featuresSection);
    
    if (await featuresSection.count() > 0) {
      await expect(featuresSection).toBeVisible();
      
      // フィーチャーアイテムの存在確認
      const featureItems = featuresSection.locator('[data-testid*="feature-"], .feature-item, .feature');
      const count = await featureItems.count();
      expect(count).toBeGreaterThan(0);
    }
  }

  /**
   * ページの読み込み速度を測定
   */
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.goto({ waitUntil: 'networkidle' });
    await this.verifyPageLoaded();
    const endTime = Date.now();
    
    return endTime - startTime;
  }

  /**
   * レスポンシブデザインのテスト
   */
  async testResponsiveDesign() {
    // デスクトップサイズ
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await this.verifyPageLoaded();
    
    // タブレットサイズ
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.verifyPageLoaded();
    
    // モバイルサイズ
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.verifyPageLoaded();
  }
}