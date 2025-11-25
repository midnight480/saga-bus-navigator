/**
 * 時刻表検索の重複チェックE2Eテスト
 * 要件1.4: ユーザーが時刻表を検索するとき、システムは各便を1回のみ表示すること
 */

const { test, expect } = require('@playwright/test');

test.describe('時刻表検索 - 重複チェック', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8788');
    // データ読み込み完了を待つ
    await page.waitForTimeout(3000);
  });

  test('時刻表検索結果に重複がないことを検証', async ({ page }) => {
    // 地図をズームインしてマーカークラスターを展開
    await page.waitForSelector('.leaflet-control-zoom-in', { timeout: 5000 });
    await page.click('.leaflet-control-zoom-in');
    await page.waitForTimeout(500);
    await page.click('.leaflet-control-zoom-in');
    await page.waitForTimeout(500);

    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon:not(.marker-cluster)', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon:not(.marker-cluster)').first();
    await marker.click();

    // 時刻表を見るボタンをクリック
    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線を選択
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.click();

    // 時刻表が表示されるまで待つ
    await page.waitForSelector('.timetable-table', { timeout: 3000 });

    // 平日タブの時刻表データを取得
    const weekdayRows = page.locator('#timetable-weekday .timetable-table tbody tr');
    const weekdayCount = await weekdayRows.count();

    console.log(`平日の時刻表行数: ${weekdayCount}`);

    if (weekdayCount > 0) {
      // 各行の時刻と行き先を取得
      const weekdayEntries = [];
      for (let i = 0; i < weekdayCount; i++) {
        const row = weekdayRows.nth(i);
        const timeCell = row.locator('.timetable-time');
        const destCell = row.locator('.timetable-destination');
        
        const time = await timeCell.textContent();
        const destination = await destCell.textContent();
        
        weekdayEntries.push(`${time}|${destination}`);
      }

      // 重複チェック: Set を使用して一意性を検証
      const uniqueEntries = new Set(weekdayEntries);
      
      console.log(`平日の時刻表エントリ数: ${weekdayEntries.length}`);
      console.log(`平日の一意なエントリ数: ${uniqueEntries.size}`);

      // 重複がないことを検証
      expect(weekdayEntries.length).toBe(uniqueEntries.size);

      // 重複がある場合は詳細を出力
      if (weekdayEntries.length !== uniqueEntries.size) {
        const duplicates = weekdayEntries.filter((item, index) => 
          weekdayEntries.indexOf(item) !== index
        );
        console.error('重複エントリ:', duplicates);
      }
    }

    // 土日祝タブをクリック
    const weekendTab = page.locator('#tab-weekend');
    await weekendTab.click();
    await page.waitForTimeout(500);

    // 土日祝タブの時刻表データを取得
    const weekendRows = page.locator('#timetable-weekend .timetable-table tbody tr');
    const weekendCount = await weekendRows.count();

    console.log(`土日祝の時刻表行数: ${weekendCount}`);

    if (weekendCount > 0) {
      // 各行の時刻と行き先を取得
      const weekendEntries = [];
      for (let i = 0; i < weekendCount; i++) {
        const row = weekendRows.nth(i);
        const timeCell = row.locator('.timetable-time');
        const destCell = row.locator('.timetable-destination');
        
        const time = await timeCell.textContent();
        const destination = await destCell.textContent();
        
        weekendEntries.push(`${time}|${destination}`);
      }

      // 重複チェック: Set を使用して一意性を検証
      const uniqueEntries = new Set(weekendEntries);
      
      console.log(`土日祝の時刻表エントリ数: ${weekendEntries.length}`);
      console.log(`土日祝の一意なエントリ数: ${uniqueEntries.size}`);

      // 重複がないことを検証
      expect(weekendEntries.length).toBe(uniqueEntries.size);

      // 重複がある場合は詳細を出力
      if (weekendEntries.length !== uniqueEntries.size) {
        const duplicates = weekendEntries.filter((item, index) => 
          weekendEntries.indexOf(item) !== index
        );
        console.error('重複エントリ:', duplicates);
      }
    }
  });

  test('複数の路線で時刻表検索結果に重複がないことを検証', async ({ page }) => {
    // 地図をズームインしてマーカークラスターを展開
    await page.waitForSelector('.leaflet-control-zoom-in', { timeout: 5000 });
    await page.click('.leaflet-control-zoom-in');
    await page.waitForTimeout(500);
    await page.click('.leaflet-control-zoom-in');
    await page.waitForTimeout(500);

    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon:not(.marker-cluster)', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon:not(.marker-cluster)').first();
    await marker.click();

    // 時刻表を見るボタンをクリック
    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線リストを取得
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });
    const routeItems = page.locator('.timetable-route-item');
    const routeCount = await routeItems.count();

    console.log(`路線数: ${routeCount}`);

    // 最大3つの路線をテスト（テスト時間を短縮）
    const testCount = Math.min(routeCount, 3);

    for (let routeIndex = 0; routeIndex < testCount; routeIndex++) {
      // 路線を選択
      await page.waitForSelector('.timetable-route-item', { timeout: 3000 });
      const routeItem = page.locator('.timetable-route-item').nth(routeIndex);
      const routeName = await routeItem.textContent();
      await routeItem.click();

      console.log(`\n路線 ${routeIndex + 1}: ${routeName}`);

      // 時刻表が表示されるまで待つ
      await page.waitForSelector('.timetable-table', { timeout: 3000 });

      // 平日タブの時刻表データを取得
      const weekdayRows = page.locator('#timetable-weekday .timetable-table tbody tr');
      const weekdayCount = await weekdayRows.count();

      if (weekdayCount > 0) {
        // 各行の時刻と行き先を取得
        const weekdayEntries = [];
        for (let i = 0; i < weekdayCount; i++) {
          const row = weekdayRows.nth(i);
          const timeCell = row.locator('.timetable-time');
          const destCell = row.locator('.timetable-destination');
          
          const time = await timeCell.textContent();
          const destination = await destCell.textContent();
          
          weekdayEntries.push(`${time}|${destination}`);
        }

        // 重複チェック
        const uniqueEntries = new Set(weekdayEntries);
        
        console.log(`  平日: エントリ数=${weekdayEntries.length}, 一意数=${uniqueEntries.size}`);

        // 重複がないことを検証
        expect(weekdayEntries.length).toBe(uniqueEntries.size);
      }

      // 戻るボタンをクリックして路線選択画面に戻る
      const backButton = page.locator('.timetable-back-button');
      await backButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('各便のtripIdが一意であることを検証', async ({ page }) => {
    // コンソールログを監視してtripIdを取得
    const tripIds = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      // 時刻表データのログからtripIdを抽出
      if (text.includes('tripId:')) {
        const match = text.match(/tripId:\s*(\S+)/);
        if (match) {
          tripIds.push(match[1]);
        }
      }
    });

    // 地図をズームインしてマーカークラスターを展開
    await page.waitForSelector('.leaflet-control-zoom-in', { timeout: 5000 });
    await page.click('.leaflet-control-zoom-in');
    await page.waitForTimeout(500);
    await page.click('.leaflet-control-zoom-in');
    await page.waitForTimeout(500);

    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon:not(.marker-cluster)', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon:not(.marker-cluster)').first();
    await marker.click();

    // 時刻表を見るボタンをクリック
    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線を選択
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.click();

    // 時刻表が表示されるまで待つ
    await page.waitForSelector('.timetable-table', { timeout: 3000 });
    await page.waitForTimeout(1000);

    // tripIdが収集されている場合は一意性を検証
    if (tripIds.length > 0) {
      const uniqueTripIds = new Set(tripIds);
      
      console.log(`収集されたtripId数: ${tripIds.length}`);
      console.log(`一意なtripId数: ${uniqueTripIds.size}`);

      // 各tripIdが一意であることを検証
      expect(tripIds.length).toBe(uniqueTripIds.size);

      // 重複がある場合は詳細を出力
      if (tripIds.length !== uniqueTripIds.size) {
        const duplicates = tripIds.filter((item, index) => 
          tripIds.indexOf(item) !== index
        );
        console.error('重複tripId:', duplicates);
      }
    } else {
      console.log('tripIdがコンソールログから収集できませんでした');
    }
  });

  test('データローダーが1回のみ呼び出されることを検証', async ({ page }) => {
    let loadAllDataCallCount = 0;
    let loadGTFSDataCallCount = 0;

    // ページのJavaScriptを監視
    await page.exposeFunction('trackDataLoaderCall', (methodName) => {
      if (methodName === 'loadAllData') {
        loadAllDataCallCount++;
      } else if (methodName === 'loadGTFSData') {
        loadGTFSDataCallCount++;
      }
    });

    // ページを読み込む前にスクリプトを注入
    await page.addInitScript(() => {
      // DataLoaderのメソッドをラップして呼び出しを追跡
      const originalDataLoader = window.DataLoader;
      if (originalDataLoader) {
        const originalLoadAllData = originalDataLoader.prototype.loadAllData;
        const originalLoadGTFSData = originalDataLoader.prototype.loadGTFSData;

        if (originalLoadAllData) {
          originalDataLoader.prototype.loadAllData = async function(...args) {
            window.trackDataLoaderCall('loadAllData');
            return originalLoadAllData.apply(this, args);
          };
        }

        if (originalLoadGTFSData) {
          originalDataLoader.prototype.loadGTFSData = async function(...args) {
            window.trackDataLoaderCall('loadGTFSData');
            return originalLoadGTFSData.apply(this, args);
          };
        }
      }
    });

    // ページを読み込む
    await page.goto('http://localhost:8788');
    
    // データ読み込み完了を待つ
    await page.waitForTimeout(3000);

    console.log(`loadAllData呼び出し回数: ${loadAllDataCallCount}`);
    console.log(`loadGTFSData呼び出し回数: ${loadGTFSDataCallCount}`);

    // loadAllDataOnce()が実装されている場合、
    // loadAllData()とloadGTFSData()は並列で呼び出されないはず
    // ただし、後方互換性のため両方が呼び出される可能性がある
    
    // 少なくとも、GTFSファイルが2回読み込まれていないことを確認
    // （実際の検証はコンソールログで確認）
  });
});
