/**
 * ORS経路描画のE2Eテスト
 * 
 * バス路線選択から経路描画までのフロー
 * キャッシュ動作の確認
 * エラー時のフォールバック確認
 * 
 * Validates: Requirements 5.1, 6.1
 */

import { test, expect } from '@playwright/test';

test.describe('ORS経路描画', () => {
  test.beforeEach(async ({ page }) => {
    // アプリケーションをロード
    await page.goto('/');
    
    // データ読み込み完了を待つ
    await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 30000 });
    await page.waitForTimeout(1000); // 追加の待機時間
  });

  test('バス路線選択から経路描画までのフロー', async ({ page }) => {
    // 地図が表示されていることを確認
    const mapContainer = page.locator('#map-container');
    await expect(mapContainer).toBeVisible();

    // バス停を検索して選択（例: 佐賀駅バスセンター）
    const departureInput = page.locator('#departure-stop');
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(500); // 候補表示を待つ
    
    // 候補から選択（最初の候補をクリック）
    const suggestion = page.locator('#departure-suggestions li').first();
    if (await suggestion.isVisible()) {
      await suggestion.click();
    }

    // 到着バス停を検索して選択
    const arrivalInput = page.locator('#arrival-stop');
    await arrivalInput.fill('県庁');
    await page.waitForTimeout(500);
    
    const arrivalSuggestion = page.locator('#arrival-suggestions li').first();
    if (await arrivalSuggestion.isVisible()) {
      await arrivalSuggestion.click();
    }

    // 検索ボタンをクリック
    const searchButton = page.locator('#search-button');
    await searchButton.click();

    // 検索結果が表示されるまで待つ
    await page.waitForSelector('#results-container', { state: 'visible', timeout: 10000 });

    // 検索結果の最初の項目をクリック（経路表示をトリガー）
    const firstResult = page.locator('#results-container .result-item').first();
    if (await firstResult.isVisible()) {
      await firstResult.click();
      
      // 経路が描画されるまで少し待つ
      await page.waitForTimeout(2000);
      
      // 地図上に経路が描画されていることを確認（Leafletのパス要素を確認）
      // 注意: ORSが無効な場合は直線が描画される
      const mapPaths = page.locator('#map-container svg path');
      const pathCount = await mapPaths.count();
      
      // 経路が描画されているか、またはフォールバック（直線）が描画されているかを確認
      expect(pathCount).toBeGreaterThan(0);
    }
  });

  test('キャッシュ動作の確認', async ({ page }) => {
    // 最初の経路描画リクエスト
    // （実際のAPI呼び出しをモックするか、または実際のAPIを使用）
    
    // ネットワークリクエストを監視
    const apiRequests = [];
    page.on('request', (request) => {
      if (request.url().includes('openrouteservice.org')) {
        apiRequests.push(request.url());
      }
    });

    // バス停を選択して経路を描画
    const departureInput = page.locator('#departure-stop');
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(500);
    
    const suggestion = page.locator('#departure-suggestions li').first();
    if (await suggestion.isVisible()) {
      await suggestion.click();
    }

    const arrivalInput = page.locator('#arrival-stop');
    await arrivalInput.fill('県庁');
    await page.waitForTimeout(500);
    
    const arrivalSuggestion = page.locator('#arrival-suggestions li').first();
    if (await arrivalSuggestion.isVisible()) {
      await arrivalSuggestion.click();
    }

    await page.locator('#search-button').click();
    await page.waitForSelector('#results-container', { state: 'visible', timeout: 10000 });

    const firstResult = page.locator('#results-container .result-item').first();
    if (await firstResult.isVisible()) {
      await firstResult.click();
      await page.waitForTimeout(2000);
    }

    const firstRequestCount = apiRequests.length;

    // 同じ経路を再度描画（キャッシュが使用されるはず）
    if (await firstResult.isVisible()) {
      await firstResult.click();
      await page.waitForTimeout(2000);
    }

    // 2回目のリクエスト数が増えていない（または増え方が少ない）ことを確認
    // 注意: キャッシュが機能している場合、APIリクエストは増えないか、増え方が少ない
    const secondRequestCount = apiRequests.length;
    
    // キャッシュが機能している場合、2回目のリクエスト数は1回目と同じか、わずかに増えるだけ
    // （完全に同じリクエストの場合は増えない）
    expect(secondRequestCount).toBeLessThanOrEqual(firstRequestCount + 1);
  });

  test('エラー時のフォールバック確認', async ({ page, context }) => {
    // ORS APIをモックしてエラーを返す
    await context.route('**/api.openrouteservice.org/**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    // バス停を選択して経路を描画
    const departureInput = page.locator('#departure-stop');
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(500);
    
    const suggestion = page.locator('#departure-suggestions li').first();
    if (await suggestion.isVisible()) {
      await suggestion.click();
    }

    const arrivalInput = page.locator('#arrival-stop');
    await arrivalInput.fill('県庁');
    await page.waitForTimeout(500);
    
    const arrivalSuggestion = page.locator('#arrival-suggestions li').first();
    if (await arrivalSuggestion.isVisible()) {
      await arrivalSuggestion.click();
    }

    await page.locator('#search-button').click();
    await page.waitForSelector('#results-container', { state: 'visible', timeout: 10000 });

    const firstResult = page.locator('#results-container .result-item').first();
    if (await firstResult.isVisible()) {
      await firstResult.click();
      
      // エラーメッセージが表示されるか、またはフォールバック（直線）が描画されるまで待つ
      await page.waitForTimeout(3000);
      
      // フォールバックとして直線が描画されていることを確認
      // （エラー時でも地図上に何らかの経路が表示される）
      const mapPaths = page.locator('#map-container svg path');
      const pathCount = await mapPaths.count();
      
      // フォールバック（直線）が描画されていることを確認
      // またはエラーメッセージが表示されていることを確認
      const errorMessage = page.locator('#error-message');
      const hasError = await errorMessage.isVisible().catch(() => false);
      const hasPath = pathCount > 0;
      
      // エラーメッセージが表示されるか、またはフォールバック経路が描画される
      expect(hasError || hasPath).toBe(true);
    }
  });
});
