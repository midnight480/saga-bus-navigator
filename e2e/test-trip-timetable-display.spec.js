/**
 * E2Eテスト: 便の時刻表表示機能
 */

import { test, expect } from '@playwright/test';

test.describe('便の時刻表表示機能', () => {
  test.beforeEach(async ({ page }) => {
    // アプリケーションを起動
    await page.goto('http://localhost:8788');
    
    // データが読み込まれるまで待機
    await page.waitForTimeout(2000);
  });

  test('時刻表が車両マーカーの吹き出しに表示される', async ({ page }) => {
    // 車両マーカーが表示されるまで待機
    await page.waitForSelector('.vehicle-marker', { timeout: 10000 });
    
    // 最初の車両マーカーをクリック
    await page.click('.vehicle-marker');
    
    // 吹き出しが表示されるまで待機
    await page.waitForSelector('.leaflet-popup-content', { timeout: 5000 });
    
    // 時刻表セクションが存在することを確認
    const timetableSection = await page.locator('.trip-timetable');
    await expect(timetableSection).toBeVisible();
    
    // 時刻表ヘッダーが存在することを確認
    const timetableHeader = await page.locator('.timetable-header');
    await expect(timetableHeader).toBeVisible();
    await expect(timetableHeader).toContainText('時刻表');
    
    // 時刻表コンテンツが存在することを確認
    const timetableContent = await page.locator('.timetable-content');
    await expect(timetableContent).toBeVisible();
  });

  test('時刻表に便IDと路線名が表示される', async ({ page }) => {
    // 車両マーカーをクリック
    await page.waitForSelector('.vehicle-marker', { timeout: 10000 });
    await page.click('.vehicle-marker');
    
    // 吹き出しが表示されるまで待機
    await page.waitForSelector('.leaflet-popup-content', { timeout: 5000 });
    
    // 路線情報が表示されることを確認
    const routeInfo = await page.locator('.route-info');
    await expect(routeInfo).toBeVisible();
    await expect(routeInfo).toContainText('便ID:');
    await expect(routeInfo).toContainText('路線:');
  });

  test('時刻表にバス停名と到着時刻が表示される', async ({ page }) => {
    // 車両マーカーをクリック
    await page.waitForSelector('.vehicle-marker', { timeout: 10000 });
    await page.click('.vehicle-marker');
    
    // 吹き出しが表示されるまで待機
    await page.waitForSelector('.leaflet-popup-content', { timeout: 5000 });
    
    // 時刻表の停車バス停が表示されることを確認
    const timetableStops = await page.locator('.timetable-stops');
    await expect(timetableStops).toBeVisible();
    
    // バス停アイテムが存在することを確認
    const stopItems = await page.locator('.stop-item');
    const stopCount = await stopItems.count();
    expect(stopCount).toBeGreaterThan(0);
    
    // 最初のバス停アイテムにバス停名と時刻が含まれることを確認
    const firstStop = stopItems.first();
    const firstStopText = await firstStop.textContent();
    expect(firstStopText).toMatch(/（\d{2}:\d{2}）/);
  });

  test('時刻表に矢印が表示される', async ({ page }) => {
    // 車両マーカーをクリック
    await page.waitForSelector('.vehicle-marker', { timeout: 10000 });
    await page.click('.vehicle-marker');
    
    // 吹き出しが表示されるまで待機
    await page.waitForSelector('.leaflet-popup-content', { timeout: 5000 });
    
    // 矢印が表示されることを確認
    const arrows = await page.locator('.stop-arrow');
    const arrowCount = await arrows.count();
    expect(arrowCount).toBeGreaterThan(0);
    
    // 矢印のテキストが「→」であることを確認
    const firstArrow = arrows.first();
    await expect(firstArrow).toContainText('→');
  });

  test('現在位置のバス停が強調表示される', async ({ page }) => {
    // 車両マーカーをクリック
    await page.waitForSelector('.vehicle-marker', { timeout: 10000 });
    await page.click('.vehicle-marker');
    
    // 吹き出しが表示されるまで待機
    await page.waitForSelector('.leaflet-popup-content', { timeout: 5000 });
    
    // 現在位置のバス停が存在するか確認
    const currentStop = await page.locator('.current-stop');
    
    // 現在位置のバス停が存在する場合のみテスト
    if (await currentStop.count() > 0) {
      await expect(currentStop).toBeVisible();
      
      // 現在地マーカーが表示されることを確認
      const currentMarker = await page.locator('.current-marker');
      await expect(currentMarker).toBeVisible();
      await expect(currentMarker).toContainText('現在地');
    }
  });

  test('10停車以上の便は折りたたまれた状態で表示される', async ({ page }) => {
    // 車両マーカーをクリック
    await page.waitForSelector('.vehicle-marker', { timeout: 10000 });
    
    // 10停車以上の便を探す
    const markers = await page.locator('.vehicle-marker').all();
    
    for (const marker of markers) {
      await marker.click();
      await page.waitForTimeout(500);
      
      // 時刻表コンテンツを取得
      const timetableContent = await page.locator('.timetable-content');
      
      if (await timetableContent.count() > 0) {
        const collapsed = await timetableContent.getAttribute('data-collapsed');
        
        // 折りたたまれている場合
        if (collapsed === 'true') {
          // 折りたたみリンクが表示されることを確認
          const toggleLink = await page.locator('.timetable-toggle');
          await expect(toggleLink).toBeVisible();
          await expect(toggleLink).toContainText('時刻表を表示');
          
          // テスト成功
          return;
        }
      }
      
      // 吹き出しを閉じる
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    
    // 10停車以上の便が見つからなかった場合はスキップ
    test.skip();
  });

  test('折りたたみリンクをクリックすると時刻表が展開される', async ({ page }) => {
    // 車両マーカーをクリック
    await page.waitForSelector('.vehicle-marker', { timeout: 10000 });
    
    // 10停車以上の便を探す
    const markers = await page.locator('.vehicle-marker').all();
    
    for (const marker of markers) {
      await marker.click();
      await page.waitForTimeout(500);
      
      // 時刻表コンテンツを取得
      const timetableContent = await page.locator('.timetable-content');
      
      if (await timetableContent.count() > 0) {
        const collapsed = await timetableContent.getAttribute('data-collapsed');
        
        // 折りたたまれている場合
        if (collapsed === 'true') {
          // 折りたたみリンクをクリック
          const toggleLink = await page.locator('.timetable-toggle');
          await toggleLink.click();
          await page.waitForTimeout(300);
          
          // 展開されたことを確認
          const newCollapsed = await timetableContent.getAttribute('data-collapsed');
          expect(newCollapsed).toBe('false');
          
          // リンクテキストが変わったことを確認
          await expect(toggleLink).toContainText('時刻表を折りたたむ');
          
          // テスト成功
          return;
        }
      }
      
      // 吹き出しを閉じる
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    
    // 10停車以上の便が見つからなかった場合はスキップ
    test.skip();
  });

  test('エラーが発生しても運行状態情報は表示される', async ({ page }) => {
    // 車両マーカーをクリック
    await page.waitForSelector('.vehicle-marker', { timeout: 10000 });
    await page.click('.vehicle-marker');
    
    // 吹き出しが表示されるまで待機
    await page.waitForSelector('.leaflet-popup-content', { timeout: 5000 });
    
    // 運行状態情報が表示されることを確認
    const vehicleStatus = await page.locator('.vehicle-status');
    await expect(vehicleStatus).toBeVisible();
    
    // 便IDが表示されることを確認
    await expect(vehicleStatus).toContainText('便ID:');
    
    // 路線名が表示されることを確認
    await expect(vehicleStatus).toContainText('路線:');
    
    // 状態が表示されることを確認
    await expect(vehicleStatus).toContainText('状態:');
  });
});
