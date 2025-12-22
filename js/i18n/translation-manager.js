/**
 * 翻訳システムの中核管理クラス
 * 翻訳データの読み込み、言語切り替え、翻訳キーの解決を行う
 */
class TranslationManager {
  constructor(busStopTranslator = null, routeNameTranslator = null) {
    this.translations = {};
    this.loadedLocales = new Set();
    this.busStopTranslator = busStopTranslator;
    this.routeNameTranslator = routeNameTranslator;
    
    // 警告を一度だけ表示するためのセット
    this.warnedKeys = new Set();
    
    // 開発環境かどうかを判定（本番環境では警告を抑制）
    this.isDevelopment = typeof window !== 'undefined' && 
                         (window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1' ||
                          window.location.hostname.includes('.dev') ||
                          window.location.hostname.includes('.local'));
    
    // LocaleStorageクラスの参照を取得
    const LocaleStorageClass = (typeof LocaleStorage !== 'undefined') ? LocaleStorage : 
                               (typeof global !== 'undefined' && global.LocaleStorage) ? global.LocaleStorage :
                               (typeof window !== 'undefined' && window.LocaleStorage) ? window.LocaleStorage : null;
    
    if (!LocaleStorageClass) {
      // フォールバック設定
      this.currentLocale = 'ja';
      this.fallbackLocale = 'ja';
    } else {
      this.currentLocale = LocaleStorageClass.getLanguage();
      this.fallbackLocale = LocaleStorageClass.getDefaultLanguage();
    }
    
    // 初期化時にデフォルト言語を読み込み
    this.loadTranslations(this.currentLocale).then(() => {
      // 初期翻訳を適用
      this.updateDOMTranslations();
    });
  }

  /**
   * 現在の言語を取得
   * @returns {string} 現在の言語コード
   */
  getLanguage() {
    return this.currentLocale;
  }

  /**
   * 言語を設定
   * @param {string} locale 言語コード
   * @returns {Promise<void>}
   */
  async setLanguage(locale) {
    // LocaleStorageクラスの参照を取得
    const LocaleStorageClass = (typeof LocaleStorage !== 'undefined') ? LocaleStorage : 
                               (typeof global !== 'undefined' && global.LocaleStorage) ? global.LocaleStorage :
                               (typeof window !== 'undefined' && window.LocaleStorage) ? window.LocaleStorage : null;
    
    if (LocaleStorageClass && !LocaleStorageClass.isSupported(locale)) {
      console.warn(`TranslationManager: サポートされていない言語です: ${locale}`);
      return;
    }

    // 翻訳データが未読み込みの場合は読み込み
    if (!this.isTranslationLoaded(locale)) {
      await this.loadTranslations(locale);
    }

    this.currentLocale = locale;
    
    if (LocaleStorageClass) {
      LocaleStorageClass.setLanguage(locale);
    }
    
    // 言語変更イベントを発火
    this.notifyLanguageChange(locale);
  }

  /**
   * 翻訳キーを解決して翻訳テキストを取得
   * @param {string} key 翻訳キー（例: "search.departure_stop"）
   * @param {Object} params 置換パラメータ
   * @returns {string} 翻訳されたテキスト
   */
  translate(key, params = {}) {
    let text = this.getTranslationText(key);
    
    // パラメータの置換
    if (params && typeof params === 'object' && Object.keys(params).length > 0) {
      Object.keys(params).forEach(param => {
        const safeValue = this.escapeHtml(String(params[param]));
        // 正規表現の特殊文字をエスケープ
        const escapedParam = param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // {{param}}形式のパターンを置換（二重波括弧）
        const pattern = `{{${escapedParam}}}`;
        const regex = new RegExp(pattern, 'g');
        const beforeReplace = text;
        text = text.replace(regex, safeValue);
        
        // 開発環境でのみデバッグログを出力
        if (this.isDevelopment && beforeReplace !== text) {
          console.log(`TranslationManager: パラメータ置換 - キー: ${key}, パラメータ: ${param}, 値: ${safeValue}, 置換前: ${beforeReplace}, 置換後: ${text}`);
        }
      });
    }
    
    return text;
  }

