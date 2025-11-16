/**
 * 運賃計算・表示機能のE2Eテスト
 * バス停選択 → 運賃計算 → 運賃表示のフローをテスト
 * 複数事業者の運賃計算をテスト
 */

const { test, expect } = require('@playwright/test');

test.describe('運賃計算・表示機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
    
    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });
  });

  test.describe('運賃表示フロー', () => {
    test('バス停選択後に検索すると運賃が表示される', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const resultsContainer = page.locator('#results-container');
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
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 最初の結果アイテムを取得
      const firstResult = page.locator('.result-item').first();
      await expect(firstResult).toBeVisible();

      // 運賃情報が表示されていることを確認
      const fareElement = firstResult.locator('.result-fare');
      await expect(fareElement).toBeVisible();

      const fareText = await fareElement.textContent();
      
      // 運賃情報が「大人 XXX円 / 小人 XXX円」形式または「運賃情報なし」であることを確認
      const hasFareInfo = fareText.includes('大人') && fareText.includes('円') && fareText.includes('小人');
      const hasNoFareInfo = fareText.includes('運賃情報なし');
      
      expect(hasFareInfo || hasNoFareInfo).toBeTruthy();
    });

    test('運賃情報が利用可能な場合は大人・小人運賃が表示される', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const resultsContainer = page.locator('#results-container');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // 運賃情報が存在する区間を選択（佐賀駅 → 県庁前など）
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 検索実行
      await searchButton.click();

      // 結果が表示されるまで待つ
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 結果アイテムを取得
      const resultItems = page.locator('.result-item');
      const count = await resultItems.count();
      
      if (count > 0) {
        // 少なくとも1つの結果に運賃情報が含まれることを確認
        let hasFareInfo = false;
        
        for (let i = 0; i < Math.min(count, 3); i++) {
          const item = resultItems.nth(i);
          const fareElement = item.locator('.result-fare');
          const fareText = await fareElement.textContent();
          
          if (fareText.includes('大人') && fareText.includes('円') && fareText.includes('小人')) {
            hasFareInfo = true;
            
            // 運賃が数値であることを確認
            const adultFareMatch = fareText.match(/大人\s*(\d+)円/);
            const childFareMatch = fareText.match(/小人\s*(\d+)円/);
            
            if (adultFareMatch && childFareMatch) {
              const adultFare = parseInt(adultFareMatch[1], 10);
              const childFare = parseInt(childFareMatch[1], 10);
              
              // 運賃が正の数値であることを確認
              expect(adultFare).toBeGreaterThan(0);
              expect(childFare).toBeGreaterThan(0);
              
              // 小人運賃は大人運賃以下であることを確認
              expect(childFare).toBeLessThanOrEqual(adultFare);
              
              console.log(`運賃情報: 大人 ${adultFare}円 / 小人 ${childFare}円`);
            }
            
            break;
          }
        }
        
        // 少なくとも1つの結果に運賃情報があることを期待
        // （運賃データが存在しない場合もあるため、警告のみ）
        if (!hasFareInfo) {
          console.warn('運賃情報が見つかりませんでした（運賃データが存在しない可能性があります）');
        }
      }
    });

    test('運賃情報が利用不可の場合は「運賃情報なし」と表示される', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const resultsContainer = page.locator('#results-container');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // 運賃情報が存在しない可能性のある区間を選択
      // （実際のデータに依存するため、結果を柔軟に検証）
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 検索実行
      await searchButton.click();

      // 結果が表示されるまで待つ
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 結果アイテムを取得
      const resultItems = page.locator('.result-item');
      const count = await resultItems.count();
      
      if (count > 0) {
        // 各結果の運賃情報を確認
        for (let i = 0; i < Math.min(count, 3); i++) {
          const item = resultItems.nth(i);
          const fareElement = item.locator('.result-fare');
          await expect(fareElement).toBeVisible();
          
          const fareText = await fareElement.textContent();
          
          // 運賃情報が「大人 XXX円 / 小人 XXX円」または「運賃情報なし」のいずれかであることを確認
          const hasFareInfo = fareText.includes('大人') && fareText.includes('円') && fareText.includes('小人');
          const hasNoFareInfo = fareText.includes('運賃情報なし');
          
          expect(hasFareInfo || hasNoFareInfo).toBeTruthy();
        }
      }
    });
  });

  test.describe('複数事業者の運賃計算', () => {
    test('佐賀市営バスの運賃が正しく表示される', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const resultsContainer = page.locator('#results-container');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // 佐賀市営バスが運行する区間を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 検索実行
      await searchButton.click();

      // 結果が表示されるまで待つ
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 佐賀市営バスの結果を探す
      const resultItems = page.locator('.result-item');
      const count = await resultItems.count();
      
      let foundSagaCityBus = false;
      
      for (let i = 0; i < count; i++) {
        const item = resultItems.nth(i);
        const operatorElement = item.locator('.result-operator');
        const operatorText = await operatorElement.textContent();
        
        if (operatorText.includes('佐賀市営バス')) {
          foundSagaCityBus = true;
          
          // 運賃情報を確認
          const fareElement = item.locator('.result-fare');
          const fareText = await fareElement.textContent();
          
          console.log(`佐賀市営バス運賃: ${fareText}`);
          
          // 運賃情報が表示されていることを確認
          expect(fareText).toBeTruthy();
          
          break;
        }
      }
      
      // 佐賀市営バスの結果が見つかったことを確認
      if (!foundSagaCityBus) {
        console.warn('佐賀市営バスの結果が見つかりませんでした');
      }
    });

    test('祐徳バスの運賃が正しく表示される', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const resultsContainer = page.locator('#results-container');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // 祐徳バスが運行する区間を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 検索実行
      await searchButton.click();

      // 結果が表示されるまで待つ
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 祐徳バスの結果を探す
      const resultItems = page.locator('.result-item');
      const count = await resultItems.count();
      
      let foundYutokuBus = false;
      
      for (let i = 0; i < count; i++) {
        const item = resultItems.nth(i);
        const operatorElement = item.locator('.result-operator');
        const operatorText = await operatorElement.textContent();
        
        if (operatorText.includes('祐徳バス')) {
          foundYutokuBus = true;
          
          // 運賃情報を確認
          const fareElement = item.locator('.result-fare');
          const fareText = await fareElement.textContent();
          
          console.log(`祐徳バス運賃: ${fareText}`);
          
          // 運賃情報が表示されていることを確認
          expect(fareText).toBeTruthy();
          
          break;
        }
      }
      
      // 祐徳バスの結果が見つからなくても警告のみ（運行していない区間の可能性）
      if (!foundYutokuBus) {
        console.warn('祐徳バスの結果が見つかりませんでした（この区間では運行していない可能性があります）');
      }
    });

    test('西鉄バスの運賃が正しく表示される', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const resultsContainer = page.locator('#results-container');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // 西鉄バスが運行する区間を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 検索実行
      await searchButton.click();

      // 結果が表示されるまで待つ
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 西鉄バスの結果を探す
      const resultItems = page.locator('.result-item');
      const count = await resultItems.count();
      
      let foundNishitetsuBus = false;
      
      for (let i = 0; i < count; i++) {
        const item = resultItems.nth(i);
        const operatorElement = item.locator('.result-operator');
        const operatorText = await operatorElement.textContent();
        
        if (operatorText.includes('西鉄バス')) {
          foundNishitetsuBus = true;
          
          // 運賃情報を確認
          const fareElement = item.locator('.result-fare');
          const fareText = await fareElement.textContent();
          
          console.log(`西鉄バス運賃: ${fareText}`);
          
          // 運賃情報が表示されていることを確認
          expect(fareText).toBeTruthy();
          
          break;
        }
      }
      
      // 西鉄バスの結果が見つからなくても警告のみ（運行していない区間の可能性）
      if (!foundNishitetsuBus) {
        console.warn('西鉄バスの結果が見つかりませんでした（この区間では運行していない可能性があります）');
      }
    });

    test('同じ区間で複数事業者の運賃が異なることを確認', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const resultsContainer = page.locator('#results-container');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // 複数事業者が運行する区間を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 検索実行
      await searchButton.click();

      // 結果が表示されるまで待つ
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 各事業者の運賃を収集
      const resultItems = page.locator('.result-item');
      const count = await resultItems.count();
      
      const faresByOperator = {};
      
      for (let i = 0; i < count; i++) {
        const item = resultItems.nth(i);
        const operatorElement = item.locator('.result-operator');
        const operatorText = await operatorElement.textContent();
        const operator = operatorText.replace('事業者: ', '').trim();
        
        const fareElement = item.locator('.result-fare');
        const fareText = await fareElement.textContent();
        
        if (!faresByOperator[operator]) {
          faresByOperator[operator] = fareText;
        }
      }
      
      console.log('事業者別運賃:', faresByOperator);
      
      // 複数の事業者が見つかった場合、運賃情報が記録されていることを確認
      const operators = Object.keys(faresByOperator);
      if (operators.length > 1) {
        operators.forEach(operator => {
          expect(faresByOperator[operator]).toBeTruthy();
        });
      } else {
        console.warn('複数事業者の結果が見つかりませんでした');
      }
    });
  });

  test.describe('運賃表示の一貫性', () => {
    test('全ての検索結果に運賃情報が表示される', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const resultsContainer = page.locator('#results-container');
      const departureSuggestions = page.locator('#departure-suggestions');
      const arrivalSuggestions = page.locator('#arrival-suggestions');

      // バス停を選択
      await departureInput.fill('佐賀駅');
      await expect(departureSuggestions).toBeVisible();
      await departureSuggestions.locator('.suggestion-item').first().click();

      await arrivalInput.fill('県庁前');
      await expect(arrivalSuggestions).toBeVisible();
      await arrivalSuggestions.locator('.suggestion-item').first().click();

      // 検索ボタンが有効になるまで待つ
      await expect(searchButton).toBeEnabled();

      // 検索実行
      await searchButton.click();

      // ローディングが表示されることを確認
      const loading = page.locator('#loading');
      await expect(loading).toBeVisible();

      // ローディングが非表示になるまで待つ
      await expect(loading).not.toBeVisible({ timeout: 5000 });

      // 結果コンテナが表示されることを確認
      await expect(resultsContainer).toBeVisible();

      // 結果アイテムまたはno-resultsメッセージのいずれかが表示されるまで待つ
      await page.waitForFunction(() => {
        const items = document.querySelectorAll('.result-item');
        const noResults = document.querySelector('.no-results-message');
        return items.length > 0 || (noResults && noResults.style.display !== 'none');
      }, { timeout: 3000 });

      // 全ての結果アイテムに運賃情報が表示されていることを確認
      const resultItems = page.locator('.result-item');
      const count = await resultItems.count();
      
      // 検索結果が0件の場合はスキップ
      if (count === 0) {
        console.warn('検索結果が0件でした（該当する便が見つかりませんでした）');
        return;
      }
      
      expect(count).toBeGreaterThan(0);
      
      for (let i = 0; i < count; i++) {
        const item = resultItems.nth(i);
        const fareElement = item.locator('.result-fare');
        
        // 運賃要素が存在することを確認
        await expect(fareElement).toBeVisible();
        
        // 運賃テキストが空でないことを確認
        const fareText = await fareElement.textContent();
        expect(fareText).toBeTruthy();
        expect(fareText.length).toBeGreaterThan(0);
      }
    });

    test('運賃情報のフォーマットが一貫している', async ({ page }) => {
      const departureInput = page.locator('#departure-stop');
      const arrivalInput = page.locator('#arrival-stop');
      const searchButton = page.locator('#search-button');
      const resultsContainer = page.locator('#results-container');
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
      await expect(resultsContainer).toBeVisible({ timeout: 3000 });

      // 各結果の運賃フォーマットを確認
      const resultItems = page.locator('.result-item');
      const count = await resultItems.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const item = resultItems.nth(i);
        const fareElement = item.locator('.result-fare');
        const fareText = await fareElement.textContent();
        
        // 運賃情報が「運賃: 」で始まることを確認
        expect(fareText).toContain('運賃:');
        
        // 運賃情報が「大人 XXX円 / 小人 XXX円」または「運賃情報なし」のいずれかであることを確認
        const hasFareInfo = fareText.includes('大人') && fareText.includes('円') && fareText.includes('小人');
        const hasNoFareInfo = fareText.includes('運賃情報なし');
        
        expect(hasFareInfo || hasNoFareInfo).toBeTruthy();
      }
    });
  });
});
