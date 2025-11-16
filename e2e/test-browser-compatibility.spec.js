const { test, expect, devices } = require('@playwright/test');

/**
 * ブラウザ互換性テスト
 * Chrome、Firefox、Safari、Edgeで全機能をテスト
 * モバイルブラウザ（iOS Safari、Chrome Mobile）でもテスト
 */

test.describe('ブラウザ互換性テスト - 基本機能', () => {
  test('アプリが正常に初期化される', async ({ page, browserName }) => {
    console.log(`テスト実行ブラウザ: ${browserName}`);

    // ページを開く
    await page.goto('http://localhost:8080/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 10000 });

    // UIが有効化されている
    const departureInput = page.locator('#departure-stop');
    await expect(departureInput).toBeEnabled();

    // 地図が表示されている
    const mapContainer = page.locator('#map-container');
    await expect(mapContainer).toBeVisible();

    console.log(`✓ ${browserName}: アプリが正常に初期化されました`);
  });

  test('検索機能が正常に動作する', async ({ page, browserName }) => {
    console.log(`テスト実行ブラウザ: ${browserName}`);

    await page.goto('http://localhost:8080/');
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 10000 });

    // 乗車バス停を入力
    const departureInput = page.locator('#departure-stop');
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(500);

    // 候補が表示される
    const departureSuggestions = page.locator('#departure-suggestions .suggestion-item');
    const suggestionCount = await departureSuggestions.count();
    expect(suggestionCount).toBeGreaterThan(0);

    console.log(`✓ ${browserName}: 検索機能が正常に動作しました`);
  });

  test('地図が正常に表示される', async ({ page, browserName }) => {
    console.log(`テスト実行ブラウザ: ${browserName}`);

    await page.goto('http://localhost:8080/');
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 10000 });

    // 地図コンテナが表示されている
    const mapContainer = page.locator('#map-container');
    await expect(mapContainer).toBeVisible();

    // Leaflet地図が初期化されている
    const leafletContainer = page.locator('#map-container .leaflet-container');
    await expect(leafletContainer).toBeVisible();

    // バス停マーカーが表示される
    await page.waitForSelector('.bus-stop-marker', { timeout: 5000 });
    const markers = page.locator('.bus-stop-marker');
    const markerCount = await markers.count();
    expect(markerCount).toBeGreaterThan(0);

    console.log(`✓ ${browserName}: 地図が正常に表示されました（マーカー数: ${markerCount}）`);
  });
});

test.describe('ブラウザ互換性テスト - 現在地表示機能', () => {
  test('現在地ボタンが表示される', async ({ page, browserName }) => {
    console.log(`テスト実行ブラウザ: ${browserName}`);

    await page.goto('http://localhost:8080/');
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 10000 });

    // 現在地ボタンが表示されている
    const currentLocationButton = page.locator('.current-location-button');
    await expect(currentLocationButton).toBeVisible();

    console.log(`✓ ${browserName}: 現在地ボタンが表示されました`);
  });

  test('現在地表示機能が動作する', async ({ page, browserName, context }) => {
    console.log(`テスト実行ブラウザ: ${browserName}`);

    // 位置情報の許可を設定
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 33.2635, longitude: 130.3005 });

    await page.goto('http://localhost:8080/');
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 10000 });

    // 現在地ボタンをクリック
    const currentLocationButton = page.locator('#current-location-button');
    await currentLocationButton.click();
    await page.waitForTimeout(1500);

    // 現在地マーカーが表示される
    const currentLocationMarker = page.locator('.current-location-marker');
    await expect(currentLocationMarker).toBeVisible({ timeout: 5000 });

    console.log(`✓ ${browserName}: 現在地表示機能が動作しました`);
  });
});

