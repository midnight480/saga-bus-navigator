/**
 * バス停検索UI（インクリメンタルサーチ）のE2Eテスト
 */

const { test, expect } = require('@playwright/test');

test.describe('バス停検索UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
    
    // データの読み込みを待つ
    await page.waitForFunction(() => {
      return window.uiController !== undefined;
    }, { timeout: 5000 });
  });

  test('乗車バス停の入力で候補が表示される', async ({ page }) => {
    const departureInput = page.locator('#departure-stop');
    const suggestions = page.locator('#departure-suggestions');

    // 1文字入力
    await departureInput.fill('佐');
    
    // 候補リストが表示されることを確認
    await expect(suggestions).toBeVisible();
    
    // 候補が表示されることを確認
    const items = suggestions.locator('.suggestion-item:not(.suggestion-item-empty)');
    await expect(items).not.toHaveCount(0);
  });

  test('降車バス停の入力で候補が表示される', async ({ page }) => {
    const arrivalInput = page.locator('#arrival-stop');
    const suggestions = page.locator('#arrival-suggestions');

    // 1文字入力
    await arrivalInput.fill('県');
    
    // 候補リストが表示されることを確認
    await expect(suggestions).toBeVisible();
    
    // 候補が表示されることを確認
    const items = suggestions.locator('.suggestion-item:not(.suggestion-item-empty)');
    await expect(items).not.toHaveCount(0);
  });

  test('候補をクリックして選択できる', async ({ page }) => {
    const departureInput = page.locator('#departure-stop');
    const suggestions = page.locator('#departure-suggestions');

    // 入力
    await departureInput.fill('佐賀駅');
    
    // 候補が表示されるまで待つ
    await expect(suggestions).toBeVisible();
    
    // 最初の候補をクリック
    const firstItem = suggestions.locator('.suggestion-item').first();
    await firstItem.click();
    
    // 入力フィールドに値が設定されることを確認
    await expect(departureInput).not.toHaveValue('');
    
    // 候補リストが非表示になることを確認
    await expect(suggestions).not.toBeVisible();
  });

  test('同一バス停を選択するとエラーが表示される', async ({ page }) => {
    const departureInput = page.locator('#departure-stop');
    const arrivalInput = page.locator('#arrival-stop');
    const errorMessage = page.locator('#error-message');
    const departureSuggestions = page.locator('#departure-suggestions');
    const arrivalSuggestions = page.locator('#arrival-suggestions');

    // 乗車バス停を選択
    await departureInput.fill('佐賀駅');
    await expect(departureSuggestions).toBeVisible();
    const firstDeparture = departureSuggestions.locator('.suggestion-item').first();
    const stopName = await firstDeparture.textContent();
    await firstDeparture.click();

    // 同じバス停を降車バス停に選択
    await arrivalInput.fill(stopName);
    await expect(arrivalSuggestions).toBeVisible();
    const firstArrival = arrivalSuggestions.locator('.suggestion-item').first();
    await firstArrival.click();

    // エラーメッセージが表示されることを確認
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('異なる停留所を選択してください');
  });

  test('両方のバス停を選択すると検索ボタンが有効になる', async ({ page }) => {
    const departureInput = page.locator('#departure-stop');
    const arrivalInput = page.locator('#arrival-stop');
    const searchButton = page.locator('#search-button');
    const departureSuggestions = page.locator('#departure-suggestions');
    const arrivalSuggestions = page.locator('#arrival-suggestions');

    // 初期状態では無効
    await expect(searchButton).toBeDisabled();

    // 乗車バス停を選択
    await departureInput.fill('佐賀駅');
    await expect(departureSuggestions).toBeVisible();
    await departureSuggestions.locator('.suggestion-item').first().click();

    // まだ無効
    await expect(searchButton).toBeDisabled();

    // 降車バス停を選択
    await arrivalInput.fill('県庁前');
    await expect(arrivalSuggestions).toBeVisible();
    await arrivalSuggestions.locator('.suggestion-item').first().click();

    // 有効になる
    await expect(searchButton).toBeEnabled();
  });

  test('入力をクリアすると候補リストが非表示になる', async ({ page }) => {
    const departureInput = page.locator('#departure-stop');
    const suggestions = page.locator('#departure-suggestions');

    // 入力
    await departureInput.fill('佐賀駅');
    await expect(suggestions).toBeVisible();

    // クリア
    await departureInput.fill('');

    // 候補リストが非表示になることを確認
    await expect(suggestions).not.toBeVisible();
  });

  test('該当するバス停がない場合はメッセージが表示される', async ({ page }) => {
    const departureInput = page.locator('#departure-stop');
    const suggestions = page.locator('#departure-suggestions');

    // 存在しないバス停名を入力
    await departureInput.fill('存在しないバス停名xyz123');
    
    // 候補リストが表示されることを確認
    await expect(suggestions).toBeVisible();
    
    // 「該当するバス停が見つかりません」メッセージが表示されることを確認
    const emptyItem = suggestions.locator('.suggestion-item-empty');
    await expect(emptyItem).toBeVisible();
    await expect(emptyItem).toContainText('該当するバス停が見つかりません');
  });

  test('キーボードで候補を選択できる（ArrowDown/ArrowUp/Enter）', async ({ page }) => {
    const departureInput = page.locator('#departure-stop');
    const suggestions = page.locator('#departure-suggestions');

    // 入力
    await departureInput.fill('佐賀');
    await expect(suggestions).toBeVisible();

    // ArrowDownで次の候補に移動
    await departureInput.press('ArrowDown');
    
    // アクティブな候補が存在することを確認
    const activeItem = suggestions.locator('.suggestion-item-active');
    await expect(activeItem).toHaveCount(1);

    // Enterで選択
    await departureInput.press('Enter');
    
    // 入力フィールドに値が設定されることを確認
    await expect(departureInput).not.toHaveValue('');
    
    // 候補リストが非表示になることを確認
    await expect(suggestions).not.toBeVisible();
  });

  test('Escapeキーで候補リストを閉じることができる', async ({ page }) => {
    const departureInput = page.locator('#departure-stop');
    const suggestions = page.locator('#departure-suggestions');

    // 入力
    await departureInput.fill('佐賀駅');
    await expect(suggestions).toBeVisible();

    // Escapeキーを押す
    await departureInput.press('Escape');

    // 候補リストが非表示になることを確認
    await expect(suggestions).not.toBeVisible();
  });

  test('外側をクリックすると候補リストが閉じる', async ({ page }) => {
    const departureInput = page.locator('#departure-stop');
    const suggestions = page.locator('#departure-suggestions');

    // 入力
    await departureInput.fill('佐賀駅');
    await expect(suggestions).toBeVisible();

    // 外側をクリック
    await page.locator('.header').click();

    // 候補リストが非表示になることを確認
    await expect(suggestions).not.toBeVisible();
  });
});
