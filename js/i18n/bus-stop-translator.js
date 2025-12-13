/**
 * バス停名の翻訳処理を行うクラス
 * CSVマッピングファイルを使用してバス停名を翻訳する
 */
class BusStopTranslator {
  constructor(mappingData = []) {
    this.mappingCache = new Map();
    this.isLoaded = false;
    this.currentLanguage = 'ja'; // デフォルトは日本語
    
    if (mappingData.length > 0) {
      this.loadMappingFromData(mappingData);
    }
  }

  /**
   * バス停名を翻訳
   * @param {string} japaneseStopName - 日本語バス停名
   * @returns {string} 翻訳されたバス停名
   */
  translateStopName(japaneseStopName) {
    if (!japaneseStopName || typeof japaneseStopName !== 'string') {
      return japaneseStopName || '';
    }

    // 現在の言語が日本語の場合は翻訳不要
    if (this.currentLanguage === 'ja') {
      return japaneseStopName;
    }

    // キャッシュから翻訳を取得
    if (this.mappingCache.has(japaneseStopName)) {
      const mapping = this.mappingCache.get(japaneseStopName);
      return mapping.english;
    }

    // マッピングが見つからない場合は元の日本語名を返す
    return japaneseStopName;
  }

  /**
   * バス停マッピングのソースを取得
   * @param {string} japaneseStopName - 日本語バス停名
   * @returns {'Mapped'|'Auto-translated'|null} マッピングソース
   */
  getMappingSource(japaneseStopName) {
    if (this.mappingCache.has(japaneseStopName)) {
      const mapping = this.mappingCache.get(japaneseStopName);
      return mapping.source;
    }
    return null;
  }

  /**
   * マッピングデータからキャッシュを構築
   * @param {Array<Object>} mappingData - マッピングデータ配列
   */
  loadMappingFromData(mappingData) {
    this.mappingCache.clear();
    
    mappingData.forEach(mapping => {
      if (this.isValidMapping(mapping)) {
        const existingMapping = this.mappingCache.get(mapping.japanese);
        
        // 優先順位: Mapped > Auto-translated
        // 同じソースタイプの場合は後から読み込まれたものを優先
        if (!existingMapping || 
            (mapping.source === 'Mapped' && existingMapping.source === 'Auto-translated') ||
            (mapping.source === existingMapping.source)) {
          this.mappingCache.set(mapping.japanese, {
            english: mapping.english,
            source: mapping.source
          });
        }
      }
    });
    
    this.isLoaded = true;
    console.log(`バス停マッピングを読み込みました: ${this.mappingCache.size}件`);
  }

  /**
   * CSVファイルからマッピングデータを読み込み
   * @returns {Promise<void>}
   */
  async loadMappingData() {
    try {
      const response = await fetch('/data/bus_stops_mapping.csv');
      if (!response.ok) {
        throw new Error(`バス停マッピングファイルの読み込みに失敗しました: ${response.status}`);
      }

      const csvText = await response.text();
      const mappingData = this.parseBusStopMappingCSV(csvText);
      this.loadMappingFromData(mappingData);
      
    } catch (error) {
      console.error('バス停マッピングの読み込みエラー:', error);
      // エラーが発生してもアプリケーションは継続
      this.isLoaded = false;
    }
  }

  /**
   * CSVテキストを解析してマッピングデータに変換
   * @param {string} csvText - CSVテキスト
   * @returns {Array<Object>} マッピングデータ配列
   */
  parseBusStopMappingCSV(csvText) {
    const lines = csvText.split('\n');
    const mappings = [];
    
    // ヘッダー行をスキップ（1行目）
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // 空行をスキップ
      
      try {
        const [japanese, english, source] = this.parseCSVLine(line);
        
        if (this.isValidBusStopName(japanese) && this.isValidBusStopName(english)) {
          mappings.push({
            japanese: japanese.trim(),
            english: english.trim(),
            source: source && source.trim() ? source.trim() : 'Auto-translated'
          });
        }
      } catch (error) {
        console.warn(`CSV行の解析に失敗しました (行 ${i + 1}): ${line}`, error);
      }
    }
    
    return mappings;
  }

  /**
   * CSV行を解析
   * @param {string} line - CSV行
   * @returns {Array<string>} 解析された値の配列
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current); // 最後のフィールドを追加
    return result;
  }

  /**
   * バス停名の妥当性をチェック
   * @param {string} stopName - バス停名
   * @returns {boolean} 妥当かどうか
   */
  isValidBusStopName(stopName) {
    return stopName && 
           typeof stopName === 'string' && 
           stopName.trim().length > 0 &&
           stopName.trim().length <= 100; // 最大長制限
  }

  /**
   * マッピングオブジェクトの妥当性をチェック
   * @param {Object} mapping - マッピングオブジェクト
   * @returns {boolean} 妥当かどうか
   */
  isValidMapping(mapping) {
    return mapping &&
           typeof mapping === 'object' &&
           this.isValidBusStopName(mapping.japanese) &&
           this.isValidBusStopName(mapping.english) &&
           (mapping.source === 'Mapped' || mapping.source === 'Auto-translated');
  }

  /**
   * マッピングデータが読み込まれているかチェック
   * @returns {boolean} 読み込み済みかどうか
   */
  isDataLoaded() {
    return this.isLoaded;
  }

  /**
   * キャッシュされているマッピング数を取得
   * @returns {number} マッピング数
   */
  getMappingCount() {
    return this.mappingCache.size;
  }

  /**
   * 全てのマッピングデータを取得（デバッグ用）
   * @returns {Array<Object>} マッピングデータ配列
   */
  getAllMappings() {
    const mappings = [];
    this.mappingCache.forEach((value, key) => {
      mappings.push({
        japanese: key,
        english: value.english,
        source: value.source
      });
    });
    return mappings;
  }

  /**
   * 現在の言語を設定
   * @param {string} language - 言語コード（'ja' または 'en'）
   */
  setCurrentLanguage(language) {
    this.currentLanguage = language || 'ja';
  }

  /**
   * 現在の言語を取得
   * @returns {string} 言語コード
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * 英語名から日本語名を取得（逆引き）
   * @param {string} englishStopName - 英語バス停名
   * @returns {string|null} 日本語バス停名、見つからない場合はnull
   */
  getJapaneseNameFromEnglish(englishStopName) {
    if (!englishStopName || typeof englishStopName !== 'string') {
      return null;
    }

    // キャッシュを検索して英語名に一致する日本語名を探す
    for (const [japanese, mapping] of this.mappingCache.entries()) {
      if (mapping.english.toLowerCase() === englishStopName.toLowerCase()) {
        return japanese;
      }
    }

    return null;
  }

  /**
   * 検索クエリに一致するバス停名を取得（日本語名と英語名の両方を検索）
   * @param {string} query - 検索クエリ
   * @returns {Array<string>} 一致する日本語バス停名の配列
   */
  searchStopNames(query) {
    if (!query || typeof query !== 'string') {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const matches = [];

    // 日本語名で検索
    for (const japanese of this.mappingCache.keys()) {
      if (japanese.toLowerCase().includes(lowerQuery)) {
        matches.push(japanese);
      }
    }

    // 英語名で検索
    for (const [japanese, mapping] of this.mappingCache.entries()) {
      if (mapping.english.toLowerCase().includes(lowerQuery)) {
        // 重複を避ける
        if (!matches.includes(japanese)) {
          matches.push(japanese);
        }
      }
    }

    return matches;
  }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
  window.BusStopTranslator = BusStopTranslator;
}

// Node.js環境での使用に対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusStopTranslator;
}