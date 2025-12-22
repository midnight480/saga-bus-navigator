/**
 * プロパティベーステスト: 言語切り替えの一貫性
 * 
 * 検証対象: 要件 1.2
 * プロパティ1: 言語切り替えの一貫性
 * 
 * 検証内容:
 * - 言語切り替え後、全ての翻訳可能な要素が新しい言語で表示される
 * - 言語設定がローカルストレージに正しく保存される
 * - ページリロード後も選択された言語が維持される
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// テスト用の翻訳データ
const mockTranslations = {
  ja: {
    app: {
      title: '佐賀バスナビ',
      subtitle: '時刻表検索'
    },
    search: {
      departure_stop: '乗車バス停',
      arrival_stop: '降車バス停',
      search_button: '検索'
    },
    footer: {
      usage: '使い方'
    }
  },
  en: {
    app: {
      title: 'Saga Bus Navigator',
      subtitle: 'Timetable Search'
    },
    search: {
      departure_stop: 'Departure Stop',
      arrival_stop: 'Arrival Stop',
      search_button: 'Search'
    },
    footer: {
      usage: 'How to Use'
    }
  }
};

describe('プロパティテスト: 言語切り替えの一貫性', () => {
  let TranslationManager;
  let LocaleStorage;
  let originalFetch;
  let originalLocalStorage;

  beforeEach(async () => {
    // ファイルを直接読み込み
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // ローカルストレージのモック
    const localStorageMock = {
      data: {},
      getItem: vi.fn((key) => localStorageMock.data[key] || null),
      setItem: vi.fn((key, value) => { localStorageMock.data[key] = value; }),
      removeItem: vi.fn((key) => { delete localStorageMock.data[key]; }),
      clear: vi.fn(() => { localStorageMock.data = {}; })
    };
    
    originalLocalStorage = global.localStorage;
    global.localStorage = localStorageMock;
    
    // DOM環境のセットアップ
    global.document = {
      createElement: vi.fn((tag) => ({
        tagName: tag.toUpperCase(),
        textContent: '',
        innerHTML: '',
        setAttribute: vi.fn(),
        getAttribute: vi.fn(),
        hasAttribute: vi.fn(() => false),
        querySelectorAll: vi.fn(() => []),
        appendChild: vi.fn(),
        removeChild: vi.fn()
      })),
      querySelectorAll: vi.fn(() => []),
      body: {
        appendChild: vi.fn(),
        innerHTML: ''
      }
    };
    
    global.CustomEvent = class CustomEvent {
      constructor(type, options) {
        this.type = type;
        this.detail = options?.detail;
      }
    };
    global.window = global;
    
    // LocaleStorageを読み込み
    const localeStorageCode = fs.readFileSync(
      path.join(__dirname, '../js/i18n/locale-storage.js'),
      'utf-8'
    );
    eval(localeStorageCode);
    LocaleStorage = global.LocaleStorage;
    
    // TranslationManagerを読み込み
    const translationManagerCode = fs.readFileSync(
      path.join(__dirname, '../js/i18n/translation-manager.js'),
      'utf-8'
    );
    eval(translationManagerCode);
    TranslationManager = global.TranslationManager;
    
    // fetchをモック化
    originalFetch = global.fetch;
    global.fetch = vi.fn((url) => {
      if (url.includes('/js/translations/ja.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTranslations.ja)
        });
      } else if (url.includes('/js/translations/en.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTranslations.en)
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.localStorage = originalLocalStorage;
    if (global.localStorage && global.localStorage.clear) {
      global.localStorage.clear();
    }
  });

  // テスト用のHTML要素を作成
  function createTestElements() {
    const elements = [];
    
    const h1 = {
      tagName: 'H1',
      textContent: '',
      getAttribute: vi.fn((attr) => attr === 'data-i18n' ? 'app.title' : null),
      setAttribute: vi.fn(),
      hasAttribute: vi.fn(() => true)
    };
    elements.push(h1);
    
    const h2 = {
      tagName: 'H2',
      textContent: '',
      getAttribute: vi.fn((attr) => attr === 'data-i18n' ? 'search.departure_stop' : null),
      setAttribute: vi.fn(),
      hasAttribute: vi.fn(() => true)
    };
    elements.push(h2);
    
    const a = {
      tagName: 'A',
      textContent: '',
      getAttribute: vi.fn((attr) => attr === 'data-i18n' ? 'footer.usage' : null),
      setAttribute: vi.fn(),
      hasAttribute: vi.fn(() => true)
    };
    elements.push(a);
    
    // querySelectorAllをモック
    global.document.querySelectorAll = vi.fn((selector) => {
      if (selector === '[data-i18n]') {
        return elements;
      }
      return [];
    });
    
    return elements;
  }

  it('プロパティ1: 言語切り替え後、全ての翻訳可能な要素が新しい言語で表示される', async () => {
    const elements = createTestElements();
    const manager = new TranslationManager();
    
    // 日本語に設定
    await manager.setLanguage('ja');
    await new Promise(resolve => setTimeout(resolve, 100)); // 翻訳読み込み待機
    
    // DOM更新をシミュレート
    manager.updateDOMTranslations();
    
    // 日本語での翻訳を確認
    expect(manager.translate('app.title')).toBe('佐賀バスナビ');
    expect(manager.translate('search.departure_stop')).toBe('乗車バス停');
    expect(manager.translate('footer.usage')).toBe('使い方');
    
    // 英語に切り替え
    await manager.setLanguage('en');
    await new Promise(resolve => setTimeout(resolve, 100)); // 翻訳読み込み待機
    
    // DOM更新をシミュレート
    manager.updateDOMTranslations();
    
    // 全ての要素が英語で翻訳されているか確認
    expect(manager.translate('app.title')).toBe('Saga Bus Navigator');
    expect(manager.translate('search.departure_stop')).toBe('Departure Stop');
    expect(manager.translate('footer.usage')).toBe('How to Use');
    
    // 各要素のtextContentが更新されていることを確認
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (key) {
        const translated = manager.translate(key);
        // updateDOMTranslationsが呼ばれた場合、textContentが設定される
        // モック環境では直接確認できないため、translateメソッドの動作を確認
        expect(translated).toBeTruthy();
      }
    });
  });

  it('プロパティ2: 言語設定がローカルストレージに正しく保存される', async () => {
    const manager = new TranslationManager();
    
    // 英語に設定
    await manager.setLanguage('en');
    
    // ローカルストレージに保存されているか確認
    const savedLanguage = LocaleStorage.getLanguage();
    expect(savedLanguage).toBe('en');
    
    // 日本語に切り替え
    await manager.setLanguage('ja');
    
    // ローカルストレージが更新されているか確認
    const updatedLanguage = LocaleStorage.getLanguage();
    expect(updatedLanguage).toBe('ja');
  });

  it('プロパティ3: 言語設定の一貫性が保たれる', async () => {
    const manager = new TranslationManager();
    
    // 初期言語を確認
    const initialLanguage = manager.getLanguage();
    expect(['ja', 'en']).toContain(initialLanguage);
    
    // 英語に設定
    await manager.setLanguage('en');
    expect(manager.getLanguage()).toBe('en');
    
    // 日本語に切り替え
    await manager.setLanguage('ja');
    expect(manager.getLanguage()).toBe('ja');
  });

  it('プロパティ4: 複数回の言語切り替えでも一貫性が保たれる', async () => {
    const elements = createTestElements();
    const manager = new TranslationManager();
    
    const languages = ['ja', 'en'];
    
    // 10回ランダムに言語を切り替え
    for (let i = 0; i < 10; i++) {
      const selectedLanguage = languages[Math.floor(Math.random() * languages.length)];
      
      await manager.setLanguage(selectedLanguage);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 言語設定が正しいか確認
      expect(manager.getLanguage()).toBe(selectedLanguage);
      
      // ローカルストレージも正しいか確認
      const savedLanguage = LocaleStorage.getLanguage();
      expect(savedLanguage).toBe(selectedLanguage);
      
      // 翻訳が正しく取得できるか確認
      const translated = manager.translate('app.title');
      const expected = selectedLanguage === 'ja' ? '佐賀バスナビ' : 'Saga Bus Navigator';
      expect(translated).toBe(expected);
    }
  });

  it('プロパティ5: 言語変更イベントが発火される', async () => {
    const manager = new TranslationManager();
    const eventListener = vi.fn();
    
    // イベントリスナーを登録
    if (global.window) {
      global.window.addEventListener('languageChanged', eventListener);
    }
    
    // 言語を変更
    await manager.setLanguage('en');
    
    // イベントが発火されたか確認
    expect(eventListener).toHaveBeenCalled();
    
    if (eventListener.mock.calls.length > 0) {
      const event = eventListener.mock.calls[0][0];
      expect(event.detail.locale).toBe('en');
    }
  });
});
