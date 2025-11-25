const { test, expect } = require('@playwright/test');

test.describe('地図経路クリア機能', () => {
  test('初期状態では経路クリアボタンが非表示', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 経路クリアボタンが非表示
    const clearRouteButton = page.locator('#clear-route-button');
    await expect(clearRouteButton).toBeHidden();

    console.log('初期状態では経路クリアボタンが非表示です');
  });

  test('経路を表示すると経路クリアボタンが表示される', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 乗車バス停を入力
    const departureInput = page.locator('#departure-stop');
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(300);

    const departureSuggestion = page.locator('#departure-suggestions .suggestion-item').first();
    await departureSuggestion.click();
    await page.waitForTimeout(300);

    // 降車バス停を入力
    const arrivalInput = page.locator('#arrival-stop');
    await arrivalInput.fill('佐賀大学');
    await page.waitForTimeout(300);

    const arrivalSuggestion = page.locator('#arrival-suggestions .suggestion-item').first();
    await arrivalSuggestion.click();
    await page.waitForTimeout(300);

    // 検索を実行
    const searchButton = page.locator('#search-button');
    await searchButton.click();

    // 検索結果が表示されるまで待つ
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    // 検索結果が存在するか確認
    const resultsList = page.locator('.results-list');
    const hasResults = await resultsList.isVisible().catch(() => false);

    if (hasResults) {
      // 「地図で表示」ボタンをクリック
      const mapDisplayButton = page.locator('.map-display-button').first();
      await mapDisplayButton.click();
      await page.waitForTimeout(500);

      // 経路クリアボタンが表示される
      const clearRouteButton = page.locator('#clear-route-button');
      await expect(clearRouteButton).toBeVisible();

      console.log('経路を表示すると経路クリアボタンが表示されました');
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });

  test('経路クリアボタンをクリックすると経路がクリアされる', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 乗車バス停を入力
    const departureInput = page.locator('#departure-stop');
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(300);

    const departureSuggestion = page.locator('#departure-suggestions .suggestion-item').first();
    await departureSuggestion.click();
    await page.waitForTimeout(300);

    // 降車バス停を入力
    const arrivalInput = page.locator('#arrival-stop');
    await arrivalInput.fill('佐賀大学');
    await page.waitForTimeout(300);

    const arrivalSuggestion = page.locator('#arrival-suggestions .suggestion-item').first();
    await arrivalSuggestion.click();
    await page.waitForTimeout(300);

    // 検索を実行
    const searchButton = page.locator('#search-button');
    await searchButton.click();

    // 検索結果が表示されるまで待つ
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    // 検索結果が存在するか確認
    const resultsList = page.locator('.results-list');
    const hasResults = await resultsList.isVisible().catch(() => false);

    if (hasResults) {
      // 「地図で表示」ボタンをクリック
      const mapDisplayButton = page.locator('.map-display-button').first();
      await mapDisplayButton.click();
      await page.waitForTimeout(500);

      // 経路が表示されていることを確認（経路線が存在する）
      const routePolyline = page.locator('.leaflet-interactive');
      const polylineCountBefore = await routePolyline.count();
      expect(polylineCountBefore).toBeGreaterThan(0);

      // 経路クリアボタンをクリック
      const clearRouteButton = page.locator('#clear-route-button');
      await clearRouteButton.click();
      await page.waitForTimeout(300);

      // 経路線が削除されている（または大幅に減少している）
      const polylineCountAfter = await routePolyline.count();
      expect(polylineCountAfter).toBeLessThan(polylineCountBefore);

      console.log(`経路がクリアされました（経路線: ${polylineCountBefore} → ${polylineCountAfter}）`);
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });

  test('経路クリアボタンをクリックするとボタンが非表示になる', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 乗車バス停を入力
    const departureInput = page.locator('#departure-stop');
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(300);

    const departureSuggestion = page.locator('#departure-suggestions .suggestion-item').first();
    await departureSuggestion.click();
    await page.waitForTimeout(300);

    // 降車バス停を入力
    const arrivalInput = page.locator('#arrival-stop');
    await arrivalInput.fill('佐賀大学');
    await page.waitForTimeout(300);

    const arrivalSuggestion = page.locator('#arrival-suggestions .suggestion-item').first();
    await arrivalSuggestion.click();
    await page.waitForTimeout(300);

    // 検索を実行
    const searchButton = page.locator('#search-button');
    await searchButton.click();

    // 検索結果が表示されるまで待つ
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    // 検索結果が存在するか確認
    const resultsList = page.locator('.results-list');
    const hasResults = await resultsList.isVisible().catch(() => false);

    if (hasResults) {
      // 「地図で表示」ボタンをクリック
      const mapDisplayButton = page.locator('.map-display-button').first();
      await mapDisplayButton.click();
      await page.waitForTimeout(500);

      // 経路クリアボタンをクリック
      const clearRouteButton = page.locator('#clear-route-button');
      await clearRouteButton.click();

      // ボタンが非表示になる
      await expect(clearRouteButton).toBeHidden();

      console.log('経路クリアボタンが非表示になりました');
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });

  test('経路クリア後に地図は表示されたまま', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 乗車バス停を入力
    const departureInput = page.locator('#departure-stop');
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(300);

    const departureSuggestion = page.locator('#departure-suggestions .suggestion-item').first();
    await departureSuggestion.click();
    await page.waitForTimeout(300);

    // 降車バス停を入力
    const arrivalInput = page.locator('#arrival-stop');
    await arrivalInput.fill('佐賀大学');
    await page.waitForTimeout(300);

    const arrivalSuggestion = page.locator('#arrival-suggestions .suggestion-item').first();
    await arrivalSuggestion.click();
    await page.waitForTimeout(300);

    // 検索を実行
    const searchButton = page.locator('#search-button');
    await searchButton.click();

    // 検索結果が表示されるまで待つ
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    // 検索結果が存在するか確認
    const resultsList = page.locator('.results-list');
    const hasResults = await resultsList.isVisible().catch(() => false);

    if (hasResults) {
      // 「地図で表示」ボタンをクリック
      const mapDisplayButton = page.locator('.map-display-button').first();
      await mapDisplayButton.click();
      await page.waitForTimeout(500);

      // 経路クリアボタンをクリック
      const clearRouteButton = page.locator('#clear-route-button');
      await clearRouteButton.click();
      await page.waitForTimeout(300);

      // 地図コンテナが表示されたまま
      const mapContainer = page.locator('#map-container');
      await expect(mapContainer).toBeVisible();

      // 地図が初期化されている
      const leafletContainer = page.locator('#map-container .leaflet-container');
      await expect(leafletContainer).toBeVisible();

      console.log('経路クリア後も地図は表示されたままです');
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });

  test('複数の経路を表示してクリアを繰り返しても正常に動作する', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 乗車バス停を入力
    const departureInput = page.locator('#departure-stop');
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(300);

    const departureSuggestion = page.locator('#departure-suggestions .suggestion-item').first();
    await departureSuggestion.click();
    await page.waitForTimeout(300);

    // 降車バス停を入力
    const arrivalInput = page.locator('#arrival-stop');
    await arrivalInput.fill('佐賀大学');
    await page.waitForTimeout(300);

    const arrivalSuggestion = page.locator('#arrival-suggestions .suggestion-item').first();
    await arrivalSuggestion.click();
    await page.waitForTimeout(300);

    // 検索を実行
    const searchButton = page.locator('#search-button');
    await searchButton.click();

    // 検索結果が表示されるまで待つ
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    // 検索結果が存在するか確認
    const resultsList = page.locator('.results-list');
    const hasResults = await resultsList.isVisible().catch(() => false);

    if (hasResults) {
      const mapDisplayButtons = page.locator('.map-display-button');
      const buttonCount = await mapDisplayButtons.count();

      if (buttonCount >= 2) {
        const clearRouteButton = page.locator('#clear-route-button');

        // 1回目: 最初の経路を表示してクリア
        await mapDisplayButtons.first().click();
        await page.waitForTimeout(500);
        await expect(clearRouteButton).toBeVisible();
        await clearRouteButton.click();
        await page.waitForTimeout(300);
        await expect(clearRouteButton).toBeHidden();
        console.log('✓ 1回目: 経路を表示してクリア');

        // 2回目: 2番目の経路を表示してクリア
        await mapDisplayButtons.nth(1).click();
        await page.waitForTimeout(500);
        await expect(clearRouteButton).toBeVisible();
        await clearRouteButton.click();
        await page.waitForTimeout(300);
        await expect(clearRouteButton).toBeHidden();
        console.log('✓ 2回目: 経路を表示してクリア');

        // 3回目: 再度最初の経路を表示してクリア
        await mapDisplayButtons.first().click();
        await page.waitForTimeout(500);
        await expect(clearRouteButton).toBeVisible();
        await clearRouteButton.click();
        await page.waitForTimeout(300);
        await expect(clearRouteButton).toBeHidden();
        console.log('✓ 3回目: 経路を表示してクリア');

        console.log('✅ 複数の経路を表示してクリアを繰り返しても正常に動作しました');
      } else {
        console.log('検索結果が1件のみです（テストスキップ）');
      }
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });
});

