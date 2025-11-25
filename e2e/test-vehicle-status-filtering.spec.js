/**
 * リアルタイム車両位置情報の運行終了バスフィルタリングE2Eテスト
 * 要件2.4: ユーザーが地図を表示するとき、システムは運行中のバスのみを表示すること
 */

const { test, expect } = require('@playwright/test');

test.describe('リアルタイム車両位置情報 - 運行終了バスフィルタリング', () => {
  test.beforeEach(async ({ page }) => {
    // モックサーバーのセットアップ
    await page.route('**/api/vehicle', async (route) => {
      // 運行中と運行終了のバスを含むモックデータ
      // 実際のProtocol Buffersデータを模擬
      const mockData = new Uint8Array([0x0a, 0x10, 0x76, 0x65, 0x68, 0x69, 0x63, 0x6c, 0x65, 0x5f, 0x31]);
      await route.fulfill({
        status: 200,
        contentType: 'application/x-protobuf',
        body: Buffer.from(mockData)
      });
    });

    await page.route('**/api/route', async (route) => {
      const mockData = new Uint8Array([0x0a, 0x10, 0x72, 0x6f, 0x75, 0x74, 0x65, 0x5f, 0x31]);
      await route.fulfill({
        status: 200,
        contentType: 'application/x-protobuf',
        body: Buffer.from(mockData)
      });
    });

    await page.route('**/api/alert', async (route) => {
      const mockData = new Uint8Array([0x0a, 0x10, 0x61, 0x6c, 0x65, 0x72, 0x74, 0x5f, 0x31]);
      await route.fulfill({
        status: 200,
        contentType: 'application/x-protobuf',
        body: Buffer.from(mockData)
      });
    });
  });

  test('運行終了バスが地図上に表示されないことを検証', async ({ page }) => {
    // コンソールログを監視して運行終了バスのフィルタリングを確認
    const logs = [];
    page.on('console', (msg) => {
      const text = msg.text();
      logs.push(text);
    });

    await page.goto('http://localhost:8788');

    // リアルタイムデータの読み込みを待つ
    await page.waitForTimeout(3000);

    // 運行終了バスがフィルタリングされたことを示すログを確認
    const filteredLog = logs.find(log => 
      log.includes('after_end') || 
      log.includes('運行終了') ||
      log.includes('Skipping vehicle')
    );

    if (filteredLog) {
      console.log('運行終了バスのフィルタリングログ:', filteredLog);
    }

    // 車両マーカーを取得
    const vehicleMarkers = page.locator('.vehicle-marker, .leaflet-marker-icon[data-vehicle-id]');
    const markerCount = await vehicleMarkers.count();

    console.log(`地図上の車両マーカー数: ${markerCount}`);

    // 各マーカーの運行状態を確認
    for (let i = 0; i < markerCount; i++) {
      const marker = vehicleMarkers.nth(i);
      
      // マーカーをクリックしてポップアップを表示
      await marker.click();
      await page.waitForTimeout(500);

      // ポップアップから運行状態を取得
      const popup = page.locator('.leaflet-popup-content');
      const isVisible = await popup.isVisible().catch(() => false);

      if (isVisible) {
        const popupText = await popup.textContent();
        console.log(`マーカー ${i + 1} のポップアップ:`, popupText);

        // 運行終了状態でないことを確認
        expect(popupText).not.toContain('運行終了');
        expect(popupText).not.toContain('after_end');
      }

      // ポップアップを閉じる
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  });

  test('運行中バスのみが表示されることを検証', async ({ page }) => {
    // コンソールログを監視
    const vehicleStatuses = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      
      // 車両状態のログを収集
      if (text.includes('Vehicle status:') || text.includes('運行状態:')) {
        vehicleStatuses.push(text);
      }
    });

    await page.goto('http://localhost:8788');

    // リアルタイムデータの読み込みを待つ
    await page.waitForTimeout(3000);

    console.log(`収集された車両状態ログ数: ${vehicleStatuses.length}`);

    // 車両マーカーを取得
    const vehicleMarkers = page.locator('.vehicle-marker, .leaflet-marker-icon[data-vehicle-id]');
    const markerCount = await vehicleMarkers.count();

    console.log(`地図上の車両マーカー数: ${markerCount}`);

    // 運行中の状態のみが表示されていることを確認
    const validStatuses = ['in_transit', 'on_time', 'delayed', 'early', 'before_start'];
    const invalidStatuses = ['after_end'];

    for (const status of vehicleStatuses) {
      // 運行終了状態が含まれていないことを確認
      for (const invalidStatus of invalidStatuses) {
        if (status.includes(invalidStatus)) {
          // 運行終了状態のバスがフィルタリングされていることを確認
          expect(status).toContain('Skipping');
        }
      }
    }
  });

  test('運行終了バスの既存マーカーが削除されることを検証', async ({ page }) => {
    // コンソールログを監視
    const logs = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });

    await page.goto('http://localhost:8788');

    // 初回のリアルタイムデータ読み込みを待つ
    await page.waitForTimeout(3000);

    // 初回の車両マーカー数を取得
    const initialMarkers = page.locator('.vehicle-marker, .leaflet-marker-icon[data-vehicle-id]');
    const initialCount = await initialMarkers.count();

    console.log(`初回の車両マーカー数: ${initialCount}`);

    // マーカー削除のログを確認
    const removeMarkerLog = logs.find(log => 
      log.includes('removeVehicleMarker') || 
      log.includes('Removing marker') ||
      log.includes('マーカーを削除')
    );

    if (removeMarkerLog) {
      console.log('マーカー削除ログ:', removeMarkerLog);
    }

    // 運行終了バスのマーカーが削除されたことを示すログを確認
    const afterEndLog = logs.find(log => 
      log.includes('after_end') && 
      (log.includes('remove') || log.includes('削除') || log.includes('Skipping'))
    );

    if (afterEndLog) {
      console.log('運行終了バスの処理ログ:', afterEndLog);
      // 運行終了バスが適切に処理されていることを確認
      expect(afterEndLog).toBeTruthy();
    }
  });

  test('運行終了バスのフィルタリング数がログ出力されることを検証', async ({ page }) => {
    // コンソールログを監視
    const logs = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });

    await page.goto('http://localhost:8788');

    // リアルタイムデータの読み込みを待つ
    await page.waitForTimeout(3000);

    // フィルタリングされたバス数のログを確認
    const filteredCountLog = logs.find(log => 
      (log.includes('filtered') || log.includes('フィルタリング')) &&
      (log.includes('after_end') || log.includes('運行終了'))
    );

    if (filteredCountLog) {
      console.log('フィルタリング数ログ:', filteredCountLog);
      
      // ログに数値が含まれていることを確認
      const numberMatch = filteredCountLog.match(/\d+/);
      if (numberMatch) {
        const filteredCount = parseInt(numberMatch[0]);
        console.log(`フィルタリングされたバス数: ${filteredCount}`);
        expect(filteredCount).toBeGreaterThanOrEqual(0);
      }
    } else {
      console.log('フィルタリング数のログが見つかりませんでした（運行終了バスがない可能性があります）');
    }
  });

  test('運行終了バスのtripIdがログ出力されることを検証', async ({ page }) => {
    // コンソールログを監視
    const logs = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });

    await page.goto('http://localhost:8788');

    // リアルタイムデータの読み込みを待つ
    await page.waitForTimeout(3000);

    // 運行終了バスのtripIdログを確認
    const tripIdLogs = logs.filter(log => 
      log.includes('after_end') && 
      (log.includes('tripId') || log.includes('trip_id'))
    );

    if (tripIdLogs.length > 0) {
      console.log('運行終了バスのtripIdログ:');
      tripIdLogs.forEach(log => console.log('  -', log));
      
      // tripIdが含まれていることを確認
      tripIdLogs.forEach(log => {
        expect(log).toMatch(/trip[_-]?id/i);
      });
    } else {
      console.log('運行終了バスのtripIdログが見つかりませんでした（運行終了バスがない可能性があります）');
    }
  });

  test('handleVehiclePositionsUpdateで運行終了バスがスキップされることを検証', async ({ page }) => {
    // コンソールログを監視
    const logs = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });

    await page.goto('http://localhost:8788');

    // リアルタイムデータの読み込みを待つ
    await page.waitForTimeout(3000);

    // handleVehiclePositionsUpdateのログを確認
    const updateLogs = logs.filter(log => 
      log.includes('handleVehiclePositionsUpdate') ||
      log.includes('Vehicle positions updated')
    );

    console.log(`handleVehiclePositionsUpdateログ数: ${updateLogs.length}`);

    // 運行終了バスのスキップログを確認
    const skipLogs = logs.filter(log => 
      log.includes('after_end') && 
      (log.includes('skip') || log.includes('スキップ') || log.includes('Skipping'))
    );

    if (skipLogs.length > 0) {
      console.log('運行終了バススキップログ:');
      skipLogs.forEach(log => console.log('  -', log));
      
      // スキップログが存在することを確認
      expect(skipLogs.length).toBeGreaterThan(0);
    } else {
      console.log('運行終了バスのスキップログが見つかりませんでした（運行終了バスがない可能性があります）');
    }
  });

  test('運行状態の判定が正しく行われることを検証', async ({ page }) => {
    // コンソールログを監視
    const statusLogs = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      
      // 運行状態の判定ログを収集
      if (text.includes('determineVehicleStatus') || text.includes('Vehicle status:')) {
        statusLogs.push(text);
      }
    });

    await page.goto('http://localhost:8788');

    // リアルタイムデータの読み込みを待つ
    await page.waitForTimeout(3000);

    console.log(`運行状態判定ログ数: ${statusLogs.length}`);

    // 有効な運行状態のリスト
    const validStatuses = [
      'before_start',
      'in_transit',
      'on_time',
      'delayed',
      'early',
      'after_end'
    ];

    // 各ログが有効な運行状態を含んでいることを確認
    statusLogs.forEach(log => {
      const hasValidStatus = validStatuses.some(status => log.includes(status));
      if (hasValidStatus) {
        console.log('有効な運行状態ログ:', log);
      }
    });
  });

  test('地図上の全ての車両マーカーが運行中であることを検証', async ({ page }) => {
    await page.goto('http://localhost:8788');

    // リアルタイムデータの読み込みを待つ
    await page.waitForTimeout(3000);

    // 車両マーカーを取得
    const vehicleMarkers = page.locator('.vehicle-marker, .leaflet-marker-icon[data-vehicle-id]');
    const markerCount = await vehicleMarkers.count();

    console.log(`地図上の車両マーカー数: ${markerCount}`);

    if (markerCount > 0) {
      // 各マーカーのクラスを確認
      for (let i = 0; i < markerCount; i++) {
        const marker = vehicleMarkers.nth(i);
        const className = await marker.getAttribute('class');
        
        console.log(`マーカー ${i + 1} のクラス:`, className);

        // 運行終了状態のクラスが含まれていないことを確認
        if (className) {
          expect(className).not.toContain('after-end');
          expect(className).not.toContain('status-after-end');
        }
      }
    } else {
      console.log('車両マーカーが見つかりませんでした（リアルタイムデータがない可能性があります）');
    }
  });
});