  /**
   * 翻訳テキストを取得（内部メソッド）
   * @param {string} key 翻訳キー
   * @returns {string} 翻訳テキスト
   */
  getTranslationText(key) {
    // 翻訳データが読み込まれていない場合は、キーをそのまま返す（警告は出さない）
    if (!this.isTranslationLoaded(this.currentLocale)) {
      return key;
    }
    
    // 現在の言語で翻訳を取得
    let text = this.getNestedValue(this.translations[this.currentLocale], key);
    
    // 翻訳が見つからない場合はフォールバック言語を試行
    if (!text && this.currentLocale !== this.fallbackLocale) {
      // フォールバック言語のデータが読み込まれている場合のみ試行
      if (this.isTranslationLoaded(this.fallbackLocale)) {
        text = this.getNestedValue(this.translations[this.fallbackLocale], key);
        if (text) {
          // 開発環境でのみ警告を表示（一度だけ）
          if (this.isDevelopment && !this.warnedKeys.has(`fallback:${key}`)) {
            console.warn(`TranslationManager: 翻訳キー "${key}" が ${this.currentLocale} で見つからないため、${this.fallbackLocale} を使用しました`);
            this.warnedKeys.add(`fallback:${key}`);
          }
        }
      }
    }
    
    // それでも見つからない場合はキー名を返す
    if (!text) {
      // 開発環境でのみ警告を表示（一度だけ）
      // ただし、翻訳データが読み込まれている場合のみ警告を出す
      if (this.isDevelopment && this.isTranslationLoaded(this.currentLocale) && !this.warnedKeys.has(`missing:${key}`)) {
        console.warn(`TranslationManager: 翻訳キー "${key}" が見つかりません`);
        this.warnedKeys.add(`missing:${key}`);
      }
      return key;
    }
    
    return text;
  }

