const { test, expect } = require('@playwright/test');

test.describe('アプリ初期化処理', () => {
  test('初期状態でUIが無効化されている', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // 初期状態でローディングが表示されている
    const loading = page.locator('#loading');
    await expect(loading).toBeVisible();

    // 初期状態で入力フィールドが無効化されている
    const departureInput = page.locator('#departure-stop');
    const arrivalInput = page.locator('#arrival-stop');
    const searchButton = page.locator('#search-button');

    await expect(departureInput).toBeDisabled();
    await expect(arrivalInput).toBeDisabled();
    await expect(searchButton).toBeDisabled();

    // 時刻オプションのラジオボタンが無効化されている
    const timeOptions = page.locator('input[name="time-option"]');
    const count = await timeOptions.count();
    for (let i = 0; i < count; i++) {
      await expect(timeOptions.nth(i)).toBeDisabled();
    }
  });

  test('データ読み込み完了後にUIが有効化される', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ（最大5秒）
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // ローディングが非表示になっている
    const loading = page.locator('#loading');
    await expect(loading).toBeHidden();

    // 入力フィールドが有効化されている
    const departureInput = page.locator('#departure-stop');
    const arrivalInput = page.locator('#arrival-stop');

    await expect(departureInput).toBeEnabled();
    await expect(arrivalInput).toBeEnabled();

    // 時刻オプションのラジオボタンが有効化されている
    const timeOptions = page.locator('input[name="time-option"]');
    const count = await timeOptions.count();
    for (let i = 0; i < count; i++) {
      await expect(timeOptions.nth(i)).toBeEnabled();
    }

    // プレースホルダーが表示されている
    const placeholder = page.locator('.results-placeholder');
    await expect(placeholder).toBeVisible();
  });

  test('データ読み込みが3秒以内に完了する', async ({ page }) => {
    const startTime = Date.now();

    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    const loadTime = Date.now() - startTime;
    console.log(`データ読み込み時間: ${loadTime}ms`);

    // 3秒以内に完了していることを確認
    expect(loadTime).toBeLessThan(3000);
  });

  test('コンソールログに初期化メッセージが出力される', async ({ page }) => {
    const consoleMessages = [];

    // コンソールメッセージをキャプチャ
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 期待されるログメッセージが出力されているか確認
    const hasLoadingMessage = consoleMessages.some(msg => 
      msg.includes('データを読み込んでいます')
    );
    const hasCompletionMessage = consoleMessages.some(msg => 
      msg.includes('データの読み込みが完了しました')
    );
    const hasSearchControllerMessage = consoleMessages.some(msg => 
      msg.includes('SearchControllerの初期化が完了しました')
    );
    const hasUIMessage = consoleMessages.some(msg => 
      msg.includes('UIの初期化が完了しました')
    );

    expect(hasLoadingMessage).toBeTruthy();
    expect(hasCompletionMessage).toBeTruthy();
    expect(hasSearchControllerMessage).toBeTruthy();
    expect(hasUIMessage).toBeTruthy();
  });
});

test.describe('データ読み込みエラー処理', () => {
  test('データ読み込み失敗時にエラーメッセージとリトライボタンが表示される', async ({ page }) => {
    // ネットワークをブロックしてデータ読み込みを失敗させる（GTFS ZIPファイル）
    await page.route('**/data/**/*.zip', route => route.abort());

    // ページを開く
    await page.goto('http://localhost:8788/');

    // エラーメッセージが表示されるまで待つ（最大10秒）
    const errorMessage = page.locator('#error-message');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // エラーメッセージの内容を確認
    const errorText = await errorMessage.textContent();
    expect(errorText).toContain('データの読み込みに失敗しました');

    // リトライボタンが表示されている
    const retryButton = page.locator('#retry-button');
    await expect(retryButton).toBeVisible();

    // リトライボタンのテキストを確認
    const retryText = await retryButton.textContent();
    expect(retryText).toBe('再読み込み');

    // ローディングが非表示になっている
    const loading = page.locator('#loading');
    await expect(loading).toBeHidden();

    // UIが無効のまま
    const departureInput = page.locator('#departure-stop');
    await expect(departureInput).toBeDisabled();
  });

  test('リトライボタンをクリックするとページがリロードされる', async ({ page }) => {
    // ネットワークをブロックしてデータ読み込みを失敗させる（GTFS ZIPファイル）
    await page.route('**/data/**/*.zip', route => route.abort());

    // ページを開く
    await page.goto('http://localhost:8788/');

    // エラーメッセージが表示されるまで待つ（最大10秒）
    const errorMessage = page.locator('#error-message');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // リトライボタンが表示されるまで待つ
    const retryButton = page.locator('#retry-button');
    await expect(retryButton).toBeVisible();

    // ネットワークブロックを解除
    await page.unroute('**/data/**/*.zip');

    // ページリロードを監視
    const navigationPromise = page.waitForNavigation();

    // リトライボタンをクリック
    await retryButton.click();

    // ページがリロードされることを確認
    await navigationPromise;

    // リロード後、データ読み込みが成功することを確認
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // UIが有効化されている
    const departureInput = page.locator('#departure-stop');
    await expect(departureInput).toBeEnabled();
  });
});
