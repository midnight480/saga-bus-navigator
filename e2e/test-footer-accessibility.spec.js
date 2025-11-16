/**
 * フッターページのアクセシビリティ検証テスト
 * 
 * 要件:
 * - 5.2: モーダルが開くとフォーカスがモーダル内の最初のフォーカス可能要素に移動する
 * - 5.3: モーダルが開いている間、Tabキーによるフォーカス移動がモーダル内に制限される
 * - 5.4: モーダルが閉じるとフォーカスがモーダルを開いたリンクに戻る
 * - 5.1: モーダルに適切なARIA属性が設定されている
 * - 5.5: 全てのリンクに適切なaria-labelまたはテキストが提供されている
 */

import { test, expect } from '@playwright/test';

test.describe('フッターページ - アクセシビリティ', () => {
  
  test.describe('6.1 キーボードナビゲーションの確認', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });
    
    test('Tabキーでフォーカス移動できる - 使い方モーダル', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // 最初のフォーカス可能要素（閉じるボタン）にフォーカスがあることを確認
      const closeButton = modal.locator('.footer-modal-close');
      await expect(closeButton).toBeFocused();
      
      // Tabキーを押してタブボタンにフォーカス移動
      await page.keyboard.press('Tab');
      const firstTabButton = modal.locator('.footer-tab-button').first();
      await expect(firstTabButton).toBeFocused();
      
      // さらにTabキーを押して次のタブボタンにフォーカス移動
      await page.keyboard.press('Tab');
      const secondTabButton = modal.locator('.footer-tab-button').nth(1);
      await expect(secondTabButton).toBeFocused();
      
      // さらにTabキーを押して3番目のタブボタンにフォーカス移動
      await page.keyboard.press('Tab');
      const thirdTabButton = modal.locator('.footer-tab-button').nth(2);
      await expect(thirdTabButton).toBeFocused();
    });
    
    test('Tabキーでフォーカス移動できる - お問い合わせモーダル', async ({ page }) => {
      // お問い合わせリンクをクリック
      await page.click('a[href="#contact"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#contact-modal');
      await expect(modal).toBeVisible();
      
      // 最初のフォーカス可能要素（閉じるボタン）にフォーカスがあることを確認
      const closeButton = modal.locator('.footer-modal-close');
      await expect(closeButton).toBeFocused();
      
      // Tabキーを押してiframeにフォーカス移動
      await page.keyboard.press('Tab');
      const iframe = modal.locator('iframe');
      await expect(iframe).toBeFocused();
    });
    
    test('ESCキーでモーダルが閉じる - 使い方モーダル', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // ESCキーを押す
      await page.keyboard.press('Escape');
      
      // モーダルが閉じることを確認
      await expect(modal).toBeHidden();
    });
    
    test('ESCキーでモーダルが閉じる - お問い合わせモーダル', async ({ page }) => {
      // お問い合わせリンクをクリック
      await page.click('a[href="#contact"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#contact-modal');
      await expect(modal).toBeVisible();
      
      // ESCキーを押す
      await page.keyboard.press('Escape');
      
      // モーダルが閉じることを確認
      await expect(modal).toBeHidden();
    });
    
    test('フォーカストラップが機能する - 最後の要素から最初の要素へ', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // 最後のフォーカス可能要素（3番目のタブボタン）にフォーカスを移動
      const lastTabButton = modal.locator('.footer-tab-button').nth(2);
      await lastTabButton.focus();
      await expect(lastTabButton).toBeFocused();
      
      // Tabキーを押す（フォーカストラップにより最初の要素に戻る）
      await page.keyboard.press('Tab');
      
      // 最初のフォーカス可能要素（閉じるボタン）にフォーカスが戻ることを確認
      const closeButton = modal.locator('.footer-modal-close');
      await expect(closeButton).toBeFocused();
    });
    
    test('フォーカストラップが機能する - 最初の要素から最後の要素へ（Shift+Tab）', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // 最初のフォーカス可能要素（閉じるボタン）にフォーカスがあることを確認
      const closeButton = modal.locator('.footer-modal-close');
      await expect(closeButton).toBeFocused();
      
      // Shift+Tabキーを押す（フォーカストラップにより最後の要素に移動）
      await page.keyboard.press('Shift+Tab');
      
      // 最後のフォーカス可能要素（3番目のタブボタン）にフォーカスが移動することを確認
      const lastTabButton = modal.locator('.footer-tab-button').nth(2);
      await expect(lastTabButton).toBeFocused();
    });
    
    test('モーダルを閉じるとフォーカスが元のリンクに戻る - 使い方', async ({ page }) => {
      // 使い方リンクを取得
      const usageLink = page.locator('a[href="#usage"]');
      
      // 使い方リンクをクリック
      await usageLink.click();
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // 閉じるボタンをクリック
      await modal.locator('.footer-modal-close').click();
      
      // モーダルが閉じることを確認
      await expect(modal).toBeHidden();
      
      // フォーカスが使い方リンクに戻ることを確認
      await expect(usageLink).toBeFocused();
    });
    
    test('モーダルを閉じるとフォーカスが元のリンクに戻る - お問い合わせ', async ({ page }) => {
      // お問い合わせリンクを取得
      const contactLink = page.locator('a[href="#contact"]');
      
      // お問い合わせリンクをクリック
      await contactLink.click();
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#contact-modal');
      await expect(modal).toBeVisible();
      
      // 閉じるボタンをクリック
      await modal.locator('.footer-modal-close').click();
      
      // モーダルが閉じることを確認
      await expect(modal).toBeHidden();
      
      // フォーカスがお問い合わせリンクに戻ることを確認
      await expect(contactLink).toBeFocused();
    });
    
    test('オーバーレイクリックでモーダルが閉じてフォーカスが戻る', async ({ page }) => {
      // 使い方リンクを取得
      const usageLink = page.locator('a[href="#usage"]');
      
      // 使い方リンクをクリック
      await usageLink.click();
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // オーバーレイをクリック
      await modal.locator('.footer-modal-overlay').click();
      
      // モーダルが閉じることを確認
      await expect(modal).toBeHidden();
      
      // フォーカスが使い方リンクに戻ることを確認
      await expect(usageLink).toBeFocused();
    });
    
    test('タブ切り替え時にキーボードナビゲーションが機能する', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // 謝辞タブボタンにフォーカスを移動
      const acknowledgmentsTabButton = modal.locator('.footer-tab-button[data-tab="acknowledgments"]');
      await acknowledgmentsTabButton.focus();
      await expect(acknowledgmentsTabButton).toBeFocused();
      
      // Enterキーでタブを切り替え
      await page.keyboard.press('Enter');
      
      // 謝辞タブがアクティブになることを確認
      await expect(acknowledgmentsTabButton).toHaveClass(/active/);
      
      // 謝辞タブコンテンツが表示されることを確認
      const acknowledgmentsTab = modal.locator('#acknowledgments-tab');
      await expect(acknowledgmentsTab).toBeVisible();
      await expect(acknowledgmentsTab).toHaveClass(/active/);
    });
  });
  
  test.describe('6.2 ARIA属性の確認', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });
    
    test('使い方モーダルに適切なARIA属性が設定されている', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // role="dialog" が設定されていることを確認
      await expect(modal).toHaveAttribute('role', 'dialog');
      
      // aria-modal="true" が設定されていることを確認
      await expect(modal).toHaveAttribute('aria-modal', 'true');
      
      // aria-labelledby が設定されていることを確認
      await expect(modal).toHaveAttribute('aria-labelledby', 'usage-modal-title');
      
      // aria-labelledby で参照されている要素が存在することを確認
      const modalTitle = modal.locator('#usage-modal-title');
      await expect(modalTitle).toBeVisible();
      await expect(modalTitle).toHaveText('佐賀バスナビ');
    });
    
    test('お問い合わせモーダルに適切なARIA属性が設定されている', async ({ page }) => {
      // お問い合わせリンクをクリック
      await page.click('a[href="#contact"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#contact-modal');
      await expect(modal).toBeVisible();
      
      // role="dialog" が設定されていることを確認
      await expect(modal).toHaveAttribute('role', 'dialog');
      
      // aria-modal="true" が設定されていることを確認
      await expect(modal).toHaveAttribute('aria-modal', 'true');
      
      // aria-labelledby が設定されていることを確認
      await expect(modal).toHaveAttribute('aria-labelledby', 'contact-modal-title');
      
      // aria-labelledby で参照されている要素が存在することを確認
      const modalTitle = modal.locator('#contact-modal-title');
      await expect(modalTitle).toBeVisible();
      await expect(modalTitle).toHaveText('お問い合わせ');
    });
    
    test('閉じるボタンに適切なaria-labelが設定されている', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // 閉じるボタンの aria-label を確認
      const closeButton = modal.locator('.footer-modal-close');
      await expect(closeButton).toHaveAttribute('aria-label', '閉じる');
    });
    
    test('タブボタンに適切なARIA属性が設定されている', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // タブリストの role を確認
      const tabList = modal.locator('.footer-modal-tabs');
      await expect(tabList).toHaveAttribute('role', 'tablist');
      
      // 各タブボタンの ARIA 属性を確認
      const tabButtons = modal.locator('.footer-tab-button');
      
      // 使い方タブ（アクティブ）
      const usageTab = tabButtons.nth(0);
      await expect(usageTab).toHaveAttribute('role', 'tab');
      await expect(usageTab).toHaveAttribute('aria-selected', 'true');
      await expect(usageTab).toHaveAttribute('aria-controls', 'usage-tab');
      await expect(usageTab).toHaveClass(/active/);
      
      // 謝辞タブ（非アクティブ）
      const acknowledgmentsTab = tabButtons.nth(1);
      await expect(acknowledgmentsTab).toHaveAttribute('role', 'tab');
      await expect(acknowledgmentsTab).toHaveAttribute('aria-selected', 'false');
      await expect(acknowledgmentsTab).toHaveAttribute('aria-controls', 'acknowledgments-tab');
      await expect(acknowledgmentsTab).not.toHaveClass(/active/);
      
      // 利用規約タブ（非アクティブ）
      const termsTab = tabButtons.nth(2);
      await expect(termsTab).toHaveAttribute('role', 'tab');
      await expect(termsTab).toHaveAttribute('aria-selected', 'false');
      await expect(termsTab).toHaveAttribute('aria-controls', 'terms-tab');
      await expect(termsTab).not.toHaveClass(/active/);
    });
    
    test('タブコンテンツに適切なARIA属性が設定されている', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // 使い方タブコンテンツ（アクティブ）
      const usageTabContent = modal.locator('#usage-tab');
      await expect(usageTabContent).toHaveAttribute('role', 'tabpanel');
      await expect(usageTabContent).toHaveAttribute('aria-labelledby', 'usage-tab-button');
      await expect(usageTabContent).toBeVisible();
      await expect(usageTabContent).not.toHaveAttribute('hidden');
      
      // 謝辞タブコンテンツ（非アクティブ）
      const acknowledgmentsTabContent = modal.locator('#acknowledgments-tab');
      await expect(acknowledgmentsTabContent).toHaveAttribute('role', 'tabpanel');
      await expect(acknowledgmentsTabContent).toHaveAttribute('aria-labelledby', 'acknowledgments-tab-button');
      await expect(acknowledgmentsTabContent).toBeHidden();
      await expect(acknowledgmentsTabContent).toHaveAttribute('hidden');
      
      // 利用規約タブコンテンツ（非アクティブ）
      const termsTabContent = modal.locator('#terms-tab');
      await expect(termsTabContent).toHaveAttribute('role', 'tabpanel');
      await expect(termsTabContent).toHaveAttribute('aria-labelledby', 'terms-tab-button');
      await expect(termsTabContent).toBeHidden();
      await expect(termsTabContent).toHaveAttribute('hidden');
    });
    
    test('タブ切り替え時にaria-selected属性が更新される', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      const tabButtons = modal.locator('.footer-tab-button');
      const usageTab = tabButtons.nth(0);
      const acknowledgmentsTab = tabButtons.nth(1);
      
      // 初期状態：使い方タブがアクティブ
      await expect(usageTab).toHaveAttribute('aria-selected', 'true');
      await expect(acknowledgmentsTab).toHaveAttribute('aria-selected', 'false');
      
      // 謝辞タブをクリック
      await acknowledgmentsTab.click();
      
      // aria-selected が更新されることを確認
      await expect(usageTab).toHaveAttribute('aria-selected', 'false');
      await expect(acknowledgmentsTab).toHaveAttribute('aria-selected', 'true');
      
      // タブコンテンツの表示状態も確認
      const usageTabContent = modal.locator('#usage-tab');
      const acknowledgmentsTabContent = modal.locator('#acknowledgments-tab');
      
      await expect(usageTabContent).toBeHidden();
      await expect(usageTabContent).toHaveAttribute('hidden');
      await expect(acknowledgmentsTabContent).toBeVisible();
      await expect(acknowledgmentsTabContent).not.toHaveAttribute('hidden');
    });
    
    test('外部リンクに適切な属性が設定されている', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // 謝辞タブに切り替え
      await modal.locator('.footer-tab-button[data-tab="acknowledgments"]').click();
      
      // 謝辞タブコンテンツが表示されるまで待機
      const acknowledgmentsTab = modal.locator('#acknowledgments-tab');
      await expect(acknowledgmentsTab).toBeVisible();
      
      // 外部リンクを取得
      const externalLinks = acknowledgmentsTab.locator('a[target="_blank"]');
      const linkCount = await externalLinks.count();
      
      // 少なくとも1つの外部リンクが存在することを確認
      expect(linkCount).toBeGreaterThan(0);
      
      // 各外部リンクの属性を確認
      for (let i = 0; i < linkCount; i++) {
        const link = externalLinks.nth(i);
        
        // target="_blank" が設定されていることを確認
        await expect(link).toHaveAttribute('target', '_blank');
        
        // rel="noopener noreferrer" が設定されていることを確認
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        
        // リンクテキストが存在することを確認
        const linkText = await link.textContent();
        expect(linkText).toBeTruthy();
        expect(linkText.trim().length).toBeGreaterThan(0);
      }
    });
    
    test('iframeに適切なtitle属性が設定されている', async ({ page }) => {
      // お問い合わせリンクをクリック
      await page.click('a[href="#contact"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#contact-modal');
      await expect(modal).toBeVisible();
      
      // iframe の title 属性を確認
      const iframe = modal.locator('iframe');
      await expect(iframe).toHaveAttribute('title', 'お問い合わせフォーム');
    });
    
    test('モーダルが開いているときbodyのスクロールが無効化される', async ({ page }) => {
      // 初期状態：bodyのoverflowを確認
      let bodyOverflow = await page.evaluate(() => {
        return window.getComputedStyle(document.body).overflow;
      });
      expect(bodyOverflow).not.toBe('hidden');
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // bodyのoverflowが'hidden'になることを確認
      bodyOverflow = await page.evaluate(() => {
        return window.getComputedStyle(document.body).overflow;
      });
      expect(bodyOverflow).toBe('hidden');
      
      // モーダルを閉じる
      await modal.locator('.footer-modal-close').click();
      await expect(modal).toBeHidden();
      
      // bodyのoverflowが元に戻ることを確認
      bodyOverflow = await page.evaluate(() => {
        return window.getComputedStyle(document.body).overflow;
      });
      expect(bodyOverflow).not.toBe('hidden');
    });
  });
  
  test.describe('複合的なアクセシビリティシナリオ', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });
    
    test('キーボードのみでモーダルを開いて閉じる', async ({ page }) => {
      // 使い方リンクにフォーカスを移動（Tabキーを複数回押す）
      await page.keyboard.press('Tab');
      
      // フッターリンクが見つかるまでTabキーを押す
      let focusedElement = await page.evaluate(() => document.activeElement.textContent);
      while (!focusedElement.includes('使い方')) {
        await page.keyboard.press('Tab');
        focusedElement = await page.evaluate(() => document.activeElement.textContent);
      }
      
      // Enterキーでモーダルを開く
      await page.keyboard.press('Enter');
      
      // モーダルが表示されることを確認
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // ESCキーでモーダルを閉じる
      await page.keyboard.press('Escape');
      
      // モーダルが閉じることを確認
      await expect(modal).toBeHidden();
    });
    
    test('複数のモーダルを順番に開いてもフォーカス管理が正しく機能する', async ({ page }) => {
      // 使い方モーダルを開く
      const usageLink = page.locator('a[href="#usage"]');
      await usageLink.click();
      
      let modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // 閉じる
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();
      await expect(usageLink).toBeFocused();
      
      // お問い合わせモーダルを開く
      const contactLink = page.locator('a[href="#contact"]');
      await contactLink.click();
      
      modal = page.locator('#contact-modal');
      await expect(modal).toBeVisible();
      
      // 閉じる
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();
      await expect(contactLink).toBeFocused();
    });
  });
});
