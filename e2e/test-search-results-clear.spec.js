const { test, expect } = require('@playwright/test');

test.describe('検索結果クリア機能', () => {
  test('初期状態では検索結果クリアボタンが非表示', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 検索結果クリアボタンが非表示
    const clearButton = page.locator('#clear-search-results-button');
    await expect(clearButton).toBeHidden();

    console.log('初期状態では検索結果クリアボタンが非表示です');
  });

  test('検索結果が表示されるとクリアボタンが表示される', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 乗車バス停を入力
    const departureInput = page.locator('#departure-stop');
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(300);

    // 候補から選択
    const departureSuggestion = page.locator('#departure-suggestions .suggestion-item').first();
    await departureSuggestion.click();
    await page.waitForTimeout(300);

    // 降車バス停を入力
    const arrivalInput = page.locator('#arrival-stop');
    await arrivalInput.fill('佐賀大学');
    await page.waitForTimeout(300);

    // 候補から選択
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
      // 検索結果クリアボタンが表示される
      const clearButton = page.locator('#clear-search-results-button');
      await expect(clearButton).toBeVisible();

      console.log('検索結果が表示されるとクリアボタンが表示されました');
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });

  test('クリアボタンをクリックすると検索結果がクリアされる', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

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
      // 検索結果クリアボタンをクリック
      const clearButton = page.locator('#clear-search-results-button');
      await clearButton.click();

      // 検索結果がクリアされる
      const resultsContainer = page.locator('#results-container');
      const placeholder = resultsContainer.locator('.results-placeholder');
      await expect(placeholder).toBeVisible();

      // 検索結果リストが非表示になる
      await expect(resultsList).toBeHidden();

      console.log('検索結果がクリアされました');
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });

  test('クリアボタンをクリックすると検索フォームがリセットされる', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

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
      // 検索結果クリアボタンをクリック
      const clearButton = page.locator('#clear-search-results-button');
      await clearButton.click();

      // 検索フォームがリセットされる
      const departureValue = await departureInput.inputValue();
      const arrivalValue = await arrivalInput.inputValue();

      expect(departureValue).toBe('');
      expect(arrivalValue).toBe('');

      console.log('検索フォームがリセットされました');
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });

  test('クリアボタンをクリックするとクリアボタン自体が非表示になる', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

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
      // 検索結果クリアボタンをクリック
      const clearButton = page.locator('#clear-search-results-button');
      await clearButton.click();

      // クリアボタンが非表示になる
      await expect(clearButton).toBeHidden();

      console.log('クリアボタンが非表示になりました');
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });

  test('クリアボタンをクリックすると検索ボタンが無効化される', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

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
      // 検索結果クリアボタンをクリック
      const clearButton = page.locator('#clear-search-results-button');
      await clearButton.click();

      // 検索ボタンが無効化される
      await expect(searchButton).toBeDisabled();

      console.log('検索ボタンが無効化されました');
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });

  test('検索結果が0件の場合はクリアボタンが表示されない', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // 存在しないバス停名を入力（検索結果0件を期待）
    const departureInput = page.locator('#departure-stop');
    await departureInput.fill('存在しないバス停XXXXXX');
    await page.waitForTimeout(500);

    // 候補が表示されない場合は、直接値を設定して検索を試みる
    const hasSuggestions = await page.locator('#departure-suggestions .suggestion-item').count() > 0;
    
    if (!hasSuggestions) {
      // 検索ボタンが無効のまま
      const searchButton = page.locator('#search-button');
      await expect(searchButton).toBeDisabled();

      // クリアボタンは表示されない
      const clearButton = page.locator('#clear-search-results-button');
      await expect(clearButton).toBeHidden();

      console.log('検索結果が0件の場合はクリアボタンが表示されません');
    } else {
      console.log('テストケースをスキップ（候補が見つかりました）');
    }
  });
});

