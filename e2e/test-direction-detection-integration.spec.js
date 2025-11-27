const { test, expect } = require('@playwright/test');

test.describe('方向判定統合機能', () => {
  test('loadAllDataOnce()実行後の検証（要件1.2, 3.4, 5.4）', async ({ page }) => {
    // コンソールログをキャプチャ
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // ページエラーをキャプチャ
    page.on('pageerror', error => {
      console.error('ページエラー:', error.message);
    });

    // テストページを開く
    await page.goto('http://localhost:8788/tests/test-direction-detection-integration.html');

    // ページが完全に読み込まれるまで待つ
    await page.waitForLoadState('networkidle');

    // 読み込みボタンをクリック
    await page.click('#loadBtn');

    // 読み込み完了を待つ（最大30秒に延長）
    try {
      await page.waitForSelector('h2', { timeout: 30000 });
    } catch (error) {
      // タイムアウトした場合、現在のページ状態を出力
      console.log('キャプチャされたコンソールログ:');
      consoleMessages.forEach(msg => console.log(msg));
      
      const resultText = await page.textContent('#result');
      console.log('結果div:', resultText);
      
      throw error;
    }

    // 結果を取得
    const resultText = await page.textContent('#result');

    // エラーがないことを確認
    expect(resultText).not.toContain('エラー');
    expect(resultText).toContain('読み込み成功');

    // 要件1.2: 全てのtripにdirectionプロパティが設定されていることを確認
    const tripDirectionStatus = await page.textContent('#trip-direction-status');
    expect(tripDirectionStatus).toContain('✓ 全てのtripに方向情報が設定されています');

    // Trip方向情報のカバレッジを確認
    const tripDirectionText = await page.textContent('#result');
    const tripDirectionMatch = tripDirectionText.match(/Trip方向情報: (\d+)\/(\d+)件 \((\d+\.?\d*)%\)/);
    if (tripDirectionMatch) {
      const withDirection = parseInt(tripDirectionMatch[1]);
      const total = parseInt(tripDirectionMatch[2]);
      const coverage = parseFloat(tripDirectionMatch[3]);
      
      console.log(`Trip方向情報カバレッジ: ${withDirection}/${total}件 (${coverage}%)`);
      expect(coverage).toBe(100); // 100%のカバレッジを期待
    }

    // 要件3.4: 時刻表データにdirectionフィールドが含まれることを確認
    const timetableDirectionStatus = await page.textContent('#timetable-direction-status');
    expect(timetableDirectionStatus).toContain('✓ 全ての時刻表エントリに方向情報が設定されています');

    // 時刻表方向情報のカバレッジを確認
    const timetableDirectionMatch = resultText.match(/時刻表方向情報: (\d+)\/(\d+)件 \((\d+\.?\d*)%\)/);
    if (timetableDirectionMatch) {
      const withDirection = parseInt(timetableDirectionMatch[1]);
      const total = parseInt(timetableDirectionMatch[2]);
      const coverage = parseFloat(timetableDirectionMatch[3]);
      
      console.log(`時刻表方向情報カバレッジ: ${withDirection}/${total}件 (${coverage}%)`);
      expect(coverage).toBe(100); // 100%のカバレッジを期待
    }

    // 要件5.4: コンソールログに統計情報が出力されることを確認
    const consoleLogCount = await page.textContent('#console-log-count');
    expect(consoleLogCount).toMatch(/ログ件数: \d+件/);

    const directionLogCount = await page.textContent('#direction-log-count');
    expect(directionLogCount).toMatch(/方向判定関連ログ: \d+件/);

    // 方向判定関連のログが存在することを確認
    const directionLogCountMatch = directionLogCount.match(/方向判定関連ログ: (\d+)件/);
    if (directionLogCountMatch) {
      const logCount = parseInt(directionLogCountMatch[1]);
      console.log(`方向判定関連ログ: ${logCount}件`);
      expect(logCount).toBeGreaterThan(0); // 少なくとも1件のログが存在することを期待
    }

    // 方向判定関連のログ内容を確認
    const directionLogsElement = await page.$('#direction-logs');
    if (directionLogsElement) {
      const directionLogs = await directionLogsElement.textContent();
      console.log('方向判定関連ログ:');
      console.log(directionLogs);
      
      // ログに方向判定の統計情報が含まれることを確認
      expect(directionLogs).toMatch(/方向判定/);
    }
  });

  test('路線メタデータに方向判定統計が含まれることを確認（要件5.1, 5.2, 5.3）', async ({ page }) => {
    // テストページを開く
    await page.goto('http://localhost:8788/tests/test-direction-detection-integration.html');

    // 読み込みボタンをクリック
    await page.click('#loadBtn');

    // 読み込み完了を待つ
    await page.waitForSelector('#route-metadata-count', { timeout: 10000 });

    // 路線メタデータの件数を確認
    const routeMetadataCount = await page.textContent('#route-metadata-count');
    expect(routeMetadataCount).toMatch(/路線数: \d+件/);

    const routeCountMatch = routeMetadataCount.match(/路線数: (\d+)件/);
    if (routeCountMatch) {
      const routeCount = parseInt(routeCountMatch[1]);
      console.log(`路線数: ${routeCount}件`);
      expect(routeCount).toBeGreaterThan(0); // 少なくとも1つの路線が存在することを期待
    }

    // 平均方向判定成功率を確認
    const avgDetectionRate = await page.textContent('#avg-detection-rate');
    expect(avgDetectionRate).toMatch(/平均方向判定成功率: \d+\.?\d*%/);

    const avgRateMatch = avgDetectionRate.match(/平均方向判定成功率: (\d+\.?\d*)%/);
    if (avgRateMatch) {
      const rate = parseFloat(avgRateMatch[1]);
      console.log(`平均方向判定成功率: ${rate}%`);
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    }

    // サンプルメタデータの内容を確認
    const resultText = await page.textContent('#result');
    
    // メタデータに必要なフィールドが含まれることを確認
    expect(resultText).toContain('directionDetectionRate');
    expect(resultText).toContain('detectionMethod');
    expect(resultText).toContain('unknownDirectionCount');
  });

  test('サンプルデータの方向情報を確認', async ({ page }) => {
    // テストページを開く
    await page.goto('http://localhost:8788/tests/test-direction-detection-integration.html');

    // 読み込みボタンをクリック
    await page.click('#loadBtn');

    // 読み込み完了を待つ
    await page.waitForSelector('h2', { timeout: 10000 });

    // 結果を取得
    const resultText = await page.textContent('#result');

    // サンプルTripに方向情報が含まれることを確認
    if (resultText.includes('サンプルTrip')) {
      expect(resultText).toMatch(/"direction":\s*"[01unknown]+"/);
      console.log('サンプルTripに方向情報が含まれています');
    }

    // サンプル時刻表に方向情報が含まれることを確認
    if (resultText.includes('サンプル時刻表')) {
      expect(resultText).toMatch(/"direction":\s*"[01unknown]+"/);
      console.log('サンプル時刻表に方向情報が含まれています');
    }
  });

  test('読み込み時間が妥当な範囲内であることを確認', async ({ page }) => {
    // テストページを開く
    await page.goto('http://localhost:8788/tests/test-direction-detection-integration.html');

    // 読み込みボタンをクリック
    await page.click('#loadBtn');

    // 読み込み完了を待つ
    await page.waitForSelector('h2', { timeout: 10000 });

    // 結果を取得
    const resultText = await page.textContent('#result');

    // 読み込み時間を確認
    const loadTimeMatch = resultText.match(/読み込み成功！（(\d+\.?\d*)ms）/);
    if (loadTimeMatch) {
      const loadTime = parseFloat(loadTimeMatch[1]);
      console.log(`読み込み時間: ${loadTime}ms`);
      
      // 読み込み時間が10秒以内であることを確認（方向判定処理が追加されたため、余裕を持たせる）
      expect(loadTime).toBeLessThan(10000);
    }
  });
});
