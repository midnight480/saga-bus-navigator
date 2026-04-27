/**
 * AlertEnhancer - お知らせ機能の拡張を統括するメインコンポーネント
 * 
 * 責務:
 * - URLParser、TranslationService、TranslationCacheを統合
 * - 言語設定に応じた表示制御ロジック
 * - 非同期翻訳処理とUI更新機能
 * - ローディング状態の管理
 * 
 * Feature: alert-enhancement
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 6.2, 6.3
 */
class AlertEnhancer {
  /**
   * デフォルト設定
   */
  static DEFAULT_SOURCE_LANGUAGE = 'ja';
  static DEFAULT_TARGET_LANGUAGE = 'en';

  /**
   * コンストラクタ
   * @param {Object} options - 設定オプション
   * @param {TranslationService} options.translationService - 翻訳サービス
   * @param {Object} options.languageManager - 言語管理システム（getLanguage()メソッドを持つ）
   */
  constructor(options = {}) {
    this.translationService = options.translationService || null;
    this.languageManager = options.languageManager || null;
    
    // 処理中のお知らせを追跡（重複処理防止）
    this.processingAlerts = new Map();
    
    // ローディング状態のコールバック
    this.onLoadingStateChange = options.onLoadingStateChange || null;
  }

  /**
   * 翻訳機能が有効かどうかを確認
   * @returns {boolean} 翻訳機能が有効な場合true
   */
  isTranslationEnabled() {
    return !!(this.translationService && this.translationService.isConfigured());
  }

  /**
   * 現在の言語設定を取得
   * @returns {string} 言語コード（'ja' | 'en'）
   */
  getCurrentLanguage() {
    if (this.languageManager && typeof this.languageManager.getLanguage === 'function') {
      return this.languageManager.getLanguage();
    }
    return AlertEnhancer.DEFAULT_SOURCE_LANGUAGE;
  }

  /**
   * 翻訳が必要かどうかを判定
   * @returns {boolean} 翻訳が必要な場合true
   */
  shouldTranslate() {
    const currentLanguage = this.getCurrentLanguage();
    return currentLanguage !== AlertEnhancer.DEFAULT_SOURCE_LANGUAGE && this.isTranslationEnabled();
  }

  /**
   * お知らせデータを処理
   * @param {Object} alertData - お知らせデータ
   * @param {Object} options - 処理オプション
   * @param {Function} options.onTranslationComplete - 翻訳完了時のコールバック
   * @returns {Promise<Object>} 処理済みお知らせデータ
   */
  async processAlert(alertData, options = {}) {
    if (!alertData) {
      return this._createEnhancedAlert(null);
    }

    const alertId = alertData.id || this._generateAlertId(alertData);
    
    // 基本的な処理済みお知らせを作成（URLハイパーリンク化）
    const enhancedAlert = this._createEnhancedAlert(alertData);

    // 翻訳が不要な場合は即座に返す
    if (!this.shouldTranslate()) {
      return enhancedAlert;
    }

    // 翻訳処理を開始
    enhancedAlert.isLoading = true;
    
    // ローディング状態を通知
    if (this.onLoadingStateChange) {
      this.onLoadingStateChange(alertId, true);
    }

    // 非同期で翻訳を実行
    this._translateAlertAsync(enhancedAlert, alertId, options.onTranslationComplete);

    return enhancedAlert;
  }

  /**
   * 処理済みお知らせオブジェクトを作成
   * @private
   * @param {Object} alertData - 元のお知らせデータ
   * @returns {Object} 処理済みお知らせオブジェクト
   */
  _createEnhancedAlert(alertData) {
    if (!alertData) {
      return {
        id: null,
        headerText: '',
        descriptionText: '',
        processedHeaderText: '',
        processedDescriptionText: '',
        translatedHeaderText: null,
        translatedDescriptionText: null,
        hasTranslation: false,
        isLoading: false,
        activeStart: null,
        activeEnd: null,
        url: null
      };
    }

    const headerText = alertData.headerText || '';
    const descriptionText = alertData.descriptionText || '';

    return {
      id: alertData.id || this._generateAlertId(alertData),
      headerText: headerText,
      descriptionText: descriptionText,
      processedHeaderText: headerText,
      processedDescriptionText: descriptionText,
      translatedHeaderText: null,
      translatedDescriptionText: null,
      hasTranslation: false,
      isLoading: false,
      activeStart: alertData.activeStart || null,
      activeEnd: alertData.activeEnd || null,
      url: alertData.url || null
    };
  }

  /**
   * お知らせIDを生成
   * @private
   * @param {Object} alertData - お知らせデータ
   * @returns {string} 生成されたID
   */
  _generateAlertId(alertData) {
    const text = (alertData.headerText || '') + (alertData.descriptionText || '');
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `alert-${Math.abs(hash)}`;
  }

