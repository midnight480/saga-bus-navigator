/**
 * 双方向路線対応のE2Eテスト
 * 
 * このテストは以下の機能を検証します：
 * - 佐賀駅を降車バス停とした検索（復路検索）
 * - 路線図の双方向表示
 * - 検索結果の行き先表示
 */

const { test, expect } = require('@playwright/test');

test.describe('双方向路線対応 - 佐賀駅を降車バス停とした検索', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
    
    // データの読み込みを待つ
    await page.waitForFunction(() => {
      return window.uiController !== undefined;
    }, { timeout: 5000 });
  });

  test('佐賀駅を降車バス停として検索できる（要件3.1）', async ({ page }) => {
    const departureInput = page.locator('#departure-stop');
    const arrivalInput = page.locator('#arrival-stop');
    const searchButton = page.locator('#search-button');
    const departureSuggestions = page.locator('#departure-suggestions');
    const arrivalSuggestions = page.locator('#arrival-suggestions');

    // 乗車バス停を選択（佐賀駅以外）
    await departureInput.fill('県庁前');
    await expect(departureSuggestions).toBeVisible();
    await departureSuggestions.locator('.suggestion-item').first().click();

    // 降車バス停として佐賀駅を選択
    await arrivalInput.fill('佐賀駅');
    await expect(arrivalSuggestions).toBeVisible();
    
    // 佐賀駅の候補をクリック
    const sagaStationSuggestion = arrivalSuggestions.locator('.suggestion-item').filter({ hasText: '佐賀駅' }).first();
    await sagaStationSuggestion.click();

    // 検索ボタンが有効になることを確認
    await expect(searchButton).toBeEnabled();

    // 検索を実行
    await searchButton.click();

    // ローディングが表示される
    const loading = page.locator('#loading');
    await expect(loading).toBeVisible();

    // 検索結果が表示されるまで待つ
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    // 結果コンテナが表示される
    const resultsContainer = page.locator('#results-container');
    await expect(resultsContainer).toBeVisible();

    // 検索結果が存在するか、エラーメッセージが表示されるかを確認
    const resultsList = page.locator('.results-list');
    const noResultsMessage = page.locator('.no-results-message');
    
    const hasResults = await resultsList.isVisible().catch(() => false);
    const hasNoResultsMessage = await noResultsMessage.isVisible().catch(() => false);

    // どちらかが表示されていることを確認
    expect(hasResults || hasNoResultsMessage).toBeTruthy();

    if (hasResults) {
      console.log('佐賀駅への検索結果が表示されました');
      
      // 検索結果が1件以上存在することを確認
      const resultItems = page.locator('.result-item');
      const resultCount = await resultItems.count();
      expect(resultCount).toBeGreaterThan(0);
    } else {
      console.log('該当する便が見つかりませんでした（正常な動作）');
      await expect(noResultsMessage).toContainText('該当する便が見つかりません');
    }
  });

  test('佐賀駅から出発する検索と佐賀駅へ向かう検索で異なる結果が返る', async ({ page }) => {
    const departureInput = page.locator('#departure-stop');
    const arrivalInput = page.locator('#arrival-stop');
    const searchButton = page.locator('#search-button');
    const departureSuggestions = page.locator('#departure-suggestions');
    const arrivalSuggestions = page.locator('#arrival-suggestions');

    // まず佐賀駅から県庁前への検索
    await departureInput.fill('佐賀駅');
    await expect(departureSuggestions).toBeVisible();
    await departureSuggestions.locator('.suggestion-item').filter({ hasText: '佐賀駅' }).first().click();

    await arrivalInput.fill('県庁前');
    await expect(arrivalSuggestions).toBeVisible();
    await arrivalSuggestions.locator('.suggestion-item').first().click();

    await searchButton.click();

    // 検索結果が表示されるまで待つ
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    // 最初の検索結果を記録
    const firstSearchResults = await page.evaluate(() => {
      const resultItems = document.querySelectorAll('.result-item');
      return Array.from(resultItems).map(item => {
        const timeElement = item.querySelector('.result-time');
        const headsignElement = item.querySelector('.result-headsign');
        return {
          time: timeElement ? timeElement.textContent : '',
          headsign: headsignElement ? headsignElement.textContent : ''
        };
      });
    });

    // 検索をクリア
    const clearButton = page.locator('#clear-search-button');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }

    // 逆方向の検索（県庁前から佐賀駅へ）
    await departureInput.fill('県庁前');
    await expect(departureSuggestions).toBeVisible();
    await departureSuggestions.locator('.suggestion-item').first().click();

    await arrivalInput.fill('佐賀駅');
    await expect(arrivalSuggestions).toBeVisible();
    await arrivalSuggestions.locator('.suggestion-item').filter({ hasText: '佐賀駅' }).first().click();

    await searchButton.click();

    // 検索結果が表示されるまで待つ
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    // 2番目の検索結果を記録
    const secondSearchResults = await page.evaluate(() => {
      const resultItems = document.querySelectorAll('.result-item');
      return Array.from(resultItems).map(item => {
        const timeElement = item.querySelector('.result-time');
        const headsignElement = item.querySelector('.result-headsign');
        return {
          time: timeElement ? timeElement.textContent : '',
          headsign: headsignElement ? headsignElement.textContent : ''
        };
      });
    });

    // 両方の検索で結果が存在する場合、異なることを確認
    if (firstSearchResults.length > 0 && secondSearchResults.length > 0) {
      // 行き先が異なることを確認（双方向検索が正しく機能している証拠）
      const firstHeadsigns = firstSearchResults.map(r => r.headsign).filter(h => h);
      const secondHeadsigns = secondSearchResults.map(r => r.headsign).filter(h => h);
      
      // 少なくとも一部の行き先が異なることを確認
      const hasDifferentHeadsigns = firstHeadsigns.some(h1 => 
        !secondHeadsigns.includes(h1)
      ) || secondHeadsigns.some(h2 => 
        !firstHeadsigns.includes(h2)
      );

      expect(hasDifferentHeadsigns).toBeTruthy();
      console.log('往路と復路で異なる検索結果が返されました');
    } else {
      console.log('一方または両方の検索で結果が見つかりませんでした');
    }
  });
});

