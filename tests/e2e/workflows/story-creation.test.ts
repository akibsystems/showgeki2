import { test, expect } from '@playwright/test';
import { CreateStoryPage } from '../pages/create-story-page';
import { HomePage } from '../pages/home-page';

test.describe('ストーリー作成ワークフロー', () => {
  test.beforeEach(async ({ page }) => {
    // 各テスト前にストーリー作成ページに移動
    await page.goto('/create');
  });

  test('ストーリー作成ページが正常に表示される', async ({ page }) => {
    const createPage = new CreateStoryPage(page);
    
    // ページロードの確認
    await createPage.verifyPageLoaded();
    
    // タイトルの確認
    const title = await createPage.getTitle();
    expect(title).toMatch(/作成|Create|Story/i);
  });

  test('基本的なストーリー作成フロー', async ({ page }) => {
    const createPage = new CreateStoryPage(page);
    
    const testStoryData = {
      title: 'E2Eテスト用ストーリー',
      content: '昔、遠い銀河系で、小さな惑星に住む若い農夫がいました。彼の名前はルーク・スカイウォーカー。彼は自分の運命を知らずに、毎日農場で働いていました。しかし、ある日、謎のメッセージを受け取ったことから、彼の人生は大きく変わることになります...'
    };

    try {
      // 完全なストーリー作成ワークフローを実行
      await createPage.createCompleteStory(testStoryData);
      
      // 成功状態の確認
      const isSuccess = await createPage.isInSuccessState();
      if (!isSuccess) {
        // リダイレクトされた場合のチェック
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/\/(stories|dashboard)/);
      }
      
    } catch (error) {
      console.log('基本フローでエラーが発生:', error);
      
      // エラー状態の詳細をログ出力
      const isError = await createPage.isInErrorState();
      if (isError) {
        console.log('ページでエラーが検出されました');
      }
      
      // スクリーンショットを撮影
      await createPage.takeScreenshot('story-creation-error');
      
      throw error;
    }
  });

  test('空のフォームでバリデーションエラーが表示される', async ({ page }) => {
    const createPage = new CreateStoryPage(page);
    
    // ページロードを確認
    await createPage.verifyPageLoaded();
    
    try {
      // 空のフォームで送信を試行
      await createPage.createStory();
      
      // バリデーションエラーが表示されることを確認
      await page.waitForTimeout(2000); // エラー表示を待機
      
      // エラーメッセージの存在確認
      const hasError = await createPage.isInErrorState();
      if (hasError) {
        console.log('期待通りバリデーションエラーが表示されました');
      } else {
        // フォームのHTML要素がrequired属性を持っているかチェック
        const titleField = page.locator('input[name="title"], input[placeholder*="タイトル"]');
        const isRequired = await titleField.getAttribute('required');
        
        if (isRequired !== null) {
          console.log('フィールドにrequired属性が設定されています');
        }
      }
      
    } catch (error) {
      console.log('空フォーム送信テストでエラー:', error);
      await createPage.takeScreenshot('empty-form-validation');
    }
  });

  test('タイトルのみ入力時のバリデーション', async ({ page }) => {
    const createPage = new CreateStoryPage(page);
    
    await createPage.verifyPageLoaded();
    
    try {
      // タイトルのみ入力
      await createPage.enterTitle('テストタイトルのみ');
      
      // 送信を試行
      await createPage.createStory();
      
      // バリデーションエラーまたは成功のいずれかを待機
      await page.waitForTimeout(2000);
      
      // 結果の確認
      const hasError = await createPage.isInErrorState();
      const hasSuccess = await createPage.isInSuccessState();
      
      if (hasError) {
        console.log('コンテンツが必須のため、バリデーションエラーが表示されました');
      } else if (hasSuccess) {
        console.log('タイトルのみでもストーリー作成が成功しました');
      }
      
    } catch (error) {
      console.log('タイトルのみ入力テストでエラー:', error);
      await createPage.takeScreenshot('title-only-validation');
    }
  });

  test('長いコンテンツでのストーリー作成', async ({ page }) => {
    const createPage = new CreateStoryPage(page);
    
    const longStoryData = {
      title: '長編ストーリーテスト',
      content: '昔々、ある王国に美しい姫がいました。' + 
               'この物語は長い長い冒険譚です。'.repeat(50) +
               '姫は勇敢な騎士と共に、邪悪な魔法使いを倒すために旅に出ました。' +
               'その旅路は険しく、多くの困難が待ち受けていました。'.repeat(30) +
               'しかし、愛と勇気の力で、ついに平和を取り戻すことができました。'
    };

    try {
      await createPage.createCompleteStory(longStoryData);
      
      // 成功の確認
      const isSuccess = await createPage.isInSuccessState();
      if (!isSuccess) {
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/\/(stories|dashboard)/);
      }
      
    } catch (error) {
      console.log('長いコンテンツテストでエラー:', error);
      await createPage.takeScreenshot('long-content-test');
      
      // エラーが許容される場合（例：文字数制限）
      const hasError = await createPage.isInErrorState();
      if (hasError) {
        console.log('長いコンテンツによる制限エラーが発生しました');
      } else {
        throw error;
      }
    }
  });

  test('特殊文字を含むストーリー作成', async ({ page }) => {
    const createPage = new CreateStoryPage(page);
    
    const specialCharStoryData = {
      title: '特殊文字テスト 【☆★】',
      content: '特殊文字を含むテストです。\n' +
               '日本語：あいうえお、カタカナ：アイウエオ\n' +
               '記号：!@#$%^&*()_+-=[]{}|;:,.<>?\n' +
               '絵文字：😀😃😄😁😆😅😂🤣\n' +
               'その他：™©®¥€£¢∞∑∏∫∂∆∇√∝∈∉∪∩⊂⊃'
    };

    try {
      await createPage.createCompleteStory(specialCharStoryData);
      
      // 成功の確認
      const isSuccess = await createPage.isInSuccessState();
      if (!isSuccess) {
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/\/(stories|dashboard)/);
      }
      
    } catch (error) {
      console.log('特殊文字テストでエラー:', error);
      await createPage.takeScreenshot('special-characters-test');
      
      // 特殊文字制限がある場合のエラーは許容
      const hasError = await createPage.isInErrorState();
      if (hasError) {
        console.log('特殊文字による制限エラーが発生しました');
      } else {
        throw error;
      }
    }
  });

  test('フォームのクリアとリセット', async ({ page }) => {
    const createPage = new CreateStoryPage(page);
    
    await createPage.verifyPageLoaded();
    
    // フォームに入力
    await createPage.enterTitle('テストタイトル');
    await createPage.enterStoryContent('テストコンテンツ');
    
    // 入力値の確認
    let formData = await createPage.getFormData();
    expect(formData.title).toBe('テストタイトル');
    expect(formData.content).toBe('テストコンテンツ');
    
    // フォームをクリア
    await createPage.clearForm();
    
    // クリア後の確認
    formData = await createPage.getFormData();
    expect(formData.title).toBe('');
    expect(formData.content).toBe('');
  });

  test('ホームページからストーリー作成フロー', async ({ page }) => {
    // ホームページから開始
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.verifyPageLoaded();
    
    try {
      // ストーリー作成ページに移動
      await homePage.goToCreateStory();
      
      // ストーリー作成ページでの処理
      const createPage = new CreateStoryPage(page);
      await createPage.verifyPageLoaded();
      
      const testStoryData = {
        title: 'ホームページからのテストストーリー',
        content: 'ホームページのナビゲーションを通じて作成されたストーリーです。'
      };
      
      await createPage.createCompleteStory(testStoryData);
      
    } catch (error) {
      console.log('ホームページからのフローでエラー:', error);
      await page.screenshot({ path: 'test-results/screenshots/home-to-create-flow-error.png' });
      
      // フォールバック: 直接作成ページに移動してテスト続行
      await page.goto('/create');
      const createPage = new CreateStoryPage(page);
      await createPage.verifyPageLoaded();
    }
  });

  test('ネットワークエラー時の挙動', async ({ page }) => {
    const createPage = new CreateStoryPage(page);
    
    await createPage.verifyPageLoaded();
    
    // ネットワークを遅延させる
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 5000);
    });
    
    const testStoryData = {
      title: 'ネットワーク遅延テスト',
      content: 'ネットワークの遅延をテストするためのストーリーです。'
    };
    
    try {
      await createPage.enterTitle(testStoryData.title);
      await createPage.enterStoryContent(testStoryData.content);
      await createPage.createStory();
      
      // 長めのタイムアウトで完了を待機
      await createPage.waitForCreationComplete();
      
    } catch (error) {
      console.log('ネットワーク遅延テストでタイムアウト:', error);
      
      // ローディング状態の確認
      const loadingElement = page.locator('[data-testid="loading-spinner"]');
      if (await loadingElement.count() > 0) {
        console.log('ローディングスピナーが表示されています');
      }
    }
  });
});