  /**
   * 非同期で翻訳を実行
   * @private
   * @param {Object} enhancedAlert - 処理済みお知らせオブジェクト
   * @param {string} alertId - お知らせID
   * @param {Function} onComplete - 完了時のコールバック
   */
  async _translateAlertAsync(enhancedAlert, alertId, onComplete) {
    try {
      // 重複処理を防止
      if (this.processingAlerts.has(alertId)) {
        return;
      }
      this.processingAlerts.set(alertId, true);

      const targetLanguage = this.getCurrentLanguage();
      const sourceLanguage = AlertEnhancer.DEFAULT_SOURCE_LANGUAGE;

      // ヘッダーテキストの翻訳
      if (enhancedAlert.headerText) {
        const translatedHeader = await this.translationService.translateText(
          enhancedAlert.headerText,
          sourceLanguage,
          targetLanguage
        );
        
        // 翻訳結果が元のテキストと異なる場合のみ設定
        if (translatedHeader !== enhancedAlert.headerText) {
          enhancedAlert.translatedHeaderText = translatedHeader;
          enhancedAlert.hasTranslation = true;
        }
      }

      // 説明テキストの翻訳
      if (enhancedAlert.descriptionText) {
        const translatedDescription = await this.translationService.translateText(
          enhancedAlert.descriptionText,
          sourceLanguage,
          targetLanguage
        );
        
        // 翻訳結果が元のテキストと異なる場合のみ設定
        if (translatedDescription !== enhancedAlert.descriptionText) {
          enhancedAlert.translatedDescriptionText = translatedDescription;
          enhancedAlert.hasTranslation = true;
        }
      }

    } catch (error) {
      console.warn('AlertEnhancer: 翻訳処理でエラーが発生しました', error);
      // エラー時は元のテキストを使用（hasTranslationはfalseのまま）
    } finally {
      // ローディング状態を解除
      enhancedAlert.isLoading = false;
      this.processingAlerts.delete(alertId);

      // ローディング状態を通知
      if (this.onLoadingStateChange) {
        this.onLoadingStateChange(alertId, false);
      }

      // 完了コールバックを呼び出し
      if (onComplete && typeof onComplete === 'function') {
        onComplete(enhancedAlert);
      }
    }
  }

  /**
   * 表示用テキストを取得
   * @param {Object} enhancedAlert - 処理済みお知らせオブジェクト
   * @param {string} field - フィールド名（'header' | 'description'）
   * @returns {string} 表示用テキスト（HTML）
   */
  getDisplayText(enhancedAlert, field) {
    if (!enhancedAlert) {
      return '';
    }

    const currentLanguage = this.getCurrentLanguage();
    const isJapanese = currentLanguage === AlertEnhancer.DEFAULT_SOURCE_LANGUAGE;

    if (field === 'header') {
      // 日本語設定の場合、または翻訳がない場合は処理済み日本語テキストを返す
      if (isJapanese || !enhancedAlert.hasTranslation || !enhancedAlert.translatedHeaderText) {
        return enhancedAlert.processedHeaderText || '';
      }
      return enhancedAlert.translatedHeaderText;
    }

    if (field === 'description') {
      // 日本語設定の場合、または翻訳がない場合は処理済み日本語テキストを返す
      if (isJapanese || !enhancedAlert.hasTranslation || !enhancedAlert.translatedDescriptionText) {
        return enhancedAlert.processedDescriptionText || '';
      }
      return enhancedAlert.translatedDescriptionText;
    }

    return '';
  }

  /**
   * 言語変更時の処理
   * @param {string} newLanguage - 新しい言語コード
   */
  onLanguageChange(newLanguage) {
    // 処理中のお知らせをクリア
    this.processingAlerts.clear();
  }

  /**
   * 複数のお知らせを一括処理
   * @param {Array} alertsData - お知らせデータの配列
   * @param {Object} options - 処理オプション
   * @returns {Promise<Array>} 処理済みお知らせの配列
   */
  async processAlerts(alertsData, options = {}) {
    if (!Array.isArray(alertsData)) {
      return [];
    }

    const results = await Promise.all(
      alertsData.map(alertData => this.processAlert(alertData, options))
    );

    return results;
  }

  /**
   * サービスの状態を取得
   * @returns {Object} サービス状態
   */
  getStatus() {
    return {
      translationEnabled: this.isTranslationEnabled(),
      currentLanguage: this.getCurrentLanguage(),
      shouldTranslate: this.shouldTranslate(),
      processingCount: this.processingAlerts.size,
      hasTranslationService: !!this.translationService,
      hasLanguageManager: !!this.languageManager
    };
  }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
  window.AlertEnhancer = AlertEnhancer;
}

// Node.js環境でのエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AlertEnhancer;
}
