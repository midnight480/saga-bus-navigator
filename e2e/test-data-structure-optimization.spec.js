/**
 * データ構造最適化機能のE2Eテスト
 * 要件2.2, 3.2, 6.3の検証
 */

const { test, expect } = require('@playwright/test');

test.describe('データ構造最適化機能', () => {
  test.beforeEach(async ({ page }) => {
    // テスト用ページを開く
    await page.goto('http://localhost:8788/tests/test-data-structure-optimization.html');
    
    // データの読み込みを待つ（dataLoaderが初期化されるまで）
    await page.waitForFunction(() => {
      return window.dataLoader && window.dataLoader.isDataLoaded();
    }, { timeout: 30000 });
    
    // コンテンツが表示されるまで待つ
    await page.waitForSelector('#content', { state: 'visible', timeout: 5000 });
  });

  test('方向別時刻表の検索テスト（要件2.2）', async ({ page }) => {
    // 路線選択（最初の路線を選択）
    await page.selectOption('#route-select', { index: 1 });
    
    // 方向選択が有効になるまで待つ
    await page.waitForSelector('#direction-select:not([disabled])', { timeout: 3000 });
    
    // 方向を選択（最初の方向を選択）
    await page.selectOption('#direction-select', { index: 1 });
    
    // 検索ボタンが有効になるまで待つ
    await page.waitForSelector('#search-timetable-btn:not([disabled])', { timeout: 1000 });
    
    // 検索ボタンをクリック
    await page.click('#search-timetable-btn');
    
    // 結果が表示されるまで待つ
    await page.waitForSelector('#timetable-result[style*="display: block"]', { timeout: 3000 });
    
    // 結果を取得
    const resultText = await page.textContent('#timetable-result');
    
    // 時刻表データが表示されることを確認
    expect(resultText).toContain('路線:');
    expect(resultText).toContain('方向:');
    expect(resultText).toContain('時刻表エントリ数:');
    expect(resultText).not.toContain('エラー');
    expect(resultText).not.toContain('データが見つかりません');
    
    // 方向情報が含まれることを確認
    const hasDirection = resultText.includes('方向: 0') || 
                        resultText.includes('方向: 1') || 
                        resultText.includes('方向: unknown');
    expect(hasDirection).toBeTruthy();
  });

  test('Trip経路の表示テスト（要件3.2）', async ({ page }) => {
    // Tripを選択（最初のTripを選択）
    await page.selectOption('#trip-select', { index: 1 });
    
    // 検索ボタンが有効になるまで待つ
    await page.waitForSelector('#search-trip-btn:not([disabled])', { timeout: 1000 });
    
    // 検索ボタンをクリック
    await page.click('#search-trip-btn');
    
    // 結果が表示されるまで待つ
    await page.waitForSelector('#trip-result[style*="display: block"]', { timeout: 3000 });
    
    // 結果を取得
    const resultText = await page.textContent('#trip-result');
    
    // 停留所リストが表示されることを確認
    expect(resultText).toContain('Trip ID:');
    expect(resultText).toContain('停留所数:');
    expect(resultText).toContain('経路:');
    expect(resultText).not.toContain('エラー');
    expect(resultText).not.toContain('データが見つかりません');
    
    // 停留所情報が含まれることを確認（stopId, stopName, sequence, arrivalTime）
    expect(resultText).toContain('停留所ID:');
    expect(resultText).toContain('順序:');
    expect(resultText).toContain('到着時刻:');
  });

  test('停留所グループ化の表示テスト（要件6.3）', async ({ page }) => {
    // グループ化オプションが有効になっていることを確認
    const isChecked = await page.isChecked('#group-by-parent');
    if (!isChecked) {
      await page.check('#group-by-parent');
    }
    
    // 検索入力（複数の乗り場がある停留所を検索）
    await page.fill('#stop-search-input', '佐賀駅');
    
    // 検索ボタンをクリック
    await page.click('#search-stops-btn');
    
    // 結果が表示されるまで待つ
    await page.waitForSelector('#stops-result[style*="display: block"]', { timeout: 3000 });
    
    // 結果を取得
    const resultText = await page.textContent('#stops-result');
    
    // グループ化された結果が表示されることを確認
    expect(resultText).toContain('検索キーワード:');
    expect(resultText).toContain('グループ化: 有効');
    expect(resultText).not.toContain('エラー');
    
    // 親駅でグループ化されていることを確認
    const hasGrouping = resultText.includes('親駅:');
    expect(hasGrouping).toBeTruthy();
  });

  test('方向別時刻表インデックスの完全性（要件2.2）', async ({ page }) => {
    // インデックスの完全性を検証
    const indexStats = await page.evaluate(() => {
      const loader = window.dataLoader;
      const index = loader.timetableByRouteAndDirection;
      
      if (!index) {
        return { error: 'インデックスが生成されていません' };
      }
      
      const routeCount = Object.keys(index).length;
      let totalEntries = 0;
      let directionsFound = new Set();
      
      Object.values(index).forEach(routeData => {
        Object.keys(routeData).forEach(direction => {
          directionsFound.add(direction);
          totalEntries += routeData[direction].length;
        });
      });
      
      return {
        routeCount,
        totalEntries,
        directions: Array.from(directionsFound),
        hasData: routeCount > 0 && totalEntries > 0
      };
    });
    
    // インデックスが正しく生成されていることを確認
    expect(indexStats.error).toBeUndefined();
    expect(indexStats.hasData).toBeTruthy();
    expect(indexStats.routeCount).toBeGreaterThan(0);
    expect(indexStats.totalEntries).toBeGreaterThan(0);
    
    console.log('方向別時刻表インデックス統計:', indexStats);
  });

  test('Trip-Stopマッピングの完全性（要件3.2）', async ({ page }) => {
    // Trip-Stopマッピングの完全性を検証
    const mappingStats = await page.evaluate(() => {
      const loader = window.dataLoader;
      const mapping = loader.tripStops;
      
      if (!mapping) {
        return { error: 'Trip-Stopマッピングが生成されていません' };
      }
      
      const tripCount = Object.keys(mapping).length;
      let totalStops = 0;
      let hasRequiredFields = true;
      let isSorted = true;
      
      Object.values(mapping).forEach(stops => {
        totalStops += stops.length;
        
        // 必須フィールドの確認
        stops.forEach(stop => {
          if (!stop.stopId || !stop.stopName || 
              stop.sequence === undefined || !stop.arrivalTime) {
            hasRequiredFields = false;
          }
        });
        
        // ソート順の確認
        for (let i = 1; i < stops.length; i++) {
          if (stops[i].sequence < stops[i - 1].sequence) {
            isSorted = false;
            break;
          }
        }
      });
      
      return {
        tripCount,
        totalStops,
        hasRequiredFields,
        isSorted,
        hasData: tripCount > 0 && totalStops > 0
      };
    });
    
    // マッピングが正しく生成されていることを確認
    expect(mappingStats.error).toBeUndefined();
    expect(mappingStats.hasData).toBeTruthy();
    expect(mappingStats.tripCount).toBeGreaterThan(0);
    expect(mappingStats.totalStops).toBeGreaterThan(0);
    expect(mappingStats.hasRequiredFields).toBeTruthy();
    expect(mappingStats.isSorted).toBeTruthy();
    
    console.log('Trip-Stopマッピング統計:', mappingStats);
  });

  test('停留所グループ化の正確性（要件6.3）', async ({ page }) => {
    // 停留所グループ化の正確性を検証
    const groupingStats = await page.evaluate(() => {
      const loader = window.dataLoader;
      const grouped = loader.stopsGrouped;
      
      if (!grouped) {
        return { error: '停留所グループ化が生成されていません' };
      }
      
      const parentStationCount = Object.keys(grouped).length;
      let totalStops = 0;
      let hasParentStationField = true;
      
      // busStopsにparent_stationフィールドがあることを確認
      if (loader.busStops) {
        loader.busStops.forEach(stop => {
          if (stop.parentStation === undefined) {
            hasParentStationField = false;
          }
        });
      }
      
      Object.values(grouped).forEach(stops => {
        totalStops += stops.length;
      });
      
      return {
        parentStationCount,
        totalStops,
        hasParentStationField,
        hasData: parentStationCount > 0 && totalStops > 0
      };
    });
    
    // グループ化が正しく生成されていることを確認
    expect(groupingStats.error).toBeUndefined();
    expect(groupingStats.hasData).toBeTruthy();
    expect(groupingStats.hasParentStationField).toBeTruthy();
    
    console.log('停留所グループ化統計:', groupingStats);
  });

  test('インデックス生成のパフォーマンス', async ({ page }) => {
    // ページをリロードしてインデックス生成時間を測定
    await page.goto('http://localhost:8788/tests/test-data-structure-optimization.html');
    
    // データ読み込みとインデックス生成の完了を待つ
    const loadTime = await page.evaluate(async () => {
      const startTime = Date.now();
      
      // データ読み込みを待つ
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (window.dataLoader && window.dataLoader.isDataLoaded()) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
      
      return Date.now() - startTime;
    });
    
    // インデックス生成が5秒以内に完了することを確認
    expect(loadTime).toBeLessThan(5000);
    
    console.log(`データ読み込み＋インデックス生成時間: ${loadTime}ms`);
  });
});
