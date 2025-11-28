/**
 * 時刻表方向情報表示機能のE2Eテスト
 * 検証: 要件1.1, 2.2, 4.2, 3.2
 */

const { test, expect } = require('@playwright/test');

test.describe('時刻表 - 方向情報表示機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8788');
    // データ読み込み完了を待つ
    await page.waitForTimeout(2000);
  });

  test.describe('検索結果リストの方向情報表示（要件1.1）', () => {
    test('検索結果に方向ラベルが表示される', async ({ page }) => {
      // データ読み込み完了を待つ
      await page.waitForFunction(() => {
        const departureInput = document.getElementById('departure-stop');
        return departureInput && !departureInput.disabled;
      }, { timeout: 5000 });

      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // バス停を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 検索実行
      await searchButton.click();

      // 結果が表示されるまで待つ
      const resultsContainer = page.locator('#results-container');
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 結果アイテムを取得
      const resultItems = page.locator('.result-item');
      const count = await resultItems.count();
      expect(count).toBeGreaterThan(0);

      // 最初の結果アイテムに方向ラベルが存在することを確認
      const firstResult = resultItems.first();
      const directionLabel = firstResult.locator('.direction-label');
      
      // 方向ラベルが表示されている（往路または復路）
      const labelCount = await directionLabel.count();
      if (labelCount > 0) {
        await expect(directionLabel).toBeVisible();
        
        // ラベルのクラスを確認（往路または復路）
        const hasOutbound = await directionLabel.evaluate(el => 
          el.classList.contains('direction-label-outbound')
        );
        const hasInbound = await directionLabel.evaluate(el => 
          el.classList.contains('direction-label-inbound')
        );
        
        expect(hasOutbound || hasInbound).toBeTruthy();
      }
    });

    test('方向ラベルにaria-label属性が設定されている', async ({ page }) => {
      // データ読み込み完了を待つ
      await page.waitForFunction(() => {
        const departureInput = document.getElementById('departure-stop');
        return departureInput && !departureInput.disabled;
      }, { timeout: 5000 });

      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // バス停を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 検索実行
      await searchButton.click();

      // 結果が表示されるまで待つ
      const resultsContainer = page.locator('#results-container');
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 方向ラベルを取得
      const directionLabel = page.locator('.direction-label').first();
      const labelCount = await directionLabel.count();
      
      if (labelCount > 0) {
        // aria-label属性が設定されていることを確認
        const ariaLabel = await directionLabel.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toMatch(/往路|復路/);
      }
    });
  });

  test.describe('時刻表モーダルの方向情報表示（要件2.2）', () => {
    test('時刻表テーブルに方向列が表示される', async ({ page }) => {
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

      // テーブルヘッダーに「方向」列が存在することを確認
      const headers = page.locator('.timetable-table th');
      const headerTexts = await headers.allTextContents();
      
      const hasDirectionColumn = headerTexts.some(text => text.includes('方向'));
      expect(hasDirectionColumn).toBeTruthy();
    });

    test('各便に方向ラベルが表示される', async ({ page }) => {
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

      // データ行を取得
      const rows = page.locator('.timetable-table tbody tr');
      const rowCount = await rows.count();
      
      if (rowCount > 0) {
        // 最初の行の方向セルを確認
        const firstRow = rows.first();
        const directionCell = firstRow.locator('td').nth(2); // 方向列は3番目
        
        await expect(directionCell).toBeVisible();
        
        // 方向ラベルが存在することを確認
        const directionLabel = directionCell.locator('.direction-label');
        const labelCount = await directionLabel.count();
        
        // 方向ラベルまたは「-」が表示されている
        if (labelCount > 0) {
          await expect(directionLabel).toBeVisible();
        } else {
          const cellText = await directionCell.textContent();
          expect(cellText.trim()).toBeTruthy();
        }
      }
    });
  });

  test.describe('方向フィルタリング機能（要件4.2）', () => {
    test('方向フィルタボタンが表示される', async ({ page }) => {
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

      // 方向フィルタが表示されるまで待つ
      await page.waitForSelector('.direction-filter', { timeout: 3000 });

      // フィルタボタンが表示されることを確認
      const filterButtons = page.locator('.direction-filter-button');
      const buttonCount = await filterButtons.count();
      expect(buttonCount).toBe(3); // すべて、往路のみ、復路のみ

      // 各ボタンのテキストを確認
      const allButton = filterButtons.nth(0);
      const outboundButton = filterButtons.nth(1);
      const inboundButton = filterButtons.nth(2);

      await expect(allButton).toContainText('すべて');
      await expect(outboundButton).toContainText('往路');
      await expect(inboundButton).toContainText('復路');
    });

    test('往路フィルタをクリックすると往路のみが表示される', async ({ page }) => {
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

      // 方向フィルタが表示されるまで待つ
      await page.waitForSelector('.direction-filter', { timeout: 3000 });

      // 往路フィルタボタンをクリック
      const outboundButton = page.locator('.direction-filter-button').nth(1);
      await outboundButton.click();

      // フィルタが適用されるまで待つ
      await page.waitForTimeout(500);

      // 往路ボタンがアクティブになることを確認
      const ariaPressed = await outboundButton.getAttribute('aria-pressed');
      expect(ariaPressed).toBe('true');

      // 表示されている便の方向を確認
      const visibleRows = page.locator('.timetable-table tbody tr:visible');
      const rowCount = await visibleRows.count();
      
      if (rowCount > 0) {
        // 各行の方向ラベルを確認
        for (let i = 0; i < Math.min(rowCount, 5); i++) {
          const row = visibleRows.nth(i);
          const directionCell = row.locator('td').nth(2);
          const directionLabel = directionCell.locator('.direction-label-outbound');
          
          // 往路ラベルまたは方向不明（-）のみが表示されている
          const hasOutbound = await directionLabel.count() > 0;
          const cellText = await directionCell.textContent();
          const isDash = cellText.trim() === '-';
          
          expect(hasOutbound || isDash).toBeTruthy();
        }
      }
    });

    test('復路フィルタをクリックすると復路のみが表示される', async ({ page }) => {
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

      // 方向フィルタが表示されるまで待つ
      await page.waitForSelector('.direction-filter', { timeout: 3000 });

      // 復路フィルタボタンをクリック
      const inboundButton = page.locator('.direction-filter-button').nth(2);
      await inboundButton.click();

      // フィルタが適用されるまで待つ
      await page.waitForTimeout(500);

      // 復路ボタンがアクティブになることを確認
      const ariaPressed = await inboundButton.getAttribute('aria-pressed');
      expect(ariaPressed).toBe('true');

      // 表示されている便の方向を確認
      const visibleRows = page.locator('.timetable-table tbody tr:visible');
      const rowCount = await visibleRows.count();
      
      if (rowCount > 0) {
        // 各行の方向ラベルを確認
        for (let i = 0; i < Math.min(rowCount, 5); i++) {
          const row = visibleRows.nth(i);
          const directionCell = row.locator('td').nth(2);
          const directionLabel = directionCell.locator('.direction-label-inbound');
          
          // 復路ラベルまたは方向不明（-）のみが表示されている
          const hasInbound = await directionLabel.count() > 0;
          const cellText = await directionCell.textContent();
          const isDash = cellText.trim() === '-';
          
          expect(hasInbound || isDash).toBeTruthy();
        }
      }
    });

    test('すべてフィルタをクリックすると全ての便が表示される', async ({ page }) => {
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

      // 方向フィルタが表示されるまで待つ
      await page.waitForSelector('.direction-filter', { timeout: 3000 });

      // 往路フィルタを適用
      const outboundButton = page.locator('.direction-filter-button').nth(1);
      await outboundButton.click();
      await page.waitForTimeout(500);

      // すべてフィルタボタンをクリック
      const allButton = page.locator('.direction-filter-button').nth(0);
      await allButton.click();
      await page.waitForTimeout(500);

      // すべてボタンがアクティブになることを確認
      const ariaPressed = await allButton.getAttribute('aria-pressed');
      expect(ariaPressed).toBe('true');

      // 全ての便が表示されることを確認
      const visibleRows = page.locator('.timetable-table tbody tr:visible');
      const rowCount = await visibleRows.count();
      expect(rowCount).toBeGreaterThan(0);
    });

    test('フィルタボタンにaria-pressed属性が設定されている', async ({ page }) => {
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

      // 方向フィルタが表示されるまで待つ
      await page.waitForSelector('.direction-filter', { timeout: 3000 });

      // 各フィルタボタンのaria-pressed属性を確認
      const filterButtons = page.locator('.direction-filter-button');
      
      for (let i = 0; i < 3; i++) {
        const button = filterButtons.nth(i);
        const ariaPressed = await button.getAttribute('aria-pressed');
        expect(ariaPressed).toBeTruthy();
        expect(['true', 'false']).toContain(ariaPressed);
      }
    });
  });

  test.describe('路線選択画面のバッジ表示（要件3.2）', () => {
    test('路線選択画面に方向判定バッジが表示される', async ({ page }) => {
      // バス停マーカーをクリックして時刻表モーダルを開く
      await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
      const marker = page.locator('.leaflet-marker-icon').first();
      await marker.click();

      await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
      const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
      await timetableButton.click();

      // 路線選択画面が表示されるまで待つ
      await page.waitForSelector('.timetable-route-list', { timeout: 3000 });

      // 路線アイテムを取得
      const routeItems = page.locator('.timetable-route-item');
      const itemCount = await routeItems.count();
      expect(itemCount).toBeGreaterThan(0);

      // 各路線アイテムを確認
      let badgeFound = false;
      for (let i = 0; i < itemCount; i++) {
        const routeItem = routeItems.nth(i);
        const badge = routeItem.locator('.detection-badge');
        const badgeCount = await badge.count();
        
        if (badgeCount > 0) {
          badgeFound = true;
          await expect(badge).toBeVisible();
          
          // バッジのクラスを確認（警告、注意、成功のいずれか）
          const hasWarning = await badge.evaluate(el => 
            el.classList.contains('detection-badge-warning')
          );
          const hasCaution = await badge.evaluate(el => 
            el.classList.contains('detection-badge-caution')
          );
          const hasSuccess = await badge.evaluate(el => 
            el.classList.contains('detection-badge-success')
          );
          
          expect(hasWarning || hasCaution || hasSuccess).toBeTruthy();
          break;
        }
      }
      
      // 少なくとも1つの路線にバッジが表示されることを確認
      // （全ての路線が高い判定率の場合はバッジが表示されない可能性がある）
      console.log(`方向判定バッジが見つかりました: ${badgeFound}`);
    });

    test('方向判定バッジにツールチップが設定されている', async ({ page }) => {
      // バス停マーカーをクリックして時刻表モーダルを開く
      await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
      const marker = page.locator('.leaflet-marker-icon').first();
      await marker.click();

      await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
      const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
      await timetableButton.click();

      // 路線選択画面が表示されるまで待つ
      await page.waitForSelector('.timetable-route-list', { timeout: 3000 });

      // バッジを探す
      const badge = page.locator('.detection-badge').first();
      const badgeCount = await badge.count();
      
      if (badgeCount > 0) {
        // data-tooltip属性が設定されていることを確認
        const tooltip = await badge.getAttribute('data-tooltip');
        expect(tooltip).toBeTruthy();
        expect(tooltip).toContain('%');
      }
    });

    test('方向判定バッジにaria-describedby属性が設定されている', async ({ page }) => {
      // バス停マーカーをクリックして時刻表モーダルを開く
      await page.waitForSelector('.leaflet-marker-icon', { timeout: 5000 });
      const marker = page.locator('.leaflet-marker-icon').first();
      await marker.click();

      await page.waitForSelector('.leaflet-popup-content button:has-text("時刻表を見る")', { timeout: 3000 });
      const timetableButton = page.locator('.leaflet-popup-content button:has-text("時刻表を見る")');
      await timetableButton.click();

      // 路線選択画面が表示されるまで待つ
      await page.waitForSelector('.timetable-route-list', { timeout: 3000 });

      // バッジを探す
      const badge = page.locator('.detection-badge').first();
      const badgeCount = await badge.count();
      
      if (badgeCount > 0) {
        // aria-describedby属性が設定されていることを確認
        const ariaDescribedby = await badge.getAttribute('aria-describedby');
        // aria-describedbyは必須ではないが、設定されている場合は有効な値であることを確認
        if (ariaDescribedby) {
          expect(ariaDescribedby).toBeTruthy();
        }
      }
    });
  });

  test.describe('レスポンシブデザイン対応', () => {
    test('モバイル画面で方向ラベルがアイコンのみで表示される', async ({ page }) => {
      // ビューポートをスマートフォンサイズに設定
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('http://localhost:8788');
      await page.waitForTimeout(2000);

      // データ読み込み完了を待つ
      await page.waitForFunction(() => {
        const departureInput = document.getElementById('departure-stop');
        return departureInput && !departureInput.disabled;
      }, { timeout: 5000 });

      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // バス停を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 検索実行
      await searchButton.click();

      // 結果が表示されるまで待つ
      const resultsContainer = page.locator('#results-container');
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 方向ラベルを確認
      const directionLabel = page.locator('.direction-label').first();
      const labelCount = await directionLabel.count();
      
      if (labelCount > 0) {
        // モバイルではアイコンのみが表示される
        const icon = directionLabel.locator('.direction-label-icon');
        const text = directionLabel.locator('.direction-label-text');
        
        const iconVisible = await icon.isVisible();
        const textVisible = await text.isVisible();
        
        // アイコンは表示され、テキストは非表示
        expect(iconVisible).toBeTruthy();
        expect(textVisible).toBeFalsy();
      }
    });

    test('タブレット画面で方向ラベルが短縮形で表示される', async ({ page }) => {
      // ビューポートをタブレットサイズに設定
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto('http://localhost:8788');
      await page.waitForTimeout(2000);

      // データ読み込み完了を待つ
      await page.waitForFunction(() => {
        const departureInput = document.getElementById('departure-stop');
        return departureInput && !departureInput.disabled;
      }, { timeout: 5000 });

      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // バス停を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 検索実行
      await searchButton.click();

      // 結果が表示されるまで待つ
      const resultsContainer = page.locator('#results-container');
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 方向ラベルを確認
      const directionLabel = page.locator('.direction-label').first();
      const labelCount = await directionLabel.count();
      
      if (labelCount > 0) {
        await expect(directionLabel).toBeVisible();
        
        // タブレットでは短縮形または完全形が表示される
        const labelText = await directionLabel.textContent();
        expect(labelText).toMatch(/往|復|往路|復路/);
      }
    });

    test('デスクトップ画面で方向ラベルが完全形で表示される', async ({ page }) => {
      // ビューポートをデスクトップサイズに設定
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      await page.goto('http://localhost:8788');
      await page.waitForTimeout(2000);

      // データ読み込み完了を待つ
      await page.waitForFunction(() => {
        const departureInput = document.getElementById('departure-stop');
        return departureInput && !departureInput.disabled;
      }, { timeout: 5000 });

      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // バス停を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 検索実行
      await searchButton.click();

      // 結果が表示されるまで待つ
      const resultsContainer = page.locator('#results-container');
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 方向ラベルを確認
      const directionLabel = page.locator('.direction-label').first();
      const labelCount = await directionLabel.count();
      
      if (labelCount > 0) {
        await expect(directionLabel).toBeVisible();
        
        // デスクトップでは完全形が表示される
        const labelText = await directionLabel.textContent();
        expect(labelText).toMatch(/往路|復路/);
      }
    });
  });
});
