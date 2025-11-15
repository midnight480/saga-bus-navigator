const { test, expect } = require('@playwright/test');

test.describe('JSZip統合テスト', () => {
  test('JSZipライブラリが正常に読み込まれる', async ({ page }) => {
    // メインページにアクセス
    await page.goto('http://localhost:8000/index.html');
    
    // JSZipがグローバルに利用可能か確認
    const isJSZipLoaded = await page.evaluate(() => {
      return typeof JSZip !== 'undefined';
    });
    
    expect(isJSZipLoaded).toBe(true);
  });

  test('JSZipインスタンスを作成できる', async ({ page }) => {
    await page.goto('http://localhost:8000/index.html');
    
    // JSZipインスタンスを作成
    const canCreateInstance = await page.evaluate(() => {
      try {
        const zip = new JSZip();
        return zip !== null && typeof zip === 'object';
      } catch (error) {
        return false;
      }
    });
    
    expect(canCreateInstance).toBe(true);
  });

  test('JSZipで基本的なZIP操作ができる', async ({ page }) => {
    await page.goto('http://localhost:8000/index.html');
    
    // ZIPファイルの作成と読み込みをテスト
    const zipOperationSuccess = await page.evaluate(async () => {
      try {
        const zip = new JSZip();
        zip.file('test.txt', 'Hello, JSZip!');
        
        const content = await zip.generateAsync({type: 'blob'});
        const loadedZip = await JSZip.loadAsync(content);
        const text = await loadedZip.file('test.txt').async('string');
        
        return text === 'Hello, JSZip!';
      } catch (error) {
        console.error('ZIP操作エラー:', error);
        return false;
      }
    });
    
    expect(zipOperationSuccess).toBe(true);
  });

  test('JSZipテストページが正常に動作する', async ({ page }) => {
    await page.goto('http://localhost:8000/tests/test-jszip-integration.html');
    
    // テスト結果が表示されるまで待機
    await page.waitForSelector('.test-result', { timeout: 5000 });
    
    // 成功メッセージが表示されているか確認
    const successMessages = await page.locator('.test-result.success').count();
    expect(successMessages).toBeGreaterThan(0);
    
    // エラーメッセージがないことを確認
    const errorMessages = await page.locator('.test-result.error').count();
    expect(errorMessages).toBe(0);
  });
});
