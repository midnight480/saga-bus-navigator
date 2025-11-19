/**
 * ローディング画面統合のプロパティベーステスト
 * Feature: initial-loading-screen, Property 1: ローディング画面の即座表示
 * Validates: Requirements 1.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// LoadingScreenControllerクラスをインポート
const LoadingScreenController = require('../js/loading-screen-controller.js');

describe('ローディング画面統合のプロパティテスト', () => {
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
   * プロパティ 1: ローディング画面の即座表示
   * 任意のアプリケーション起動時において、ローディング画面はDOM読み込み完了後、即座に表示されるべきである
   */
  it('プロパティ 1: アプリケーション起動時にローディング画面が即座に表示される', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // アプリケーション起動は外部入力に依存しない
        () => {
          // show()を呼び出す
          controller.show();
          
          // ローディング画面が表示されていることを検証
          expect(mockLoadingScreen.style.display).toBe('flex');
          expect(mockLoadingScreen.classList.remove).toHaveBeenCalledWith('fade-out');
          
          // エラー表示が非表示であることを検証
          expect(mockLoadingError.setAttribute).toHaveBeenCalledWith('hidden', '');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ 2: データロード完了時の非表示
   * 任意のデータロード処理において、DataLoader.loadAllData()が正常に完了した場合、ローディング画面は非表示になるべきである
   */
  it('プロパティ 2: データロード完了時にローディング画面が非表示になる', () => {
    // タイマーをモック
    vi.useFakeTimers();

    fc.assert(
      fc.property(
        fc.constant(null), // データロード完了は外部入力に依存しない
        () => {
          // show()を呼び出してローディング画面を表示
          controller.show();
          expect(mockLoadingScreen.style.display).toBe('flex');
          
          // hide()を呼び出してローディング画面を非表示
          controller.hide();
          
          // fade-outクラスが追加されることを検証
          expect(mockLoadingScreen.classList.add).toHaveBeenCalledWith('fade-out');
          
          // 300ms経過後にdisplayがnoneになることを検証
          vi.advanceTimersByTime(300);
          expect(mockLoadingScreen.style.display).toBe('none');
        }
      ),
      { numRuns: 100 }
    );

    vi.useRealTimers();
  });

  /**
   * プロパティ 3: エラー時のエラー表示
   * 任意のデータロード処理において、DataLoader.loadAllData()がエラーをスローした場合、
   * ローディング画面上にエラーメッセージとリトライボタンが表示されるべきである
   */
  it('プロパティ 3: エラー時にエラーメッセージとリトライボタンが表示される', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // 任意のエラーメッセージ
        (errorMessage) => {
          const retryCallback = vi.fn();
          
          // showError()を呼び出す
          controller.showError(errorMessage, retryCallback);
          
          // エラーメッセージが表示されることを検証
          expect(mockErrorMessage.textContent).toBe(errorMessage);
          
          // エラー表示が表示されることを検証
          expect(mockLoadingError.removeAttribute).toHaveBeenCalledWith('hidden');
          
          // 進捗メッセージがクリアされることを検証
          expect(mockLoadingMessage.textContent).toBe('');
          
          // リトライボタンのonclickが設定されることを検証
          expect(mockRetryButton.onclick).toBeDefined();
          expect(typeof mockRetryButton.onclick).toBe('function');
        }
      ),
      { numRuns: 100 }
    );
  });
});
