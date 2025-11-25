const { test, expect } = require('@playwright/test');

test.describe('現在地表示機能', () => {
  test('現在地ボタンが地図上に表示される', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 現在地ボタンが表示されている
    const currentLocationButton = page.locator('.current-location-button');
    await expect(currentLocationButton).toBeVisible();

    // 地図コンテナも表示されている
    const mapContainer = page.locator('#map-container');
    await expect(mapContainer).toBeVisible();

    console.log('現在地ボタンが表示されました');
  });

  test('現在地ボタンに正しいアイコンが表示される', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 現在地ボタンのアイコンを確認
    const locationIcon = page.locator('.current-location-button .location-icon');
    await expect(locationIcon).toBeVisible();

    const iconText = await locationIcon.textContent();
    expect(iconText).toBe('◎');

    console.log('現在地ボタンのアイコンが正しく表示されました');
  });

  test('現在地ボタンをクリックすると位置情報を取得する（許可された場合）', async ({ page, context }) => {
    // 位置情報の許可を設定
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 33.2635, longitude: 130.3005 }); // 佐賀市の座標

    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 現在地ボタンをクリック
    const currentLocationButton = page.locator('#current-location-button');
    await currentLocationButton.click();

    // 地図が移動するまで待つ（少し時間を置く）
    await page.waitForTimeout(1000);

    // 現在地マーカーが表示される
    const currentLocationMarker = page.locator('.current-location-marker');
    await expect(currentLocationMarker).toBeVisible({ timeout: 3000 });

    console.log('現在地が地図上に表示されました');
  });

  test('現在地マーカーをクリックするとポップアップが表示される', async ({ page, context }) => {
    // 位置情報の許可を設定
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 33.2635, longitude: 130.3005 });

    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 現在地ボタンをクリック
    const currentLocationButton = page.locator('#current-location-button');
    await currentLocationButton.click();

    // 現在地マーカーが表示されるまで待つ
    const currentLocationMarker = page.locator('.current-location-marker');
    await expect(currentLocationMarker).toBeVisible({ timeout: 3000 });

    // マーカーをクリック
    await currentLocationMarker.click();

    // ポップアップが表示される
    const popup = page.locator('.leaflet-popup');
    await expect(popup).toBeVisible({ timeout: 2000 });

    // ポップアップに「現在地」と表示される
    const popupContent = await popup.textContent();
    expect(popupContent).toContain('現在地');

    console.log('現在地マーカーのポップアップが表示されました');
  });

  test('現在地ボタンを複数回クリックしても正常に動作する', async ({ page, context }) => {
    // 位置情報の許可を設定
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 33.2635, longitude: 130.3005 });

    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    const currentLocationButton = page.locator('#current-location-button');

    // 1回目のクリック
    await currentLocationButton.click();
    await page.waitForTimeout(1000);

    const marker1 = page.locator('.current-location-marker');
    await expect(marker1).toBeVisible({ timeout: 3000 });

    // 2回目のクリック（位置を変更）
    await context.setGeolocation({ latitude: 33.2700, longitude: 130.3100 });
    await currentLocationButton.click();
    await page.waitForTimeout(1000);

    // マーカーが依然として表示されている（古いマーカーは削除されている）
    const markers = page.locator('.current-location-marker');
    const markerCount = await markers.count();
    expect(markerCount).toBe(1);

    console.log('現在地ボタンを複数回クリックしても正常に動作しました');
  });

  test('位置情報が拒否された場合にエラーメッセージが表示される', async ({ page, context }) => {
    // 位置情報の許可を拒否
    await context.grantPermissions([]);

    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // コンソールエラーをキャプチャ
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'log') {
        consoleMessages.push(msg.text());
      }
    });

    // 現在地ボタンをクリック
    const currentLocationButton = page.locator('#current-location-button');
    await currentLocationButton.click();

    // エラー通知が表示されるまで待つ
    const errorNotification = page.locator('.location-error-notification');
    await expect(errorNotification).toBeVisible({ timeout: 3000 });

    // エラーメッセージの内容を確認
    const errorText = await errorNotification.textContent();
    expect(errorText).toContain('位置情報');

    console.log('位置情報拒否時のエラーメッセージが表示されました');
  });

  test('エラー通知が3秒後に自動的に消える', async ({ page, context }) => {
    // 位置情報の許可を拒否
    await context.grantPermissions([]);

    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 現在地ボタンをクリック
    const currentLocationButton = page.locator('#current-location-button');
    await currentLocationButton.click();

    // エラー通知が表示される
    const errorNotification = page.locator('.location-error-notification');
    await expect(errorNotification).toBeVisible({ timeout: 3000 });

    // 3秒後に非表示になる
    await expect(errorNotification).toBeHidden({ timeout: 4000 });

    console.log('エラー通知が自動的に消えました');
  });

  test('現在地表示後に地図のズームレベルが15になる', async ({ page, context }) => {
    // 位置情報の許可を設定
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 33.2635, longitude: 130.3005 });

    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 現在地ボタンをクリック
    const currentLocationButton = page.locator('#current-location-button');
    await currentLocationButton.click();

    // 地図が移動するまで待つ
    await page.waitForTimeout(1000);

    // 地図のズームレベルを確認
    const zoomLevel = await page.evaluate(() => {
      return window.mapController && window.mapController.map 
        ? window.mapController.map.getZoom() 
        : null;
    });

    expect(zoomLevel).toBe(15);

    console.log(`地図のズームレベル: ${zoomLevel}`);
  });

  test('現在地表示後に地図の中心が現在地になる', async ({ page, context }) => {
    // 位置情報の許可を設定
    const testLat = 33.2635;
    const testLng = 130.3005;
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: testLat, longitude: testLng });

    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 現在地ボタンをクリック
    const currentLocationButton = page.locator('#current-location-button');
    await currentLocationButton.click();

    // 地図が移動するまで待つ
    await page.waitForTimeout(1000);

    // 地図の中心座標を確認
    const center = await page.evaluate(() => {
      if (window.mapController && window.mapController.map) {
        const center = window.mapController.map.getCenter();
        return { lat: center.lat, lng: center.lng };
      }
      return null;
    });

    expect(center).not.toBeNull();
    expect(Math.abs(center.lat - testLat)).toBeLessThan(0.001);
    expect(Math.abs(center.lng - testLng)).toBeLessThan(0.001);

    console.log(`地図の中心座標: ${center.lat}, ${center.lng}`);
  });
});

