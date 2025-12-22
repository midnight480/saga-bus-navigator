/**
 * プロパティベーステスト: 言語設定の永続化
 * 
 * 検証対象: 要件 1.3, 1.4
 * プロパティ2: 言語設定の永続化
 * 
 * 検証内容:
 * - 言語設定がローカルストレージに正しく保存される
 * - アプリケーション再起動後も選択された言語が維持される
 * - 無効な言語設定がフォールバックされる
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('プロパティテスト: 言語設定の永続化', () => {
  let LocaleStorage;
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
    
    // LocaleStorageを読み込み
    const localeStorageCode = fs.readFileSync(
      path.join(__dirname, '../js/i18n/locale-storage.js'),
      'utf-8'
    );
    eval(localeStorageCode);
    LocaleStorage = global.LocaleStorage;
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    if (global.localStorage && global.localStorage.clear) {
      global.localStorage.clear();
    }
  });

  it('プロパティ1: 言語設定がローカルストレージに正しく保存される', () => {
    // 日本語を設定
    LocaleStorage.setLanguage('ja');
    
    // ローカルストレージに保存されているか確認
    const savedLanguage = LocaleStorage.getLanguage();
    expect(savedLanguage).toBe('ja');
    
    // 英語に変更
    LocaleStorage.setLanguage('en');
    
    // ローカルストレージが更新されているか確認
    const updatedLanguage = LocaleStorage.getLanguage();
    expect(updatedLanguage).toBe('en');
  });

  it('プロパティ2: アプリケーション再起動後も選択された言語が維持される', () => {
    // 最初に英語を設定
    LocaleStorage.setLanguage('en');
    
    // ローカルストレージから直接読み込んで確認（再起動をシミュレート）
    const storedValue = global.localStorage.getItem(LocaleStorage.STORAGE_KEY);
    expect(storedValue).toBe('en');
    
    // LocaleStorage.getLanguage()で読み込んで確認
    const restoredLanguage = LocaleStorage.getLanguage();
    expect(restoredLanguage).toBe('en');
    
    // 日本語に変更して再度確認
    LocaleStorage.setLanguage('ja');
    const restoredLanguage2 = LocaleStorage.getLanguage();
    expect(restoredLanguage2).toBe('ja');
  });

  it('プロパティ3: 無効な言語設定がフォールバックされる', () => {
    // 無効な言語を直接ローカルストレージに設定
    global.localStorage.setItem(LocaleStorage.STORAGE_KEY, 'invalid');
    
    // getLanguage()がデフォルト言語を返すことを確認
    const language = LocaleStorage.getLanguage();
    expect(language).toBe(LocaleStorage.DEFAULT_LANGUAGE);
    expect(language).toBe('ja');
  });

  it('プロパティ4: 空の言語設定がフォールバックされる', () => {
    // 空文字列を設定
    global.localStorage.setItem(LocaleStorage.STORAGE_KEY, '');
    
    // デフォルト言語が返されることを確認
    const language = LocaleStorage.getLanguage();
    expect(language).toBe('ja');
  });

  it('プロパティ5: nullの言語設定がフォールバックされる', () => {
    // nullを設定
    global.localStorage.setItem(LocaleStorage.STORAGE_KEY, null);
    
    // デフォルト言語が返されることを確認
    const language = LocaleStorage.getLanguage();
    expect(language).toBe('ja');
  });

  it('プロパティ6: サポートされていない言語が拒否される', () => {
    // サポートされていない言語を設定しようとする
    LocaleStorage.setLanguage('fr');
    
    // ローカルストレージに保存されていないことを確認
    const storedValue = global.localStorage.getItem(LocaleStorage.STORAGE_KEY);
    expect(storedValue).not.toBe('fr');
    
    // デフォルト言語が返されることを確認
    const language = LocaleStorage.getLanguage();
    expect(language).toBe('ja');
  });

  it('プロパティ7: 複数回の言語切り替えでも永続化が正しく動作する', () => {
    const languages = ['ja', 'en'];
    
    // 10回ランダムに言語を切り替え
    for (let i = 0; i < 10; i++) {
      const selectedLanguage = languages[Math.floor(Math.random() * languages.length)];
      
      // 言語を設定
      LocaleStorage.setLanguage(selectedLanguage);
      
      // 即座に読み込んで確認
      const savedLanguage = LocaleStorage.getLanguage();
      expect(savedLanguage).toBe(selectedLanguage);
      
      // ローカルストレージから直接確認
      const storedValue = global.localStorage.getItem(LocaleStorage.STORAGE_KEY);
      expect(storedValue).toBe(selectedLanguage);
    }
  });

  it('プロパティ8: ローカルストレージが利用できない場合のフォールバック', () => {
    // ローカルストレージを無効化
    const originalGetItem = global.localStorage.getItem;
    global.localStorage.getItem = vi.fn(() => {
      throw new Error('localStorage is not available');
    });
    
    // デフォルト言語が返されることを確認
    const language = LocaleStorage.getLanguage();
    expect(language).toBe('ja');
    
    // 復元
    global.localStorage.getItem = originalGetItem;
  });

  it('プロパティ9: ローカルストレージへの保存が失敗した場合の処理', () => {
    // ローカルストレージのsetItemを無効化
    const originalSetItem = global.localStorage.setItem;
    global.localStorage.setItem = vi.fn(() => {
      throw new Error('localStorage is not available');
    });
    
    // エラーが発生しても例外がスローされないことを確認
    expect(() => {
      LocaleStorage.setLanguage('en');
    }).not.toThrow();
    
    // 復元
    global.localStorage.setItem = originalSetItem;
  });

  it('プロパティ10: デフォルト言語が正しく返される', () => {
    // ローカルストレージをクリア
    global.localStorage.clear();
    
    // デフォルト言語が返されることを確認
    const defaultLanguage = LocaleStorage.getDefaultLanguage();
    expect(defaultLanguage).toBe('ja');
    
    // getLanguage()もデフォルト言語を返すことを確認
    const language = LocaleStorage.getLanguage();
    expect(language).toBe('ja');
  });
});

