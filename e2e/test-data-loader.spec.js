const { test, expect } = require('@playwright/test');

test('データローダーが正しく動作する', async ({ page }) => {
  // テストページを開く
  await page.goto('http://localhost:8788/tests/test-data-loader.html');

  // 読み込みボタンをクリック
  await page.click('#loadBtn');

  // 読み込み完了を待つ（最大5秒）
  await page.waitForSelector('h2', { timeout: 5000 });

  // 結果を取得
  const resultText = await page.textContent('#result');

  // エラーがないことを確認
  expect(resultText).not.toContain('エラー');
  expect(resultText).toContain('読み込み成功');

  // データ件数を確認
  expect(resultText).toContain('バス停:');
  expect(resultText).toContain('時刻表:');
  expect(resultText).toContain('運賃:');

  // 読み込み時間が3秒以内であることを確認
  const loadTimeMatch = resultText.match(/（(\d+\.?\d*)ms）/);
  if (loadTimeMatch) {
    const loadTime = parseFloat(loadTimeMatch[1]);
    expect(loadTime).toBeLessThan(3000);
    console.log(`読み込み時間: ${loadTime}ms`);
  }
});
