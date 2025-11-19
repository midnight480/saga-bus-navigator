/**
 * ローディング画面アニメーションのプロパティベーステスト
 * Feature: initial-loading-screen, Property 8: フェードアウトアニメーション
 * Validates: Requirements 4.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// LoadingScreenControllerクラスをインポート
const LoadingScreenController = require('../js/loading-screen-controller.js');

describe('ローディング画面アニメーションのプロパティテスト', () => {
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
   * プロパティ 8: フェードアウトアニメーション
   * 任意のhide()呼び出しにおいて、ローディング画面はフェードアウトアニメーションを伴って非表示になるべきである
   */
  it('プロパティ 8: hide()呼び出し時にフェードアウトアニメーションが適用される', () => {
    // タイマーをモック
    vi.useFakeTimers();

    fc.assert(
      fc.property(
        fc.constant(null), // hide()は外部入力に依存しない
        () => {
          // モックをリセット
          mockLoadingScreen.classList.add.mockClear();
          mockLoadingScreen.style.display = '';
          
          // show()を呼び出してローディング画面を表示
          controller.show();
          expect(mockLoadingScreen.style.display).toBe('flex');
          
          // hide()を呼び出す
          controller.hide();
          
          // fade-outクラスが追加されることを検証
          expect(mockLoadingScreen.classList.add).toHaveBeenCalledWith('fade-out');
          
          // 300ms経過前はdisplayがnoneにならないことを検証
          vi.advanceTimersByTime(299);
          expect(mockLoadingScreen.style.display).not.toBe('none');
          
          // 300ms経過後にdisplayがnoneになることを検証
          vi.advanceTimersByTime(1);
          expect(mockLoadingScreen.style.display).toBe('none');
        }
      ),
      { numRuns: 100 }
    );

    vi.useRealTimers();
  });
});
