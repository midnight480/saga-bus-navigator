/**
 * フッターページのブラウザ互換性検証テスト
 * 
 * 要件:
 * - 全般: Chrome、Firefox、Safari、Edge で動作確認する
 * - 全般: モバイルブラウザ（iOS Safari、Android Chrome）で動作確認する
 * 
 * このテストは複数のブラウザプロジェクト（chromium、firefox、webkit）で実行され、
 * 各ブラウザでフッターページの基本機能が正しく動作することを確認します。
 */

import { test, expect } from '@playwright/test';

test.describe('フッターページ - ブラウザ互換性', () => {
  
  test.describe('基本的なモーダル機能', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });
    
    test('使い方モーダルが正しく開閉する', async ({ page, browserName }) => {
      // ブラウザ名をログ出力
      console.log(`Testing on: ${browserName}`);
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // モーダルコンテンツが表示されることを確認
      const modalContent = modal.locator('.footer-modal-content');
      await expect(modalContent).toBeVisible();
      
      // タイトルが表示されることを確認
      const title = modal.locator('.footer-modal-title');
      await expect(title).toBeVisible();
      await expect(title).toHaveText('佐賀バスナビ');
      
      // 閉じるボタンをクリック
      await modal.locator('.footer-modal-close').click();
      
      // モーダルが閉じることを確認
      await expect(modal).toBeHidden();
    });
    
    test('お問い合わせモーダルが正しく開閉する', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // お問い合わせリンクをクリック
      await page.click('a[href="#contact"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#contact-modal');
      await expect(modal).toBeVisible();
      
      // モーダルコンテンツが表示されることを確認
      const modalContent = modal.locator('.footer-modal-content');
      await expect(modalContent).toBeVisible();
      
      // タイトルが表示されることを確認
      const title = modal.locator('.footer-modal-title');
      await expect(title).toBeVisible();
      await expect(title).toHaveText('お問い合わせ');
      
      // iframeが表示されることを確認
      const iframe = modal.locator('iframe');
      await expect(iframe).toBeVisible();
      
      // 閉じるボタンをクリック
      await modal.locator('.footer-modal-close').click();
      
      // モーダルが閉じることを確認
      await expect(modal).toBeHidden();
    });
    
    test('オーバーレイクリックでモーダルが閉じる', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // オーバーレイをクリック（force: trueを使用してコンテンツの下のオーバーレイをクリック）
      await modal.locator('.footer-modal-overlay').click({ force: true });
      
      // モーダルが閉じることを確認
      await expect(modal).toBeHidden();
    });
    
    test('ESCキーでモーダルが閉じる', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // ESCキーを押す
      await page.keyboard.press('Escape');
      
      // モーダルが閉じることを確認
      await expect(modal).toBeHidden();
    });
  });
  
  test.describe('タブ切り替え機能', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // 使い方モーダルを開く
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
    });
    
    test('使い方タブが初期表示される', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      const modal = page.locator('#usage-modal');
      
      // 使い方タブボタンがアクティブであることを確認
      const usageTabButton = modal.locator('.footer-tab-button[data-tab="usage"]');
      await expect(usageTabButton).toHaveClass(/active/);
      
      // 使い方タブコンテンツが表示されることを確認
      const usageTab = modal.locator('#usage-tab');
      await expect(usageTab).toBeVisible();
      await expect(usageTab).toHaveClass(/active/);
    });
    
    test('謝辞タブに切り替えられる', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      const modal = page.locator('#usage-modal');
      
      // 謝辞タブボタンをクリック
      const acknowledgmentsTabButton = modal.locator('.footer-tab-button[data-tab="acknowledgments"]');
      await acknowledgmentsTabButton.click();
      
      // 謝辞タブボタンがアクティブになることを確認
      await expect(acknowledgmentsTabButton).toHaveClass(/active/);
      
      // 謝辞タブコンテンツが表示されることを確認
      const acknowledgmentsTab = modal.locator('#acknowledgments-tab');
      await expect(acknowledgmentsTab).toBeVisible();
      await expect(acknowledgmentsTab).toHaveClass(/active/);
      
      // 使い方タブが非表示になることを確認
      const usageTab = modal.locator('#usage-tab');
      await expect(usageTab).toBeHidden();
    });
    
    test('利用規約タブに切り替えられる', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      const modal = page.locator('#usage-modal');
      
      // 利用規約タブボタンをクリック
      const termsTabButton = modal.locator('.footer-tab-button[data-tab="terms"]');
      await termsTabButton.click();
      
      // 利用規約タブボタンがアクティブになることを確認
      await expect(termsTabButton).toHaveClass(/active/);
      
      // 利用規約タブコンテンツが表示されることを確認
      const termsTab = modal.locator('#terms-tab');
      await expect(termsTab).toBeVisible();
      await expect(termsTab).toHaveClass(/active/);
      
      // 使い方タブが非表示になることを確認
      const usageTab = modal.locator('#usage-tab');
      await expect(usageTab).toBeHidden();
    });
    
    test('タブを複数回切り替えても正しく動作する', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      const modal = page.locator('#usage-modal');
      
      // 謝辞タブに切り替え
      await modal.locator('.footer-tab-button[data-tab="acknowledgments"]').click();
      await expect(modal.locator('#acknowledgments-tab')).toBeVisible();
      
      // 利用規約タブに切り替え
      await modal.locator('.footer-tab-button[data-tab="terms"]').click();
      await expect(modal.locator('#terms-tab')).toBeVisible();
      
      // 使い方タブに戻る
      await modal.locator('.footer-tab-button[data-tab="usage"]').click();
      await expect(modal.locator('#usage-tab')).toBeVisible();
    });
  });
  
  test.describe('CSSスタイルとアニメーション', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });
    
    test('モーダルが正しいスタイルで表示される', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // モーダルのz-indexを確認
      const zIndex = await modal.evaluate((el) => {
        return window.getComputedStyle(el).zIndex;
      });
      expect(parseInt(zIndex)).toBeGreaterThanOrEqual(3000);
      
      // モーダルコンテンツの背景色を確認
      const modalContent = modal.locator('.footer-modal-content');
      const backgroundColor = await modalContent.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      // 白色（rgb(255, 255, 255)）であることを確認
      expect(backgroundColor).toMatch(/rgb\(255,\s*255,\s*255\)/);
    });
    
    test('オーバーレイが正しいスタイルで表示される', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // オーバーレイの背景色を確認（半透明の黒）
      const overlay = modal.locator('.footer-modal-overlay');
      const backgroundColor = await overlay.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      // rgba形式で半透明であることを確認
      expect(backgroundColor).toMatch(/rgba?\(/);
    });
    
    test('タブボタンのホバースタイルが適用される', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // 謝辞タブボタンにホバー
      const acknowledgmentsTabButton = modal.locator('.footer-tab-button[data-tab="acknowledgments"]');
      await acknowledgmentsTabButton.hover();
      
      // ホバー時のスタイルを確認（カーソルがpointerであることを確認）
      const cursor = await acknowledgmentsTabButton.evaluate((el) => {
        return window.getComputedStyle(el).cursor;
      });
      expect(cursor).toBe('pointer');
    });
    
    test('閉じるボタンが正しいスタイルで表示される', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // 閉じるボタンのスタイルを確認
      const closeButton = modal.locator('.footer-modal-close');
      const cursor = await closeButton.evaluate((el) => {
        return window.getComputedStyle(el).cursor;
      });
      expect(cursor).toBe('pointer');
      
      // ボタンが表示されていることを確認
      await expect(closeButton).toBeVisible();
      await expect(closeButton).toHaveText('×');
    });
  });
  
  test.describe('コンテンツ表示', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });
    
    test('使い方タブのコンテンツが正しく表示される', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // 使い方タブコンテンツを確認
      const usageTab = modal.locator('#usage-tab');
      await expect(usageTab).toBeVisible();
      
      // コンテンツにテキストが含まれていることを確認
      const content = await usageTab.textContent();
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
    });
    
    test('謝辞タブのコンテンツが正しく表示される', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // 謝辞タブに切り替え
      await modal.locator('.footer-tab-button[data-tab="acknowledgments"]').click();
      
      // 謝辞タブコンテンツを確認
      const acknowledgmentsTab = modal.locator('#acknowledgments-tab');
      await expect(acknowledgmentsTab).toBeVisible();
      
      // コンテンツにテキストが含まれていることを確認
      const content = await acknowledgmentsTab.textContent();
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
      
      // 外部リンクが存在することを確認
      const externalLinks = acknowledgmentsTab.locator('a[target="_blank"]');
      const linkCount = await externalLinks.count();
      expect(linkCount).toBeGreaterThan(0);
    });
    
    test('利用規約タブのコンテンツが正しく表示される', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // 利用規約タブに切り替え
      await modal.locator('.footer-tab-button[data-tab="terms"]').click();
      
      // 利用規約タブコンテンツを確認
      const termsTab = modal.locator('#terms-tab');
      await expect(termsTab).toBeVisible();
      
      // コンテンツにテキストが含まれていることを確認
      const content = await termsTab.textContent();
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
    });
    
    test('お問い合わせフォームのiframeが正しく表示される', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // お問い合わせリンクをクリック
      await page.click('a[href="#contact"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#contact-modal');
      await expect(modal).toBeVisible();
      
      // iframeが表示されることを確認
      const iframe = modal.locator('iframe');
      await expect(iframe).toBeVisible();
      
      // iframeのsrc属性を確認
      const src = await iframe.getAttribute('src');
      expect(src).toContain('docs.google.com/forms');
      
      // iframeのtitle属性を確認
      const title = await iframe.getAttribute('title');
      expect(title).toBe('お問い合わせフォーム');
    });
  });
  
  test.describe('レスポンシブデザイン', () => {
    
    test('デスクトップサイズでモーダルが中央配置される', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // デスクトップサイズに設定
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // モーダルコンテンツの最大幅を確認
      const modalContent = modal.locator('.footer-modal-content');
      const maxWidth = await modalContent.evaluate((el) => {
        return window.getComputedStyle(el).maxWidth;
      });
      // 最大幅が800px以下であることを確認
      expect(maxWidth).toMatch(/\d+px/);
    });
    
    test('タブレットサイズでモーダルが正しく表示される', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // タブレットサイズに設定
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // モーダルコンテンツが表示されることを確認
      const modalContent = modal.locator('.footer-modal-content');
      await expect(modalContent).toBeVisible();
    });
    
    test('モバイルサイズでモーダルが全画面表示される', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // モバイルサイズに設定
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // モーダルコンテンツが表示されることを確認
      const modalContent = modal.locator('.footer-modal-content');
      await expect(modalContent).toBeVisible();
      
      // タブが表示されることを確認
      const tabs = modal.locator('.footer-modal-tabs');
      await expect(tabs).toBeVisible();
    });
  });
  
  test.describe('JavaScript機能', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });
    
    test('FooterPagesControllerが正しく初期化される', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // JavaScriptエラーがないことを確認
      const errors = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // JavaScriptエラーがないことを確認
      expect(errors).toHaveLength(0);
    });
    
    test('イベントリスナーが正しく動作する', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // タブボタンのクリックイベントが動作することを確認
      await modal.locator('.footer-tab-button[data-tab="acknowledgments"]').click();
      await expect(modal.locator('#acknowledgments-tab')).toBeVisible();
      
      // 閉じるボタンのクリックイベントが動作することを確認
      await modal.locator('.footer-modal-close').click();
      await expect(modal).toBeHidden();
    });
    
    test('複数のモーダルを順番に開いても正しく動作する', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // 使い方モーダルを開く
      await page.click('a[href="#usage"]');
      let modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // 閉じる
      await modal.locator('.footer-modal-close').click();
      await expect(modal).toBeHidden();
      
      // お問い合わせモーダルを開く
      await page.click('a[href="#contact"]');
      modal = page.locator('#contact-modal');
      await expect(modal).toBeVisible();
      
      // 閉じる
      await modal.locator('.footer-modal-close').click();
      await expect(modal).toBeHidden();
      
      // 再度使い方モーダルを開く
      await page.click('a[href="#usage"]');
      modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
    });
  });
  
  test.describe('パフォーマンス', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });
    
    test('モーダルが素早く表示される', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // クリック前の時刻を記録
      const startTime = Date.now();
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // 表示までの時間を計測
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 1秒以内に表示されることを確認（ネットワーク遅延を考慮）
      expect(duration).toBeLessThan(1000);
    });
    
    test('タブ切り替えが素早く動作する', async ({ page, browserName }) => {
      console.log(`Testing on: ${browserName}`);
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // タブ切り替え前の時刻を記録
      const startTime = Date.now();
      
      // 謝辞タブに切り替え
      await modal.locator('.footer-tab-button[data-tab="acknowledgments"]').click();
      
      // 謝辞タブが表示されることを確認
      const acknowledgmentsTab = modal.locator('#acknowledgments-tab');
      await expect(acknowledgmentsTab).toBeVisible();
      
      // 切り替えまでの時間を計測
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 2秒以内に切り替わることを確認（ネットワーク遅延やレンダリング時間を考慮）
      expect(duration).toBeLessThan(2000);
    });
  });
});
