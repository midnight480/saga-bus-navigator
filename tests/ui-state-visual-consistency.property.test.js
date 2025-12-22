/**
 * UI状態視覚的一貫性のプロパティテスト
 * **Feature: multilingual-support, Property 8: UI状態の視覚的一貫性**
 * **Validates: Requirements 4.2**
 * 
 * プロパティ8: UI状態の視覚的一貫性
 * 任意の言語切り替え操作に対して、現在選択されている言語が視覚的に正しく示される
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// テスト用のDOM環境をセットアップ
import { JSDOM } from 'jsdom';

describe('UI状態視覚的一貫性のプロパティテスト', () => {
  let dom;
  let document;
  let window;
  let LanguageSwitcher;
  let TranslationManager;

  beforeEach(async () => {
    // JSDOM環境をセットアップ
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head><title>Test</title></head>
        <body>
          <div id="language-switcher"></div>
        </body>
      </html>
    `, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    document = dom.window.document;
    window = dom.window;
    
    // グローバルオブジェクトを設定
    global.document = document;
    global.window = window;
    global.HTMLElement = window.HTMLElement;
    global.Element = window.Element;

    // LanguageSwitcherクラスを動的にロード
    const languageSwitcherModule = await import('../js/i18n/language-switcher.js');
    LanguageSwitcher = languageSwitcherModule.default || window.LanguageSwitcher;

    // TranslationManagerクラスを動的にロード
    const translationManagerModule = await import('../js/i18n/translation-manager.js');
    TranslationManager = translationManagerModule.default || window.TranslationManager;
  });

  afterEach(() => {
    // グローバルオブジェクトをクリーンアップ
    delete global.document;
    delete global.window;
    delete global.HTMLElement;
    delete global.Element;
    
    if (dom) {
      dom.window.close();
    }
  });

  /**
   * サポートされている言語コードのジェネレーター
   */
  const supportedLanguageArb = fc.constantFrom('ja', 'en');

  /**
   * プロパティ8: UI状態の視覚的一貫性
   * 任意の言語切り替え操作に対して、現在選択されている言語が視覚的に正しく示される
   */
  it('プロパティ8: 任意の言語に対してUI状態が視覚的に一貫している', () => {
    fc.assert(
      fc.property(supportedLanguageArb, (languageCode) => {
        // テスト用のTranslationManagerモックを作成
        const mockTranslationManager = {
          getLanguage: vi.fn().mockReturnValue(languageCode),
          setLanguage: vi.fn().mockResolvedValue(undefined)
        };

        // コンテナ要素を取得
        const container = document.getElementById('language-switcher');
        expect(container).toBeTruthy();

        // LanguageSwitcherインスタンスを作成
        const languageSwitcher = new LanguageSwitcher(container, mockTranslationManager);

        // 言語情報を取得
        const expectedLanguage = languageSwitcher.supportedLanguages.find(
          lang => lang.code === languageCode
        );
        expect(expectedLanguage).toBeTruthy();

        // 初期レンダリング後の視覚的一貫性をチェック
        const isInitiallyConsistent = languageSwitcher.isVisuallyConsistent();
        expect(isInitiallyConsistent).toBe(true);

        // updateActiveState()を呼び出した後も一貫性が保たれるかチェック
        languageSwitcher.updateActiveState();
        const isConsistentAfterUpdate = languageSwitcher.isVisuallyConsistent();
        expect(isConsistentAfterUpdate).toBe(true);

        // ボタンのテキストに正しい言語情報が含まれているかチェック
        const button = container.querySelector('.language-dropdown-button');
        expect(button).toBeTruthy();
        
        const buttonText = button.textContent || button.innerText;
        expect(buttonText).toContain(expectedLanguage.flag);
        expect(buttonText).toContain(expectedLanguage.name);

        // aria-labelが正しく設定されているかチェック
        const ariaLabel = button.getAttribute('aria-label');
        expect(ariaLabel).toContain(expectedLanguage.name);

        // プルダウンオプションの選択状態が正しいかチェック
        const selectedOption = container.querySelector('.language-dropdown-menu li[aria-selected="true"]');
        expect(selectedOption).toBeTruthy();
        
        const selectedButton = selectedOption.querySelector('button');
        expect(selectedButton.dataset.locale).toBe(languageCode);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 言語切り替え後の視覚的一貫性テスト
   */
  it('言語切り替え後もUI状態が視覚的に一貫している', async () => {
    await fc.assert(
      fc.asyncProperty(
        supportedLanguageArb,
        supportedLanguageArb,
        async (initialLanguage, targetLanguage) => {
          // 初期言語でTranslationManagerモックを作成
          const mockTranslationManager = {
            getLanguage: vi.fn().mockReturnValue(initialLanguage),
            setLanguage: vi.fn().mockImplementation((locale) => {
              // setLanguageが呼ばれたらgetLanguageの戻り値を更新
              mockTranslationManager.getLanguage.mockReturnValue(locale);
              return Promise.resolve();
            })
          };

          const container = document.getElementById('language-switcher');
          const languageSwitcher = new LanguageSwitcher(container, mockTranslationManager);

          // 初期状態の一貫性をチェック
          expect(languageSwitcher.isVisuallyConsistent()).toBe(true);

          // 言語切り替えを実行
          await languageSwitcher.handleLanguageChange(targetLanguage);

          // 言語切り替え後の一貫性をチェック
          expect(languageSwitcher.isVisuallyConsistent()).toBe(true);

          // TranslationManagerのsetLanguageが正しく呼ばれたかチェック
          expect(mockTranslationManager.setLanguage).toHaveBeenCalledWith(targetLanguage);

          // 現在の言語が正しく更新されているかチェック
          expect(mockTranslationManager.getLanguage()).toBe(targetLanguage);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * ローディング状態での視覚的一貫性テスト
   */
  it('ローディング状態でも基本的な視覚的一貫性が保たれる', () => {
    fc.assert(
      fc.property(supportedLanguageArb, (languageCode) => {
        const mockTranslationManager = {
          getLanguage: vi.fn().mockReturnValue(languageCode),
          setLanguage: vi.fn().mockResolvedValue(undefined)
        };

        const container = document.getElementById('language-switcher');
        const languageSwitcher = new LanguageSwitcher(container, mockTranslationManager);

        // ローディング状態に設定
        languageSwitcher.setLoadingState(true);

        const button = container.querySelector('.language-dropdown-button');
        expect(button).toBeTruthy();

        // ローディング状態のクラスが設定されているかチェック
        expect(button.classList.contains('loading')).toBe(true);
        expect(button.disabled).toBe(true);

        // aria-labelがローディング状態を示しているかチェック
        const ariaLabel = button.getAttribute('aria-label');
        expect(ariaLabel).toContain('切り替え中');

        // ローディング状態を解除
        languageSwitcher.setLoadingState(false);

        // 通常状態に戻った後の一貫性をチェック
        expect(languageSwitcher.isVisuallyConsistent()).toBe(true);
        expect(button.classList.contains('loading')).toBe(false);
        expect(button.disabled).toBe(false);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * プルダウン開閉状態での視覚的一貫性テスト
   */
  it('プルダウン開閉状態でも視覚的一貫性が保たれる', () => {
    fc.assert(
      fc.property(supportedLanguageArb, (languageCode) => {
        const mockTranslationManager = {
          getLanguage: vi.fn().mockReturnValue(languageCode),
          setLanguage: vi.fn().mockResolvedValue(undefined)
        };

        const container = document.getElementById('language-switcher');
        const languageSwitcher = new LanguageSwitcher(container, mockTranslationManager);

        // 初期状態（閉じている）での一貫性をチェック
        expect(languageSwitcher.isVisuallyConsistent()).toBe(true);

        const dropdown = container.querySelector('.language-switcher-dropdown');
        const menu = container.querySelector('.language-dropdown-menu');

        // 初期状態の確認
        expect(dropdown.getAttribute('aria-expanded')).toBe('false');
        expect(menu.hidden).toBe(true);

        // プルダウンを開く
        languageSwitcher.openDropdown();

        // 開いた状態での一貫性をチェック
        expect(languageSwitcher.isVisuallyConsistent()).toBe(true);
        expect(dropdown.getAttribute('aria-expanded')).toBe('true');
        expect(menu.hidden).toBe(false);

        // プルダウンを閉じる
        languageSwitcher.closeDropdown();

        // 閉じた状態での一貫性をチェック
        expect(languageSwitcher.isVisuallyConsistent()).toBe(true);
        expect(dropdown.getAttribute('aria-expanded')).toBe('false');
        expect(menu.hidden).toBe(true);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});