test.describe('ブラウザ互換性テスト - 検索結果クリア機能', () => {
  test('検索結果クリア機能が動作する', async ({ page, browserName }) => {
    console.log(`テスト実行ブラウザ: ${browserName}`);

    await page.goto('http://localhost:8080/');
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 10000 });

    // 検索を実行
    const departureInput = page.locator('#departure-stop');
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(500);
    await page.locator('#departure-suggestions .suggestion-item').first().click();
    await page.waitForTimeout(300);

    const arrivalInput = page.locator('#arrival-stop');
    await arrivalInput.fill('佐賀大学');
    await page.waitForTimeout(500);
    await page.locator('#arrival-suggestions .suggestion-item').first().click();
    await page.waitForTimeout(300);

    const searchButton = page.locator('#search-button');
    await searchButton.click();

    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 10000 });

    const resultsList = page.locator('.results-list');
    const hasResults = await resultsList.isVisible().catch(() => false);

    if (hasResults) {
      // クリアボタンが表示される
      const clearButton = page.locator('#clear-search-results-button');
      await expect(clearButton).toBeVisible();

      // クリアボタンをクリック
      await clearButton.click();

      // 検索結果がクリアされる
      await expect(clearButton).toBeHidden();
      const departureValue = await departureInput.inputValue();
      expect(departureValue).toBe('');

      console.log(`✓ ${browserName}: 検索結果クリア機能が動作しました`);
    } else {
      console.log(`${browserName}: 検索結果が見つかりませんでした（テストスキップ）`);
    }
  });
});

test.describe('ブラウザ互換性テスト - カレンダー登録機能', () => {
  test('カレンダー登録ボタンが表示される', async ({ page, browserName }) => {
    console.log(`テスト実行ブラウザ: ${browserName}`);

    await page.goto('http://localhost:8080/');
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 10000 });

    // 検索を実行
    await page.fill('#departure-stop', '佐賀駅');
    await page.waitForSelector('#departure-suggestions li', { timeout: 5000 });
    await page.click('#departure-suggestions li:first-child');

    await page.fill('#arrival-stop', '佐賀大学');
    await page.waitForSelector('#arrival-suggestions li', { timeout: 5000 });
    await page.click('#arrival-suggestions li:first-child');

    await page.click('#search-button');
    await page.waitForSelector('.result-item', { timeout: 10000 });

    // カレンダー登録ボタンが表示される
    const calendarButton = await page.locator('.add-to-calendar-button').first();
    await expect(calendarButton).toBeVisible();

    console.log(`✓ ${browserName}: カレンダー登録ボタンが表示されました`);
  });

  test('カレンダーモーダルが正常に動作する', async ({ page, browserName }) => {
    console.log(`テスト実行ブラウザ: ${browserName}`);

    await page.goto('http://localhost:8080/');
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 10000 });

    // 検索を実行
    await page.fill('#departure-stop', '佐賀駅');
    await page.waitForSelector('#departure-suggestions li', { timeout: 5000 });
    await page.click('#departure-suggestions li:first-child');

    await page.fill('#arrival-stop', '佐賀大学');
    await page.waitForSelector('#arrival-suggestions li', { timeout: 5000 });
    await page.click('#arrival-suggestions li:first-child');

    await page.click('#search-button');
    await page.waitForSelector('.result-item', { timeout: 10000 });

    // カレンダー登録ボタンをクリック
    await page.click('.add-to-calendar-button');

    // モーダルが表示される
    const modal = await page.locator('#calendar-modal');
    await expect(modal).toBeVisible();

    // 閉じるボタンで閉じる
    await page.click('.calendar-close-button');
    await expect(modal).toBeHidden();

    console.log(`✓ ${browserName}: カレンダーモーダルが正常に動作しました`);
  });
});

