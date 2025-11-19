/**
 * ローディング画面タイムアウトのプロパティベーステスト
 * Feature: initial-loading-screen, Property 5: タイムアウト警告の表示
 * Feature: initial-loading-screen, Property 6: タイムアウトエラーの表示
 * Validates: Requirements 5.1, 5.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// LoadingScreenControllerクラスをインポート
const LoadingScreenController = require('../js/loading-screen-controller.js');

describe('ローディング画面タイムアウトのプロパティテスト', () => {
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
   * プロパティ 5: タイムアウト警告の表示
   * 任意のデータロード処理において、30秒経過した場合、警告メッセージが表示されるべきである
   */
  it('プロパティ 5: 30秒経過後に警告メッセージが表示される', () => {
    // タイマーをモック
    vi.useFakeTimers();

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // 任意の警告メッセージ
        (warningMessage) => {
          const warningCallback = vi.fn(() => {
            controller.updateProgress(warningMessage);
          });
          
          // タイムアウトタイマーを開始（30秒で警告）
          controller.startTimeout(30000, warningCallback);
          
          // 30秒経過前
          vi.advanceTimersByTime(29999);
          expect(warningCallback).not.toHaveBeenCalled();
          
          // 30秒経過後
          vi.advanceTimersByTime(1);
          expect(warningCallback).toHaveBeenCalledTimes(1);
          expect(mockLoadingMessage.textContent).toBe(warningMessage);
        }
      ),
      { numRuns: 100 }
    );

    vi.useRealTimers();
  });

  /**
   * プロパティ 6: タイムアウトエラーの表示
   * 任意のデータロード処理において、60秒経過した場合、タイムアウトエラーメッセージとリトライボタンが表示されるべきである
   */
  it('プロパティ 6: 60秒経過後にタイムアウトエラーが表示される', () => {
    // タイマーをモック
    vi.useFakeTimers();

    fc.assert(
      fc.property(
        fc.constant(null), // タイムアウトは外部入力に依存しない
        () => {
          // モックをリセット
          mockLoadingError.removeAttribute.mockClear();
          mockErrorMessage.textContent = '';
          mockRetryButton.onclick = null;
          
          const warningCallback = vi.fn();
          
          // タイムアウトタイマーを開始（30秒で警告、60秒でエラー）
          controller.startTimeout(30000, warningCallback);
          
          // 60秒経過前
          vi.advanceTimersByTime(59999);
          expect(mockLoadingError.removeAttribute).not.toHaveBeenCalled();
          
          // 60秒経過後
          vi.advanceTimersByTime(1);
          
          // エラーメッセージが表示されることを検証
          expect(mockErrorMessage.textContent).toContain('タイムアウト');
          expect(mockLoadingError.removeAttribute).toHaveBeenCalledWith('hidden');
          
          // リトライボタンが設定されることを検証
          expect(mockRetryButton.onclick).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );

    vi.useRealTimers();
  });
});
