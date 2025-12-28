/**
 * TranslationService - Amazon Translateとの連携を管理
 * 
 * 責務:
 * - Cloudflare Pages Functions経由でAmazon Translate APIを呼び出し
 * - 翻訳エラーハンドリングとフォールバック
 * - 5秒タイムアウト処理
 * 
 * Feature: alert-enhancement
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.1, 5.2, 5.3, 5.4, 5.5
 */
class TranslationService {
  /**
   * デフォルト設定
   */
  static DEFAULT_TIMEOUT = 5000; // 5秒
  static DEFAULT_SOURCE_LANGUAGE = 'ja';
  static DEFAULT_TARGET_LANGUAGE = 'en';
  static DEFAULT_API_ENDPOINT = '/api/translate';

  /**
   * コンストラクタ
   * @param {Object} config - 設定オブジェクト
   * @param {string} config.apiEndpoint - 翻訳APIエンドポイント（デフォルト: /api/translate）
   * @param {number} config.timeout - タイムアウト（ミリ秒）
   * @param {TranslationCache} config.cache - キャッシュインスタンス
   * @param {boolean} config.enabled - 翻訳機能の有効/無効（デフォルト: true）
   */
  constructor(config = {}) {
    this.apiEndpoint = config.apiEndpoint || TranslationService.DEFAULT_API_ENDPOINT;
    this.timeout = config.timeout || TranslationService.DEFAULT_TIMEOUT;
    this.cache = config.cache || null;
    this._enabled = config.enabled !== false;
    this._configured = this._enabled;
    this._authFailed = false;
  }

  /**
   * 設定の確認
   * @private
   * @returns {boolean} 設定が有効な場合true
   */
  _checkConfiguration() {
    return this._enabled && !this._authFailed;
  }

  /**
   * 翻訳機能が設定されているかを確認
   * @returns {boolean} 設定されている場合true
   */
  isConfigured() {
    return this._checkConfiguration();
  }

  /**
   * 設定を更新
   * @param {Object} config - 新しい設定
   */
  updateConfig(config) {
    if (config.apiEndpoint !== undefined) {
      this.apiEndpoint = config.apiEndpoint;
    }
    if (config.timeout !== undefined) {
      this.timeout = config.timeout;
    }
    if (config.cache !== undefined) {
      this.cache = config.cache;
    }
    if (config.enabled !== undefined) {
      this._enabled = config.enabled;
      // 有効化時は認証失敗フラグをリセット
      if (config.enabled) {
        this._authFailed = false;
      }
    }
    this._configured = this._checkConfiguration();
  }

  /**
   * テキストを翻訳
   * @param {string} text - 翻訳対象のテキスト
   * @param {string} sourceLanguage - ソース言語（デフォルト: 'ja'）
   * @param {string} targetLanguage - ターゲット言語（デフォルト: 'en'）
   * @returns {Promise<string>} 翻訳結果（エラー時は元のテキスト）
   */
  async translateText(
    text,
    sourceLanguage = TranslationService.DEFAULT_SOURCE_LANGUAGE,
    targetLanguage = TranslationService.DEFAULT_TARGET_LANGUAGE
  ) {
    // 入力検証
    if (!text || typeof text !== 'string') {
      return text || '';
    }

    // 空白のみのテキストはそのまま返す
    if (text.trim().length === 0) {
      return text;
    }

    // 翻訳機能が設定されていない場合は元のテキストを返す
    if (!this.isConfigured()) {
      return text;
    }

    // 同じ言語への翻訳は不要
    if (sourceLanguage === targetLanguage) {
      return text;
    }

    // キャッシュから取得を試みる
    if (this.cache) {
      const cachedResult = this.cache.get(text, sourceLanguage, targetLanguage);
      if (cachedResult !== null) {
        return cachedResult;
      }
    }

    // API呼び出し
    try {
      const translatedText = await this._callTranslateAPI(text, sourceLanguage, targetLanguage);
      
      // キャッシュに保存
      if (this.cache && translatedText !== text) {
        this.cache.set(text, translatedText, sourceLanguage, targetLanguage);
      }
      
      return translatedText;
    } catch (error) {
      // エラーハンドリング: 元のテキストを返す
      this._handleTranslationError(error);
      return text;
    }
  }

