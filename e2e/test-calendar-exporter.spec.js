/**
 * CalendarExporter E2Eテスト
 * ブラウザ環境でカレンダー登録機能をテスト
 */

import { test, expect } from '@playwright/test';

test.describe('CalendarExporter', () => {
  test.beforeEach(async ({ page }) => {
    // テストページに移動
    await page.goto('http://localhost:8080');
    
    // データ読み込み完了を待つ
    await page.waitForSelector('#search-button:not([disabled])', { timeout: 10000 });
  });

  test('カレンダー登録ボタンが検索結果に表示される', async ({ page }) => {
    // バス停を選択
    await page.fill('#departure-stop', '佐賀駅');
    await page.waitForSelector('#departure-suggestions li', { timeout: 5000 });
    await page.click('#departure-suggestions li:first-child');
    
    await page.fill('#arrival-stop', '佐賀大学');
    await page.waitForSelector('#arrival-suggestions li', { timeout: 5000 });
    await page.click('#arrival-suggestions li:first-child');
    
    // 検索実行
    await page.click('#search-button');
    
    // 検索結果を待つ
    await page.waitForSelector('.result-item', { timeout: 5000 });
    
    // カレンダー登録ボタンが表示されることを確認
    const calendarButton = await page.locator('.add-to-calendar-button').first();
    await expect(calendarButton).toBeVisible();
    await expect(calendarButton).toHaveText('カレンダーに登録');
  });

  test('カレンダー登録ボタンをクリックするとモーダルが表示される', async ({ page }) => {
    // バス停を選択して検索
    await page.fill('#departure-stop', '佐賀駅');
    await page.waitForSelector('#departure-suggestions li', { timeout: 5000 });
    await page.click('#departure-suggestions li:first-child');
    
    await page.fill('#arrival-stop', '佐賀大学');
    await page.waitForSelector('#arrival-suggestions li', { timeout: 5000 });
    await page.click('#arrival-suggestions li:first-child');
    
    await page.click('#search-button');
    await page.waitForSelector('.result-item', { timeout: 5000 });
    
    // カレンダー登録ボタンをクリック
    await page.click('.add-to-calendar-button');
    
    // モーダルが表示されることを確認
    const modal = await page.locator('#calendar-modal');
    await expect(modal).toBeVisible();
    
    // モーダルのタイトルを確認
    const modalTitle = await page.locator('#calendar-modal-title');
    await expect(modalTitle).toHaveText('カレンダーに登録');
    
    // 2つのオプションボタンが表示されることを確認
    const optionButtons = await page.locator('.calendar-option-button');
    await expect(optionButtons).toHaveCount(2);
  });

  test('iCal形式でダウンロードできる', async ({ page }) => {
    // バス停を選択して検索
    await page.fill('#departure-stop', '佐賀駅');
    await page.waitForSelector('#departure-suggestions li', { timeout: 5000 });
    await page.click('#departure-suggestions li:first-child');
    
    await page.fill('#arrival-stop', '佐賀大学');
    await page.waitForSelector('#arrival-suggestions li', { timeout: 5000 });
    await page.click('#arrival-suggestions li:first-child');
    
    await page.click('#search-button');
    await page.waitForSelector('.result-item', { timeout: 5000 });
    
    // カレンダー登録ボタンをクリック
    await page.click('.add-to-calendar-button');
    await page.waitForSelector('#calendar-modal:not([hidden])');
    
    // ダウンロードイベントを監視
    const downloadPromise = page.waitForEvent('download');
    
    // iCal形式ボタンをクリック
    await page.click('.calendar-option-button[data-format="ical"]');
    
    // ダウンロードが開始されることを確認
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^bus-schedule-\d{8}-\d{4}\.ics$/);
    
    // モーダルが閉じることを確認
    const modal = await page.locator('#calendar-modal');
    await expect(modal).toBeHidden();
  });

  test('Google Calendarで開くことができる', async ({ page, context }) => {
    // バス停を選択して検索
    await page.fill('#departure-stop', '佐賀駅');
    await page.waitForSelector('#departure-suggestions li', { timeout: 5000 });
    await page.click('#departure-suggestions li:first-child');
    
    await page.fill('#arrival-stop', '佐賀大学');
    await page.waitForSelector('#arrival-suggestions li', { timeout: 5000 });
    await page.click('#arrival-suggestions li:first-child');
    
    await page.click('#search-button');
    await page.waitForSelector('.result-item', { timeout: 5000 });
    
    // カレンダー登録ボタンをクリック
    await page.click('.add-to-calendar-button');
    await page.waitForSelector('#calendar-modal:not([hidden])');
    
    // 新しいページが開くことを監視
    const pagePromise = context.waitForEvent('page');
    
    // Google Calendarボタンをクリック
    await page.click('.calendar-option-button[data-format="google"]');
    
    // 新しいページが開くことを確認
    const newPage = await pagePromise;
    await newPage.waitForLoadState();
    
    // Google CalendarのURLであることを確認
    expect(newPage.url()).toContain('calendar.google.com/calendar/render');
    expect(newPage.url()).toContain('action=TEMPLATE');
    
    await newPage.close();
    
    // モーダルが閉じることを確認
    const modal = await page.locator('#calendar-modal');
    await expect(modal).toBeHidden();
  });

  test('モーダルの閉じるボタンで閉じることができる', async ({ page }) => {
    // バス停を選択して検索
    await page.fill('#departure-stop', '佐賀駅');
    await page.waitForSelector('#departure-suggestions li', { timeout: 5000 });
    await page.click('#departure-suggestions li:first-child');
    
    await page.fill('#arrival-stop', '佐賀大学');
    await page.waitForSelector('#arrival-suggestions li', { timeout: 5000 });
    await page.click('#arrival-suggestions li:first-child');
    
    await page.click('#search-button');
    await page.waitForSelector('.result-item', { timeout: 5000 });
    
    // カレンダー登録ボタンをクリック
    await page.click('.add-to-calendar-button');
    await page.waitForSelector('#calendar-modal:not([hidden])');
    
    // 閉じるボタンをクリック
    await page.click('.calendar-close-button');
    
    // モーダルが閉じることを確認
    const modal = await page.locator('#calendar-modal');
    await expect(modal).toBeHidden();
  });

  test('モーダル外側をクリックして閉じることができる', async ({ page }) => {
    // バス停を選択して検索
    await page.fill('#departure-stop', '佐賀駅');
    await page.waitForSelector('#departure-suggestions li', { timeout: 5000 });
    await page.click('#departure-suggestions li:first-child');
    
    await page.fill('#arrival-stop', '佐賀大学');
    await page.waitForSelector('#arrival-suggestions li', { timeout: 5000 });
    await page.click('#arrival-suggestions li:first-child');
    
    await page.click('#search-button');
    await page.waitForSelector('.result-item', { timeout: 5000 });
    
    // カレンダー登録ボタンをクリック
    await page.click('.add-to-calendar-button');
    await page.waitForSelector('#calendar-modal:not([hidden])');
    
    // モーダルの外側をクリック
    await page.click('#calendar-modal', { position: { x: 5, y: 5 } });
    
    // モーダルが閉じることを確認
    const modal = await page.locator('#calendar-modal');
    await expect(modal).toBeHidden();
  });

  test('Escapeキーでモーダルを閉じることができる', async ({ page }) => {
    // バス停を選択して検索
    await page.fill('#departure-stop', '佐賀駅');
    await page.waitForSelector('#departure-suggestions li', { timeout: 5000 });
    await page.click('#departure-suggestions li:first-child');
    
    await page.fill('#arrival-stop', '佐賀大学');
    await page.waitForSelector('#arrival-suggestions li', { timeout: 5000 });
    await page.click('#arrival-suggestions li:first-child');
    
    await page.click('#search-button');
    await page.waitForSelector('.result-item', { timeout: 5000 });
    
    // カレンダー登録ボタンをクリック
    await page.click('.add-to-calendar-button');
    await page.waitForSelector('#calendar-modal:not([hidden])');
    
    // Escapeキーを押す
    await page.keyboard.press('Escape');
    
    // モーダルが閉じることを確認
    const modal = await page.locator('#calendar-modal');
    await expect(modal).toBeHidden();
  });

  test('CalendarExporterクラスのメソッドが正しく動作する', async ({ page }) => {
    // CalendarExporterクラスをブラウザコンテキストで評価
    const result = await page.evaluate(() => {
      const exporter = new CalendarExporter();
      
      const mockSchedule = {
        tripId: 'trip_001',
        routeNumber: '1',
        routeName: '佐賀大学線',
        operator: '佐賀市営バス',
        departureStop: '佐賀駅バスセンター',
        arrivalStop: '佐賀大学',
        departureTime: '09:00',
        arrivalTime: '09:30',
        departureHour: 9,
        departureMinute: 0,
        arrivalHour: 9,
        arrivalMinute: 30,
        duration: 30,
        adultFare: 200,
        childFare: 100,
        weekdayType: '平日',
        viaStops: []
      };
      
      // 各メソッドをテスト
      const eventDate = exporter.getEventDate(mockSchedule);
      const description = exporter.generateDescription(mockSchedule);
      const icalContent = exporter.generateICalContent(mockSchedule);
      const googleUrl = exporter.generateGoogleCalendarURL(mockSchedule);
      const uid = exporter.generateUID();
      const filename = exporter.generateFilename(mockSchedule);
      
      return {
        eventDateValid: eventDate.start instanceof Date && eventDate.end instanceof Date,
        descriptionContainsRoute: description.includes('佐賀大学線'),
        descriptionContainsFare: description.includes('運賃'),
        icalContentValid: icalContent.includes('BEGIN:VCALENDAR') && icalContent.includes('END:VCALENDAR'),
        googleUrlValid: googleUrl.includes('calendar.google.com'),
        uidValid: uid.includes('@saga-bus-navi'),
        filenameValid: /^bus-schedule-\d{8}-\d{4}\.ics$/.test(filename)
      };
    });
    
    // 各メソッドの結果を検証
    expect(result.eventDateValid).toBe(true);
    expect(result.descriptionContainsRoute).toBe(true);
    expect(result.descriptionContainsFare).toBe(true);
    expect(result.icalContentValid).toBe(true);
    expect(result.googleUrlValid).toBe(true);
    expect(result.uidValid).toBe(true);
    expect(result.filenameValid).toBe(true);
  });
});

