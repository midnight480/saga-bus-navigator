/**
 * 時刻選択UIのE2Eテスト
 */

const { test, expect } = require('@playwright/test');

test.describe('時刻選択UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
    // データ読み込み完了を待つ
    await page.waitForTimeout(2000);
  });

  test('デフォルトで「今すぐ」が選択されている', async ({ page }) => {
    const nowRadio = page.locator('input[name="time-option"][value="now"]');
    await expect(nowRadio).toBeChecked();
  });

  test('デフォルトでタイムピッカーが非表示', async ({ page }) => {
    const timePicker = page.locator('#time-picker');
    await expect(timePicker).not.toBeVisible();
  });

  test('「出発時刻指定」選択時にタイムピッカーが表示される', async ({ page }) => {
    const departureRadio = page.locator('input[name="time-option"][value="departure-time"]');
    await departureRadio.click();
    
    const timePicker = page.locator('#time-picker');
    await expect(timePicker).toBeVisible();
  });

  test('「到着時刻指定」選択時にタイムピッカーが表示される', async ({ page }) => {
    const arrivalRadio = page.locator('input[name="time-option"][value="arrival-time"]');
    await arrivalRadio.click();
    
    const timePicker = page.locator('#time-picker');
    await expect(timePicker).toBeVisible();
  });

  test('「始発」選択時にタイムピッカーが非表示', async ({ page }) => {
    // まず出発時刻指定を選択してタイムピッカーを表示
    const departureRadio = page.locator('input[name="time-option"][value="departure-time"]');
    await departureRadio.click();
    
    const timePicker = page.locator('#time-picker');
    await expect(timePicker).toBeVisible();
    
    // 始発を選択
    const firstBusRadio = page.locator('input[name="time-option"][value="first-bus"]');
    await firstBusRadio.click();
    
    await expect(timePicker).not.toBeVisible();
  });

  test('「終電」選択時にタイムピッカーが非表示', async ({ page }) => {
    // まず出発時刻指定を選択してタイムピッカーを表示
    const departureRadio = page.locator('input[name="time-option"][value="departure-time"]');
    await departureRadio.click();
    
    const timePicker = page.locator('#time-picker');
    await expect(timePicker).toBeVisible();
    
    // 終電を選択
    const lastBusRadio = page.locator('input[name="time-option"][value="last-bus"]');
    await lastBusRadio.click();
    
    await expect(timePicker).not.toBeVisible();
  });

  test('タイムピッカーに現在時刻が初期値として設定される', async ({ page }) => {
    const departureRadio = page.locator('input[name="time-option"][value="departure-time"]');
    await departureRadio.click();
    
    // タイムピッカーが表示されるまで待つ
    await page.waitForTimeout(1000);
    
    const hourInput = page.locator('#time-hour');
    const minuteInput = page.locator('#time-minute');
    
    const hourValue = await hourInput.inputValue();
    const minuteValue = await minuteInput.inputValue();
    
    // 値が設定されていることを確認（具体的な値は時刻によって変わるため、存在確認のみ）
    expect(hourValue).toBeTruthy();
    expect(minuteValue).toBeTruthy();
    
    // 時刻の範囲を確認
    const hour = parseInt(hourValue, 10);
    const minute = parseInt(minuteValue, 10);
    
    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThanOrEqual(23);
    expect(minute).toBeGreaterThanOrEqual(0);
    expect(minute).toBeLessThanOrEqual(59);
  });

  test('時刻入力の検証（時の範囲）', async ({ page }) => {
    const departureRadio = page.locator('input[name="time-option"][value="departure-time"]');
    await departureRadio.click();
    
    const hourInput = page.locator('#time-hour');
    
    // 24を入力すると23に修正される
    await hourInput.fill('24');
    await hourInput.blur();
    
    const hourValue = await hourInput.inputValue();
    expect(hourValue).toBe('23');
  });

  test('時刻入力の検証（分の範囲）', async ({ page }) => {
    const departureRadio = page.locator('input[name="time-option"][value="departure-time"]');
    await departureRadio.click();
    
    const minuteInput = page.locator('#time-minute');
    
    // 60を入力すると59に修正される
    await minuteInput.fill('60');
    await minuteInput.blur();
    
    const minuteValue = await minuteInput.inputValue();
    expect(minuteValue).toBe('59');
  });

  test('時刻入力の0埋め', async ({ page }) => {
    const departureRadio = page.locator('input[name="time-option"][value="departure-time"]');
    await departureRadio.click();
    
    const hourInput = page.locator('#time-hour');
    const minuteInput = page.locator('#time-minute');
    
    // 1桁の数字を入力
    await hourInput.fill('9');
    await hourInput.blur();
    
    await minuteInput.fill('5');
    await minuteInput.blur();
    
    // 0埋めされることを確認
    const hourValue = await hourInput.inputValue();
    const minuteValue = await minuteInput.inputValue();
    
    expect(hourValue).toBe('09');
    expect(minuteValue).toBe('05');
  });

  test('「今すぐ」選択時にNTPから時刻を取得（エラーメッセージが表示されない）', async ({ page }) => {
    const nowRadio = page.locator('input[name="time-option"][value="now"]');
    await nowRadio.click();
    
    // NTP取得を待つ
    await page.waitForTimeout(2000);
    
    // エラーメッセージが表示されていないことを確認
    const errorMessage = page.locator('#error-message');
    await expect(errorMessage).not.toBeVisible();
  });

});