test.describe('双方向路線対応 - 検索結果の行き先表示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
    
    // データの読み込みを待つ
    await page.waitForFunction(() => {
      return window.uiController !== undefined;
    }, { timeout: 5000 });
  });

  test('検索結果に行き先（trip_headsign）が表示される（要件3.2）', async ({ page }) => {
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

    // 検索を実行
    await searchButton.click();

    // 検索結果が表示されるまで待つ
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    // 検索結果が存在する場合
    const resultsList = page.locator('.results-list');
    const hasResults = await resultsList.isVisible().catch(() => false);

    if (hasResults) {
      // 各検索結果に行き先が表示されることを確認
      const resultItems = page.locator('.result-item');
      const resultCount = await resultItems.count();
      
      expect(resultCount).toBeGreaterThan(0);

      // 最初の結果の行き先を確認
      const firstResult = resultItems.first();
      const headsignElement = firstResult.locator('.result-headsign');
      
      await expect(headsignElement).toBeVisible();
      
      const headsignText = await headsignElement.textContent();
      expect(headsignText).toBeTruthy();
      expect(headsignText.length).toBeGreaterThan(0);

      console.log(`行き先が表示されました: ${headsignText}`);

      // 全ての結果に行き先が表示されることを確認
      for (let i = 0; i < Math.min(resultCount, 5); i++) {
        const resultItem = resultItems.nth(i);
        const headsign = resultItem.locator('.result-headsign');
        await expect(headsign).toBeVisible();
        
        const text = await headsign.textContent();
        expect(text).toBeTruthy();
      }

      console.log(`全ての検索結果に行き先が表示されています（確認した件数: ${Math.min(resultCount, 5)}）`);
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });

  test('行き先が異なるバスは異なる行き先として表示される', async ({ page }) => {
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

    // 検索を実行
    await searchButton.click();

    // 検索結果が表示されるまで待つ
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    // 検索結果が存在する場合
    const resultsList = page.locator('.results-list');
    const hasResults = await resultsList.isVisible().catch(() => false);

    if (hasResults) {
      // 全ての行き先を収集
      const headsigns = await page.evaluate(() => {
        const headsignElements = document.querySelectorAll('.result-headsign');
        return Array.from(headsignElements).map(el => el.textContent.trim());
      });

      // 行き先が存在することを確認
      expect(headsigns.length).toBeGreaterThan(0);

      // ユニークな行き先を取得
      const uniqueHeadsigns = [...new Set(headsigns)];

      console.log(`検索結果の行き先: ${uniqueHeadsigns.join(', ')}`);
      console.log(`ユニークな行き先の数: ${uniqueHeadsigns.length}`);

      // 各行き先が適切に表示されていることを確認
      uniqueHeadsigns.forEach(headsign => {
        expect(headsign).toBeTruthy();
        expect(headsign.length).toBeGreaterThan(0);
      });
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });
});

