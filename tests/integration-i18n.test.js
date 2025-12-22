/**
 * 統合テスト: 多言語対応機能
 * 
 * 検証内容:
 * - 言語切り替え後のページ全体翻訳更新
 * - バス停検索結果の多言語表示
 * - 時刻表モーダルの多言語表示
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('統合テスト: 多言語対応機能', () => {
  let TranslationManager;
  let LocaleStorage;
  let LanguageSwitcher;
  let BusStopTranslator;
  let originalLocalStorage;
  let originalFetch;

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
    
    // fetchのモック
    originalFetch = global.fetch;
    global.fetch = vi.fn((url) => {
      if (url.includes('/js/translations/ja.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            app: { title: '佐賀バスナビ', subtitle: '時刻表検索' },
            search: { departure_stop: '乗車バス停', arrival_stop: '降車バス停' },
            results: { title: '検索結果', departure: '出発', arrival: '到着' }
          })
        });
      } else if (url.includes('/js/translations/en.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            app: { title: 'Saga Bus Navigator', subtitle: 'Timetable Search' },
            search: { departure_stop: 'Departure Stop', arrival_stop: 'Arrival Stop' },
            results: { title: 'Search Results', departure: 'Departure', arrival: 'Arrival' }
          })
        });
      }
      return Promise.reject(new Error('Not found'));
    });
    
    // DOMのモック
    global.document = {
      querySelectorAll: vi.fn(() => []),
      getElementById: vi.fn(() => null),
      createElement: vi.fn((tag) => ({
        tagName: tag,
        textContent: '',
        setAttribute: vi.fn(),
        getAttribute: vi.fn(),
        appendChild: vi.fn(),
        style: {},
        classList: { add: vi.fn(), remove: vi.fn() }
      }))
    };
    
    // クラスを読み込み
    const localeStorageCode = fs.readFileSync(
      path.join(__dirname, '../js/i18n/locale-storage.js'),
      'utf-8'
    );
    eval(localeStorageCode);
    LocaleStorage = global.LocaleStorage;
    
    const translationManagerCode = fs.readFileSync(
      path.join(__dirname, '../js/i18n/translation-manager.js'),
      'utf-8'
    );
    eval(translationManagerCode);
    TranslationManager = global.TranslationManager;
    
    const busStopTranslatorCode = fs.readFileSync(
      path.join(__dirname, '../js/i18n/bus-stop-translator.js'),
      'utf-8'
    );
    eval(busStopTranslatorCode);
    BusStopTranslator = global.BusStopTranslator;
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    global.fetch = originalFetch;
    delete global.document;
  });

  it('統合テスト1: 言語切り替え後のページ全体翻訳更新', async () => {
    // TranslationManagerの初期化
    const translationManager = new TranslationManager();
    await translationManager.setLanguage('ja');
    
    // 日本語での翻訳を確認
    expect(translationManager.translate('app.title')).toBe('佐賀バスナビ');
    
    // 英語に切り替え
    await translationManager.setLanguage('en');
    
    // 英語での翻訳を確認
    expect(translationManager.translate('app.title')).toBe('Saga Bus Navigator');
    
    // 現在の言語が英語であることを確認
    expect(translationManager.getLanguage()).toBe('en');
  });

  it('統合テスト2: バス停検索結果の多言語表示', async () => {
    // BusStopTranslatorの初期化
    const mappingData = [
      { japanese: '佐賀駅', english: 'Saga Station', source: 'Mapped' }
    ];
    const busStopTranslator = new BusStopTranslator(mappingData);
    
    // TranslationManagerの初期化（BusStopTranslatorを設定）
    const translationManager = new TranslationManager(busStopTranslator);
    await translationManager.setLanguage('ja');
    
    // 日本語では元の名前を返す
    expect(translationManager.translateBusStop('佐賀駅')).toBe('佐賀駅');
    
    // 英語に切り替え
    await translationManager.setLanguage('en');
    
    // 英語では翻訳された名前を返す
    expect(translationManager.translateBusStop('佐賀駅')).toBe('Saga Station');
  });

  it('統合テスト3: 時刻表モーダルの多言語表示', async () => {
    // TranslationManagerの初期化
    const translationManager = new TranslationManager();
    await translationManager.setLanguage('ja');
    
    // 日本語での翻訳を確認
    expect(translationManager.translate('modal.timetable_title')).toBe('時刻表');
    expect(translationManager.translate('timetable.weekday')).toBe('平日');
    
    // 英語に切り替え
    await translationManager.setLanguage('en');
    
    // 英語での翻訳を確認
    expect(translationManager.translate('modal.timetable_title')).toBe('Timetable');
    expect(translationManager.translate('timetable.weekday')).toBe('Weekday');
  });

  it('統合テスト4: 言語設定の永続化と復元', async () => {
    // 英語を設定
    LocaleStorage.setLanguage('en');
    
    // ローカルストレージに保存されていることを確認
    expect(global.localStorage.getItem(LocaleStorage.STORAGE_KEY)).toBe('en');
    
    // 復元をシミュレート
    const restoredLanguage = LocaleStorage.getLanguage();
    expect(restoredLanguage).toBe('en');
    
    // TranslationManagerで復元された言語を使用
    const translationManager = new TranslationManager();
    await translationManager.setLanguage(restoredLanguage);
    
    // 英語での翻訳を確認
    expect(translationManager.translate('app.title')).toBe('Saga Bus Navigator');
  });

  it('統合テスト5: エラーメッセージの多言語対応', async () => {
    // TranslationManagerの初期化
    const translationManager = new TranslationManager();
    await translationManager.setLanguage('ja');
    
    // 日本語でのエラーメッセージを確認
    expect(translationManager.translate('error.select_stops')).toBe('乗車・降車バス停を選択してください');
    
    // 英語に切り替え
    await translationManager.setLanguage('en');
    
    // 英語でのエラーメッセージを確認
    expect(translationManager.translate('error.select_stops')).toBe('Please select departure and arrival stops');
  });

  it('統合テスト6: 検索結果ラベルの多言語対応', async () => {
    // TranslationManagerの初期化
    const translationManager = new TranslationManager();
    await translationManager.setLanguage('ja');
    
    // 日本語でのラベルを確認
    expect(translationManager.translate('results.departure')).toBe('出発');
    expect(translationManager.translate('results.arrival')).toBe('到着');
    expect(translationManager.translate('results.fare')).toBe('運賃');
    
    // 英語に切り替え
    await translationManager.setLanguage('en');
    
    // 英語でのラベルを確認
    expect(translationManager.translate('results.departure')).toBe('Departure');
    expect(translationManager.translate('results.arrival')).toBe('Arrival');
    expect(translationManager.translate('results.fare')).toBe('Fare');
  });
});

