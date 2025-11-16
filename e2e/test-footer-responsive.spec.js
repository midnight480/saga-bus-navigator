/**
 * フッターページのレスポンシブデザイン検証テスト
 * 
 * 要件:
 * - 6.1: 画面幅768px未満でモーダルが全画面表示される
 * - 6.2: タブがスクロール可能である
 * - 6.3: 画面幅768px以上でモーダルが中央配置され、最大幅800pxが適用される
 */

import { test, expect } from '@playwright/test';

test.describe('フッターページ - レスポンシブデザイン', () => {
  
  test.describe('5.1 モバイル表示の確認', () => {
    
    test.beforeEach(async ({ page }) => {
      // モバイルビューポートを設定（iPhone SE サイズ）
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });
    
    test('画面幅768px未満でモーダルが全画面表示される', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // モーダルコンテンツの要素を取得（使い方モーダル内のみ）
      const modalContent = modal.locator('.footer-modal-content');
      await expect(modalContent).toBeVisible();
      
      // モーダルコンテンツのサイズを取得
      const boundingBox = await modalContent.boundingBox();
      expect(boundingBox).not.toBeNull();
      
      // 全画面表示の確認（幅が100%、高さが100vh）
      const viewportSize = page.viewportSize();
      expect(boundingBox.width).toBeCloseTo(viewportSize.width, 1);
      expect(boundingBox.height).toBeCloseTo(viewportSize.height, 1);
      
      // border-radiusが0であることを確認（全画面表示の特徴）
      const borderRadius = await modalContent.evaluate((el) => {
        return window.getComputedStyle(el).borderRadius;
      });
      expect(borderRadius).toBe('0px');
    });
    
    test('タブがスクロール可能であることを確認', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // タブナビゲーション要素を取得
      const tabsContainer = modal.locator('.footer-modal-tabs');
      await expect(tabsContainer).toBeVisible();
      
      // overflow-x が auto であることを確認
      const overflowX = await tabsContainer.evaluate((el) => {
        return window.getComputedStyle(el).overflowX;
      });
      expect(overflowX).toBe('auto');
      
      // タブボタンが横並びで表示されることを確認
      const tabButtons = modal.locator('.footer-tab-button');
      const tabCount = await tabButtons.count();
      expect(tabCount).toBe(3); // 使い方、謝辞、利用規約
      
      // 各タブボタンの flex プロパティを確認
      const firstTabFlex = await tabButtons.first().evaluate((el) => {
        return window.getComputedStyle(el).flex;
      });
      // flex: 0 0 auto が設定されていることを確認
      expect(firstTabFlex).toContain('0 0 auto');
      
      // タブボタンの最小幅が設定されていることを確認
      const minWidth = await tabButtons.first().evaluate((el) => {
        return window.getComputedStyle(el).minWidth;
      });
      expect(parseInt(minWidth)).toBeGreaterThanOrEqual(100);
    });
    
    test('モバイルで適切なフォントサイズが適用される', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // タイトルのフォントサイズを確認
      const titleFontSize = await modal.locator('.footer-modal-title').evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });
      expect(parseFloat(titleFontSize)).toBeLessThanOrEqual(20); // 1.25rem = 20px
      
      // タブボタンのフォントサイズを確認
      const tabButtonFontSize = await modal.locator('.footer-tab-button').first().evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });
      expect(parseFloat(tabButtonFontSize)).toBeLessThanOrEqual(14); // 0.875rem = 14px
    });
    
    test('モバイルで適切なパディングが適用される', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // モーダルボディのパディングを確認
      const bodyPadding = await modal.locator('.footer-modal-body').evaluate((el) => {
        return window.getComputedStyle(el).padding;
      });
      // 1.25rem = 20px
      expect(bodyPadding).toContain('20px');
    });
    
    test('異なるモバイルサイズでも全画面表示される', async ({ page }) => {
      // 小さいモバイル（iPhone SE）
      await page.setViewportSize({ width: 320, height: 568 });
      await page.click('a[href="#usage"]');
      
      let modal = page.locator('#usage-modal');
      let modalContent = modal.locator('.footer-modal-content');
      await expect(modalContent).toBeVisible();
      
      let boundingBox = await modalContent.boundingBox();
      let viewportSize = page.viewportSize();
      expect(boundingBox.width).toBeCloseTo(viewportSize.width, 1);
      
      // モーダルを閉じる
      await modal.locator('.footer-modal-close').click();
      await expect(modal).toBeHidden();
      
      // 大きいモバイル（iPhone 14 Pro Max）
      await page.setViewportSize({ width: 430, height: 932 });
      await page.click('a[href="#usage"]');
      
      await expect(modalContent).toBeVisible();
      
      boundingBox = await modalContent.boundingBox();
      viewportSize = page.viewportSize();
      expect(boundingBox.width).toBeCloseTo(viewportSize.width, 1);
    });
  });
  
  test.describe('5.2 タブレット・PC表示の確認', () => {
    
    test.beforeEach(async ({ page }) => {
      // タブレットビューポートを設定（iPad サイズ）
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });
    
    test('画面幅768px以上でモーダルが中央配置される', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // モーダルコンテナの display と align-items を確認
      const modalDisplay = await modal.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          alignItems: styles.alignItems,
          justifyContent: styles.justifyContent
        };
      });
      
      expect(modalDisplay.display).toBe('flex');
      expect(modalDisplay.alignItems).toBe('center');
      expect(modalDisplay.justifyContent).toBe('center');
      
      // モーダルコンテンツが中央に配置されていることを確認
      const modalContent = modal.locator('.footer-modal-content');
      const boundingBox = await modalContent.boundingBox();
      const viewportSize = page.viewportSize();
      
      // 左右の余白がほぼ等しいことを確認（中央配置）
      const leftMargin = boundingBox.x;
      const rightMargin = viewportSize.width - (boundingBox.x + boundingBox.width);
      expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(20); // 誤差20px以内
    });
    
    test('最大幅800pxが適用される', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // モーダルコンテンツの幅を確認
      const modalContent = modal.locator('.footer-modal-content');
      const boundingBox = await modalContent.boundingBox();
      
      // 最大幅800pxが適用されていることを確認
      expect(boundingBox.width).toBeLessThanOrEqual(800);
      
      // max-width スタイルを確認
      const maxWidth = await modalContent.evaluate((el) => {
        return window.getComputedStyle(el).maxWidth;
      });
      expect(maxWidth).toBe('800px');
    });
    
    test('border-radiusが適用される（全画面表示ではない）', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // モーダルコンテンツの border-radius を確認
      const modalContent = modal.locator('.footer-modal-content');
      const borderRadius = await modalContent.evaluate((el) => {
        return window.getComputedStyle(el).borderRadius;
      });
      
      // border-radius が 8px であることを確認
      expect(borderRadius).toBe('8px');
    });
    
    test('大きいデスクトップでも最大幅800pxが維持される', async ({ page }) => {
      // デスクトップビューポートを設定（1920x1080）
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // モーダルコンテンツの幅を確認
      const modalContent = modal.locator('.footer-modal-content');
      const boundingBox = await modalContent.boundingBox();
      
      // 最大幅800pxが維持されていることを確認
      expect(boundingBox.width).toBeLessThanOrEqual(800);
      
      // 中央配置されていることを確認
      const viewportSize = page.viewportSize();
      const leftMargin = boundingBox.x;
      const rightMargin = viewportSize.width - (boundingBox.x + boundingBox.width);
      expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(20);
    });
    
    test('タブレット・PCで適切なパディングが適用される', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // モーダルボディのパディングを確認
      const bodyPadding = await modal.locator('.footer-modal-body').evaluate((el) => {
        return window.getComputedStyle(el).padding;
      });
      // 2rem = 32px
      expect(bodyPadding).toContain('32px');
    });
    
    test('タブレット・PCでタブが横並びで表示される', async ({ page }) => {
      // 使い方リンクをクリック
      await page.click('a[href="#usage"]');
      
      // モーダルが表示されるまで待機
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      // タブボタンの flex プロパティを確認
      const tabButtons = modal.locator('.footer-tab-button');
      const firstTabFlex = await tabButtons.first().evaluate((el) => {
        return window.getComputedStyle(el).flex;
      });
      
      // flex: 1 が設定されていることを確認（均等配置）
      expect(firstTabFlex).toContain('1 1');
    });
  });
  
  test.describe('ブレークポイント境界のテスト', () => {
    
    test('767pxでモバイルスタイルが適用される', async ({ page }) => {
      await page.setViewportSize({ width: 767, height: 1024 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.click('a[href="#usage"]');
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      const modalContent = modal.locator('.footer-modal-content');
      const borderRadius = await modalContent.evaluate((el) => {
        return window.getComputedStyle(el).borderRadius;
      });
      
      // モバイルスタイル（border-radius: 0）
      expect(borderRadius).toBe('0px');
    });
    
    test('768pxでタブレットスタイルが適用される', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.click('a[href="#usage"]');
      const modal = page.locator('#usage-modal');
      await expect(modal).toBeVisible();
      
      const modalContent = modal.locator('.footer-modal-content');
      const borderRadius = await modalContent.evaluate((el) => {
        return window.getComputedStyle(el).borderRadius;
      });
      
      // タブレットスタイル（border-radius: 8px）
      expect(borderRadius).toBe('8px');
    });
  });
  
  test.describe('お問い合わせモーダルのレスポンシブ', () => {
    
    test('モバイルでお問い合わせモーダルが全画面表示される', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.click('a[href="#contact"]');
      
      const modal = page.locator('#contact-modal');
      await expect(modal).toBeVisible();
      
      const modalContent = modal.locator('.footer-modal-content');
      const boundingBox = await modalContent.boundingBox();
      const viewportSize = page.viewportSize();
      
      expect(boundingBox.width).toBeCloseTo(viewportSize.width, 1);
    });
    
    test('タブレット・PCでお問い合わせモーダルが中央配置される', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.click('a[href="#contact"]');
      
      const modal = page.locator('#contact-modal');
      await expect(modal).toBeVisible();
      
      const modalContent = modal.locator('.footer-modal-content');
      const boundingBox = await modalContent.boundingBox();
      
      // 最大幅800px
      expect(boundingBox.width).toBeLessThanOrEqual(800);
      
      // 中央配置
      const viewportSize = page.viewportSize();
      const leftMargin = boundingBox.x;
      const rightMargin = viewportSize.width - (boundingBox.x + boundingBox.width);
      expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(20);
    });
  });
});
