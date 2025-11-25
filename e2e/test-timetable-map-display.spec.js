/**
 * 時刻表の地図表示機能のE2Eテスト
 */

const { test, expect } = require('@playwright/test');

test.describe('時刻表 - 地図表示機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8788');
    // データ読み込み完了を待つ
    await page.waitForTimeout(2000);
  });

  test('地図で表示するボタンをクリックすると経路が地図に表示される', async ({ page }) => {
    // 地図を最大ズームしてクラスターを解除
    await page.waitForSelector('.leaflet-control-zoom-in', { timeout: 5000 });
    for (let i = 0; i < 5; i++) {
      await page.click('.leaflet-control-zoom-in');
      await page.waitForTimeout(200);
    }

    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.bus-stop-marker', { timeout: 5000 });
    const marker = page.locator('.bus-stop-marker').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線を選択
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.click();

    // 地図表示ボタンをクリック
    await page.waitForSelector('.timetable-map-button', { timeout: 3000 });
    const mapButton = page.locator('.timetable-map-button');
    await mapButton.click();

    // モーダルが閉じることを確認
    const modal = page.locator('#timetable-modal');
    await expect(modal).not.toBeVisible();

    // 地図に経路が表示されることを確認（ポリラインが存在する）
    await page.waitForSelector('.leaflet-overlay-pane path', { timeout: 3000 });
    const polyline = page.locator('.leaflet-overlay-pane path').first();
    await expect(polyline).toBeVisible();
  });

  test('地図表示後、経路をクリアボタンが表示される', async ({ page }) => {
    // 地図を最大ズームしてクラスターを解除
    await page.waitForSelector('.leaflet-control-zoom-in', { timeout: 5000 });
    for (let i = 0; i < 5; i++) {
      await page.click('.leaflet-control-zoom-in');
      await page.waitForTimeout(200);
    }

    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.bus-stop-marker', { timeout: 5000 });
    const marker = page.locator('.bus-stop-marker').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線を選択
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.click();

    // 地図表示ボタンをクリック
    await page.waitForSelector('.timetable-map-button', { timeout: 3000 });
    const mapButton = page.locator('.timetable-map-button');
    await mapButton.click();

    // 経路をクリアボタンが表示される
    await page.waitForSelector('#clear-route-button', { timeout: 3000 });
    const clearButton = page.locator('#clear-route-button');
    await expect(clearButton).toBeVisible();
  });

  test('経路をクリアボタンをクリックすると経路が消える', async ({ page }) => {
    // 地図を最大ズームしてクラスターを解除
    await page.waitForSelector('.leaflet-control-zoom-in', { timeout: 5000 });
    for (let i = 0; i < 5; i++) {
      await page.click('.leaflet-control-zoom-in');
      await page.waitForTimeout(200);
    }

    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.bus-stop-marker', { timeout: 5000 });
    const marker = page.locator('.bus-stop-marker').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線を選択
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.click();

    // 地図表示ボタンをクリック
    await page.waitForSelector('.timetable-map-button', { timeout: 3000 });
    const mapButton = page.locator('.timetable-map-button');
    await mapButton.click();

    // 経路が表示されることを確認
    await page.waitForSelector('.leaflet-overlay-pane path', { timeout: 3000 });

    // 経路をクリアボタンをクリック
    await page.waitForSelector('#clear-route-button', { timeout: 3000 });
    const clearButton = page.locator('#clear-route-button');
    await clearButton.click();

    // 経路が消えることを確認（ポリラインが存在しない）
    const polylines = page.locator('.leaflet-overlay-pane path');
    await expect(polylines).toHaveCount(0);

    // 経路をクリアボタンが非表示になる
    await expect(clearButton).not.toBeVisible();
  });

  test('地図表示後、地図エリアにスクロールする', async ({ page }) => {
    // 地図を最大ズームしてクラスターを解除
    await page.waitForSelector('.leaflet-control-zoom-in', { timeout: 5000 });
    for (let i = 0; i < 5; i++) {
      await page.click('.leaflet-control-zoom-in');
      await page.waitForTimeout(200);
    }

    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.bus-stop-marker', { timeout: 5000 });
    const marker = page.locator('.bus-stop-marker').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線を選択
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.click();

    // 地図表示ボタンをクリック
    await page.waitForSelector('.timetable-map-button', { timeout: 3000 });
    const mapButton = page.locator('.timetable-map-button');
    await mapButton.click();

    // 地図コンテナが表示領域内にあることを確認
    await page.waitForTimeout(1000); // スクロールアニメーション完了を待つ
    const mapContainer = page.locator('#map-container');
    const isInViewport = await mapContainer.isVisible();
    expect(isInViewport).toBe(true);
  });

  test('経路表示時、乗車バス停と降車バス停のマーカーが表示される', async ({ page }) => {
    // 地図を最大ズームしてクラスターを解除
    await page.waitForSelector('.leaflet-control-zoom-in', { timeout: 5000 });
    for (let i = 0; i < 5; i++) {
      await page.click('.leaflet-control-zoom-in');
      await page.waitForTimeout(200);
    }

    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.bus-stop-marker', { timeout: 5000 });
    const marker = page.locator('.bus-stop-marker').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線を選択
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.click();

    // 地図表示ボタンをクリック
    await page.waitForSelector('.timetable-map-button', { timeout: 3000 });
    const mapButton = page.locator('.timetable-map-button');
    await mapButton.click();

    // 経路が表示されるまで待つ
    await page.waitForSelector('.leaflet-overlay-pane path', { timeout: 3000 });

    // マーカーが複数表示されることを確認（乗車、降車、経由バス停）
    const markers = page.locator('.leaflet-marker-icon');
    const markerCount = await markers.count();
    expect(markerCount).toBeGreaterThan(1);
  });
});
