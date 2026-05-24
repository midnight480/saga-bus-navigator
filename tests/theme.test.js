/**
 * テーママネージャーの単体テスト
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ThemeManagerクラスをインポート
import '../js/theme.js';

describe('ThemeManager', () => {
  let themeManager;
  let mockMatchMedia;

  beforeEach(() => {
    // DOMをリセット
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();

    // トグルボタンのモックを作成
    const button = document.createElement('button');
    button.id = 'theme-toggle-button';
    button.innerHTML = '<span class="theme-toggle-icon">\u{1F319}</span>';
    document.body.appendChild(button);

    // matchMediaをモック
    mockMatchMedia = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    window.matchMedia = vi.fn(() => mockMatchMedia);

    themeManager = new window.ThemeManager();
  });

  afterEach(() => {
    // クリーンアップ
    const button = document.getElementById('theme-toggle-button');
    if (button) button.remove();
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  describe('initialize', () => {
    it('OS設定がライトの場合、ライトモードがデフォルトになる', () => {
      mockMatchMedia.matches = false;
      themeManager.initialize();
      expect(themeManager.getCurrentTheme()).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('OS設定がダークの場合、ダークモードがデフォルトになる', () => {
      mockMatchMedia.matches = true;
      themeManager.initialize();
      expect(themeManager.getCurrentTheme()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('localStorageにテーマが保存されている場合、それをロードする', () => {
      localStorage.setItem('theme', 'dark');
      themeManager.initialize();
      expect(themeManager.getCurrentTheme()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('localStorageの設定がOS設定より優先される', () => {
      mockMatchMedia.matches = true; // OSはダーク
      localStorage.setItem('theme', 'light'); // 保存はライト
      themeManager.initialize();
      expect(themeManager.getCurrentTheme()).toBe('light');
    });
  });

  describe('toggleTheme', () => {
    it('ライトからダークに切り替わる', () => {
      mockMatchMedia.matches = false;
      themeManager.initialize();
      themeManager.toggleTheme();
      expect(themeManager.getCurrentTheme()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('ダークからライトに切り替わる', () => {
      localStorage.setItem('theme', 'dark');
      themeManager.initialize();
      themeManager.toggleTheme();
      expect(themeManager.getCurrentTheme()).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('テーマ変更時にlocalStorageに保存される', () => {
      mockMatchMedia.matches = false;
      themeManager.initialize();
      themeManager.toggleTheme();
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  describe('updateToggleButton', () => {
    it('ライトモード時にmoonアイコンが表示される', () => {
      mockMatchMedia.matches = false;
      themeManager.initialize();
      const icon = document.querySelector('.theme-toggle-icon');
      expect(icon.textContent).toBe('\u{1F319}');
    });

    it('ダークモード時にsunアイコンが表示される', () => {
      localStorage.setItem('theme', 'dark');
      themeManager.initialize();
      const icon = document.querySelector('.theme-toggle-icon');
      expect(icon.textContent).toBe('\u{2600}\u{FE0F}');
    });

    it('aria-labelが現在のテーマに応じて更新される', () => {
      mockMatchMedia.matches = false;
      themeManager.initialize();
      const button = document.getElementById('theme-toggle-button');
      expect(button.getAttribute('aria-label')).toBe(
        '\u30C0\u30FC\u30AF\u30E2\u30FC\u30C9\u306B\u5207\u308A\u66FF\u3048'
      );

      themeManager.toggleTheme();
      expect(button.getAttribute('aria-label')).toBe(
        '\u30E9\u30A4\u30C8\u30E2\u30FC\u30C9\u306B\u5207\u308A\u66FF\u3048'
      );
    });
  });

  describe('OS設定変更の監視', () => {
    it('ユーザー未設定時にOS設定変更に追従する', () => {
      mockMatchMedia.matches = false;
      themeManager.initialize();

      // addEventListener が呼ばれたことを確認
      expect(mockMatchMedia.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );

      // OS設定変更をシミュレート
      const changeHandler = mockMatchMedia.addEventListener.mock.calls[0][1];
      changeHandler({ matches: true });

      expect(themeManager.getCurrentTheme()).toBe('dark');
    });

    it('ユーザーが手動設定した場合はOS設定変更に追従しない', () => {
      mockMatchMedia.matches = false;
      themeManager.initialize();
      themeManager.toggleTheme(); // ユーザーが手動でダークに変更

      // OS設定変更をシミュレート（ダーク→ライト）
      const changeHandler = mockMatchMedia.addEventListener.mock.calls[0][1];
      changeHandler({ matches: false });

      // ユーザー設定（ダーク）が維持される
      expect(themeManager.getCurrentTheme()).toBe('dark');
    });
  });
});
