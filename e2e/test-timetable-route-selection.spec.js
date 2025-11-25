/**
 * 時刻表の路線選択機能のE2Eテスト
 */

const { test, expect } = require('@playwright/test');

test.describe('時刻表 - 路線選択機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8788');
    // データ読み込み完了を待つ
    await page.waitForTimeout(2000);
  });

  test('バス停マーカーをクリックすると「時刻表を見る」ボタンが表示される', async ({ page }) => {
    // 地図が読み込まれるまで待つ
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });

    // 最初のバス停マーカーをクリック
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    // ポップアップが表示されるまで待つ
    await page.waitForSelector('.leaflet-popup-content', { timeout: 3000 });

    // 「時刻表を見る」ボタンが表示されることを確認
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await expect(timetableButton).toBeVisible();
  });

  test('「時刻表を見る」ボタンをクリックすると路線選択モーダルが表示される', async ({ page }) => {
    // バス停マーカーをクリック
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    // 「時刻表を見る」ボタンをクリック
    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // モーダルが表示されることを確認
    const modal = page.locator('#timetable-modal');
    await expect(modal).toBeVisible();

    // モーダルタイトルが表示されることを確認
    const modalTitle = page.locator('#timetable-modal-title');
    await expect(modalTitle).toBeVisible();
    await expect(modalTitle).toContainText('時刻表');
  });

  test('路線選択画面に路線一覧が表示される', async ({ page }) => {
    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線選択画面が表示されるまで待つ
    await page.waitForSelector('.timetable-route-list', { timeout: 3000 });

    // 「路線を選択してください」というメッセージが表示される
    const instruction = page.locator('.timetable-instruction');
    await expect(instruction).toBeVisible();
    await expect(instruction).toContainText('路線を選択してください');

    // 路線アイテムが表示される
    const routeItems = page.locator('.timetable-route-item');
    await expect(routeItems.first()).toBeVisible();
  });

  test('各路線に路線名と事業者名が表示される', async ({ page }) => {
    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線選択画面が表示されるまで待つ
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });

    // 最初の路線アイテムを確認
    const firstRouteItem = page.locator('.timetable-route-item').first();

    // 路線名が表示される
    const routeName = firstRouteItem.locator('.timetable-route-name');
    await expect(routeName).toBeVisible();
    const routeNameText = await routeName.textContent();
    expect(routeNameText.length).toBeGreaterThan(0);

    // 事業者名が表示される
    const agencyName = firstRouteItem.locator('.timetable-agency-name');
    await expect(agencyName).toBeVisible();
    const agencyNameText = await agencyName.textContent();
    expect(agencyNameText.length).toBeGreaterThan(0);
  });

  test('路線をクリックすると時刻表が表示される', async ({ page }) => {
    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線選択画面が表示されるまで待つ
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });

    // 最初の路線をクリック
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.click();

    // 時刻表が表示されるまで待つ
    await page.waitForSelector('.timetable-tabs', { timeout: 3000 });

    // タブが表示される
    const tabs = page.locator('.timetable-tab');
    await expect(tabs.first()).toBeVisible();

    // 時刻表コンテンツが表示される
    const timetableContent = page.locator('.timetable-content');
    await expect(timetableContent).toBeVisible();
  });

  test('路線をEnterキーで選択できる', async ({ page }) => {
    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線選択画面が表示されるまで待つ
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });

    // 最初の路線にフォーカスしてEnterキーを押す
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.focus();
    await page.keyboard.press('Enter');

    // 時刻表が表示されるまで待つ
    await page.waitForSelector('.timetable-tabs', { timeout: 3000 });

    // タブが表示される
    const tabs = page.locator('.timetable-tab');
    await expect(tabs.first()).toBeVisible();
  });

  test('路線をSpaceキーで選択できる', async ({ page }) => {
    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線選択画面が表示されるまで待つ
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });

    // 最初の路線にフォーカスしてSpaceキーを押す
    const firstRouteItem = page.locator('.timetable-route-item').first();
    await firstRouteItem.focus();
    await page.keyboard.press('Space');

    // 時刻表が表示されるまで待つ
    await page.waitForSelector('.timetable-tabs', { timeout: 3000 });

    // タブが表示される
    const tabs = page.locator('.timetable-tab');
    await expect(tabs.first()).toBeVisible();
  });

  test('モーダルの閉じるボタンをクリックするとモーダルが閉じる', async ({ page }) => {
    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // モーダルが表示されることを確認
    const modal = page.locator('#timetable-modal');
    await expect(modal).toBeVisible();

    // 閉じるボタンをクリック
    const closeButton = page.locator('.timetable-close-button');
    await closeButton.click();

    // モーダルが閉じることを確認
    await expect(modal).not.toBeVisible();
  });

  test('Escapeキーでモーダルを閉じることができる', async ({ page }) => {
    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // モーダルが表示されることを確認
    const modal = page.locator('#timetable-modal');
    await expect(modal).toBeVisible();

    // Escapeキーを押す
    await page.keyboard.press('Escape');

    // モーダルが閉じることを確認
    await expect(modal).not.toBeVisible();
  });

  test('路線アイテムにARIA属性が設定されている', async ({ page }) => {
    // バス停マーカーをクリックして時刻表モーダルを開く
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
    const marker = page.locator('.leaflet-marker-icon').first();
    await marker.click();

    await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
    const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
    await timetableButton.click();

    // 路線選択画面が表示されるまで待つ
    await page.waitForSelector('.timetable-route-item', { timeout: 3000 });

    // 最初の路線アイテムのARIA属性を確認
    const firstRouteItem = page.locator('.timetable-route-item').first();
    
    // role属性が設定されている
    const role = await firstRouteItem.getAttribute('role');
    expect(role).toBe('listitem');

    // tabindex属性が設定されている
    const tabindex = await firstRouteItem.getAttribute('tabindex');
    expect(tabindex).toBe('0');

    // aria-label属性が設定されている
    const ariaLabel = await firstRouteItem.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toContain('を選択');
  });
});
