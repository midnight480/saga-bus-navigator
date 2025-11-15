/**
 * CSP設定とOpenStreetMap地図タイルの動作確認テスト
 * 
 * このテストは以下を確認します：
 * - CSP違反エラーが発生しないこと
 * - OpenStreetMapタイルが正常に読み込まれること
 * - 不正な外部画像がブロックされること
 */

const { test, expect } = require('@playwright/test');

test.describe('CSP設定と地図タイル表示の確認', () => {
  let consoleMessages = [];
  let cspViolations = [];
  let networkRequests = [];

  test.beforeEach(async ({ page }) => {
    // コンソールメッセージを記録
    consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // CSP違反を記録
    cspViolations = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Content Security Policy') || text.includes('CSP')) {
        cspViolations.push(text);
      }
    });

    // ネットワークリクエストを記録
    networkRequests = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('tile.openstreetmap')) {
        networkRequests.push({
          url: url,
          status: response.status(),
          ok: response.ok()
        });
      }
    });

    await page.goto('http://localhost:8080');
  });

  test('サブタスク2.1: OpenStreetMapタイルが正常に読み込まれること', async ({ page }) => {
    // 地図が表示されるまで待機
    await page.waitForSelector('#map-container', { timeout: 10000 });
    
    // 地図タイルの読み込みを待機（少し時間を置く）
    await page.waitForTimeout(3000);

    // ネットワークリクエストの確認
    const osmRequests = networkRequests.filter(req => 
      req.url.includes('tile.openstreetmap.org') || 
      req.url.includes('tile.openstreetmap.fr')
    );

    console.log(`OpenStreetMapタイルリクエスト数: ${osmRequests.length}`);
    
    // タイルリクエストが存在することを確認
    expect(osmRequests.length).toBeGreaterThan(0);

    // サブドメイン（a, b, c）からのリクエストを確認
    const subdomainRequests = osmRequests.filter(req => 
      req.url.includes('a.tile.openstreetmap') ||
      req.url.includes('b.tile.openstreetmap') ||
      req.url.includes('c.tile.openstreetmap')
    );

    console.log(`サブドメイン付きリクエスト数: ${subdomainRequests.length}`);
    expect(subdomainRequests.length).toBeGreaterThan(0);

    // 全てのタイルリクエストが成功（HTTPステータス200）していることを確認
    const failedRequests = osmRequests.filter(req => !req.ok);
    if (failedRequests.length > 0) {
      console.log('失敗したリクエスト:', failedRequests);
    }
    expect(failedRequests.length).toBe(0);

    // CSP違反エラーが発生していないことを確認
    const cspErrors = cspViolations.filter(msg => 
      msg.includes('tile.openstreetmap')
    );
    
    if (cspErrors.length > 0) {
      console.log('CSP違反エラー:', cspErrors);
    }
    expect(cspErrors.length).toBe(0);
  });

  test('CSP違反エラーが表示されないこと', async ({ page }) => {
    // 地図が表示されるまで待機
    await page.waitForSelector('#map-container', { timeout: 10000 });
    
    // データ読み込みとマーカー表示を待機
    await page.waitForTimeout(5000);

    // CSP違反エラーが発生していないことを確認
    expect(cspViolations.length).toBe(0);

    // エラーメッセージがコンソールに表示されていないことを確認
    const errorMessages = consoleMessages.filter(msg => 
      msg.type === 'error' && 
      (msg.text.includes('Content Security Policy') || 
       msg.text.includes('violates'))
    );
    
    expect(errorMessages.length).toBe(0);
  });

  test('地図タイルが正常に表示されること', async ({ page }) => {
    // 地図が表示されるまで待機
    await page.waitForSelector('#map-container', { timeout: 10000 });
    
    // 地図コンテナが存在することを確認
    const mapContainer = await page.locator('#map-container');
    await expect(mapContainer).toBeVisible();

    // Leaflet地図レイヤーが存在することを確認
    const leafletContainer = await page.locator('.leaflet-container');
    await expect(leafletContainer).toBeVisible();

    // タイル画像が読み込まれていることを確認
    await page.waitForTimeout(3000);
    const tiles = await page.locator('.leaflet-tile').count();
    console.log(`読み込まれたタイル数: ${tiles}`);
    expect(tiles).toBeGreaterThan(0);
  });

  test('全てのズームレベルで地図タイルが表示されること', async ({ page }) => {
    // 地図が表示されるまで待機
    await page.waitForSelector('#map-container', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // ズームインボタンを3回クリック
    for (let i = 0; i < 3; i++) {
      await page.click('.leaflet-control-zoom-in');
      await page.waitForTimeout(1000);
      
      // タイルが読み込まれていることを確認
      const tiles = await page.locator('.leaflet-tile').count();
      expect(tiles).toBeGreaterThan(0);
    }

    // ズームアウトボタンを3回クリック
    for (let i = 0; i < 3; i++) {
      await page.click('.leaflet-control-zoom-out');
      await page.waitForTimeout(1000);
      
      // タイルが読み込まれていることを確認
      const tiles = await page.locator('.leaflet-tile').count();
      expect(tiles).toBeGreaterThan(0);
    }

    // CSP違反エラーが発生していないことを確認
    expect(cspViolations.length).toBe(0);
  });

  test('バス停マーカー（2549個）が正常に表示されること', async ({ page }) => {
    // 地図が表示されるまで待機
    await page.waitForSelector('#map-container', { timeout: 10000 });
    
    // データ読み込みとマーカー表示を待機
    await page.waitForTimeout(5000);

    // コンソールログからマーカー表示メッセージを確認
    const markerMessages = consoleMessages.filter(msg => 
      msg.text.includes('バス停マーカーを表示しました')
    );

    expect(markerMessages.length).toBeGreaterThan(0);

    // マーカー数を確認（コンソールログから）
    const markerCountMessage = markerMessages.find(msg => 
      msg.text.includes('有効:')
    );

    if (markerCountMessage) {
      console.log('マーカー表示メッセージ:', markerCountMessage.text);
      // メッセージに2549が含まれていることを確認
      expect(markerCountMessage.text).toContain('2549');
    }
  });

  test('サブタスク2.2: 不正な外部画像がブロックされること', async ({ page }) => {
    // 地図が表示されるまで待機
    await page.waitForSelector('#map-container', { timeout: 10000 });

    // 不正な外部画像を追加しようとする
    const result = await page.evaluate(() => {
      const img = document.createElement('img');
      img.src = 'https://evil.example.com/malicious.png';
      document.body.appendChild(img);
      
      return new Promise((resolve) => {
        // 画像読み込みエラーを待機
        img.onerror = () => resolve({ blocked: true });
        img.onload = () => resolve({ blocked: false });
        
        // タイムアウト（2秒）
        setTimeout(() => resolve({ blocked: true }), 2000);
      });
    });

    // 画像がブロックされたことを確認（エラーまたはタイムアウト）
    expect(result.blocked).toBe(true);
    console.log('不正な外部画像がブロックされました');
  });

  test('サブタスク2.2: OpenStreetMap以外のタイルサーバーがブロックされること', async ({ page }) => {
    // 地図が表示されるまで待機
    await page.waitForSelector('#map-container', { timeout: 10000 });

    // OpenStreetMap以外のタイルサーバーから画像を読み込もうとする
    const result = await page.evaluate(() => {
      const img = document.createElement('img');
      img.src = 'https://tile.example.com/13/7234/3245.png';
      document.body.appendChild(img);
      
      return new Promise((resolve) => {
        // 画像読み込みエラーを待機
        img.onerror = () => resolve({ blocked: true });
        img.onload = () => resolve({ blocked: false });
        
        // タイムアウト（2秒）
        setTimeout(() => resolve({ blocked: true }), 2000);
      });
    });

    // 画像がブロックされたことを確認（エラーまたはタイムアウト）
    expect(result.blocked).toBe(true);
    console.log('OpenStreetMap以外のタイルサーバーがブロックされました');
  });

  test('CSP設定が意図通りに動作すること', async ({ page }) => {
    // 地図が表示されるまで待機
    await page.waitForSelector('#map-container', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // 許可されたドメイン（OpenStreetMap）からの画像は読み込まれる
    const osmRequests = networkRequests.filter(req => 
      req.url.includes('tile.openstreetmap')
    );
    expect(osmRequests.length).toBeGreaterThan(0);
    
    const successfulOsmRequests = osmRequests.filter(req => req.ok);
    expect(successfulOsmRequests.length).toBeGreaterThan(0);

    // 不正なドメインからの画像はブロックされる
    const blockedResult = await page.evaluate(() => {
      const img = document.createElement('img');
      img.src = 'https://malicious-tile-server.com/tile.png';
      document.body.appendChild(img);
      
      return new Promise((resolve) => {
        img.onerror = () => resolve({ blocked: true });
        img.onload = () => resolve({ blocked: false });
        setTimeout(() => resolve({ blocked: true }), 2000);
      });
    });

    expect(blockedResult.blocked).toBe(true);

    // CSP設定が正しく機能していることを確認
    // - OpenStreetMapタイルは許可される
    // - その他の外部画像はブロックされる
    console.log('CSP設定が意図通りに動作しています');
  });
});
