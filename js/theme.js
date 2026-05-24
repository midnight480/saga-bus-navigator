/**
 * テーママネージャー
 * ライトモード/ダークモードの切り替えを管理するクラス
 */
class ThemeManager {
  constructor() {
    // localStorageのキー
    this.STORAGE_KEY = 'theme';
    // 現在のテーマ
    this.currentTheme = 'light';
    // ユーザーが手動で設定したかどうか
    this.isUserSet = false;
    // メディアクエリ
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  }

  /**
   * テーマの初期化
   * localStorage > OS設定 の優先順位でテーマを決定
   */
  initialize() {
    // localStorageから保存されたテーマを取得
    const savedTheme = localStorage.getItem(this.STORAGE_KEY);

    if (savedTheme === 'dark' || savedTheme === 'light') {
      this.currentTheme = savedTheme;
      this.isUserSet = true;
    } else {
      // OS設定に基づくデフォルト
      this.currentTheme = this.mediaQuery.matches ? 'dark' : 'light';
      this.isUserSet = false;
    }

    this.applyTheme();
    this.setupMediaQueryListener();
    this.setupToggleButton();
  }

  /**
   * テーマをDOMに適用
   */
  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    this.updateToggleButton();
  }

  /**
   * テーマを切り替え
   */
  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.isUserSet = true;
    localStorage.setItem(this.STORAGE_KEY, this.currentTheme);
    this.applyTheme();
  }

  /**
   * 現在のテーマを取得
   * @returns {string} 'light' または 'dark'
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * OS設定変更のリスナーを設定
   */
  setupMediaQueryListener() {
    this.mediaQuery.addEventListener('change', (e) => {
      // ユーザーが手動設定していない場合のみOS設定に追従
      if (!this.isUserSet) {
        this.currentTheme = e.matches ? 'dark' : 'light';
        this.applyTheme();
      }
    });
  }

  /**
   * トグルボタンのイベントリスナーを設定
   */
  setupToggleButton() {
    const button = document.getElementById('theme-toggle-button');
    if (button) {
      button.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
  }

  /**
   * トグルボタンの表示を更新
   */
  updateToggleButton() {
    const button = document.getElementById('theme-toggle-button');
    if (button) {
      const icon = button.querySelector('.theme-toggle-icon');
      if (icon) {
        icon.textContent = this.currentTheme === 'light' ? '\u{1F319}' : '\u{2600}\u{FE0F}';
      }
      // アクセシビリティ: aria-labelを更新
      const label =
        this.currentTheme === 'light'
          ? '\u30C0\u30FC\u30AF\u30E2\u30FC\u30C9\u306B\u5207\u308A\u66FF\u3048'
          : '\u30E9\u30A4\u30C8\u30E2\u30FC\u30C9\u306B\u5207\u308A\u66FF\u3048';
      button.setAttribute('aria-label', label);
    }
  }
}

// グローバルに公開
window.ThemeManager = ThemeManager;

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', () => {
  window.themeManager = new ThemeManager();
  window.themeManager.initialize();
});
