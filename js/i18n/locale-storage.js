/**
 * 言語設定の永続化を管理するクラス
 * ローカルストレージを使用して言語設定を保存・読み込みする
 */
class LocaleStorage {
  static STORAGE_KEY = 'saga-bus-nav-locale';
  static DEFAULT_LANGUAGE = 'ja';
  static SUPPORTED_LANGUAGES = ['ja', 'en'];

  /**
   * 現在の言語設定を取得
   * @returns {string} 言語コード（ja, en）
   */
  static getLanguage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored && this.SUPPORTED_LANGUAGES.includes(stored)) {
        return stored;
      }
    } catch (error) {
      console.warn('LocaleStorage: ローカルストレージの読み込みに失敗しました', error);
    }
    return this.getDefaultLanguage();
  }

  /**
   * 言語設定を保存
   * @param {string} locale 言語コード
   */
  static setLanguage(locale) {
    if (!this.SUPPORTED_LANGUAGES.includes(locale)) {
      console.warn(`LocaleStorage: サポートされていない言語です: ${locale}`);
      return;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, locale);
    } catch (error) {
      console.warn('LocaleStorage: ローカルストレージへの保存に失敗しました', error);
    }
  }

  /**
   * デフォルト言語を取得
   * @returns {string} デフォルト言語コード
   */
  static getDefaultLanguage() {
    return this.DEFAULT_LANGUAGE;
  }

  /**
   * サポートされている言語の一覧を取得
   * @returns {Array<string>} サポート言語のリスト
   */
  static getSupportedLanguages() {
    return [...this.SUPPORTED_LANGUAGES];
  }

  /**
   * 指定された言語がサポートされているかチェック
   * @param {string} locale 言語コード
   * @returns {boolean} サポートされている場合true
   */
  static isSupported(locale) {
    return this.SUPPORTED_LANGUAGES.includes(locale);
  }
}

// Node.js環境での使用に対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LocaleStorage;
}

// グローバルスコープに登録
if (typeof window !== 'undefined') {
  window.LocaleStorage = LocaleStorage;
} else if (typeof global !== 'undefined') {
  global.LocaleStorage = LocaleStorage;
}