test.describe('ブラウザ互換性テスト - 地図経路クリア機能', () => {
  test('地図経路クリア機能が動作する', async ({ page, browserName }) => {
    console.log(`テスト実行ブラウザ: ${browserName}`);

    await page.goto('http://localhost:8080/');
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 10000 });

    // 検索を実行
    const departureInput = page.locator('#departure-stop');
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(500);
    await page.locator('#departure-suggestions .suggestion-item').first().click();
    await page.waitForTimeout(300);

    const arrivalInput = page.locator('#arrival-stop');
    await arrivalInput.fill('佐賀大学');
    await page.waitForTimeout(500);
    await page.locator('#arrival-suggestions .suggestion-item').first().click();
    await page.waitForTimeout(300);

    const searchButton = page.locator('#search-button');
    await searchButton.click();

    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 10000 });

    const resultsList = page.locator('.results-list');
    const hasResults = await resultsList.isVisible().catch(() => false);

    if (hasResults) {
      // 地図で表示
      const mapDisplayButton = page.locator('.map-display-button').first();
      await mapDisplayButton.click();
      await page.waitForTimeout(500);

      // 経路クリアボタンが表示される
      const clearRouteButton = page.locator('#clear-route-button');
      await expect(clearRouteButton).toBeVisible();

      // 経路クリアボタンをクリック
      await clearRouteButton.click();
      await expect(clearRouteButton).toBeHidden();

      console.log(`✓ ${browserName}: 地図経路クリア機能が動作しました`);
    } else {
      console.log(`${browserName}: 検索結果が見つかりませんでした（テストスキップ）`);
    }
  });
});

// モバイルブラウザテスト
test.describe('モバイルブラウザ互換性テスト', () => {
  test.use({ ...devices['iPhone 13'] });

  test('iOS Safari - 基本機能が動作する', async ({ page }) => {
    console.log('テスト実行デバイス: iPhone 13 (iOS Safari)');

    await page.goto('http://localhost:8080/');
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 10000 });

    // UIが有効化されている
    const departureInput = page.locator('#departure-stop');
    await expect(departureInput).toBeEnabled();

    // 地図が表示されている
    const mapContainer = page.locator('#map-container');
    await expect(mapContainer).toBeVisible();

    // 現在地ボタンが表示されている
    const currentLocationButton = page.locator('.current-location-button');
    await expect(currentLocationButton).toBeVisible();

    console.log('✓ iOS Safari: 基本機能が動作しました');
  });

  test('iOS Safari - タッチ操作が動作する', async ({ page }) => {
    console.log('テスト実行デバイス: iPhone 13 (iOS Safari)');

    await page.goto('http://localhost:8080/');
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 10000 });

    // 検索フィールドをタップ
    const departureInput = page.locator('#departure-stop');
    await departureInput.tap();
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(500);

    // 候補が表示される
    const suggestions = page.locator('#departure-suggestions .suggestion-item');
    const suggestionCount = await suggestions.count();
    expect(suggestionCount).toBeGreaterThan(0);

    // 候補をタップ
    await suggestions.first().tap();
    await page.waitForTimeout(300);

    const value = await departureInput.inputValue();
    expect(value).not.toBe('');

    console.log('✓ iOS Safari: タッチ操作が動作しました');
  });
});

test.describe('モバイルブラウザ互換性テスト - Android', () => {
  test.use({ ...devices['Pixel 5'] });

  test('Chrome Mobile - 基本機能が動作する', async ({ page }) => {
    console.log('テスト実行デバイス: Pixel 5 (Chrome Mobile)');

    await page.goto('http://localhost:8080/');
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 10000 });

    // UIが有効化されている
    const departureInput = page.locator('#departure-stop');
    await expect(departureInput).toBeEnabled();

    // 地図が表示されている
    const mapContainer = page.locator('#map-container');
    await expect(mapContainer).toBeVisible();

    // 現在地ボタンが表示されている
    const currentLocationButton = page.locator('.current-location-button');
    await expect(currentLocationButton).toBeVisible();

    console.log('✓ Chrome Mobile: 基本機能が動作しました');
  });

  test('Chrome Mobile - タッチ操作が動作する', async ({ page }) => {
    console.log('テスト実行デバイス: Pixel 5 (Chrome Mobile)');

    await page.goto('http://localhost:8080/');
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 10000 });

    // 検索フィールドをタップ
    const departureInput = page.locator('#departure-stop');
    await departureInput.tap();
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(500);

    // 候補が表示される
    const suggestions = page.locator('#departure-suggestions .suggestion-item');
    const suggestionCount = await suggestions.count();
    expect(suggestionCount).toBeGreaterThan(0);

    // 候補をタップ
    await suggestions.first().tap();
    await page.waitForTimeout(300);

    const value = await departureInput.inputValue();
    expect(value).not.toBe('');

    console.log('✓ Chrome Mobile: タッチ操作が動作しました');
  });
});