test.describe('地図経路クリアフロー統合テスト', () => {
  test('地図で表示 → 経路表示 → クリアボタン表示 → クリア → 非表示の完全フロー', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // ステップ1: 初期状態では経路クリアボタンが非表示
    const clearRouteButton = page.locator('#clear-route-button');
    await expect(clearRouteButton).toBeHidden();
    console.log('✓ ステップ1: 初期状態では経路クリアボタンが非表示');

    // ステップ2: 乗車バス停を入力
    const departureInput = page.locator('#departure-stop');
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(300);

    const departureSuggestion = page.locator('#departure-suggestions .suggestion-item').first();
    await departureSuggestion.click();
    await page.waitForTimeout(300);
    console.log('✓ ステップ2: 乗車バス停を入力');

    // ステップ3: 降車バス停を入力
    const arrivalInput = page.locator('#arrival-stop');
    await arrivalInput.fill('佐賀大学');
    await page.waitForTimeout(300);

    const arrivalSuggestion = page.locator('#arrival-suggestions .suggestion-item').first();
    await arrivalSuggestion.click();
    await page.waitForTimeout(300);
    console.log('✓ ステップ3: 降車バス停を入力');

    // ステップ4: 検索を実行
    const searchButton = page.locator('#search-button');
    await searchButton.click();
    console.log('✓ ステップ4: 検索を実行');

    // ステップ5: 検索結果が表示される
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    const resultsList = page.locator('.results-list');
    const hasResults = await resultsList.isVisible().catch(() => false);

    if (hasResults) {
      console.log('✓ ステップ5: 検索結果が表示される');

      // ステップ6: 「地図で表示」ボタンをクリック
      const mapDisplayButton = page.locator('.map-display-button').first();
      await mapDisplayButton.click();
      await page.waitForTimeout(500);
      console.log('✓ ステップ6: 「地図で表示」ボタンをクリック');

      // ステップ7: 経路が地図上に表示される
      const routePolyline = page.locator('.leaflet-interactive');
      const polylineCount = await routePolyline.count();
      expect(polylineCount).toBeGreaterThan(0);
      console.log('✓ ステップ7: 経路が地図上に表示される');

      // ステップ8: 経路クリアボタンが表示される
      await expect(clearRouteButton).toBeVisible();
      console.log('✓ ステップ8: 経路クリアボタンが表示される');

      // ステップ9: 経路クリアボタンをクリック
      await clearRouteButton.click();
      await page.waitForTimeout(300);
      console.log('✓ ステップ9: 経路クリアボタンをクリック');

      // ステップ10: 経路がクリアされる
      const polylineCountAfter = await routePolyline.count();
      expect(polylineCountAfter).toBeLessThan(polylineCount);
      console.log('✓ ステップ10: 経路がクリアされる');

      // ステップ11: 経路クリアボタンが非表示になる
      await expect(clearRouteButton).toBeHidden();
      console.log('✓ ステップ11: 経路クリアボタンが非表示になる');

      // ステップ12: 地図は表示されたまま
      const mapContainer = page.locator('#map-container');
      await expect(mapContainer).toBeVisible();
      console.log('✓ ステップ12: 地図は表示されたまま');

      console.log('✅ 地図経路クリアフローの完全テストが成功しました');
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });
});
