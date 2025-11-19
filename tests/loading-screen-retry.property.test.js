/**
 * ローディング画面リトライ機能のプロパティベーステスト
 * Feature: initial-loading-screen, Property 7: リトライ機能の動作
 * Validates: Requirements 5.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// LoadingScreenControllerクラスをインポート
const LoadingScreenController = require('../js/loading-screen-controller.js');

describe('ローディング画面リトライ機能のプロパティテスト', () => {
  let controller;
  let mockLoadingScreen;
  let mockLoadingMessage;
  let mockLoadingError;
  let mockErrorMessage;
  let mockRetryButton;

  beforeEach(() => {
    // DOM要素をモック
    mockLoadingMessage = {
      textContent: ''
    };

    mockErrorMessage = {
      textContent: ''
    };

    mockRetryButton = {
      onclick: null,
      focus: vi.fn()
    };

    mockLoadingError = {
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
      hasAttribute: vi.fn(() => true),
      querySelector: vi.fn((selector) => {
        if (selector === '.error-message') return mockErrorMessage;
        if (selector === '.retry-button') return mockRetryButton;
        return null;
      })
    };

    mockLoadingScreen = {
      style: { display: '' },
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(() => false)
      },
      querySelector: vi.fn((selector) => {
        if (selector === '.loading-message') return mockLoadingMessage;
        if (selector === '.loading-error') return mockLoadingError;
        return null;
      }),
      querySelectorAll: vi.fn(() => [])
    };

    // グローバルdocumentをモック
    global.document = {
      getElementById: vi.fn((id) => {
        if (id === 'loading-screen') return mockLoadingScreen;
        return null;
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      activeElement: null
    };

    // コントローラーを初期化
    controller = new LoadingScreenController();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  /**
   * プロパティ 7: リトライ機能の動作
   * 任意のエラー状態において、リトライボタンをクリックした場合、データロード処理が再実行されるべきである
   */
  it('プロパティ 7: リトライボタンクリック時にデータロード処理が再実行される', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // 任意のエラーメッセージ
        (errorMessage) => {
          const retryCallback = vi.fn();
          
          // エラーを表示
          controller.showError(errorMessage, retryCallback);
          
          // エラーメッセージが表示されることを確認
          expect(mockErrorMessage.textContent).toBe(errorMessage);
          expect(mockLoadingError.removeAttribute).toHaveBeenCalledWith('hidden');
          
          // リトライボタンがクリック可能であることを確認
          expect(mockRetryButton.onclick).toBeDefined();
          expect(typeof mockRetryButton.onclick).toBe('function');
          
          // リトライボタンをクリック
          mockRetryButton.onclick();
          
          // リトライコールバックが実行されることを検証
          expect(retryCallback).toHaveBeenCalledTimes(1);
          
          // エラー表示が非表示になることを検証
          expect(mockLoadingError.setAttribute).toHaveBeenCalledWith('hidden', '');
          
          // ローディング画面が再表示されることを検証
          expect(mockLoadingScreen.style.display).toBe('flex');
        }
      ),
      { numRuns: 100 }
    );
  });
});
