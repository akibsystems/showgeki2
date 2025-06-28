import { Page, expect } from '@playwright/test';
import { BasePage } from '../fixtures/base-page';

/**
 * ストーリー作成ページのページオブジェクトモデル
 */
export class CreateStoryPage extends BasePage {
  // セレクター定義
  private readonly selectors = {
    // フォーム要素
    storyTitleInput: '[data-testid="story-title-input"]',
    storyTextarea: '[data-testid="story-textarea"]',
    workspaceSelect: '[data-testid="workspace-select"]',
    
    // ボタン
    createStoryButton: '[data-testid="create-story-button"]',
    saveAsDraftButton: '[data-testid="save-draft-button"]',
    previewButton: '[data-testid="preview-button"]',
    cancelButton: '[data-testid="cancel-button"]',
    
    // フィードバック要素
    errorMessage: '[data-testid="error-message"]',
    successMessage: '[data-testid="success-message"]',
    validationError: '[data-testid="validation-error"]',
    
    // プログレス関連
    loadingSpinner: '[data-testid="loading-spinner"]',
    progressBar: '[data-testid="progress-bar"]',
    
    // 汎用セレクター（フォールバック用）
    titleInput: 'input[name="title"], input[placeholder*="タイトル"], input[placeholder*="title"]',
    contentTextarea: 'textarea[name="content"], textarea[name="text"], textarea[placeholder*="ストーリー"], textarea[placeholder*="story"]',
    submitButton: 'button[type="submit"], button:has-text("作成"), button:has-text("Create"), button:has-text("送信")',
    formContainer: 'form, [data-testid="story-form"]',
  };

  constructor(page: Page) {
    super(page, '/create');
  }

  /**
   * ページが正しく表示されているかチェック
   */
  async verifyPageLoaded() {
    await this.waitForPageLoad();
    
    // フォームコンテナの存在確認
    const formContainer = this.page.locator(this.selectors.formContainer);
    await expect(formContainer).toBeVisible();
    
    // ページタイトルの確認
    const title = await this.getTitle();
    expect(title).toMatch(/作成|Create|Story/i);
  }

  /**
   * ストーリーのタイトルを入力
   */
  async enterTitle(title: string) {
    let titleInput = this.page.locator(this.selectors.storyTitleInput);
    
    // data-testidが見つからない場合はフォールバック
    if (await titleInput.count() === 0) {
      titleInput = this.page.locator(this.selectors.titleInput);
    }
    
    await expect(titleInput).toBeVisible();
    await titleInput.fill(title);
    
    // 入力値の確認
    const inputValue = await titleInput.inputValue();
    expect(inputValue).toBe(title);
  }

  /**
   * ストーリーの内容を入力
   */
  async enterStoryContent(content: string) {
    let contentTextarea = this.page.locator(this.selectors.storyTextarea);
    
    // data-testidが見つからない場合はフォールバック
    if (await contentTextarea.count() === 0) {
      contentTextarea = this.page.locator(this.selectors.contentTextarea);
    }
    
    await expect(contentTextarea).toBeVisible();
    await contentTextarea.fill(content);
    
    // 入力値の確認
    const inputValue = await contentTextarea.inputValue();
    expect(inputValue).toBe(content);
  }

  /**
   * ワークスペースを選択
   */
  async selectWorkspace(workspaceName: string) {
    const workspaceSelect = this.page.locator(this.selectors.workspaceSelect);
    
    if (await workspaceSelect.count() > 0) {
      await workspaceSelect.selectOption({ label: workspaceName });
    } else {
      // フォールバック: 一般的なselectタグを探す
      const selectElements = this.page.locator('select');
      const count = await selectElements.count();
      
      if (count > 0) {
        await selectElements.first().selectOption({ label: workspaceName });
      }
    }
  }

  /**
   * ストーリーを作成（送信）
   */
  async createStory() {
    let createButton = this.page.locator(this.selectors.createStoryButton);
    
    // data-testidが見つからない場合はフォールバック
    if (await createButton.count() === 0) {
      createButton = this.page.locator(this.selectors.submitButton);
    }
    
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();
    
    // ボタンをクリック
    await createButton.click();
  }

  /**
   * 下書きとして保存
   */
  async saveAsDraft() {
    const draftButton = this.page.locator(this.selectors.saveAsDraftButton);
    
    if (await draftButton.count() > 0) {
      await draftButton.click();
    } else {
      // フォールバック: 下書きテキストを含むボタンを探す
      await this.page.click('button:has-text("下書き"), button:has-text("Draft"), button:has-text("保存")');
    }
  }

  /**
   * プレビューを表示
   */
  async showPreview() {
    const previewButton = this.page.locator(this.selectors.previewButton);
    
    if (await previewButton.count() > 0) {
      await previewButton.click();
    }
  }

  /**
   * 作成処理の完了を待機
   */
  async waitForCreationComplete() {
    // ローディング状態の終了を待機
    await this.waitForLoadingToFinish();
    
    // 成功メッセージまたはリダイレクトを待機
    await Promise.race([
      this.page.waitForSelector(this.selectors.successMessage, { timeout: 30000 }),
      this.page.waitForURL('**/stories/**', { timeout: 30000 }),
      this.page.waitForURL('**/dashboard**', { timeout: 30000 })
    ]);
  }

  /**
   * バリデーションエラーを確認
   */
  async checkValidationError(expectedMessage?: string) {
    const errorElement = this.page.locator(this.selectors.validationError);
    await expect(errorElement).toBeVisible();
    
    if (expectedMessage) {
      await expect(errorElement).toContainText(expectedMessage);
    }
  }

  /**
   * フォームをクリア
   */
  async clearForm() {
    // タイトルをクリア
    const titleInput = this.page.locator(this.selectors.storyTitleInput);
    if (await titleInput.count() > 0) {
      await titleInput.fill('');
    }
    
    // コンテンツをクリア
    const contentTextarea = this.page.locator(this.selectors.storyTextarea);
    if (await contentTextarea.count() > 0) {
      await contentTextarea.fill('');
    }
  }

  /**
   * 完全なストーリー作成ワークフロー
   */
  async createCompleteStory(storyData: {
    title: string;
    content: string;
    workspace?: string;
  }) {
    await this.verifyPageLoaded();
    
    // フォームに入力
    await this.enterTitle(storyData.title);
    await this.enterStoryContent(storyData.content);
    
    if (storyData.workspace) {
      await this.selectWorkspace(storyData.workspace);
    }
    
    // ストーリーを作成
    await this.createStory();
    
    // 作成完了を待機
    await this.waitForCreationComplete();
  }

  /**
   * エラー状態かチェック
   */
  async isInErrorState(): Promise<boolean> {
    return await this.hasErrorMessage();
  }

  /**
   * 成功状態かチェック
   */
  async isInSuccessState(): Promise<boolean> {
    return await this.hasSuccessMessage();
  }

  /**
   * フォームの入力状態を取得
   */
  async getFormData() {
    const titleInput = this.page.locator(this.selectors.storyTitleInput);
    const contentTextarea = this.page.locator(this.selectors.storyTextarea);
    
    return {
      title: await titleInput.inputValue().catch(() => ''),
      content: await contentTextarea.inputValue().catch(() => '')
    };
  }
}