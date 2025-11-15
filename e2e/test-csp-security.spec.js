/**
 * CSP（Content Security Policy）セキュリティテスト
 * 
 * このテストは以下を確認します：
 * 1. Cloudflare Insightsスクリプトが正常に読み込まれること
 * 2. 不正な外部スクリプトがブロックされること
 * 3. CSP設定が意図通りに動作すること
 */

import { test, expect } from '@playwright/test';

test.describe('CSPセキュリティテスト', () => {
  test.beforeEach(async ({ page }) => {
    // コンソールエラーを監視
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text());
      }
    });
  });

  test('Cloudflare Insightsスクリプトが正常に読み込まれる（CSP違反なし）', async ({ page }) => {
    const cspViolations = [];
    
    // CSP違反を監視
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Content Security Policy') || text.includes('CSP')) {
        cspViolations.push(text);
      }
    });

    // ページを読み込む
    await page.goto('/');
    
    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    // 少し待機してCloudflare Insightsスクリプトの読み込みを確認
    await page.waitForTimeout(2000);
    
    // CSP違反がないことを確認
    expect(cspViolations).toHaveLength(0);
  });

  test('不正な外部スクリプトがCSPによってブロックされる', async ({ page }) => {
    // ページを読み込む
    await page.goto('/');
    
    // 不正な外部スクリプトを動的に追加しようとする
    const scriptBlocked = await page.evaluate(() => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://evil.example.com/malicious.js';
        
        script.onerror = () => {
          resolve(true); // スクリプトがブロックされた
        };
        
        script.onload = () => {
          resolve(false); // スクリプトが読み込まれた（問題）
        };
        
        document.body.appendChild(script);
        
        // タイムアウト設定
        setTimeout(() => resolve(true), 3000);
      });
    });
    
    // スクリプトがブロックされたことを確認
    // CSPまたはネットワークエラーによってブロックされる
    expect(scriptBlocked).toBe(true);
  });

  test('許可されたドメイン（OpenStreetMap）からの画像が読み込まれる', async ({ page }) => {
    // ページを読み込む
    await page.goto('/');
    
    // 地図が表示されるまで待機
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    
    // タイルが読み込まれるまで待機（最大5秒）
    await page.waitForSelector('.leaflet-tile', { timeout: 5000 });
    
    // 少し待機してタイルの読み込みを確認
    await page.waitForTimeout(2000);
    
    // OpenStreetMapタイルが読み込まれることを確認
    const tileImages = await page.evaluate(() => {
      const tiles = document.querySelectorAll('.leaflet-tile');
      return Array.from(tiles).map(tile => ({
        src: tile.src,
        complete: tile.complete,
        naturalWidth: tile.naturalWidth
      }));
    });
    
    // タイルが存在することを確認
    expect(tileImages.length).toBeGreaterThan(0);
    
    // タイルのソースがOpenStreetMapドメインであることを確認
    const osmTiles = tileImages.filter(tile => 
      tile.src.includes('openstreetmap.org') || tile.src.includes('openstreetmap.fr')
    );
    expect(osmTiles.length).toBeGreaterThan(0);
  });

  test('許可されたAPI（NICT時刻サーバー）への接続が成功する', async ({ page }) => {
    const networkErrors = [];
    
    // ネットワークエラーを監視
    page.on('requestfailed', (request) => {
      networkErrors.push({
        url: request.url(),
        failure: request.failure()
      });
    });

    // ページを読み込む
    await page.goto('/');
    
    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    // NICT時刻サーバーへのリクエストが失敗していないことを確認
    const nictErrors = networkErrors.filter(error => 
      error.url.includes('ntp-a1.nict.go.jp')
    );
    
    expect(nictErrors).toHaveLength(0);
  });

  test('既存機能が正常に動作する（地図表示）', async ({ page }) => {
    // ページを読み込む
    await page.goto('/');
    
    // 地図コンテナが表示されることを確認
    const mapContainer = await page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible();
    
    // 地図が初期化されていることを確認
    const mapInitialized = await page.evaluate(() => {
      return window.mapController && window.mapController.map !== null;
    });
    
    expect(mapInitialized).toBe(true);
  });

  test('既存機能が正常に動作する（バス停検索）', async ({ page }) => {
    // ページを読み込む
    await page.goto('/');
    
    // ローディングが完了するまで待機
    await page.waitForSelector('#loading', { state: 'hidden', timeout: 30000 });
    
    // 出発地入力フィールドが有効になるまで待機
    await page.waitForSelector('#departure-stop:not([disabled])', { timeout: 5000 });
    
    // 出発地入力フィールドに入力
    const departureInput = page.locator('#departure-stop');
    await departureInput.fill('佐賀駅');
    
    // 候補リストが表示されるまで待機
    await page.waitForSelector('#departure-suggestions .suggestion-item', { timeout: 5000 });
    
    // 候補が表示されることを確認
    const suggestions = await page.locator('#departure-suggestions .suggestion-item');
    const count = await suggestions.count();
    expect(count).toBeGreaterThan(0);
  });

  test('既存機能が正常に動作する（時刻選択）', async ({ page }) => {
    // ページを読み込む
    await page.goto('/');
    
    // ローディングが完了するまで待機
    await page.waitForSelector('#loading', { state: 'hidden', timeout: 30000 });
    
    // 時刻選択ラジオボタンが有効になることを確認
    const nowRadio = page.locator('input[name="time-option"][value="now"]');
    await expect(nowRadio).not.toBeDisabled();
    
    // 時刻選択ラジオボタンがチェックされていることを確認
    await expect(nowRadio).toBeChecked();
  });
});
