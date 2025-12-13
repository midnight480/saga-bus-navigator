/**
 * 翻訳データの構造検証機能
 * 要件5.1, 5.3に対応
 */
class TranslationValidator {
  /**
   * 翻訳データの構造を検証する
   * @param {Object} translations - 検証対象の翻訳データ
   * @param {string} locale - ロケール（ja, en等）
   * @returns {Object} 検証結果 { isValid: boolean, errors: string[] }
   */
  static validateStructure(translations, locale) {
    const errors = [];
    
    if (!translations || typeof translations !== 'object') {
      errors.push(`Invalid translations object for locale: ${locale}`);
      return { isValid: false, errors };
    }
    
    // 必須セクションの検証
    const requiredSections = ['app', 'search', 'time', 'results', 'map', 'footer', 'modal', 'error'];
    
    for (const section of requiredSections) {
      if (!translations[section] || typeof translations[section] !== 'object') {
        errors.push(`Missing or invalid section: ${section} in locale: ${locale}`);
      }
    }
    
    // 各セクションの必須キーを検証
    const sectionRequirements = {
      app: ['title', 'subtitle'],
      search: ['departure_stop', 'arrival_stop', 'search_button', 'clear_results'],
      time: ['weekday', 'weekend', 'departure_time', 'arrival_time', 'now', 'first_bus', 'last_bus'],
      results: ['loading', 'no_results', 'route', 'departure', 'arrival', 'fare', 'duration'],
      map: ['select_from_map', 'clear_route', 'direction_both', 'direction_outbound', 'direction_inbound'],
      footer: ['usage', 'contact', 'data_source'],
      modal: ['close', 'calendar_register', 'ical_download', 'google_calendar'],
      error: ['data_load_failed', 'retry', 'invalid_time', 'select_stops']
    };
    
    for (const [section, requiredKeys] of Object.entries(sectionRequirements)) {
      if (translations[section]) {
        for (const key of requiredKeys) {
          if (!translations[section][key] || typeof translations[section][key] !== 'string') {
            errors.push(`Missing or invalid key: ${section}.${key} in locale: ${locale}`);
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * 複数のロケールの翻訳データの整合性を検証する
   * @param {Object} allTranslations - 全ロケールの翻訳データ { ja: {...}, en: {...} }
   * @returns {Object} 検証結果 { isValid: boolean, errors: string[] }
   */
  static validateConsistency(allTranslations) {
    const errors = [];
    const locales = Object.keys(allTranslations);
    
    if (locales.length < 2) {
      errors.push('At least two locales are required for consistency validation');
      return { isValid: false, errors };
    }
    
    // 基準となるロケール（最初のロケール）のキー構造を取得
    const baseLocale = locales[0];
    const baseKeys = this.extractAllKeys(allTranslations[baseLocale]);
    
    // 他のロケールと比較
    for (let i = 1; i < locales.length; i++) {
      const currentLocale = locales[i];
      const currentKeys = this.extractAllKeys(allTranslations[currentLocale]);
      
      // 不足しているキーをチェック
      for (const key of baseKeys) {
        if (!currentKeys.has(key)) {
          errors.push(`Missing key: ${key} in locale: ${currentLocale}`);
        }
      }
      
      // 余分なキーをチェック
      for (const key of currentKeys) {
        if (!baseKeys.has(key)) {
          errors.push(`Extra key: ${key} in locale: ${currentLocale}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * オブジェクトから全てのキーパスを抽出する
   * @param {Object} obj - 対象オブジェクト
   * @param {string} prefix - キーのプレフィックス
   * @returns {Set<string>} キーパスのセット
   */
  static extractAllKeys(obj, prefix = '') {
    const keys = new Set();
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        // ネストしたオブジェクトの場合、再帰的に処理
        const nestedKeys = this.extractAllKeys(value, fullKey);
        for (const nestedKey of nestedKeys) {
          keys.add(nestedKey);
        }
      } else {
        // 文字列値の場合、キーを追加
        keys.add(fullKey);
      }
    }
    
    return keys;
  }
  
  /**
   * 翻訳値が空白のみでないかチェック
   * @param {Object} translations - 翻訳データ
   * @param {string} locale - ロケール
   * @returns {Object} 検証結果 { isValid: boolean, errors: string[] }
   */
  static validateNonEmptyValues(translations, locale) {
    const errors = [];
    
    const checkValues = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null) {
          checkValues(value, fullKey);
        } else if (typeof value === 'string') {
          if (!value.trim()) {
            errors.push(`Empty or whitespace-only value for key: ${fullKey} in locale: ${locale}`);
          }
        }
      }
    };
    
    checkValues(translations);
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Node.js環境での使用をサポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranslationValidator;
}