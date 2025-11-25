/**
 * 時刻表表示機能のE2Eテスト
 */

const { test, expect } = require('@playwright/test');

test.describe('時刻表 - 時刻表表示機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8788');
    // データ読み込み完了を待つ
    await page.waitForTimeout(2000);
  });

  test('時刻表に平日・土日祝タブが表示される', async ({ page }) => {
    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線を選択
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.click();

    // タブが表示されるまで待つ
    await page.waitForSelector('.timetable-tabs', { timeout: 3000 });

    // 平日タブが表示される
    const weekdayTab = page.locator('#tab-weekday');
    await expect(weekdayTab).toBeVisible();
    await expect(weekdayTab).toContainText('平日');

    // 土日祝タブが表示される
    const weekendTab = page.locator('#tab-weekend');
    await expect(weekendTab).toBeVisible();
    await expect(weekendTab).toContainText('土日祝');
  });

  test('平日タブがデフォルトで選択されている', async ({ page }) => {
    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線を選択
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.click();

    // タブが表示されるまで待つ
    await page.waitForSelector('.timetable-tabs', { timeout: 3000 });

    // 平日タブがアクティブ
    const weekdayTab = page.locator('#tab-weekday');
    await expect(weekdayTab).toHaveClass(/active/);
    const ariaSelected = await weekdayTab.getAttribute('aria-selected');
    expect(ariaSelected).toBe('true');

    // 土日祝タブは非アクティブ
    const weekendTab = page.locator('#tab-weekend');
    await expect(weekendTab).not.toHaveClass(/active/);
  });

  test('土日祝タブをクリックすると土日祝の時刻表が表示される', async ({ page }) => {
    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線を選択
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.click();

    // タブが表示されるまで待つ
    await page.waitForSelector('.timetable-tabs', { timeout: 3000 });

    // 土日祝タブをクリック
    const weekendTab = page.locator('#tab-weekend');
    await weekendTab.click();

    // 土日祝タブがアクティブになる
    await expect(weekendTab).toHaveClass(/active/);
    const ariaSelected = await weekendTab.getAttribute('aria-selected');
    expect(ariaSelected).toBe('true');

    // 平日タブは非アクティブになる
    const weekdayTab = page.locator('#tab-weekday');
    await expect(weekdayTab).not.toHaveClass(/active/);

    // 土日祝の時刻表コンテンツが表示される
    const weekendContent = page.locator('#timetable-weekend');
    await expect(weekendContent).toBeVisible();

    // 平日の時刻表コンテンツは非表示
    const weekdayContent = page.locator('#timetable-weekday');
    await expect(weekdayContent).not.toBeVisible();
  });

  test('時刻表に発車時刻と行き先が表示される', async ({ page }) => {
    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線を選択
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.click();

    // 時刻表が表示されるまで待つ
    await page.waitForSelector('.timetable-table', { timeout: 3000 });

    // テーブルヘッダーを確認
    const headers = page.locator('.timetable-table th');
    await expect(headers.nth(0)).toContainText('発車時刻');
    await expect(headers.nth(1)).toContainText('行き先');

    // データ行が存在することを確認
    const rows = page.locator('.timetable-table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // 最初の行のデータを確認
    const firstRow = rows.first();
    const timeCell = firstRow.locator('.timetable-time');
    const destCell = firstRow.locator('.timetable-destination');

    await expect(timeCell).toBeVisible();
    await expect(destCell).toBeVisible();

    // 時刻がHH:MM形式であることを確認
    const timeText = await timeCell.textContent();
    expect(timeText).toMatch(/^\d{2}:\d{2}$|^翌\d{2}:\d{2}$/);
  });

  test('地図で表示するボタンが表示される', async ({ page }) => {
    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線を選択
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.click();

    // 地図表示ボタンが表示されるまで待つ
    await page.waitForSelector('.timetable-map-button', { timeout: 3000 });

    const mapButton = page.locator('.timetable-map-button');
    await expect(mapButton).toBeVisible();
    await expect(mapButton).toContainText('地図で表示する');
  });

  test('戻るボタンをクリックすると路線選択画面に戻る', async ({ page }) => {
    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線を選択
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.click();

    // 時刻表が表示されるまで待つ
    await page.waitForSelector('.timetable-tabs', { timeout: 3000 });

    // 戻るボタンをクリック
    const backButton = page.locator('.timetable-back-button');
    await backButton.click();

    // 路線選択画面に戻る
    await page.waitForSelector('.timetable-route-list', { timeout: 3000 });
    const routeList = page.locator('.timetable-route-list');
    await expect(routeList).toBeVisible();
  });

  test('タブにARIA属性が設定されている', async ({ page }) => {
    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線を選択
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.click();

    // タブが表示されるまで待つ
    await page.waitForSelector('.timetable-tabs', { timeout: 3000 });

    // 平日タブのARIA属性を確認
    const weekdayTab = page.locator('#tab-weekday');
    const weekdayRole = await weekdayTab.getAttribute('role');
    expect(weekdayRole).toBe('tab');

    const weekdayAriaSelected = await weekdayTab.getAttribute('aria-selected');
    expect(weekdayAriaSelected).toBe('true');

    const weekdayAriaControls = await weekdayTab.getAttribute('aria-controls');
    expect(weekdayAriaControls).toBe('timetable-weekday');

    // 土日祝タブのARIA属性を確認
    const weekendTab = page.locator('#tab-weekend');
    const weekendRole = await weekendTab.getAttribute('role');
    expect(weekendRole).toBe('tab');

    const weekendAriaSelected = await weekendTab.getAttribute('aria-selected');
    expect(weekendAriaSelected).toBe('false');

    const weekendAriaControls = await weekendTab.getAttribute('aria-controls');
    expect(weekendAriaControls).toBe('timetable-weekend');
  });
});
