import { Page, Locator, expect } from '@playwright/test';

/**
 * E2Eテスト用ページオブジェクトモデルの基底クラス
 */
export abstract class BasePage {
  protected page: Page;
  protected url: string;

  constructor(page: Page, url: string) {
    this.page = page;
    this.url = url;
  }

  /**
   * ページに移動
   */
  async goto(options?: { waitUntil?: 'networkidle' | 'domcontentloaded' | 'load' }) {
    await this.page.goto(this.url, options);
  }

  /**
   * ページタイトルを取得
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * URLが正しいかチェック
   */
  async expectUrl(expectedUrl?: string) {
    const urlToCheck = expectedUrl || this.url;
    await expect(this.page).toHaveURL(urlToCheck);
  }

  /**
   * 要素がページに表示されるまで待機
   */
  async waitForElement(selector: string, timeout: number = 10000): Promise<Locator> {
    return this.page.waitForSelector(selector, { timeout });
  }

  /**
   * 要素をクリック
   */
  async clickElement(selector: string) {
    await this.page.click(selector);
  }

  /**
   * 入力フィールドに値を入力
   */
  async fillInput(selector: string, value: string) {
    await this.page.fill(selector, value);
  }

  /**
   * テキストが表示されるまで待機
   */
  async waitForText(text: string, timeout: number = 10000) {
    await this.page.waitForFunction(
      (searchText) => document.body.innerText.includes(searchText),
      text,
      { timeout }
    );
  }

  /**
   * ローディング状態の終了を待機
   */
  async waitForLoadingToFinish() {
    // ローディングスピナーの非表示を待機
    await this.page.waitForSelector('[data-testid="loading-spinner"]', { 
      state: 'hidden',
      timeout: 30000 
    }).catch(() => {
      // スピナーが存在しない場合は無視
    });

    // ネットワークアクティビティの終了を待機
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * エラーメッセージが表示されているかチェック
   */
  async hasErrorMessage(): Promise<boolean> {
    const errorSelectors = [
      '[data-testid="error-message"]',
      '.error-message',
      '[role="alert"]',
      '.alert-error'
    ];

    for (const selector of errorSelectors) {
      const element = await this.page.$(selector);
      if (element && await element.isVisible()) {
        return true;
      }
    }
    return false;
  }

  /**
   * 成功メッセージが表示されているかチェック
   */
  async hasSuccessMessage(): Promise<boolean> {
    const successSelectors = [
      '[data-testid="success-message"]',
      '.success-message',
      '.alert-success'
    ];

    for (const selector of successSelectors) {
      const element = await this.page.$(selector);
      if (element && await element.isVisible()) {
        return true;
      }
    }
    return false;
  }

  /**
   * ページのスクリーンショットを撮影
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  /**
   * 指定した要素のスクリーンショットを撮影
   */
  async takeElementScreenshot(selector: string, name: string) {
    const element = await this.page.$(selector);
    if (element) {
      await element.screenshot({ 
        path: `test-results/screenshots/${name}-element.png` 
      });
    }
  }

  /**
   * ページが完全に読み込まれるまで待機
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle');
  }
}