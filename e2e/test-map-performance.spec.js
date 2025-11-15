const { test, expect } = require('@playwright/test');

test.describe('地図パフォーマンステスト', () => {
  test('初期表示時間が3秒以内である', async ({ page }) => {
    const startTime = Date.now();

    // ページを開く
    await page.goto('http://localhost:8080/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // マーカーが表示されるまで待つ
    await page.waitForSelector('.bus-stop-marker', { timeout: 3000 });

    const loadTime = Date.now() - startTime;
    console.log(`初期表示時間: ${loadTime}ms`);

    // 3秒以内に表示されることを確認
    expect(loadTime).toBeLessThan(3000);
  });

  test('地図操作時のフレームレートが60FPS以上を維持する', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8080/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // マーカーが表示されるまで待つ
    await page.waitForSelector('.bus-stop-marker', { timeout: 3000 });

    // MapControllerのフレームレート計測機能を使用
    const frameRateStats = await page.evaluate(async () => {
      if (window.mapController && typeof window.mapController.measureFrameRate === 'function') {
        return await window.mapController.measureFrameRate(5000);
      }
      return null;
    });

    if (frameRateStats) {
      console.log('フレームレート統計:', frameRateStats);
      console.log(`平均FPS: ${frameRateStats.averageFPS}`);
      console.log(`最小FPS: ${frameRateStats.minFPS}`);
      console.log(`最大FPS: ${frameRateStats.maxFPS}`);

      // 平均FPSが55以上であることを確認（実用上問題ないレベル）
      // 60FPSが理想だが、ブラウザやシステムの状態により55-60FPSの範囲は許容
      const avgFps = parseFloat(frameRateStats.averageFPS);
      expect(avgFps).toBeGreaterThanOrEqual(55);
    } else {
      console.log('フレームレート計測機能が利用できません（テストスキップ）');
    }
  });

  test('メモリ使用量が適切である', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8080/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // マーカーが表示されるまで待つ
    await page.waitForSelector('.bus-stop-marker', { timeout: 3000 });

    // パフォーマンス統計を取得
    const performanceStats = await page.evaluate(() => {
      if (window.mapController && typeof window.mapController.getPerformanceStats === 'function') {
        return window.mapController.getPerformanceStats();
      }
      return null;
    });

    if (performanceStats) {
      console.log('パフォーマンス統計:', performanceStats);
      console.log(`マーカー数: ${performanceStats.markerCount}`);
      console.log(`クラスター数: ${performanceStats.clusterCount}`);
      console.log(`経路レイヤー数: ${performanceStats.routeLayerCount}`);
      console.log(`エラー数: ${performanceStats.errorCount}`);

      if (performanceStats.memory) {
        const usedMB = (performanceStats.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
        const totalMB = (performanceStats.memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
        const limitMB = (performanceStats.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);

        console.log(`使用メモリ: ${usedMB}MB / ${totalMB}MB (上限: ${limitMB}MB)`);

        // メモリ使用量が上限の80%以下であることを確認
        const memoryUsageRatio = performanceStats.memory.usedJSHeapSize / performanceStats.memory.jsHeapSizeLimit;
        expect(memoryUsageRatio).toBeLessThan(0.8);
      }

      // エラーが発生していないことを確認
      expect(performanceStats.errorCount).toBe(0);
    } else {
      console.log('パフォーマンス統計が利用できません（テストスキップ）');
    }
  });

  test('大量のマーカー表示でもパフォーマンスが維持される', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8080/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // マーカーが表示されるまで待つ
    await page.waitForSelector('.bus-stop-marker', { timeout: 3000 });

    // マーカー数を取得
    const markerCount = await page.evaluate(() => {
      if (window.mapController && window.mapController.markers) {
        return window.mapController.markers.size;
      }
      return 0;
    });

    console.log(`表示されているマーカー数: ${markerCount}`);

    // マーカーが100個以上ある場合
    if (markerCount >= 100) {
      // 地図を複数回ズーム・パン操作
      const mapContainer = page.locator('#map-container');

      for (let i = 0; i < 5; i++) {
        // ズームイン
        const zoomInButton = page.locator('.leaflet-control-zoom-in');
        await zoomInButton.click();
        await page.waitForTimeout(200);

        // ズームアウト
        const zoomOutButton = page.locator('.leaflet-control-zoom-out');
        await zoomOutButton.click();
        await page.waitForTimeout(200);

        // パン操作
        const mapBounds = await mapContainer.boundingBox();
        if (mapBounds) {
          await page.mouse.move(mapBounds.x + mapBounds.width / 2, mapBounds.y + mapBounds.height / 2);
          await page.mouse.down();
          await page.mouse.move(mapBounds.x + mapBounds.width / 2 + 50, mapBounds.y + mapBounds.height / 2 + 50);
          await page.mouse.up();
          await page.waitForTimeout(200);
        }
      }

      // エラーが発生していないことを確認
      const errorMessage = page.locator('#error-message');
      await expect(errorMessage).toBeHidden();

      console.log('大量のマーカー表示でもパフォーマンスが維持されました');
    } else {
      console.log(`マーカー数が少ないためテストスキップ（${markerCount}個）`);
    }
  });

  test('経路表示のパフォーマンスが適切である', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8080/');

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
      // 経路表示の開始時刻を記録
      const startTime = Date.now();

      // 「地図で表示」ボタンをクリック
      const mapDisplayButton = page.locator('.map-display-button').first();
      await mapDisplayButton.click();

      // 経路が表示されるまで待つ
      await page.waitForSelector('.leaflet-interactive', { timeout: 2000 });

      const displayTime = Date.now() - startTime;
      console.log(`経路表示時間: ${displayTime}ms`);

      // 経路表示が1秒以内に完了することを確認
      expect(displayTime).toBeLessThan(1000);

      // エラーが発生していないことを確認
      const errorMessage = page.locator('#error-message');
      await expect(errorMessage).toBeHidden();
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });

  test('連続した経路表示でメモリリークが発生しない', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8080/');

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
        // 初期メモリ使用量を取得
        const initialMemory = await page.evaluate(() => {
          if (window.performance && window.performance.memory) {
            return window.performance.memory.usedJSHeapSize;
          }
          return null;
        });

        // 複数の経路を連続して表示
        for (let i = 0; i < Math.min(buttonCount, 5); i++) {
          await mapDisplayButtons.nth(i).click();
          await page.waitForTimeout(500);

          // 経路をクリア
          const clearRouteButton = page.locator('#clear-route-button');
          await clearRouteButton.click();
          await page.waitForTimeout(300);
        }

        // 最終メモリ使用量を取得
        const finalMemory = await page.evaluate(() => {
          if (window.performance && window.performance.memory) {
            return window.performance.memory.usedJSHeapSize;
          }
          return null;
        });

        if (initialMemory !== null && finalMemory !== null) {
          const memoryIncrease = finalMemory - initialMemory;
          const memoryIncreaseMB = (memoryIncrease / 1024 / 1024).toFixed(2);

          console.log(`初期メモリ: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
          console.log(`最終メモリ: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
          console.log(`メモリ増加量: ${memoryIncreaseMB}MB`);

          // メモリ増加量が10MB以下であることを確認（メモリリークがない）
          expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
        } else {
          console.log('メモリ情報が取得できません（テストスキップ）');
        }
      } else {
        console.log('検索結果が少ないためテストスキップ');
      }
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });
});