test.describe('現在地表示フロー統合テスト', () => {
  test('現在地ボタンクリック → 位置情報許可 → 地図移動 → マーカー表示の完全フロー', async ({ page, context }) => {
    // 位置情報の許可を設定
    const testLat = 33.2635;
    const testLng = 130.3005;
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: testLat, longitude: testLng });

    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // ステップ1: 現在地ボタンが表示されている
    const currentLocationButton = page.locator('#current-location-button');
    await expect(currentLocationButton).toBeVisible();
    console.log('✓ ステップ1: 現在地ボタンが表示されている');

    // ステップ2: 現在地ボタンをクリック
    await currentLocationButton.click();
    console.log('✓ ステップ2: 現在地ボタンをクリック');

    // ステップ3: 地図が現在地中心に移動（ズームレベル15）
    await page.waitForTimeout(1000);
    const zoomLevel = await page.evaluate(() => {
      return window.mapController && window.mapController.map 
        ? window.mapController.map.getZoom() 
        : null;
    });
    expect(zoomLevel).toBe(15);
    console.log('✓ ステップ3: 地図が現在地中心に移動（ズームレベル15）');

    // ステップ4: 地図の中心が現在地になる
    const center = await page.evaluate(() => {
      if (window.mapController && window.mapController.map) {
        const center = window.mapController.map.getCenter();
        return { lat: center.lat, lng: center.lng };
      }
      return null;
    });
    expect(center).not.toBeNull();
    expect(Math.abs(center.lat - testLat)).toBeLessThan(0.001);
    expect(Math.abs(center.lng - testLng)).toBeLessThan(0.001);
    console.log('✓ ステップ4: 地図の中心が現在地になる');

    // ステップ5: 現在地マーカーが表示される
    const currentLocationMarker = page.locator('.current-location-marker');
    await expect(currentLocationMarker).toBeVisible({ timeout: 3000 });
    console.log('✓ ステップ5: 現在地マーカーが表示される');

    // ステップ6: マーカーをクリックするとポップアップが表示される
    await currentLocationMarker.click();
    const popup = page.locator('.leaflet-popup');
    await expect(popup).toBeVisible({ timeout: 2000 });
    const popupContent = await popup.textContent();
    expect(popupContent).toContain('現在地');
    console.log('✓ ステップ6: マーカーをクリックするとポップアップが表示される');

    console.log('✅ 現在地表示フローの完全テストが成功しました');
  });
});