  /**
   * ネストされたオブジェクトから値を取得
   * @param {Object} obj 対象オブジェクト
   * @param {string} path ドット記法のパス
   * @returns {string|null} 取得した値
   */
  getNestedValue(obj, path) {
    if (!obj || !path) return null;
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
        // nullまたはundefinedの場合は早期リターン
        if (current === null || current === undefined) {
          return null;
        }
      } else {
        return null;
      }
    }
    
    // 空文字列や空白のみの文字列は無効とする
    if (typeof current === 'string' && current.trim() !== '') {
      return current;
    }
    
    return null;
  }

  /**
   * 翻訳データを読み込み
   * @param {string} locale 言語コード
   * @returns {Promise<void>}
   */
  async loadTranslations(locale) {
    if (this.loadedLocales.has(locale)) {
      return; // 既に読み込み済み
    }

    try {
      const response = await fetch(`/js/translations/${locale}.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const translations = await response.json();
      this.translations[locale] = translations;
      this.loadedLocales.add(locale);
      
      console.log(`TranslationManager: ${locale} の翻訳データを読み込みました`);
    } catch (error) {
      console.error(`TranslationManager: ${locale} の翻訳データ読み込みに失敗しました`, error);
      
      // フォールバック言語でない場合は、フォールバック言語の読み込みを試行
      if (locale !== this.fallbackLocale && !this.loadedLocales.has(this.fallbackLocale)) {
        console.log(`TranslationManager: フォールバック言語 ${this.fallbackLocale} を読み込みます`);
        await this.loadTranslations(this.fallbackLocale);
      }
    }
  }

  /**
   * 翻訳データが読み込み済みかチェック
   * @param {string} locale 言語コード
   * @returns {boolean} 読み込み済みの場合true
   */
  isTranslationLoaded(locale) {
    return this.loadedLocales.has(locale);
  }

  /**
   * HTMLエスケープ処理
   * @param {string} text エスケープするテキスト
   * @returns {string} エスケープされたテキスト
   */
  escapeHtml(text) {
    // 統一されたエスケープ処理（ブラウザ・Node.js共通）
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      // 追加のセキュリティ対策：JavaScriptイベントハンドラーを完全に除去
      .replace(/on\w+/gi, 'data-blocked');
  }

  /**
   * 言語変更通知
   * @param {string} locale 新しい言語コード
   */
  notifyLanguageChange(locale) {
    try {
      // DOM要素の翻訳を更新
      this.updateDOMTranslations();
      
      // カスタムイベントを発火
      if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
        const event = new CustomEvent('languageChanged', {
          detail: { locale, previousLocale: this.currentLocale }
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      // イベント発火に失敗した場合はログ出力のみ
      console.warn('TranslationManager: 言語変更イベントの発火に失敗しました', error);
    }
  }

  /**
   * DOM要素の翻訳を更新
   */
  updateDOMTranslations() {
    if (typeof document === 'undefined') return;

    // data-i18n属性を持つ要素を更新
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (key) {
        element.textContent = this.translate(key);
      }
    });

    // data-i18n-placeholder属性を持つ要素を更新
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      if (key) {
        element.placeholder = this.translate(key);
      }
    });

    // data-i18n-title属性を持つ要素を更新
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      if (key) {
        element.title = this.translate(key);
      }
    });

    // data-i18n-aria-label属性を持つ要素を更新
    const ariaLabelElements = document.querySelectorAll('[data-i18n-aria-label]');
    ariaLabelElements.forEach(element => {
      const key = element.getAttribute('data-i18n-aria-label');
      if (key) {
        element.setAttribute('aria-label', this.translate(key));
      }
    });
  }

  /**
   * サポートされている言語の一覧を取得
   * @returns {Array<Object>} 言語情報のリスト
   */
  getSupportedLanguages() {
    return [
      { code: 'ja', name: '日本語', flag: '🇯🇵' },
      { code: 'en', name: 'English', flag: '🇺🇸' }
    ];
  }

  /**
   * バス停名を翻訳
   * @param {string} japaneseStopName - 日本語バス停名
   * @returns {string} 翻訳されたバス停名（現在の言語が日本語の場合は元の名前を返す）
   */
  translateBusStop(japaneseStopName) {
    // 日本語の場合は翻訳不要
    if (this.currentLocale === 'ja') {
      return japaneseStopName;
    }

    // BusStopTranslatorが設定されていない場合は元の名前を返す
    if (!this.busStopTranslator) {
      console.warn('TranslationManager: BusStopTranslatorが設定されていません');
      return japaneseStopName;
    }

    // 英語の場合は翻訳を試行
    if (this.currentLocale === 'en') {
      const translated = this.busStopTranslator.translateStopName(japaneseStopName);
      return translated || japaneseStopName; // 翻訳が見つからない場合は元の名前を返す
    }

    // その他の言語の場合は元の名前を返す（将来の拡張用）
    return japaneseStopName;
  }

  /**
   * BusStopTranslatorを設定
   * @param {BusStopTranslator} busStopTranslator - バス停翻訳システムのインスタンス
   */
  setBusStopTranslator(busStopTranslator) {
    this.busStopTranslator = busStopTranslator;
  }

  /**
   * RouteNameTranslatorを設定
   * @param {RouteNameTranslator} routeNameTranslator - 路線名翻訳システムのインスタンス
   */
  setRouteNameTranslator(routeNameTranslator) {
    this.routeNameTranslator = routeNameTranslator;
  }

  /**
   * 路線名を翻訳
   * @param {string} japaneseRouteName - 日本語路線名
   * @returns {string} 翻訳された路線名
   */
  translateRouteName(japaneseRouteName) {
    // 日本語の場合は翻訳不要
    if (this.currentLocale === 'ja') {
      return japaneseRouteName;
    }

    // RouteNameTranslatorが設定されていない場合は元の名前を返す
    if (!this.routeNameTranslator) {
      console.warn('TranslationManager: RouteNameTranslatorが設定されていません');
      return japaneseRouteName;
    }

    // 英語の場合は翻訳を試行
    if (this.currentLocale === 'en') {
      const translated = this.routeNameTranslator.translateRouteName(japaneseRouteName);
      return translated || japaneseRouteName; // 翻訳が見つからない場合は元の名前を返す
    }

    // その他の言語の場合は元の名前を返す（将来の拡張用）
    return japaneseRouteName;
  }
}

// Node.js環境での使用に対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranslationManager;
}

// グローバルスコープに登録
if (typeof window !== 'undefined') {
  window.TranslationManager = TranslationManager;
} else if (typeof global !== 'undefined') {
  global.TranslationManager = TranslationManager;
}