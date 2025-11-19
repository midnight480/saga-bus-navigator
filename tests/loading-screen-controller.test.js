/**
 * LoadingScreenControllerの単体テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// LoadingScreenControllerクラスをインポート
const LoadingScreenController = require('../js/loading-screen-controller.js');

describe('LoadingScreenController', () => {
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
      onclick: null
    };

    mockLoadingError = {
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
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
        remove: vi.fn()
      },
      querySelector: vi.fn((selector) => {
        if (selector === '.loading-message') return mockLoadingMessage;
        if (selector === '.loading-error') return mockLoadingError;
        return null;
      }),
      querySelectorAll: vi.fn(() => [mockRetryButton])
    };

    // グローバルdocumentをモック
    global.document = {
      getElementById: vi.fn((id) => {
        if (id === 'loading-screen') return mockLoadingScreen;
        return null;
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    // コントローラーを初期化
    controller = new LoadingScreenController();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('DOM要素を正しく初期化する', () => {
      expect(controller.loadingScreen).toBe(mockLoadingScreen);
      expect(controller.loadingMessage).toBe(mockLoadingMessage);
      expect(controller.loadingError).toBe(mockLoadingError);
      expect(controller.errorMessage).toBe(mockErrorMessage);
      expect(controller.retryButton).toBe(mockRetryButton);
    });

    it('タイマーIDをnullで初期化する', () => {
      expect(controller.timeoutId).toBeNull();
      expect(controller.warningTimeoutId).toBeNull();
      expect(controller.startTime).toBeNull();
    });
  });

  describe('show()', () => {
    it('ローディング画面を表示する', () => {
      controller.show();

      expect(mockLoadingScreen.style.display).toBe('flex');
      expect(mockLoadingScreen.classList.remove).toHaveBeenCalledWith('fade-out');
    });

    it('エラー表示を非表示にする', () => {
      controller.show();

      expect(mockLoadingError.setAttribute).toHaveBeenCalledWith('hidden', '');
    });

    it('開始時刻を記録する', () => {
      const beforeTime = Date.now();
      controller.show();
      const afterTime = Date.now();

      expect(controller.startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(controller.startTime).toBeLessThanOrEqual(afterTime);
    });

    it('loadingScreenがnullの場合は何もしない', () => {
      controller.loadingScreen = null;
      
      expect(() => controller.show()).not.toThrow();
    });
  });

  describe('hide()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('fade-outクラスを追加する', () => {
      controller.hide();

      expect(mockLoadingScreen.classList.add).toHaveBeenCalledWith('fade-out');
    });

    it('300ms後にdisplayをnoneに設定する', () => {
      controller.hide();

      // 300ms経過前
      vi.advanceTimersByTime(299);
      expect(mockLoadingScreen.style.display).not.toBe('none');

      // 300ms経過後
      vi.advanceTimersByTime(1);
      expect(mockLoadingScreen.style.display).toBe('none');
    });

    it('loadingScreenがnullの場合は何もしない', () => {
      controller.loadingScreen = null;
      
      expect(() => controller.hide()).not.toThrow();
    });
  });

  describe('updateProgress()', () => {
    it('進捗メッセージを更新する', () => {
      const message = 'データを読み込んでいます...';
      controller.updateProgress(message);

      expect(mockLoadingMessage.textContent).toBe(message);
    });

    it('空文字列のメッセージを設定できる', () => {
      controller.updateProgress('');

      expect(mockLoadingMessage.textContent).toBe('');
    });

    it('日本語メッセージを正しく設定できる', () => {
      const message = 'GTFSデータを検索しています...';
      controller.updateProgress(message);

      expect(mockLoadingMessage.textContent).toBe(message);
    });

    it('loadingMessageがnullの場合は何もしない', () => {
      controller.loadingMessage = null;
      
      expect(() => controller.updateProgress('test')).not.toThrow();
    });
  });

  describe('showError()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // focusメソッドをモック
      mockRetryButton.focus = vi.fn();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('エラーメッセージを表示する', () => {
      const errorMsg = 'データの読み込みに失敗しました';
      const retryCallback = vi.fn();

      controller.showError(errorMsg, retryCallback);

      expect(mockErrorMessage.textContent).toBe(errorMsg);
      expect(mockLoadingError.removeAttribute).toHaveBeenCalledWith('hidden');
    });

    it('リトライボタンにフォーカスを移動する', () => {
      const retryCallback = vi.fn();

      controller.showError('エラー', retryCallback);

      // 100ms後にフォーカスが移動する
      vi.advanceTimersByTime(100);
      expect(mockRetryButton.focus).toHaveBeenCalledTimes(1);
    });

    it('進捗メッセージをクリアする', () => {
      mockLoadingMessage.textContent = '読み込み中...';
      
      controller.showError('エラー', vi.fn());

      expect(mockLoadingMessage.textContent).toBe('');
    });

    it('リトライボタンのクリックイベントを設定する', () => {
      const retryCallback = vi.fn();

      controller.showError('エラー', retryCallback);

      expect(mockRetryButton.onclick).toBeDefined();
      expect(typeof mockRetryButton.onclick).toBe('function');
    });

    it('リトライボタンクリック時にコールバックを実行する', () => {
      const retryCallback = vi.fn();

      controller.showError('エラー', retryCallback);
      
      // リトライボタンをクリック
      mockRetryButton.onclick();

      expect(retryCallback).toHaveBeenCalledTimes(1);
    });

    it('リトライボタンクリック時にエラー表示を非表示にする', () => {
      const retryCallback = vi.fn();

      controller.showError('エラー', retryCallback);
      
      // リトライボタンをクリック
      mockRetryButton.onclick();

      expect(mockLoadingError.setAttribute).toHaveBeenCalledWith('hidden', '');
    });

    it('リトライボタンクリック時にローディング画面を再表示する', () => {
      const retryCallback = vi.fn();

      controller.showError('エラー', retryCallback);
      
      // リトライボタンをクリック
      mockRetryButton.onclick();

      expect(mockLoadingScreen.style.display).toBe('flex');
    });

    it('retryCallbackがnullの場合でもエラーを表示する', () => {
      const errorMsg = 'エラーメッセージ';
      
      expect(() => controller.showError(errorMsg, null)).not.toThrow();
      expect(mockErrorMessage.textContent).toBe(errorMsg);
    });
  });

  describe('startTimeout()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('警告タイマーを開始する', () => {
      const warningCallback = vi.fn();
      const warningDuration = 30000; // 30秒

      controller.startTimeout(warningDuration, warningCallback);

      // 30秒経過前
      vi.advanceTimersByTime(29999);
      expect(warningCallback).not.toHaveBeenCalled();

      // 30秒経過後
      vi.advanceTimersByTime(1);
      expect(warningCallback).toHaveBeenCalledTimes(1);
    });

    it('エラータイマーを開始する（警告の2倍の時間）', () => {
      const warningCallback = vi.fn();
      const warningDuration = 30000; // 30秒

      controller.startTimeout(warningDuration, warningCallback);

      // 60秒経過前
      vi.advanceTimersByTime(59999);
      expect(mockLoadingError.removeAttribute).not.toHaveBeenCalled();

      // 60秒経過後
      vi.advanceTimersByTime(1);
      expect(mockLoadingError.removeAttribute).toHaveBeenCalled();
      expect(mockErrorMessage.textContent).toContain('タイムアウト');
    });

    it('既存のタイマーをクリアしてから新しいタイマーを開始する', () => {
      const warningCallback1 = vi.fn();
      const warningCallback2 = vi.fn();

      // 1回目のタイマー開始
      controller.startTimeout(30000, warningCallback1);
      
      // 2回目のタイマー開始（1回目をクリア）
      controller.startTimeout(30000, warningCallback2);

      // 30秒経過
      vi.advanceTimersByTime(30000);

      // 2回目のコールバックのみが呼ばれる
      expect(warningCallback1).not.toHaveBeenCalled();
      expect(warningCallback2).toHaveBeenCalledTimes(1);
    });

    it('warningCallbackがnullの場合でもタイマーを開始する', () => {
      expect(() => controller.startTimeout(30000, null)).not.toThrow();
      
      // タイマーIDが設定されることを確認
      expect(controller.warningTimeoutId).not.toBeNull();
      expect(controller.timeoutId).not.toBeNull();
    });
  });

  describe('clearTimeout()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('警告タイマーをクリアする', () => {
      const warningCallback = vi.fn();

      controller.startTimeout(30000, warningCallback);
      controller.clearTimeout();

      // 30秒経過してもコールバックが呼ばれない
      vi.advanceTimersByTime(30000);
      expect(warningCallback).not.toHaveBeenCalled();
    });

    it('エラータイマーをクリアする', () => {
      const warningCallback = vi.fn();

      controller.startTimeout(30000, warningCallback);
      controller.clearTimeout();

      // 60秒経過してもエラーが表示されない
      vi.advanceTimersByTime(60000);
      expect(mockLoadingError.removeAttribute).not.toHaveBeenCalled();
    });

    it('タイマーIDをnullに設定する', () => {
      controller.startTimeout(30000, vi.fn());
      controller.clearTimeout();

      expect(controller.warningTimeoutId).toBeNull();
      expect(controller.timeoutId).toBeNull();
    });

    it('タイマーが設定されていない場合でもエラーにならない', () => {
      expect(() => controller.clearTimeout()).not.toThrow();
    });

    it('複数回呼び出してもエラーにならない', () => {
      controller.startTimeout(30000, vi.fn());
      controller.clearTimeout();
      
      expect(() => controller.clearTimeout()).not.toThrow();
    });
  });

  describe('フォーカストラップ', () => {
    it('show()呼び出し時にフォーカストラップを有効化する', () => {
      controller.show();

      expect(global.document.addEventListener).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });

    it('hide()呼び出し時にフォーカストラップを無効化する', () => {
      controller.show();
      controller.hide();

      expect(global.document.removeEventListener).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });

    it('フォーカス可能な要素を取得する', () => {
      controller.show();

      expect(mockLoadingScreen.querySelectorAll).toHaveBeenCalledWith(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
    });
  });

  describe('統合テスト', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('正常なデータロードフローをシミュレートする', () => {
      // ローディング画面を表示
      controller.show();
      expect(mockLoadingScreen.style.display).toBe('flex');

      // 進捗メッセージを更新
      controller.updateProgress('GTFSデータを検索しています...');
      expect(mockLoadingMessage.textContent).toBe('GTFSデータを検索しています...');

      controller.updateProgress('バス停データを読み込んでいます...');
      expect(mockLoadingMessage.textContent).toBe('バス停データを読み込んでいます...');

      controller.updateProgress('時刻表データを読み込んでいます...');
      expect(mockLoadingMessage.textContent).toBe('時刻表データを読み込んでいます...');

      // ローディング画面を非表示
      controller.hide();
      expect(mockLoadingScreen.classList.add).toHaveBeenCalledWith('fade-out');

      vi.advanceTimersByTime(300);
      expect(mockLoadingScreen.style.display).toBe('none');
    });

    it('エラー発生とリトライのフローをシミュレートする', () => {
      const retryCallback = vi.fn();

      // ローディング画面を表示
      controller.show();

      // エラーを表示
      controller.showError('データの読み込みに失敗しました', retryCallback);
      expect(mockErrorMessage.textContent).toBe('データの読み込みに失敗しました');
      expect(mockLoadingError.removeAttribute).toHaveBeenCalledWith('hidden');

      // リトライボタンをクリック
      mockRetryButton.onclick();
      expect(retryCallback).toHaveBeenCalledTimes(1);
      expect(mockLoadingScreen.style.display).toBe('flex');
    });

    it('タイムアウト警告からエラーまでのフローをシミュレートする', () => {
      const warningCallback = vi.fn();

      // ローディング画面を表示
      controller.show();

      // タイムアウトタイマーを開始
      controller.startTimeout(30000, warningCallback);

      // 30秒経過 - 警告表示
      vi.advanceTimersByTime(30000);
      expect(warningCallback).toHaveBeenCalledTimes(1);

      // さらに30秒経過 - エラー表示
      vi.advanceTimersByTime(30000);
      expect(mockErrorMessage.textContent).toContain('タイムアウト');
      expect(mockLoadingError.removeAttribute).toHaveBeenCalled();
    });

    it('データロード完了時にタイムアウトをクリアする', () => {
      const warningCallback = vi.fn();

      // ローディング画面を表示
      controller.show();

      // タイムアウトタイマーを開始
      controller.startTimeout(30000, warningCallback);

      // データロード完了（20秒後）
      vi.advanceTimersByTime(20000);
      controller.clearTimeout();
      controller.hide();

      // さらに時間が経過してもタイムアウトは発生しない
      vi.advanceTimersByTime(50000);
      expect(warningCallback).not.toHaveBeenCalled();
      expect(mockErrorMessage.textContent).not.toContain('タイムアウト');
    });
  });
});
