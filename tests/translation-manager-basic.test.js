/**
 * TranslationManagerの基本機能テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('TranslationManager 基本機能テスト', () => {
  let TranslationManager;
  let LocaleStorage;
  let originalFetch;

  beforeEach(async () => {
    // ファイルを直接読み込み
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // グローバル環境をセットアップ
    global.localStorage = {
      getItem: vi.fn(() => 'ja'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    global.document = {
      createElement: vi.fn(() => {
        const element = {
          textContent: '',
          innerHTML: ''
        };
        // textContentが設定されたときにinnerHTMLを更新
        Object.defineProperty(element, 'textContent', {
          get() { return this._textContent || ''; },
          set(value) { 
            this._textContent = value;
            this.innerHTML = value; // 簡易的なエスケープなし
          }
        });
        return element;
      }),
      dispatchEvent: vi.fn()
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
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('TranslationManagerクラスが正しく定義されている', () => {
    expect(TranslationManager).toBeDefined();
    expect(typeof TranslationManager).toBe('function');
  });

  it('LocaleStorageクラスが正しく定義されている', () => {
    expect(LocaleStorage).toBeDefined();
    expect(typeof LocaleStorage).toBe('function');
  });

  it('TranslationManagerのインスタンスが作成できる', () => {
    // fetchをモック化
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        app: { title: 'テストアプリ' }
      })
    });

    const manager = new TranslationManager();
    expect(manager).toBeInstanceOf(TranslationManager);
    expect(manager.getLanguage()).toBe('ja');
  });

  it('翻訳キーが正しく解決される', async () => {
    // 翻訳データをモック化
    const translationData = {
      app: {
        title: 'テストアプリ',
        subtitle: 'サブタイトル'
      },
      search: {
        departure_stop: '乗車バス停'
      }
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(translationData)
    });

    const manager = new TranslationManager();
    await manager.setLanguage('ja');

    expect(manager.translate('app.title')).toBe('テストアプリ');
    expect(manager.translate('app.subtitle')).toBe('サブタイトル');
    expect(manager.translate('search.departure_stop')).toBe('乗車バス停');
  });

  it('存在しない翻訳キーの場合はキー名が返される', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        app: { title: 'テストアプリ' }
      })
    });

    const manager = new TranslationManager();
    await manager.setLanguage('ja');

    expect(manager.translate('nonexistent.key')).toBe('nonexistent.key');
  });

  it('パラメータ置換が正しく動作する', async () => {
    const translationData = {
      message: {
        greeting: 'こんにちは、{{name}}さん'
      }
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(translationData)
    });

    const manager = new TranslationManager();
    await manager.setLanguage('ja');

    const result = manager.translate('message.greeting', { name: '太郎' });
    expect(result).toBe('こんにちは、太郎さん');
  });
});