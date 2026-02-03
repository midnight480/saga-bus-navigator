/**
 * 統一されたエラーハンドリングとログ出力モジュール
 * 
 * このモジュールは、全てのスクリプトで使用される統一されたエラーハンドリングと
 * ログ出力機能を提供します。
 * 
 * 主な機能:
 * - エラーカテゴリごとの適切な処理
 * - 統一されたログ出力フォーマット
 * - リトライ処理（指数バックオフ）
 * - エラーコンテキストの管理
 */

// ログレベル
const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

// エラーカテゴリ
const ErrorCategory = {
  DATA_CONVERSION: 'DATA_CONVERSION',    // データ変換エラー
  KV_OPERATION: 'KV_OPERATION',          // KV操作エラー
  DATA_LOADING: 'DATA_LOADING',          // データ読み込みエラー
  VERSION_MANAGEMENT: 'VERSION_MANAGEMENT', // バージョン管理エラー
  NETWORK: 'NETWORK',                    // ネットワークエラー
  VALIDATION: 'VALIDATION',              // バリデーションエラー
  UNKNOWN: 'UNKNOWN'                     // 不明なエラー
};

// リトライ設定
const RetryConfig = {
  MAX_ATTEMPTS: 5,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 30000,
  BACKOFF_MULTIPLIER: 2
};

/**
 * ログ出力クラス
 */
class Logger {
  constructor(context = '') {
    this.context = context;
    this.startTime = Date.now();
  }

  /**
   * ログメッセージをフォーマット
   * @param {string} level - ログレベル
   * @param {string} message - メッセージ
   * @param {Object} data - 追加データ
   * @returns {string} フォーマットされたログメッセージ
   */
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.startTime;
    const contextStr = this.context ? `[${this.context}]` : '';
    
    let logMessage = `[${timestamp}] [${level}]${contextStr} ${message}`;
    
    if (data) {
      logMessage += `\n  データ: ${JSON.stringify(data, null, 2)}`;
    }
    
    logMessage += ` (経過時間: ${elapsed}ms)`;
    
    return logMessage;
  }

  /**
   * DEBUGレベルのログを出力
   * @param {string} message - メッセージ
   * @param {Object} data - 追加データ
   */
  debug(message, data = null) {
    console.log(this.formatMessage(LogLevel.DEBUG, message, data));
  }

  /**
   * INFOレベルのログを出力
   * @param {string} message - メッセージ
   * @param {Object} data - 追加データ
   */
  info(message, data = null) {
    console.log(this.formatMessage(LogLevel.INFO, message, data));
  }

  /**
   * WARNレベルのログを出力
   * @param {string} message - メッセージ
   * @param {Object} data - 追加データ
   */
  warn(message, data = null) {
    console.warn(this.formatMessage(LogLevel.WARN, message, data));
  }

  /**
   * ERRORレベルのログを出力
   * @param {string} message - メッセージ
   * @param {Error|Object} error - エラーオブジェクトまたは追加データ
   */
  error(message, error = null) {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      code: error.code,
      category: error.category
    } : error;
    
    console.error(this.formatMessage(LogLevel.ERROR, message, errorData));
  }

  /**
   * 処理の開始をログ出力
   * @param {string} operation - 処理名
   * @param {Object} params - パラメータ
   */
  start(operation, params = null) {
    this.info(`${operation}を開始`, params);
  }

  /**
   * 処理の完了をログ出力
   * @param {string} operation - 処理名
   * @param {Object} result - 結果
   */
  complete(operation, result = null) {
    this.info(`${operation}が完了`, result);
  }

  /**
   * 処理の失敗をログ出力
   * @param {string} operation - 処理名
   * @param {Error} error - エラー
   */
  fail(operation, error) {
    this.error(`${operation}が失敗`, error);
  }
}

/**
 * カスタムエラークラス
 */