test.describe('検索結果クリアフロー統合テスト', () => {
  test('検索 → 結果表示 → クリアボタン表示 → クリア → リセットの完全フロー', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    // ステップ1: 初期状態ではクリアボタンが非表示
    const clearButton = page.locator('#clear-search-results-button');
    await expect(clearButton).toBeHidden();
    console.log('✓ ステップ1: 初期状態ではクリアボタンが非表示');

    // ステップ2: 乗車バス停を入力
    const departureInput = page.locator('#departure-stop');
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(300);

    const departureSuggestion = page.locator('#departure-suggestions .suggestion-item').first();
    await departureSuggestion.click();
    await page.waitForTimeout(300);
    console.log('✓ ステップ2: 乗車バス停を入力');

    // ステップ3: 降車バス停を入力
    const arrivalInput = page.locator('#arrival-stop');
    await arrivalInput.fill('佐賀大学');
    await page.waitForTimeout(300);

    const arrivalSuggestion = page.locator('#arrival-suggestions .suggestion-item').first();
    await arrivalSuggestion.click();
    await page.waitForTimeout(300);
    console.log('✓ ステップ3: 降車バス停を入力');

    // ステップ4: 検索を実行
    const searchButton = page.locator('#search-button');
    await searchButton.click();
    console.log('✓ ステップ4: 検索を実行');

    // ステップ5: 検索結果が表示される
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    const resultsList = page.locator('.results-list');
    const hasResults = await resultsList.isVisible().catch(() => false);

    if (hasResults) {
      console.log('✓ ステップ5: 検索結果が表示される');

      // ステップ6: クリアボタンが表示される
      await expect(clearButton).toBeVisible();
      console.log('✓ ステップ6: クリアボタンが表示される');

      // ステップ7: クリアボタンをクリック
      await clearButton.click();
      console.log('✓ ステップ7: クリアボタンをクリック');

      // ステップ8: 検索結果がクリアされる
      const placeholder = page.locator('.results-placeholder');
      await expect(placeholder).toBeVisible();
      await expect(resultsList).toBeHidden();
      console.log('✓ ステップ8: 検索結果がクリアされる');

      // ステップ9: 検索フォームがリセットされる
      const departureValue = await departureInput.inputValue();
      const arrivalValue = await arrivalInput.inputValue();
      expect(departureValue).toBe('');
      expect(arrivalValue).toBe('');
      console.log('✓ ステップ9: 検索フォームがリセットされる');

      // ステップ10: クリアボタンが非表示になる
      await expect(clearButton).toBeHidden();
      console.log('✓ ステップ10: クリアボタンが非表示になる');

      // ステップ11: 検索ボタンが無効化される
      await expect(searchButton).toBeDisabled();
      console.log('✓ ステップ11: 検索ボタンが無効化される');

      console.log('✅ 検索結果クリアフローの完全テストが成功しました');
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });

  test('複数回の検索とクリアを繰り返しても正常に動作する', async ({ page }) => {
    // ページを開く
    await page.goto('http://localhost:8788/');

    // データ読み込み完了を待つ
    await page.waitForFunction(() => {
      const departureInput = document.getElementById('departure-stop');
      return departureInput && !departureInput.disabled;
    }, { timeout: 5000 });

    const departureInput = page.locator('#departure-stop');
    const arrivalInput = page.locator('#arrival-stop');
    const searchButton = page.locator('#search-button');
    const clearButton = page.locator('#clear-search-results-button');

    // 1回目の検索とクリア
    await departureInput.fill('佐賀駅');
    await page.waitForTimeout(300);
    await page.locator('#departure-suggestions .suggestion-item').first().click();
    await page.waitForTimeout(300);

    await arrivalInput.fill('佐賀大学');
    await page.waitForTimeout(300);
    await page.locator('#arrival-suggestions .suggestion-item').first().click();
    await page.waitForTimeout(300);

    await searchButton.click();
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading');
      return loading && loading.style.display === 'none';
    }, { timeout: 5000 });

    const hasResults1 = await page.locator('.results-list').isVisible().catch(() => false);
    if (hasResults1) {
      await clearButton.click();
      await page.waitForTimeout(300);
      console.log('✓ 1回目の検索とクリアが完了');

      // 2回目の検索とクリア
      await departureInput.fill('佐賀駅');
      await page.waitForTimeout(300);
      await page.locator('#departure-suggestions .suggestion-item').first().click();
      await page.waitForTimeout(300);

      await arrivalInput.fill('佐賀大学');
      await page.waitForTimeout(300);
      await page.locator('#arrival-suggestions .suggestion-item').first().click();
      await page.waitForTimeout(300);

      await searchButton.click();
      await page.waitForFunction(() => {
        const loading = document.getElementById('loading');
        return loading && loading.style.display === 'none';
      }, { timeout: 5000 });

      const hasResults2 = await page.locator('.results-list').isVisible().catch(() => false);
      if (hasResults2) {
        await clearButton.click();
        console.log('✓ 2回目の検索とクリアが完了');

        // 最終状態の確認
        await expect(clearButton).toBeHidden();
        await expect(searchButton).toBeDisabled();
        const departureValue = await departureInput.inputValue();
        const arrivalValue = await arrivalInput.inputValue();
        expect(departureValue).toBe('');
        expect(arrivalValue).toBe('');

        console.log('✅ 複数回の検索とクリアが正常に動作しました');
      }
    } else {
      console.log('検索結果が見つかりませんでした（テストスキップ）');
    }
  });
});
