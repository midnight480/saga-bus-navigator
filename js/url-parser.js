/**
 * URLParser - テキスト内のURLを検出してハイパーリンク化する
 * 
 * 責務:
 * - HTTP・HTTPSプロトコルのURL検出
 * - セキュリティ属性付きハイパーリンクへの変換
 * - 複数URLの一括処理
 * 
 * Feature: alert-enhancement
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */
class URLParser {
  /**
   * URL検出用の正規表現
   * HTTP・HTTPSプロトコルのURLを検出する
   * 
   * パターン説明:
   * - https?:// - http:// または https://
   * - [^\s<>"{}|\\^`[\]]+ - 空白、HTML特殊文字、その他の特殊文字以外の文字列
   */
  static URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

  /**
   * テキスト内のURLを検出してハイパーリンク化する
   * @param {string} text - 処理対象のテキスト
   * @returns {string} URLがハイパーリンク化されたHTML文字列
   */
  static parseURLs(text) {
    if (!text || typeof text !== 'string') {
      return text || '';
    }

    // URLを検出して置換
    return text.replace(URLParser.URL_REGEX, (url) => {
      return URLParser.createSecureLink(url, url);
    });
  }

  /**
   * セキュリティ属性付きのハイパーリンクを作成
   * @param {string} url - リンク先URL
   * @param {string} displayText - 表示テキスト
   * @returns {string} セキュリティ属性付きのaタグHTML
   */
  static createSecureLink(url, displayText) {
    // URLをエスケープしてXSS攻撃を防ぐ
    const escapedUrl = URLParser.escapeHtml(url);
    const escapedText = URLParser.escapeHtml(displayText);
    
    return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${escapedText}</a>`;
  }

  /**
   * HTML特殊文字をエスケープ
   * @param {string} text - エスケープ対象のテキスト
   * @returns {string} エスケープされたテキスト
   */
  static escapeHtml(text) {
    if (!text || typeof text !== 'string') {
      return text || '';
    }
    
    const htmlEntities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    
    return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
  }

  /**
   * テキスト内のURL数をカウント
   * @param {string} text - 処理対象のテキスト
   * @returns {number} 検出されたURL数
   */
  static countURLs(text) {
    if (!text || typeof text !== 'string') {
      return 0;
    }
    
    const matches = text.match(URLParser.URL_REGEX);
    return matches ? matches.length : 0;
  }

  /**
   * テキスト内のURLを抽出
   * @param {string} text - 処理対象のテキスト
   * @returns {string[]} 検出されたURLの配列
   */
  static extractURLs(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }
    
    const matches = text.match(URLParser.URL_REGEX);
    return matches || [];
  }

  /**
   * URLが有効かどうかを検証
   * @param {string} url - 検証対象のURL
   * @returns {boolean} 有効なURLの場合true
   */
  static isValidURL(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
  window.URLParser = URLParser;
}

// Node.js環境でのエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = URLParser;
}