class GTFSError extends Error {
  constructor(message, category = ErrorCategory.UNKNOWN, details = null) {
    super(message);
    this.name = 'GTFSError';
    this.category = category;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  /**
   * エラー情報をJSON形式で取得
   * @returns {Object} エラー情報
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * エラーハンドラークラス
 */
class ErrorHandler {
  constructor(logger) {
    this.logger = logger || new Logger();
  }

  /**
   * エラーをラップして適切なカテゴリを設定
   * @param {Error} error - 元のエラー
   * @param {string} category - エラーカテゴリ
   * @param {string} context - エラーコンテキスト
   * @returns {GTFSError} ラップされたエラー
   */
  wrapError(error, category, context) {
    if (error instanceof GTFSError) {
      return error;
    }

    const message = `${context}: ${error.message}`;
    return new GTFSError(message, category, {
      originalError: error.message,
      originalStack: error.stack
    });
  }

  /**
   * データ変換エラーをハンドリング
   * @param {Error} error - エラー
   * @param {string} filename - ファイル名
   * @throws {GTFSError} ラップされたエラー
   */
  handleConversionError(error, filename) {
    const wrappedError = this.wrapError(
      error,
      ErrorCategory.DATA_CONVERSION,
      `${filename}の変換中にエラーが発生しました`
    );
    this.logger.fail(`データ変換 (${filename})`, wrappedError);
    throw wrappedError;
  }

  /**
   * KV操作エラーをハンドリング
   * @param {Error} error - エラー
   * @param {string} operation - 操作名
   * @param {string} key - KVキー
   * @throws {GTFSError} ラップされたエラー
   */
  handleKVError(error, operation, key) {
    const wrappedError = this.wrapError(
      error,
      ErrorCategory.KV_OPERATION,
      `KV ${operation}操作が失敗しました (キー: ${key})`
    );
    this.logger.fail(`KV ${operation} (${key})`, wrappedError);
    throw wrappedError;
  }

  /**
   * データ読み込みエラーをハンドリング
   * @param {Error} error - エラー
   * @param {string} source - データソース
   * @throws {GTFSError} ラップされたエラー
   */
  handleLoadingError(error, source) {
    const wrappedError = this.wrapError(
      error,
      ErrorCategory.DATA_LOADING,
      `${source}からのデータ読み込みが失敗しました`
    );
    this.logger.fail(`データ読み込み (${source})`, wrappedError);
    throw wrappedError;
  }

  /**
   * バージョン管理エラーをハンドリング
   * @param {Error} error - エラー
   * @param {string} operation - 操作名
   * @throws {GTFSError} ラップされたエラー
   */
  handleVersionError(error, operation) {
    const wrappedError = this.wrapError(
      error,
      ErrorCategory.VERSION_MANAGEMENT,
      `バージョン管理操作が失敗しました: ${operation}`
    );
    this.logger.fail(`バージョン管理 (${operation})`, wrappedError);
    throw wrappedError;
  }

  /**
   * ネットワークエラーをハンドリング
   * @param {Error} error - エラー
   * @param {string} url - URL
   * @throws {GTFSError} ラップされたエラー
   */
  handleNetworkError(error, url) {
    const wrappedError = this.wrapError(
      error,
      ErrorCategory.NETWORK,
      `ネットワークエラーが発生しました (URL: ${url})`
    );
    this.logger.fail(`ネットワーク通信 (${url})`, wrappedError);
    throw wrappedError;
  }

  /**
   * バリデーションエラーをハンドリング
   * @param {string} message - エラーメッセージ
   * @param {Object} details - 詳細情報
   * @throws {GTFSError} バリデーションエラー
   */
  handleValidationError(message, details) {
    const error = new GTFSError(message, ErrorCategory.VALIDATION, details);
    this.logger.fail('バリデーション', error);
    throw error;
  }
}

/**
 * リトライ処理クラス
 */
class RetryHandler {
  constructor(logger) {
    this.logger = logger || new Logger();
  }

  /**
   * 指数バックオフを使用したリトライ処理
   * @param {Function} fn - 実行する非同期関数
   * @param {Object} options - オプション
   * @param {number} options.maxAttempts - 最大試行回数
   * @param {number} options.initialDelay - 初期遅延時間（ミリ秒）
   * @param {number} options.maxDelay - 最大遅延時間（ミリ秒）
   * @param {number} options.backoffMultiplier - バックオフ倍率
   * @param {Function} options.shouldRetry - リトライすべきかを判定する関数
   * @returns {Promise<*>} 関数の実行結果
   * @throws {Error} 最大試行回数に達した場合
   */
  async retryWithBackoff(fn, options = {}) {
    const {
      maxAttempts = RetryConfig.MAX_ATTEMPTS,
      initialDelay = RetryConfig.INITIAL_DELAY_MS,
      maxDelay = RetryConfig.MAX_DELAY_MS,
      backoffMultiplier = RetryConfig.BACKOFF_MULTIPLIER,
      shouldRetry = this.defaultShouldRetry.bind(this)
    } = options;

    let attempts = 0;
    let delay = initialDelay;
    let lastError = null;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        this.logger.debug(`試行 ${attempts}/${maxAttempts}`);
        
        const result = await fn();
        
        if (attempts > 1) {
          this.logger.info(`リトライ成功 (試行回数: ${attempts})`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // リトライすべきかチェック
        if (!shouldRetry(error)) {
          this.logger.warn('リトライ不可能なエラーが発生しました', {
            error: error.message,
            attempts
          });
          throw error;
        }

        // 最大試行回数に達した場合
        if (attempts >= maxAttempts) {
          this.logger.error(`最大リトライ回数（${maxAttempts}回）に達しました`, error);
          throw new GTFSError(
            `最大リトライ回数（${maxAttempts}回）に達しました: ${error.message}`,
            ErrorCategory.KV_OPERATION,
            {
              attempts,
              originalError: error.message
            }
          );
        }

        // 次のリトライまで待機
        this.logger.warn(`リトライ ${attempts}/${maxAttempts}: ${delay}ms後に再試行します`, {
          error: error.message
        });
        
        await this.sleep(delay);
        
        // 遅延時間を増加（指数バックオフ）
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }

    // ここには到達しないはずだが、念のため
    throw lastError;
  }

  /**
   * デフォルトのリトライ判定関数
   * @param {Error} error - エラー
   * @returns {boolean} リトライすべき場合はtrue
   */
  defaultShouldRetry(error) {
    // レート制限エラー（429）の場合はリトライ
    if (error.message && (
      error.message.includes('429') ||
      error.message.includes('Too Many Requests') ||
      error.message.includes('rate limit')
    )) {
      return true;
    }

    // 一時的なネットワークエラーの場合はリトライ
    if (error.message && (
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('network')
    )) {
      return true;
    }

    // その他のエラーはリトライしない
    return false;
  }

  /**
   * 指定時間待機
   * @param {number} ms - 待機時間（ミリ秒）
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// エクスポート（CommonJSとESモジュールの両方に対応）
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS
  module.exports = {
    Logger,
    ErrorHandler,
    RetryHandler,
    GTFSError,
    LogLevel,
    ErrorCategory,
    RetryConfig
  };
}

// ESモジュール用のエクスポート
export {
  Logger,
  ErrorHandler,
  RetryHandler,
  GTFSError,
  LogLevel,
  ErrorCategory,
  RetryConfig
};
