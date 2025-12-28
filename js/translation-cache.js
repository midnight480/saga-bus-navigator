/**
 * TranslationCache - 翻訳結果のキャッシュ管理
 * 
 * 責務:
 * - ローカルストレージベースのキャッシュシステム
 * - 最大100エントリ、24時間TTLの制限
 * - キャッシュキーの生成とエントリ管理
 * 
 * Feature: alert-enhancement
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */
class TranslationCache {
  /**
   * ストレージキー
   */
  static STORAGE_KEY = 'saga-bus-nav-translation-cache';

  /**
   * デフォルト設定
   */
  static DEFAULT_MAX_SIZE = 100;
  static DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24時間（ミリ秒）

  /**
   * コンストラクタ
   * @param {number} maxSize - 最大エントリ数（デフォルト: 100）
   * @param {number} ttl - 有効期限（ミリ秒、デフォルト: 24時間）
   */
  constructor(maxSize = TranslationCache.DEFAULT_MAX_SIZE, ttl = TranslationCache.DEFAULT_TTL) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
    this._loadFromStorage();
  }

  /**
   * キャッシュキーを生成
   * @param {string} text - 元のテキスト
   * @param {string} sourceLanguage - ソース言語
   * @param {string} targetLanguage - ターゲット言語
   * @returns {string} キャッシュキー
   */
  _generateKey(text, sourceLanguage, targetLanguage) {
    return `${sourceLanguage}:${targetLanguage}:${text}`;
  }

  /**
   * ローカルストレージからキャッシュを読み込み
   * @private
   */
  _loadFromStorage() {
    try {
      const stored = localStorage.getItem(TranslationCache.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
          // 有効なエントリのみを読み込み
          const now = Date.now();
          data.forEach(entry => {
            if (entry && entry.key && entry.value && entry.timestamp) {
              // 有効期限内のエントリのみを追加
              if (now - entry.timestamp < this.ttl) {
                this.cache.set(entry.key, {
                  value: entry.value,
                  timestamp: entry.timestamp
                });
              }
            }
          });
        }
      }
    } catch (error) {
      console.warn('TranslationCache: ローカルストレージの読み込みに失敗しました', error);
      this.cache = new Map();
    }
  }

  /**
   * キャッシュをローカルストレージに保存
   * @private
   */
  _saveToStorage() {
    try {
      const data = [];
      this.cache.forEach((entry, key) => {
        data.push({
          key,
          value: entry.value,
          timestamp: entry.timestamp
        });
      });
      localStorage.setItem(TranslationCache.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('TranslationCache: ローカルストレージへの保存に失敗しました', error);
    }
  }

  /**
   * キャッシュから翻訳結果を取得
   * @param {string} text - 元のテキスト
   * @param {string} sourceLanguage - ソース言語（デフォルト: 'ja'）
   * @param {string} targetLanguage - ターゲット言語（デフォルト: 'en'）
   * @returns {string|null} キャッシュされた翻訳結果、またはnull
   */
  get(text, sourceLanguage = 'ja', targetLanguage = 'en') {
    if (!text || typeof text !== 'string') {
      return null;
    }

    const key = this._generateKey(text, sourceLanguage, targetLanguage);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 有効期限チェック
    const now = Date.now();
    if (now - entry.timestamp >= this.ttl) {
      // 期限切れのエントリを削除
      this.cache.delete(key);
      this._saveToStorage();
      return null;
    }

    return entry.value;
  }

  /**
   * 翻訳結果をキャッシュに保存
   * @param {string} text - 元のテキスト
   * @param {string} translatedText - 翻訳結果
   * @param {string} sourceLanguage - ソース言語（デフォルト: 'ja'）
   * @param {string} targetLanguage - ターゲット言語（デフォルト: 'en'）
   * @returns {boolean} 保存成功の場合true
   */
  set(text, translatedText, sourceLanguage = 'ja', targetLanguage = 'en') {
    if (!text || typeof text !== 'string') {
      return false;
    }

    if (!translatedText || typeof translatedText !== 'string') {
      return false;
    }

    const key = this._generateKey(text, sourceLanguage, targetLanguage);

    // キャッシュサイズ制限のチェック
    if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
      // 古いエントリを削除
      this._evictOldestEntry();
    }

    // エントリを追加/更新
    this.cache.set(key, {
      value: translatedText,
      timestamp: Date.now()
    });

    // ストレージに保存
    this._saveToStorage();

    return true;
  }

  /**
   * 最も古いエントリを削除
   * @private
   */
  _evictOldestEntry() {
    let oldestKey = null;
    let oldestTimestamp = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 期限切れのエントリを削除
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp >= this.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });

    if (keysToDelete.length > 0) {
      this._saveToStorage();
    }

    return keysToDelete.length;
  }

  /**
   * キャッシュをクリア
   */
  clear() {
    this.cache.clear();
    try {
      localStorage.removeItem(TranslationCache.STORAGE_KEY);
    } catch (error) {
      console.warn('TranslationCache: ローカルストレージのクリアに失敗しました', error);
    }
  }

  /**
   * キャッシュのサイズを取得
   * @returns {number} キャッシュエントリ数
   */
  size() {
    return this.cache.size;
  }

  /**
   * キャッシュにエントリが存在するかチェック
   * @param {string} text - 元のテキスト
   * @param {string} sourceLanguage - ソース言語（デフォルト: 'ja'）
   * @param {string} targetLanguage - ターゲット言語（デフォルト: 'en'）
   * @returns {boolean} エントリが存在する場合true
   */
  has(text, sourceLanguage = 'ja', targetLanguage = 'en') {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const key = this._generateKey(text, sourceLanguage, targetLanguage);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // 有効期限チェック
    const now = Date.now();
    if (now - entry.timestamp >= this.ttl) {
      return false;
    }

    return true;
  }

  /**
   * キャッシュの統計情報を取得
   * @returns {Object} 統計情報
   */
  getStats() {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;

    this.cache.forEach((entry) => {
      if (now - entry.timestamp < this.ttl) {
        validCount++;
      } else {
        expiredCount++;
      }
    });

    return {
      totalEntries: this.cache.size,
      validEntries: validCount,
      expiredEntries: expiredCount,
      maxSize: this.maxSize,
      ttl: this.ttl
    };
  }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
  window.TranslationCache = TranslationCache;
}

// Node.js環境でのエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranslationCache;
}
