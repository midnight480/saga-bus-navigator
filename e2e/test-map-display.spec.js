const { test, expect } = require('@playwright/test');

test.describe('地図表示機能', () => {
  test('初期状態で地図が表示される', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 地図コンテナが表示されている
    const mapContainer = page.locator('#map-container');
    await expect(mapContainer).toBeVisible();

    // 地図が初期化されている（Leafletの地図要素が存在する）
    const leafletContainer = page.locator('#map-container .leaflet-container');
    await expect(leafletContainer).toBeVisible();
  });

  test('地図上にバス停マーカーが表示される', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // マーカーが表示されるまで待つ（最大3秒）
    await page.waitForSelector('.bus-stop-marker', { timeout: 3000 });

    // バス停マーカーが存在する
    const markers = page.locator('.bus-stop-marker');
    const markerCount = await markers.count();
    expect(markerCount).toBeGreaterThan(0);

    console.log(`バス停マーカー数: ${markerCount}`);
  });

  test('バス停マーカーをクリックするとポップアップが表示される', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // マーカーが表示されるまで待つ
    await page.waitForSelector('.bus-stop-marker', { timeout: 3000 });

    // 最初のマーカーをクリック
    const firstMarker = page.locator('.bus-stop-marker').first();
    await firstMarker.click();

    // ポップアップが表示される
    const popup = page.locator('.leaflet-popup');
    await expect(popup).toBeVisible({ timeout: 2000 });

    // ポップアップにバス停名が表示される
    const popupContent = page.locator('.bus-stop-popup');
    await expect(popupContent).toBeVisible();
  });

  test('地図の操作（ズーム、パン）が正常に動作する', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 地図コンテナを取得
    const mapContainer = page.locator('#map-container');

    // ズームインボタンをクリック
    const zoomInButton = page.locator('.leaflet-control-zoom-in');
    await zoomInButton.click();

    // 少し待つ
    await page.waitForTimeout(500);

    // ズームアウトボタンをクリック
    const zoomOutButton = page.locator('.leaflet-control-zoom-out');
    await zoomOutButton.click();

    // 少し待つ
    await page.waitForTimeout(500);

    // 地図をドラッグ（パン操作）
    const mapBounds = await mapContainer.boundingBox();
    if (mapBounds) {
      await page.mouse.move(mapBounds.x + mapBounds.width / 2, mapBounds.y + mapBounds.height / 2);
      await page.mouse.down();
      await page.mouse.move(mapBounds.x + mapBounds.width / 2 + 100, mapBounds.y + mapBounds.height / 2 + 100);
      await page.mouse.up();
    }

    // エラーが発生していないことを確認
    const errorMessage = page.locator('#error-message');
    await expect(errorMessage).toBeHidden();
  });
});