test.describe('カレンダー登録フロー統合テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForSelector('#search-button:not([disabled])', { timeout: 10000 });
  });

  test('検索 → カレンダー登録ボタンクリック → モーダル表示 → iCalダウンロードの完全フロー', async ({ page }) => {
    // ステップ1: バス停を選択
    await page.fill('#departure-stop', '佐賀駅');
    await page.waitForSelector('#departure-suggestions li', { timeout: 5000 });
    await page.click('#departure-suggestions li:first-child');
    console.log('✓ ステップ1: 乗車バス停を選択');
    
    await page.fill('#arrival-stop', '佐賀大学');
    await page.waitForSelector('#arrival-suggestions li', { timeout: 5000 });
    await page.click('#arrival-suggestions li:first-child');
    console.log('✓ ステップ2: 降車バス停を選択');
    
    // ステップ2: 検索実行
    await page.click('#search-button');
    await page.waitForSelector('.result-item', { timeout: 5000 });
    console.log('✓ ステップ3: 検索を実行');
    
    // ステップ3: カレンダー登録ボタンが表示される
    const calendarButton = await page.locator('.add-to-calendar-button').first();
    await expect(calendarButton).toBeVisible();
    console.log('✓ ステップ4: カレンダー登録ボタンが表示される');
    
    // ステップ4: カレンダー登録ボタンをクリック
    await calendarButton.click();
    console.log('✓ ステップ5: カレンダー登録ボタンをクリック');
    
    // ステップ5: モーダルが表示される
    const modal = await page.locator('#calendar-modal');
    await expect(modal).toBeVisible();
    console.log('✓ ステップ6: モーダルが表示される');
    
    // ステップ6: モーダルに2つのオプションが表示される
    const optionButtons = await page.locator('.calendar-option-button');
    await expect(optionButtons).toHaveCount(2);
    console.log('✓ ステップ7: モーダルに2つのオプションが表示される');
    
    // ステップ7: iCal形式ボタンをクリック
    const downloadPromise = page.waitForEvent('download');
    await page.click('.calendar-option-button[data-format="ical"]');
    console.log('✓ ステップ8: iCal形式ボタンをクリック');
    
    // ステップ8: ダウンロードが開始される
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^bus-schedule-\d{8}-\d{4}\.ics$/);
    console.log('✓ ステップ9: iCalファイルがダウンロードされる');
    
    // ステップ9: モーダルが閉じる
    await expect(modal).toBeHidden();
    console.log('✓ ステップ10: モーダルが閉じる');
    
    console.log('✅ iCalダウンロードフローの完全テストが成功しました');
  });

  test('検索 → カレンダー登録ボタンクリック → モーダル表示 → Google Calendar表示の完全フロー', async ({ page, context }) => {
    // ステップ1: バス停を選択
    await page.fill('#departure-stop', '佐賀駅');
    await page.waitForSelector('#departure-suggestions li', { timeout: 5000 });
    await page.click('#departure-suggestions li:first-child');
    console.log('✓ ステップ1: 乗車バス停を選択');
    
    await page.fill('#arrival-stop', '佐賀大学');
    await page.waitForSelector('#arrival-suggestions li', { timeout: 5000 });
    await page.click('#arrival-suggestions li:first-child');
    console.log('✓ ステップ2: 降車バス停を選択');
    
    // ステップ2: 検索実行
    await page.click('#search-button');
    await page.waitForSelector('.result-item', { timeout: 5000 });
    console.log('✓ ステップ3: 検索を実行');
    
    // ステップ3: カレンダー登録ボタンが表示される
    const calendarButton = await page.locator('.add-to-calendar-button').first();
    await expect(calendarButton).toBeVisible();
    console.log('✓ ステップ4: カレンダー登録ボタンが表示される');
    
    // ステップ4: カレンダー登録ボタンをクリック
    await calendarButton.click();
    console.log('✓ ステップ5: カレンダー登録ボタンをクリック');
    
    // ステップ5: モーダルが表示される
    const modal = await page.locator('#calendar-modal');
    await expect(modal).toBeVisible();
    console.log('✓ ステップ6: モーダルが表示される');
    
    // ステップ6: Google Calendarボタンをクリック
    const pagePromise = context.waitForEvent('page');
    await page.click('.calendar-option-button[data-format="google"]');
    console.log('✓ ステップ7: Google Calendarボタンをクリック');
    
    // ステップ7: 新しいタブが開く
    const newPage = await pagePromise;
    await newPage.waitForLoadState();
    console.log('✓ ステップ8: 新しいタブが開く');
    
    // ステップ8: Google CalendarのURLが正しい
    expect(newPage.url()).toContain('calendar.google.com/calendar/render');
    expect(newPage.url()).toContain('action=TEMPLATE');
    console.log('✓ ステップ9: Google CalendarのURLが正しい');
    
    await newPage.close();
    
    // ステップ9: モーダルが閉じる
    await expect(modal).toBeHidden();
    console.log('✓ ステップ10: モーダルが閉じる');
    
    console.log('✅ Google Calendarフローの完全テストが成功しました');
  });

  test('複数の検索結果からそれぞれカレンダー登録できる', async ({ page }) => {
    // バス停を選択して検索
    await page.fill('#departure-stop', '佐賀駅');
    await page.waitForSelector('#departure-suggestions li', { timeout: 5000 });
    await page.click('#departure-suggestions li:first-child');
    
    await page.fill('#arrival-stop', '佐賀大学');
    await page.waitForSelector('#arrival-suggestions li', { timeout: 5000 });
    await page.click('#arrival-suggestions li:first-child');
    
    await page.click('#search-button');
    await page.waitForSelector('.result-item', { timeout: 5000 });
    
    // 検索結果の数を確認
    const calendarButtons = await page.locator('.add-to-calendar-button');
    const buttonCount = await calendarButtons.count();
    
    if (buttonCount >= 2) {
      // 1つ目の結果からカレンダー登録
      await calendarButtons.nth(0).click();
      let modal = await page.locator('#calendar-modal');
      await expect(modal).toBeVisible();
      await page.click('.calendar-close-button');
      await expect(modal).toBeHidden();
      console.log('✓ 1つ目の検索結果からカレンダー登録モーダルを開閉');
      
      // 2つ目の結果からカレンダー登録
      await calendarButtons.nth(1).click();
      modal = await page.locator('#calendar-modal');
      await expect(modal).toBeVisible();
      await page.click('.calendar-close-button');
      await expect(modal).toBeHidden();
      console.log('✓ 2つ目の検索結果からカレンダー登録モーダルを開閉');
      
      console.log('✅ 複数の検索結果からカレンダー登録できました');
    } else {
      console.log('検索結果が1件のみです（テストスキップ）');
    }
  });

  test('モーダルを閉じた後に再度開くことができる', async ({ page }) => {
    // バス停を選択して検索
    await page.fill('#departure-stop', '佐賀駅');
    await page.waitForSelector('#departure-suggestions li', { timeout: 5000 });
    await page.click('#departure-suggestions li:first-child');
    
    await page.fill('#arrival-stop', '佐賀大学');
    await page.waitForSelector('#arrival-suggestions li', { timeout: 5000 });
    await page.click('#arrival-suggestions li:first-child');
    
    await page.click('#search-button');
    await page.waitForSelector('.result-item', { timeout: 5000 });
    
    const calendarButton = await page.locator('.add-to-calendar-button').first();
    const modal = await page.locator('#calendar-modal');
    
    // 1回目: モーダルを開いて閉じる
    await calendarButton.click();
    await expect(modal).toBeVisible();
    await page.click('.calendar-close-button');
    await expect(modal).toBeHidden();
    console.log('✓ 1回目: モーダルを開いて閉じる');
    
    // 2回目: 再度モーダルを開いて閉じる
    await calendarButton.click();
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    console.log('✓ 2回目: モーダルを開いて閉じる（Escapeキー）');
    
    // 3回目: 再度モーダルを開いて閉じる
    await calendarButton.click();
    await expect(modal).toBeVisible();
    await page.click('#calendar-modal', { position: { x: 5, y: 5 } });
    await expect(modal).toBeHidden();
    console.log('✓ 3回目: モーダルを開いて閉じる（外側クリック）');
    
    console.log('✅ モーダルを複数回開閉できました');
  });
});