  /**
   * 翻訳APIを呼び出す
   * @private
   * @param {string} text - 翻訳対象のテキスト
   * @param {string} sourceLanguage - ソース言語
   * @param {string} targetLanguage - ターゲット言語
   * @returns {Promise<string>} 翻訳結果
   */
  async _callTranslateAPI(text, sourceLanguage, targetLanguage) {
    // AbortControllerでタイムアウトを実装
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const requestBody = {
        text: text,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage
      };

      const headers = {
        'Content-Type': 'application/json'
      };

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // エラーレスポンスの解析を試みる
        let errorCode = 'API_ERROR';
        try {
          const errorBody = await response.json();
          if (errorBody.code) {
            errorCode = errorBody.code;
          }
        } catch {
          // JSONパースに失敗した場合はデフォルトのエラーコードを使用
        }

        throw new TranslationError(
          `API error: ${response.status} ${response.statusText}`,
          errorCode,
          response.status
        );
      }

      const result = await response.json();
      
      if (!result || typeof result.translatedText !== 'string') {
        throw new TranslationError(
          'Invalid API response format',
          'INVALID_RESPONSE'
        );
      }

      return result.translatedText;
    } catch (error) {
      clearTimeout(timeoutId);

      // AbortErrorはタイムアウトとして処理
      if (error.name === 'AbortError') {
        throw new TranslationError(
          `Translation timeout after ${this.timeout}ms`,
          'TIMEOUT'
        );
      }

      // ネットワークエラー
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new TranslationError(
          'Network error during translation',
          'NETWORK_ERROR'
        );
      }

      // TranslationErrorはそのまま再スロー
      if (error instanceof TranslationError) {
        throw error;
      }

      // その他のエラー
      throw new TranslationError(
        error.message || 'Unknown translation error',
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * 翻訳エラーを処理
   * @private
   * @param {Error} error - エラーオブジェクト
   */
  _handleTranslationError(error) {
    const errorInfo = {
      message: error.message,
      code: error.code || 'UNKNOWN',
      timestamp: new Date().toISOString()
    };

    // コンソールにエラーをログ
    console.warn('TranslationService: 翻訳エラーが発生しました', errorInfo);

    // 認証エラーまたはAWS認証情報未設定の場合は翻訳機能を無効化
    if (
      error.code === 'AUTH_ERROR' ||
      error.code === 'AUTH_NOT_CONFIGURED' ||
      error.statusCode === 401 ||
      error.statusCode === 403 ||
      error.statusCode === 503
    ) {
      console.warn('TranslationService: 認証エラーのため翻訳機能を無効化します');
      this._authFailed = true;
      this._configured = false;
    }
  }

  /**
   * 複数のテキストを一括翻訳
   * @param {string[]} texts - 翻訳対象のテキスト配列
   * @param {string} sourceLanguage - ソース言語
   * @param {string} targetLanguage - ターゲット言語
   * @returns {Promise<string[]>} 翻訳結果の配列
   */
  async translateTexts(
    texts,
    sourceLanguage = TranslationService.DEFAULT_SOURCE_LANGUAGE,
    targetLanguage = TranslationService.DEFAULT_TARGET_LANGUAGE
  ) {
    if (!Array.isArray(texts)) {
      return [];
    }

    const results = await Promise.all(
      texts.map(text => this.translateText(text, sourceLanguage, targetLanguage))
    );

    return results;
  }

  /**
   * サービスの状態を取得
   * @returns {Object} サービス状態
   */
  getStatus() {
    return {
      configured: this._checkConfiguration(),
      enabled: this._enabled,
      authFailed: this._authFailed,
      apiEndpoint: this.apiEndpoint,
      timeout: this.timeout,
      hasCache: !!this.cache
    };
  }
}

/**
 * TranslationError - 翻訳エラークラス
 */
class TranslationError extends Error {
  /**
   * コンストラクタ
   * @param {string} message - エラーメッセージ
   * @param {string} code - エラーコード
   * @param {number} statusCode - HTTPステータスコード（オプション）
   */
  constructor(message, code, statusCode = null) {
    super(message);
    this.name = 'TranslationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
  window.TranslationService = TranslationService;
  window.TranslationError = TranslationError;
}

// Node.js環境でのエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TranslationService, TranslationError };
}