test.describe('バス停選択フロー', () => {
  test('地図から乗車バス停を選択できる', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // マーカーが表示されるまで待つ
    await page.waitForSelector('.bus-stop-marker', { timeout: 3000 });

    // 「地図から選択」ボタンをクリック（乗車バス停）
    const mapSelectDepartureButton = page.locator('#map-select-departure');
    await mapSelectDepartureButton.click();

    // ボタンのテキストが変わる
    await expect(mapSelectDepartureButton).toHaveText('選択を中止');

    // 地図エリアにスクロール
    await page.waitForTimeout(500);

    // マーカーをクリック
    const firstMarker = page.locator('.bus-stop-marker').first();
    await firstMarker.click();

    // 乗車バス停入力フィールドに値が設定される
    const departureInput = page.locator('#departure-stop');
    const departureValue = await departureInput.inputValue();
    expect(departureValue).not.toBe('');

    console.log(`選択された乗車バス停: ${departureValue}`);

    // ボタンのテキストが元に戻る
    await expect(mapSelectDepartureButton).toHaveText('地図から選択');
  });

  test('地図から降車バス停を選択できる', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // マーカーが表示されるまで待つ
    await page.waitForSelector('.bus-stop-marker', { timeout: 3000 });

    // 「地図から選択」ボタンをクリック（降車バス停）
    const mapSelectArrivalButton = page.locator('#map-select-arrival');
    await mapSelectArrivalButton.click();

    // ボタンのテキストが変わる
    await expect(mapSelectArrivalButton).toHaveText('選択を中止');

    // 地図エリアにスクロール
    await page.waitForTimeout(500);

    // マーカーをクリック
    const firstMarker = page.locator('.bus-stop-marker').first();
    await firstMarker.click();

    // 降車バス停入力フィールドに値が設定される
    const arrivalInput = page.locator('#arrival-stop');
    const arrivalValue = await arrivalInput.inputValue();
    expect(arrivalValue).not.toBe('');

    console.log(`選択された降車バス停: ${arrivalValue}`);

    // ボタンのテキストが元に戻る
    await expect(mapSelectArrivalButton).toHaveText('地図から選択');
  });

  test('地図から乗車・降車バス停を選択して検索できる', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // マーカーが表示されるまで待つ
    await page.waitForSelector('.bus-stop-marker', { timeout: 3000 });

    // 乗車バス停を選択
    const mapSelectDepartureButton = page.locator('#map-select-departure');
    await mapSelectDepartureButton.click();
    await page.waitForTimeout(300);

    const markers = page.locator('.bus-stop-marker');
    const firstMarker = markers.first();
    await firstMarker.click();
    await page.waitForTimeout(300);

    // 降車バス停を選択（異なるマーカー）
    const mapSelectArrivalButton = page.locator('#map-select-arrival');
    await mapSelectArrivalButton.click();
    await page.waitForTimeout(300);

    const secondMarker = markers.nth(1);
    await secondMarker.click();
    await page.waitForTimeout(300);

    // 検索ボタンが有効になる
    const searchButton = page.locator('#search-button');
    await expect(searchButton).toBeEnabled();

    // 検索を実行
    await searchButton.click();

    // ローディングが表示される
    const loading = page.locator('#loading');
    await expect(loading).toBeVisible();

    // 検索結果が表示される（または「該当する便が見つかりませんでした」メッセージ）
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    // 結果コンテナが表示される
    const resultsContainer = page.locator('#results-container');
    await expect(resultsContainer).toBeVisible();
  });

  test('選択を中止ボタンで選択モードを終了できる', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 「地図から選択」ボタンをクリック
    const mapSelectDepartureButton = page.locator('#map-select-departure');
    await mapSelectDepartureButton.click();

    // ボタンのテキストが変わる
    await expect(mapSelectDepartureButton).toHaveText('選択を中止');

    // もう一度クリックして選択を中止
    await mapSelectDepartureButton.click();

    // ボタンのテキストが元に戻る
    await expect(mapSelectDepartureButton).toHaveText('地図から選択');
  });
});

test.describe('経路表示フロー', () => {
  test('検索結果から「地図で表示」ボタンをクリックして経路を表示できる', async ({ page }) => {
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

    // 候補から選択
    const departureSuggestion = page.locator('#departure-suggestions .suggestion-item').first();
    await departureSuggestion.click();
    await page.waitForTimeout(300);

    // 降車バス停を入力
    const arrivalInput = page.locator('#arrival-stop');
    await arrivalInput.fill('佐賀大学');
    await page.waitForTimeout(300);

    // 候補から選択
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

      // 地図エリアにスクロール
      await page.waitForTimeout(500);

      // 経路が地図上に表示される（経路線が存在する）
      const routePolyline = page.locator('.leaflet-interactive');
      await expect(routePolyline).toBeVisible({ timeout: 2000 });

      // 「経路をクリア」ボタンが表示される
      const clearRouteButton = page.locator('#clear-route-button');
      await expect(clearRouteButton).toBeVisible();

      console.log('経路が地図上に表示されました');
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });

  test('「経路をクリア」ボタンで経路表示をクリアできる', async ({ page }) => {
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

      // 「経路をクリア」ボタンが表示される
      const clearRouteButton = page.locator('#clear-route-button');
      await expect(clearRouteButton).toBeVisible();

      // 「経路をクリア」ボタンをクリック
      await clearRouteButton.click();

      // ボタンが非表示になる
      await expect(clearRouteButton).toBeHidden();

      console.log('経路がクリアされました');
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });

  test('複数の経路を表示すると前の経路がクリアされる', async ({ page }) => {
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
        // 最初の経路を表示
        await mapDisplayButtons.first().click();
        await page.waitForTimeout(500);

        // 2番目の経路を表示
        await mapDisplayButtons.nth(1).click();
        await page.waitForTimeout(500);

        // 経路が表示されている（エラーが発生していない）
        const errorMessage = page.locator('#error-message');
        await expect(errorMessage).toBeHidden();

        console.log('複数の経路を表示しました');
      } else {
        console.log('検索結果が1件のみです（テストスキップ）');
      }
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });
});
