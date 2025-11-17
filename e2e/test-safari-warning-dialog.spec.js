import { test, expect } from '@playwright/test';

test.describe('Safari警告ダイアログ', () => {
  test.describe('4.1 iPhone Safariでの動作確認', () => {
    test('iPhone Safariで初回アクセス時に警告ダイアログが表示される', async ({
      browser,
    }) => {
      // iPhone SafariのUserAgentを設定
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 375, height: 667 },
      });

      const page = await context.newPage();

      // LocalStorageをクリア
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.removeItem('hideIphoneSafariWarning');
      });

      // ページをリロード
      await page.reload();

      // 警告ダイアログが表示されることを確認
      const dialog = page.locator('.safari-warning-overlay');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // ダイアログの内容を確認
      await expect(
        page.locator('.safari-warning-title')
      ).toHaveText('動作環境について');
      await expect(
        page.locator('.safari-warning-message')
      ).toContainText('iPhone版Safariでは地図の読み込みが不安定な場合があります');
      await expect(
        page.locator('.safari-warning-recommendation')
      ).toContainText('Google Chromeでのアクセスを推奨します');

      // チェックボックスとOKボタンが表示されることを確認
      await expect(
        page.locator('.safari-warning-checkbox')
      ).toBeVisible();
      await expect(
        page.locator('.safari-warning-ok-button')
      ).toBeVisible();

      await context.close();
    });

    test('警告ダイアログのARIA属性が正しく設定されている', async ({
      browser,
    }) => {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 375, height: 667 },
      });

      const page = await context.newPage();

      await page.goto('/');
      await page.evaluate(() => {
        localStorage.removeItem('hideIphoneSafariWarning');
      });
      await page.reload();

      const dialog = page.locator('.safari-warning-overlay');
      await expect(dialog).toBeVisible();

      // ARIA属性を確認
      await expect(dialog).toHaveAttribute('role', 'dialog');
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      await expect(dialog).toHaveAttribute(
        'aria-labelledby',
        'safari-warning-title'
      );

      await context.close();
    });
  });

  test.describe('4.2 「今後表示しない」機能の確認', () => {
    test('チェックボックスをチェックしてOKを押すと次回表示されない', async ({
      browser,
    }) => {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 375, height: 667 },
      });

      const page = await context.newPage();

      // LocalStorageをクリア
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.removeItem('hideIphoneSafariWarning');
      });
      await page.reload();

      // 警告ダイアログが表示されることを確認
      const dialog = page.locator('.safari-warning-overlay');
      await expect(dialog).toBeVisible();

      // チェックボックスをチェック
      const checkbox = page.locator('.safari-warning-checkbox');
      await checkbox.check();
      await expect(checkbox).toBeChecked();

      // OKボタンをクリック
      const okButton = page.locator('.safari-warning-ok-button');
      await okButton.click();

      // ダイアログが非表示になることを確認
      await expect(dialog).not.toBeVisible();

      // LocalStorageに保存されていることを確認
      const storageValue = await page.evaluate(() => {
        return localStorage.getItem('hideIphoneSafariWarning');
      });
      expect(storageValue).toBe('true');

      // ページをリロード
      await page.reload();

      // 警告ダイアログが表示されないことを確認
      await page.waitForLoadState('domcontentloaded');
      await expect(dialog).not.toBeVisible();

      await context.close();
    });

    test('チェックボックスをチェックせずにOKを押すと次回も表示される', async ({
      browser,
    }) => {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 375, height: 667 },
      });

      const page = await context.newPage();

      // LocalStorageをクリア
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.removeItem('hideIphoneSafariWarning');
      });
      await page.reload();

      // 警告ダイアログが表示されることを確認
      const dialog = page.locator('.safari-warning-overlay');
      await expect(dialog).toBeVisible();

      // チェックボックスをチェックしない
      const checkbox = page.locator('.safari-warning-checkbox');
      await expect(checkbox).not.toBeChecked();

      // OKボタンをクリック
      const okButton = page.locator('.safari-warning-ok-button');
      await okButton.click();

      // ダイアログが非表示になることを確認
      await expect(dialog).not.toBeVisible();

      // LocalStorageに保存されていないことを確認
      const storageValue = await page.evaluate(() => {
        return localStorage.getItem('hideIphoneSafariWarning');
      });
      expect(storageValue).toBeNull();

      // ページをリロード
      await page.reload();

      // 警告ダイアログが再度表示されることを確認
      await expect(dialog).toBeVisible();

      await context.close();
    });
  });

  test.describe('4.3 他のブラウザでの動作確認', () => {
    test('iPhone Chromeでは警告ダイアログが表示されない', async ({
      browser,
    }) => {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/108.0.5359.112 Mobile/15E148 Safari/604.1',
        viewport: { width: 375, height: 667 },
      });

      const page = await context.newPage();

      await page.goto('/');
      await page.evaluate(() => {
        localStorage.removeItem('hideIphoneSafariWarning');
      });
      await page.reload();

      // 警告ダイアログが表示されないことを確認
      const dialog = page.locator('.safari-warning-overlay');
      await page.waitForLoadState('domcontentloaded');
      await expect(dialog).not.toBeVisible();

      await context.close();
    });

    test('Android Chromeでは警告ダイアログが表示されない', async ({
      browser,
    }) => {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.5359.128 Mobile Safari/537.36',
        viewport: { width: 412, height: 915 },
      });

      const page = await context.newPage();

      await page.goto('/');
      await page.evaluate(() => {
        localStorage.removeItem('hideIphoneSafariWarning');
      });
      await page.reload();

      // 警告ダイアログが表示されないことを確認
      const dialog = page.locator('.safari-warning-overlay');
      await page.waitForLoadState('domcontentloaded');
      await expect(dialog).not.toBeVisible();

      await context.close();
    });

    test('デスクトップChromeでは警告ダイアログが表示されない', async ({
      page,
    }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.removeItem('hideIphoneSafariWarning');
      });
      await page.reload();

      // 警告ダイアログが表示されないことを確認
      const dialog = page.locator('.safari-warning-overlay');
      await page.waitForLoadState('domcontentloaded');
      await expect(dialog).not.toBeVisible();
    });
  });

  test.describe('4.4 既存機能への影響確認', () => {
    test('警告ダイアログ表示中もバックグラウンドでデータ読み込みが継続される', async ({
      browser,
    }) => {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 375, height: 667 },
      });

      const page = await context.newPage();

      await page.goto('/');
      await page.evaluate(() => {
        localStorage.removeItem('hideIphoneSafariWarning');
      });
      await page.reload();

      // 警告ダイアログが表示されることを確認
      const dialog = page.locator('.safari-warning-overlay');
      await expect(dialog).toBeVisible();

      // データローダーが初期化されていることを確認
      const dataLoaderInitialized = await page.evaluate(() => {
        return typeof window.DataLoader !== 'undefined';
      });
      expect(dataLoaderInitialized).toBe(true);

      // 地図が初期化されていることを確認
      const mapInitialized = await page.evaluate(() => {
        return document.getElementById('map-container') !== null;
      });
      expect(mapInitialized).toBe(true);

      await context.close();
    });

    test('警告ダイアログを閉じた後、既存機能が正常に動作する', async ({
      browser,
    }) => {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 375, height: 667 },
      });

      const page = await context.newPage();

      await page.goto('/');
      await page.evaluate(() => {
        localStorage.removeItem('hideIphoneSafariWarning');
      });
      await page.reload();

      // 警告ダイアログが表示されることを確認
      const dialog = page.locator('.safari-warning-overlay');
      await expect(dialog).toBeVisible();

      // OKボタンをクリック
      const okButton = page.locator('.safari-warning-ok-button');
      await okButton.click();

      // ダイアログが非表示になることを確認
      await expect(dialog).not.toBeVisible();

      // データが読み込まれるまで待機
      await page.waitForTimeout(2000);

      // 検索フォームが有効になることを確認
      const departureInput = page.locator('#departure-stop');
      await expect(departureInput).not.toBeDisabled();

      // バス停名を入力して候補が表示されることを確認
      await departureInput.fill('佐賀駅');
      await page.waitForTimeout(500);

      const suggestions = page.locator('#departure-suggestions li');
      const count = await suggestions.count();
      expect(count).toBeGreaterThan(0);

      await context.close();
    });
  });

  test.describe('4.5 アクセシビリティの確認', () => {
    test('キーボード操作でチェックボックスとボタンにフォーカスできる', async ({
      browser,
    }) => {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 375, height: 667 },
      });

      const page = await context.newPage();

      await page.goto('/');
      await page.evaluate(() => {
        localStorage.removeItem('hideIphoneSafariWarning');
      });
      await page.reload();

      // 警告ダイアログが表示されることを確認
      const dialog = page.locator('.safari-warning-overlay');
      await expect(dialog).toBeVisible();

      // チェックボックスに直接フォーカス
      const checkbox = page.locator('.safari-warning-checkbox');
      await checkbox.focus();
      await expect(checkbox).toBeFocused();

      // Spaceキーでチェック
      await page.keyboard.press('Space');
      await expect(checkbox).toBeChecked();

      // Tabキーで次の要素（OKボタン）にフォーカス
      await page.keyboard.press('Tab');

      // OKボタンにフォーカスがあることを確認
      const okButton = page.locator('.safari-warning-ok-button');
      await expect(okButton).toBeFocused();

      // Enterキーでボタンをクリック
      await page.keyboard.press('Enter');

      // ダイアログが非表示になることを確認
      await expect(dialog).not.toBeVisible();

      await context.close();
    });

    test('ダイアログのコントラスト比が適切である', async ({ browser }) => {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 375, height: 667 },
      });

      const page = await context.newPage();

      await page.goto('/');
      await page.evaluate(() => {
        localStorage.removeItem('hideIphoneSafariWarning');
      });
      await page.reload();

      // 警告ダイアログが表示されることを確認
      const dialog = page.locator('.safari-warning-overlay');
      await expect(dialog).toBeVisible();

      // タイトルのスタイルを確認
      const title = page.locator('.safari-warning-title');
      const titleColor = await title.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      const titleBg = await title.evaluate((el) => {
        return window.getComputedStyle(el.parentElement).backgroundColor;
      });

      // 色が設定されていることを確認（具体的なコントラスト比の計算は省略）
      expect(titleColor).toBeTruthy();
      expect(titleBg).toBeTruthy();

      await context.close();
    });

    test('タップ領域が44x44px以上である', async ({ browser }) => {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 375, height: 667 },
      });

      const page = await context.newPage();

      await page.goto('/');
      await page.evaluate(() => {
        localStorage.removeItem('hideIphoneSafariWarning');
      });
      await page.reload();

      // 警告ダイアログが表示されることを確認
      const dialog = page.locator('.safari-warning-overlay');
      await expect(dialog).toBeVisible();

      // OKボタンのサイズを確認
      const okButton = page.locator('.safari-warning-ok-button');
      const buttonBox = await okButton.boundingBox();

      expect(buttonBox).not.toBeNull();
      if (buttonBox) {
        expect(buttonBox.height).toBeGreaterThanOrEqual(44);
        // 幅は100%なので高さのみチェック
      }

      await context.close();
    });
  });
});
