/**
 * Safari警告ダイアログの単体テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// SafariWarningDialogクラスをインポート
import '../js/safari-warning-dialog.js';

describe('SafariWarningDialog', () => {
  let dialog;
  let originalUserAgent;
  let originalLocalStorage;

  beforeEach(() => {
    // 各テストの前に新しいインスタンスを作成
    dialog = new window.SafariWarningDialog();

    // UserAgentを保存
    originalUserAgent = navigator.userAgent;

    // LocalStorageをモック
    originalLocalStorage = global.localStorage;
    global.localStorage = {
      data: {},
      getItem(key) {
        return this.data[key] || null;
      },
      setItem(key, value) {
        this.data[key] = value;
      },
      removeItem(key) {
        delete this.data[key];
      },
      clear() {
        this.data = {};
      }
    };

    // DOMをクリーンアップ
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // ダイアログを削除
    if (dialog && dialog.dialogElement) {
      dialog.hide();
    }

    // LocalStorageをリセット
    global.localStorage = originalLocalStorage;
  });

  describe('isIphoneSafari', () => {
    it('iPhone Safariを正しく検出する', () => {
      // UserAgentをモック
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        configurable: true
      });

      const result = dialog.isIphoneSafari();
      expect(result).toBe(true);
    });

    it('iPhone Chromeを除外する', () => {
      // UserAgentをモック（Chrome on iOS）
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1',
        configurable: true
      });

      const result = dialog.isIphoneSafari();
      expect(result).toBe(false);
    });

    it('Android Chromeを除外する', () => {
      // UserAgentをモック（Android Chrome）
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Mobile Safari/537.36',
        configurable: true
      });

      const result = dialog.isIphoneSafari();
      expect(result).toBe(false);
    });

    it('デスクトップSafariを除外する', () => {
      // UserAgentをモック（macOS Safari）
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15',
        configurable: true
      });

      const result = dialog.isIphoneSafari();
      expect(result).toBe(false);
    });

    it('iPadを除外する', () => {
      // UserAgentをモック（iPad Safari）
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        configurable: true
      });

      const result = dialog.isIphoneSafari();
      expect(result).toBe(false);
    });
  });

  describe('shouldShowWarning', () => {
    it('LocalStorageに設定がない場合はtrueを返す', () => {
      const result = dialog.shouldShowWarning();
      expect(result).toBe(true);
    });

    it('LocalStorageにtrueが設定されている場合はfalseを返す', () => {
      localStorage.setItem('hideIphoneSafariWarning', 'true');
      const result = dialog.shouldShowWarning();
      expect(result).toBe(false);
    });

    it('LocalStorageにfalseが設定されている場合はtrueを返す', () => {
      localStorage.setItem('hideIphoneSafariWarning', 'false');
      const result = dialog.shouldShowWarning();
      expect(result).toBe(true);
    });

    it('LocalStorageアクセスエラー時はtrueを返す', () => {
      // LocalStorageのgetItemでエラーをスロー
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => {
        throw new Error('LocalStorage access denied');
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = dialog.shouldShowWarning();
      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      localStorage.getItem = originalGetItem;
    });
  });

  describe('saveHidePreference', () => {
    it('LocalStorageに設定を保存できる', () => {
      dialog.saveHidePreference();
      const value = localStorage.getItem('hideIphoneSafariWarning');
      expect(value).toBe('true');
    });

    it('LocalStorageアクセスエラー時も処理が継続する', () => {
      // LocalStorageのsetItemでエラーをスロー
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('LocalStorage access denied');
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // エラーがスローされないことを確認
      expect(() => dialog.saveHidePreference()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      localStorage.setItem = originalSetItem;
    });
  });

  describe('createDialogElement', () => {
    it('正しいDOM構造を生成する', () => {
      const element = dialog.createDialogElement();

      // ルート要素
      expect(element.className).toBe('safari-warning-overlay');
      expect(element.getAttribute('role')).toBe('dialog');
      expect(element.getAttribute('aria-modal')).toBe('true');
      expect(element.getAttribute('aria-labelledby')).toBe('safari-warning-title');

      // ダイアログ本体
      const dialogDiv = element.querySelector('.safari-warning-dialog');
      expect(dialogDiv).toBeTruthy();

      // ヘッダー
      const header = element.querySelector('.safari-warning-header');
      expect(header).toBeTruthy();

      const icon = element.querySelector('.safari-warning-icon');
      expect(icon).toBeTruthy();
      expect(icon.textContent).toBe('⚠️');

      const title = element.querySelector('#safari-warning-title');
      expect(title).toBeTruthy();
      expect(title.textContent).toBe('動作環境について');

      // ボディ
      const body = element.querySelector('.safari-warning-body');
      expect(body).toBeTruthy();

      const message = element.querySelector('.safari-warning-message');
      expect(message).toBeTruthy();
      expect(message.textContent).toContain('iPhone版Safariでは地図の読み込みが不安定');

      const recommendation = element.querySelector('.safari-warning-recommendation');
      expect(recommendation).toBeTruthy();
      expect(recommendation.textContent).toContain('Google Chromeでのアクセスを推奨');

      // フッター
      const footer = element.querySelector('.safari-warning-footer');
      expect(footer).toBeTruthy();

      const checkbox = element.querySelector('#safari-warning-checkbox');
      expect(checkbox).toBeTruthy();
      expect(checkbox.type).toBe('checkbox');

      const okButton = element.querySelector('.safari-warning-ok-button');
      expect(okButton).toBeTruthy();
      expect(okButton.textContent).toBe('OK');
    });

    it('チェックボックスとOKボタンの参照を保存する', () => {
      const element = dialog.createDialogElement();

      expect(dialog.checkboxElement).toBeTruthy();
      expect(dialog.checkboxElement.id).toBe('safari-warning-checkbox');

      expect(dialog.okButtonElement).toBeTruthy();
      expect(dialog.okButtonElement.className).toBe('safari-warning-ok-button');
    });
  });

  describe('show', () => {
    it('ダイアログをDOMに追加する', () => {
      dialog.show();

      const overlay = document.querySelector('.safari-warning-overlay');
      expect(overlay).toBeTruthy();
      expect(document.body.contains(overlay)).toBe(true);
    });

    it('既に表示されている場合は何もしない', () => {
      dialog.show();
      const firstElement = dialog.dialogElement;

      dialog.show();
      const secondElement = dialog.dialogElement;

      expect(firstElement).toBe(secondElement);
      expect(document.querySelectorAll('.safari-warning-overlay').length).toBe(1);
    });

    it('DOM追加エラー時も処理が継続する', () => {
      // document.bodyをnullに設定してエラーをシミュレート
      const originalBody = document.body;
      Object.defineProperty(document, 'body', {
        value: null,
        configurable: true
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // エラーがスローされないことを確認
      expect(() => dialog.show()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      Object.defineProperty(document, 'body', {
        value: originalBody,
        configurable: true
      });
    });
  });

  describe('hide', () => {
    it('ダイアログをDOMから削除する', () => {
      dialog.show();
      expect(document.querySelector('.safari-warning-overlay')).toBeTruthy();

      dialog.hide();
      expect(document.querySelector('.safari-warning-overlay')).toBeFalsy();
    });

    it('参照をクリアする', () => {
      dialog.show();
      expect(dialog.dialogElement).toBeTruthy();
      expect(dialog.checkboxElement).toBeTruthy();
      expect(dialog.okButtonElement).toBeTruthy();

      dialog.hide();
      expect(dialog.dialogElement).toBeNull();
      expect(dialog.checkboxElement).toBeNull();
      expect(dialog.okButtonElement).toBeNull();
    });

    it('ダイアログが表示されていない場合は何もしない', () => {
      // エラーがスローされないことを確認
      expect(() => dialog.hide()).not.toThrow();
    });
  });

  describe('handleOkClick', () => {
    it('チェックボックスがチェックされている場合LocalStorageに保存する', () => {
      dialog.show();
      dialog.checkboxElement.checked = true;

      dialog.handleOkClick();

      const value = localStorage.getItem('hideIphoneSafariWarning');
      expect(value).toBe('true');
    });

    it('チェックボックスがチェックされていない場合LocalStorageに保存しない', () => {
      dialog.show();
      dialog.checkboxElement.checked = false;

      dialog.handleOkClick();

      const value = localStorage.getItem('hideIphoneSafariWarning');
      expect(value).toBeNull();
    });

    it('ダイアログを閉じる', () => {
      dialog.show();
      expect(document.querySelector('.safari-warning-overlay')).toBeTruthy();

      dialog.handleOkClick();
      expect(document.querySelector('.safari-warning-overlay')).toBeFalsy();
    });
  });

  describe('init', () => {
    it('iPhone Safari以外では何もしない', () => {
      // UserAgentをモック（Android Chrome）
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Mobile Safari/537.36',
        configurable: true
      });

      dialog.init();

      expect(document.querySelector('.safari-warning-overlay')).toBeFalsy();
    });

    it('iPhone Safariで非表示設定がある場合は何もしない', () => {
      // UserAgentをモック（iPhone Safari）
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        configurable: true
      });

      localStorage.setItem('hideIphoneSafariWarning', 'true');

      dialog.init();

      expect(document.querySelector('.safari-warning-overlay')).toBeFalsy();
    });

    it('iPhone Safariで非表示設定がない場合はダイアログを表示する', () => {
      // UserAgentをモック（iPhone Safari）
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        configurable: true
      });

      dialog.init();

      expect(document.querySelector('.safari-warning-overlay')).toBeTruthy();
    });
  });

  describe('統合テスト', () => {
    it('完全なフロー: 表示 → チェック → OK → 非表示 → 再初期化で表示されない', () => {
      // UserAgentをモック（iPhone Safari）
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        configurable: true
      });

      // 初回表示
      dialog.init();
      expect(document.querySelector('.safari-warning-overlay')).toBeTruthy();

      // チェックボックスをチェック
      dialog.checkboxElement.checked = true;

      // OKボタンをクリック
      dialog.handleOkClick();
      expect(document.querySelector('.safari-warning-overlay')).toBeFalsy();

      // LocalStorageに保存されていることを確認
      const value = localStorage.getItem('hideIphoneSafariWarning');
      expect(value).toBe('true');

      // 新しいインスタンスで再初期化
      const newDialog = new window.SafariWarningDialog();
      newDialog.init();

      // 表示されないことを確認
      expect(document.querySelector('.safari-warning-overlay')).toBeFalsy();
    });

    it('完全なフロー: 表示 → チェックなし → OK → 非表示 → 再初期化で再表示', () => {
      // UserAgentをモック（iPhone Safari）
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        configurable: true
      });

      // 初回表示
      dialog.init();
      expect(document.querySelector('.safari-warning-overlay')).toBeTruthy();

      // チェックボックスをチェックしない
      dialog.checkboxElement.checked = false;

      // OKボタンをクリック
      dialog.handleOkClick();
      expect(document.querySelector('.safari-warning-overlay')).toBeFalsy();

      // LocalStorageに保存されていないことを確認
      const value = localStorage.getItem('hideIphoneSafariWarning');
      expect(value).toBeNull();

      // 新しいインスタンスで再初期化
      const newDialog = new window.SafariWarningDialog();
      newDialog.init();

      // 再度表示されることを確認
      expect(document.querySelector('.safari-warning-overlay')).toBeTruthy();
    });
  });
});
