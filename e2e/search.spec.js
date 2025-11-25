/**
 * 時刻表検索機能の統合E2Eテスト
 * バス停選択、検索実行、結果表示、エラーハンドリング、レスポンシブデザインをテスト
 */

const { test, expect } = require('@playwright/test');

test.describe('時刻表検索機能 - 統合テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8788');
    
    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });
  });

  test.describe('バス停選択フロー', () => {
    test('乗車バス停と降車バス停を選択できる', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // 乗車バス停を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();
      await expect(departureInput).not.toHaveValue('');

      // 降車バス停を選択
      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();
      await expect(arrivalInput).not.toHaveValue('');

      // 検索ボタンが有効になることを確認
      const searchButton = page.locator('#search-button');
      await expect(searchButton).toBeEnabled();
    });

    test('インクリメンタルサーチで候補が絞り込まれる', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const suggestions = page.locator('#departure-suggestions');

      // 1文字入力
      await departureInput.fill('佐');
      await expect(suggestions).toBeVisible();
      
      // 候補数を取得
      const items1 = suggestions.locator('.suggestion-item:not(.suggestion-item-empty)');
      const count1 = await items1.count();
      expect(count1).toBeGreaterThan(0);

      // さらに文字を追加して絞り込み
      await departureInput.fill('佐賀駅');
      
      // 候補数が減ることを確認
      const items2 = suggestions.locator('.suggestion-item:not(.suggestion-item-empty)');
      const count2 = await items2.count();
      expect(count2).toBeLessThanOrEqual(count1);
    });

    test('同一バス停選択時にエラーが表示される', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const errorMessage = page.locator('#error-message');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // 乗車バス停を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      const firstItem = departureSuggestions.locator('.suggestion-item').first();
      const stopName = await firstItem.textContent();
      await firstItem.click();

      // 同じバス停を降車バス停に選択
      await arrivalInput.fill(stopName);
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // エラーメッセージが表示されることを確認
      await expect(errorMessage).toBeVisible();
      const errorText = await errorMessage.textContent();
      expect(errorText).toContain('異なる停留所を選択してください');
    });

    test('バス停選択後に候補リストが非表示になる', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const suggestions = page.locator('#departure-suggestions');

      await departureInput.fill('佐賀駅');
      await expect(suggestions).toBeVisible();
      
      await suggestions.locator('.suggestion-item').first().click();
      
      // 候補リストが非表示になることを確認
      await expect(suggestions).not.toBeVisible();
    });
  });

  test.describe('検索実行フロー', () => {
    test('検索を実行して結果が表示される', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const resultsContainer = page.locator('#results-container');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // バス停を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 検索実行
      await searchButton.click();

      // ローディング表示を確認
      const loading = page.locator('#loading');
      await expect(loading).toBeVisible();

      // 結果が表示されるまで待つ
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });
      
      // ローディングが非表示になることを確認
      await expect(loading).not.toBeVisible();

      // 結果リストが表示されることを確認
      const resultItems = page.locator('.result-item');
      const count = await resultItems.count();
      expect(count).toBeGreaterThan(0);
    });

    test('検索が2秒以内に完了する', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const resultsContainer = page.locator('#results-container');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // バス停を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 検索実行時間を計測
      const startTime = Date.now();
      await searchButton.click();

      // 結果が表示されるまで待つ
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });
      
      const searchTime = Date.now() - startTime;
      console.log(`検索時間: ${searchTime}ms`);
      
      // 2秒以内に完了していることを確認
      expect(searchTime).toBeLessThan(2000);
    });

    test('時刻指定で検索できる', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const departureTimeRadio = page.locator('input[name="time-option"][value="departure-time"]');
      const hourInput = page.locator('#time-hour');
      const minuteInput = page.locator('#time-minute');
      const searchButton = page.locator('#search-button');
      const resultsContainer = page.locator('#results-container');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // バス停を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 時刻指定
      await departureTimeRadio.click();
      await hourInput.fill('09');
      await minuteInput.fill('00');

      // 検索実行
      await searchButton.click();

      // 結果が表示されることを確認
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });
    });

    test('始発検索ができる', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const firstBusRadio = page.locator('input[name="time-option"][value="first-bus"]');
      const searchButton = page.locator('#search-button');
      const resultsContainer = page.locator('#results-container');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // バス停を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 始発を選択
      await firstBusRadio.click();

      // 検索実行
      await searchButton.click();

      // 結果が表示されることを確認
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });
    });

    test('終電検索ができる', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const lastBusRadio = page.locator('input[name="time-option"][value="last-bus"]');
      const searchButton = page.locator('#search-button');
      const resultsContainer = page.locator('#results-container');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // バス停を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 終電を選択
      await lastBusRadio.click();

      // 検索実行
      await searchButton.click();

      // 結果が表示されることを確認
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('検索結果表示確認', () => {
    test('検索結果に必要な情報が全て表示される', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // バス停を選択して検索
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      await searchButton.click();

      // 結果が表示されるまで待つ
      const resultsContainer = page.locator('#results-container');
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 最初の結果アイテムを取得
      const firstResult = page.locator('.result-item').first();
      await expect(firstResult).toBeVisible();

      // 必要な情報が表示されていることを確認
      const resultText = await firstResult.textContent();
      
      // 出発時刻（HH:MM形式）
      expect(resultText).toMatch(/\d{2}:\d{2}/);
      
      // 到着時刻
      expect(resultText).toContain('→');
      
      // 所要時間
      expect(resultText).toMatch(/\d+分/);
      
      // 運賃
      expect(resultText).toMatch(/\d+円/);
      
      // 事業者名（佐賀市営バス、祐徳バス、西鉄バスのいずれか）
      const hasOperator = resultText.includes('佐賀市営バス') || 
                         resultText.includes('祐徳バス') || 
                         resultText.includes('西鉄バス');
      expect(hasOperator).toBeTruthy();
    });

    test('検索結果が時刻順にソートされている', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // バス停を選択して検索
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      await searchButton.click();

      // 結果が表示されるまで待つ
      const resultsContainer = page.locator('#results-container');
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 結果アイテムを取得
      const resultItems = page.locator('.result-item');
      const count = await resultItems.count();
      
      if (count > 1) {
        // 各結果の出発時刻を取得
        const times = [];
        for (let i = 0; i < Math.min(count, 5); i++) {
          const item = resultItems.nth(i);
          const text = await item.textContent();
          const timeMatch = text.match(/(\d{2}):(\d{2})/);
          if (timeMatch) {
            const hour = parseInt(timeMatch[1], 10);
            const minute = parseInt(timeMatch[2], 10);
            times.push(hour * 60 + minute);
          }
        }
        
        // 時刻が昇順にソートされていることを確認
        for (let i = 1; i < times.length; i++) {
          expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
        }
      }
    });

    test('検索結果が最大20件表示される', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // バス停を選択して検索
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      await searchButton.click();

      // 結果が表示されるまで待つ
      const resultsContainer = page.locator('#results-container');
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 結果アイテム数を確認
      const resultItems = page.locator('.result-item');
      const count = await resultItems.count();
      
      // 最大20件であることを確認
      expect(count).toBeLessThanOrEqual(20);
    });

    test('検索結果0件時にメッセージが表示される', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const departureTimeRadio = page.locator('input[name="time-option"][value="departure-time"]');
      const hourInput = page.locator('#time-hour');
      const minuteInput = page.locator('#time-minute');
      const searchButton = page.locator('#search-button');
      const resultsContainer = page.locator('#results-container');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // バス停を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 深夜の時刻を指定（該当便なし）
      await departureTimeRadio.click();
      await hourInput.fill('23');
      await minuteInput.fill('59');

      // 検索実行
      await searchButton.click();

      // 結果コンテナが表示されるまで待つ
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 「該当する便が見つかりません」メッセージが表示されることを確認
      const noResultsMessage = page.locator('.no-results-message');
      await expect(noResultsMessage).toBeVisible();
      
      const messageText = await noResultsMessage.textContent();
      expect(messageText).toContain('該当する便が見つかりませんでした');
    });
  });

  test.describe('エラーハンドリング確認', () => {
    test('乗車バス停未選択時にエラーが表示される', async ({ page }) => {
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const errorMessage = page.locator('#error-message');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // 降車バス停のみ選択
      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 検索ボタンは無効のまま
      await expect(searchButton).toBeDisabled();
    });

    test('降車バス停未選択時にエラーが表示される', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const searchButton = page.locator('#search-button');
      const departureSuggestions = page.locator('#departure-suggestions');

      // 乗車バス停のみ選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      // 検索ボタンは無効のまま
      await expect(searchButton).toBeDisabled();
    });

    test('エラーメッセージが条件修正後にクリアされる', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const errorMessage = page.locator('#error-message');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // 同一バス停を選択してエラーを発生させる
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      const firstItem = departureSuggestions.locator('.suggestion-item').first();
      const stopName = await firstItem.textContent();
      await firstItem.click();

      await arrivalInput.fill(stopName);
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // エラーメッセージが表示されることを確認
      await expect(errorMessage).toBeVisible();

      // 降車バス停を変更
      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // エラーメッセージがクリアされることを確認
      await expect(errorMessage).not.toBeVisible();
    });
  });

  test.describe('レスポンシブデザイン', () => {
    test('スマートフォン表示（375px）で正しくレイアウトされる', async ({ page }) => {
      // ビューポートをiPhone SE相当に設定
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('http://localhost:8788');
      
      // データ読み込み完了を待つ
      await page.waitForFunction(() => {
        const departureInput = document.getElementById('departure-stop');
        return departureInput && !departureInput.disabled;
      }, { timeout: 5000 });

      // 主要要素が表示されることを確認
      const header = page.locator('.header');
      const searchForm = page.locator('.search-form');
      const resultsArea = page.locator('.results-area');

      await expect(header).toBeVisible();
      await expect(searchForm).toBeVisible();
      await expect(resultsArea).toBeVisible();

      // タップターゲットのサイズを確認（最小44x44px）
      const searchButton = page.locator('#search-button');
      const buttonBox = await searchButton.boundingBox();
      
      if (buttonBox) {
        expect(buttonBox.height).toBeGreaterThanOrEqual(44);
        expect(buttonBox.width).toBeGreaterThanOrEqual(44);
      }
    });

    test('タブレット表示（768px）で正しくレイアウトされる', async ({ page }) => {
      // ビューポートをiPad相当に設定
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto('http://localhost:8788');
      
      // データ読み込み完了を待つ
      await page.waitForFunction(() => {
        const departureInput = document.getElementById('departure-stop');
        return departureInput && !departureInput.disabled;
      }, { timeout: 5000 });

      // 主要要素が表示されることを確認
      const header = page.locator('.header');
      const searchForm = page.locator('.search-form');
      const resultsArea = page.locator('.results-area');

      await expect(header).toBeVisible();
      await expect(searchForm).toBeVisible();
      await expect(resultsArea).toBeVisible();
    });

    test('デスクトップ表示（1920px）で正しくレイアウトされる', async ({ page }) => {
      // ビューポートをフルHDに設定
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      await page.goto('http://localhost:8788');
      
      // データ読み込み完了を待つ
      await page.waitForFunction(() => {
        const departureInput = document.getElementById('departure-stop');
        return departureInput && !departureInput.disabled;
      }, { timeout: 5000 });

      // 主要要素が表示されることを確認
      const header = page.locator('.header');
      const searchForm = page.locator('.search-form');
      const resultsArea = page.locator('.results-area');

      await expect(header).toBeVisible();
      await expect(searchForm).toBeVisible();
      await expect(resultsArea).toBeVisible();
    });

    test('異なる画面サイズで検索機能が正常に動作する', async ({ page }) => {
      const viewports = [
        { width: 375, height: 667, name: 'スマートフォン' },
        { width: 768, height: 1024, name: 'タブレット' },
        { width: 1920, height: 1080, name: 'デスクトップ' }
      ];

      for (const viewport of viewports) {
        console.log(`${viewport.name}でテスト中...`);
        
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('http://localhost:8788');
        
        // データ読み込み完了を待つ
        await page.waitForFunction(() => {
          const departureInput = document.getElementById('departure-stop');
          return departureInput && !departureInput.disabled;
        }, { timeout: 5000 });

        const departureInput = page.locator('#departure-stop');
        const arrivalInput = page.locator('#arrival-stop');
        const searchButton = page.locator('#search-button');
        const resultsContainer = page.locator('#results-container');
        const departureSuggestions = page.locator('#departure-suggestions');
        const arrivalSuggestions = page.locator('#arrival-suggestions');

        // バス停を選択
        await departureInput.fill('佐賀駅');
        await expect(departureSuggestions).toBeVisible();
        await departureSuggestions.locator('.suggestion-item').first().click();

        await arrivalInput.fill('県庁前');
        await expect(arrivalSuggestions).toBeVisible();
        await arrivalSuggestions.locator('.suggestion-item').first().click();

        // 検索実行
        await searchButton.click();

        // 結果が表示されることを確認
        await expect(resultsContainer).toBeVisible({ timeout: 3000 });
        
        const resultItems = page.locator('.result-item');
        const count = await resultItems.count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });
});