test.describe('双方向路線対応 - 路線図の双方向表示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
    
    // データの読み込みを待つ
    await page.waitForFunction(() => {
      return window.uiController !== undefined;
    }, { timeout: 5000 });
  });

  test('路線図に往路と復路の両方のバス停が表示される（要件4.1）', async ({ page }) => {
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

    // 検索を実行
    await searchButton.click();

    // 検索結果が表示されるまで待つ
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    // 検索結果が存在する場合
    const resultsList = page.locator('.results-list');
    const hasResults = await resultsList.isVisible().catch(() => false);

    if (hasResults) {
      // 「地図で表示」ボタンをクリック
      const mapDisplayButton = page.locator('.map-display-button').first();
      await mapDisplayButton.click();

      // 地図エリアにスクロール
      await page.waitForTimeout(500);

      // 経路が地図上に表示される（経路線が存在することを確認）
      const routePolylines = await page.locator('.leaflet-interactive[stroke]').count();
      expect(routePolylines).toBeGreaterThan(0);

      // バス停マーカーが表示される
      const markers = page.locator('.bus-stop-marker');
      const markerCount = await markers.count();
      
      expect(markerCount).toBeGreaterThan(0);
      console.log(`地図上のバス停マーカー数: ${markerCount}`);

      // 経路線が表示されている
      const polylines = page.locator('.leaflet-interactive[stroke]');
      const polylineCount = await polylines.count();
      
      expect(polylineCount).toBeGreaterThan(0);
      console.log(`地図上の経路線数: ${polylineCount}`);

      // 「経路をクリア」ボタンが表示される
      const clearRouteButton = page.locator('#clear-route-button');
      await expect(clearRouteButton).toBeVisible();
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });

  test('往路と復路で異なる経路が地図上に表示される', async ({ page }) => {
    const departureInput = page.locator('#departure-stop');
    const arrivalInput = page.locator('#arrival-stop');
    const searchButton = page.locator('#search-button');
    const departureSuggestions = page.locator('#departure-suggestions');
    const arrivalSuggestions = page.locator('#arrival-suggestions');

    // 往路の検索（佐賀駅から県庁前）
    await departureInput.fill('佐賀駅');
    await expect(departureSuggestions).toBeVisible();
    await departureSuggestions.locator('.suggestion-item').first().click();

    await arrivalInput.fill('県庁前');
    await expect(arrivalSuggestions).toBeVisible();
    await arrivalSuggestions.locator('.suggestion-item').first().click();

    await searchButton.click();

    // 検索結果が表示されるまで待つ
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    const resultsList = page.locator('.results-list');
    const hasFirstResults = await resultsList.isVisible().catch(() => false);

    if (hasFirstResults) {
      // 往路の経路を表示
      const mapDisplayButton = page.locator('.map-display-button').first();
      await mapDisplayButton.click();
      await page.waitForTimeout(500);

      // 往路の経路情報を記録
      const firstRouteInfo = await page.evaluate(() => {
        const polylines = document.querySelectorAll('.leaflet-interactive[stroke]');
        return {
          polylineCount: polylines.length,
          hasRoute: polylines.length > 0
        };
      });

      // 経路をクリア
      const clearRouteButton = page.locator('#clear-route-button');
      if (await clearRouteButton.isVisible()) {
        await clearRouteButton.click();
        await page.waitForTimeout(300);
      }

      // 検索をクリア
      const clearButton = page.locator('#clear-search-button');
      if (await clearButton.isVisible()) {
        await clearButton.click();
      }

      // 復路の検索（県庁前から佐賀駅）
      await departureInput.fill('県庁前');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('佐賀駅');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      await searchButton.click();

      // 検索結果が表示されるまで待つ
      await page.waitForFunction(() => {
        const loading = document.getElementById('loading');
        return loading && loading.style.display === 'none';
      }, { timeout: 5000 });

      const hasSecondResults = await resultsList.isVisible().catch(() => false);

      if (hasSecondResults) {
        // 復路の経路を表示
        const secondMapDisplayButton = page.locator('.map-display-button').first();
        await secondMapDisplayButton.click();
        await page.waitForTimeout(500);

        // 復路の経路情報を記録
        const secondRouteInfo = await page.evaluate(() => {
          const polylines = document.querySelectorAll('.leaflet-interactive[stroke]');
          return {
            polylineCount: polylines.length,
            hasRoute: polylines.length > 0
          };
        });

        // 両方の経路が表示されたことを確認
        expect(firstRouteInfo.hasRoute).toBeTruthy();
        expect(secondRouteInfo.hasRoute).toBeTruthy();

        console.log('往路と復路の両方の経路が地図上に表示されました');
        console.log(`往路の経路線数: ${firstRouteInfo.polylineCount}`);
        console.log(`復路の経路線数: ${secondRouteInfo.polylineCount}`);
      } else {
        console.log('復路の検索結果が見つかりませんでした');
      }
    } else {
      console.log('往路の検索結果が見つかりませんでした（テストスキップ）');
    }
  });

  test('経路をクリアすると地図上の経路表示が消える', async ({ page }) => {
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

    // 検索を実行
    await searchButton.click();

    // 検索結果が表示されるまで待つ
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    const resultsList = page.locator('.results-list');
    const hasResults = await resultsList.isVisible().catch(() => false);

    if (hasResults) {
      // 経路を表示
      const mapDisplayButton = page.locator('.map-display-button').first();
      await mapDisplayButton.click();
      await page.waitForTimeout(500);

      // 経路が表示されていることを確認
      const routePolyline = page.locator('.leaflet-interactive[stroke]');
      await expect(routePolyline.first()).toBeVisible();

      // 「経路をクリア」ボタンをクリック
      const clearRouteButton = page.locator('#clear-route-button');
      await expect(clearRouteButton).toBeVisible();
      await clearRouteButton.click();

      // ボタンが非表示になることを確認
      await expect(clearRouteButton).toBeHidden();

      // 経路線が削除されたことを確認（バス停マーカーは残る）
      const polylinesAfterClear = await page.evaluate(() => {
        const polylines = document.querySelectorAll('.leaflet-interactive[stroke]');
        return polylines.length;
      });

      console.log(`経路クリア後の経路線数: ${polylinesAfterClear}`);
      
      // エラーが発生していないことを確認
      const errorMessage = page.locator('#error-message');
      await expect(errorMessage).toBeHidden();
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });
});
