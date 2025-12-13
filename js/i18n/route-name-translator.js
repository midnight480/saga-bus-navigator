/**
 * 路線名の翻訳処理を行うクラス
 * CSVマッピングファイルを使用して路線名を翻訳する
 */
class RouteNameTranslator {
  constructor(mappingData = []) {
    this.mappingCache = new Map();
    this.isLoaded = false;
    this.currentLanguage = 'ja'; // デフォルトは日本語
    
    if (mappingData.length > 0) {
      this.loadMappingFromData(mappingData);
    }
  }

  /**
   * 路線名を翻訳
   * @param {string} japaneseRouteName - 日本語路線名
   * @returns {string} 翻訳された路線名
   */
  translateRouteName(japaneseRouteName) {
    if (!japaneseRouteName || typeof japaneseRouteName !== 'string') {
      return japaneseRouteName || '';
    }

    // 現在の言語が日本語の場合は翻訳不要
    if (this.currentLanguage === 'ja') {
      return japaneseRouteName;
    }

    // キャッシュから翻訳を取得
    if (this.mappingCache.has(japaneseRouteName)) {
      const mapping = this.mappingCache.get(japaneseRouteName);
      return mapping.english;
    }

    // マッピングが見つからない場合は元の日本語名を返す
    return japaneseRouteName;
  }

  /**
   * 路線名マッピングのソースを取得
   * @param {string} japaneseRouteName - 日本語路線名
   * @returns {'Mapped'|'Auto-translated'|null} マッピングソース
   */
  getMappingSource(japaneseRouteName) {
    if (this.mappingCache.has(japaneseRouteName)) {
      const mapping = this.mappingCache.get(japaneseRouteName);
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
    console.log(`路線名マッピングを読み込みました: ${this.mappingCache.size}件`);
  }

  /**
   * マッピングデータを再読み込み（CSVファイル更新時に使用）
   * @param {Array<Object>} mappingData - 新しいマッピングデータ配列
   */
  reloadMappingFromData(mappingData) {
    console.log('路線名マッピングを再読み込みします...');
    this.loadMappingFromData(mappingData);
  }

  /**
   * CSVファイルからマッピングデータを読み込み
   * @returns {Promise<void>}
   */
  async loadMappingData() {
    try {
      const response = await fetch('./data/route_names_mapping.csv');
      if (!response.ok) {
        throw new Error(`路線名マッピングファイルの読み込みに失敗しました: ${response.status}`);
      }

      const csvText = await response.text();
      const mappingData = this.parseRouteNameMappingCSV(csvText);
      this.loadMappingFromData(mappingData);
      
    } catch (error) {
      console.error('路線名マッピングの読み込みエラー:', error);
      // エラーが発生してもアプリケーションは継続
      this.isLoaded = false;
    }
  }

  /**
   * CSVテキストを解析してマッピングデータに変換
   * @param {string} csvText - CSVテキスト
   * @returns {Array<Object>} マッピングデータ配列
   */
  parseRouteNameMappingCSV(csvText) {
    const lines = csvText.split('\n');
    const mappings = [];
    
    // ヘッダー行をスキップ（1行目）
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // 空行をスキップ
      
      try {
        const [routeId, japanese, english, source] = this.parseCSVLine(line);
        
        if (this.isValidRouteName(japanese) && this.isValidRouteName(english)) {
          mappings.push({
            routeId: routeId ? routeId.trim() : '',
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
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // エスケープされたダブルクォート（""）
          current += '"';
          i++; // 次の文字をスキップ
        } else {
          // クォートの開始/終了
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // カンマ区切り（クォート外のみ）
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // 最後の値を追加
    values.push(current.trim());

    return values;
  }

  /**
   * マッピングデータが有効かチェック
   * @param {Object} mapping - マッピングデータ
   * @returns {boolean} 有効な場合true
   */
  isValidMapping(mapping) {
    return mapping &&
           mapping.japanese &&
           mapping.english &&
           typeof mapping.japanese === 'string' &&
           typeof mapping.english === 'string' &&
           mapping.japanese.trim().length > 0 &&
           mapping.english.trim().length > 0;
  }

  /**
   * 路線名が有効かチェック
   * @param {string} routeName - 路線名
   * @returns {boolean} 有効な場合true
   */
  isValidRouteName(routeName) {
    return routeName && 
           typeof routeName === 'string' && 
           routeName.trim().length > 0;
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
   * @param {string} englishRouteName - 英語路線名
   * @returns {string|null} 日本語路線名、見つからない場合はnull
   */
  getJapaneseNameFromEnglish(englishRouteName) {
    if (!englishRouteName || typeof englishRouteName !== 'string') {
      return null;
    }

    // キャッシュを検索して英語名に一致する日本語名を探す
    for (const [japanese, mapping] of this.mappingCache.entries()) {
      if (mapping.english.toLowerCase() === englishRouteName.toLowerCase()) {
        return japanese;
      }
    }

    return null;
  }

  /**
   * 検索クエリに一致する路線名を取得（日本語名と英語名の両方を検索）
   * @param {string} query - 検索クエリ
   * @returns {Array<string>} 一致する日本語路線名の配列
   */
  searchRouteNames(query) {
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

  /**
   * マッピング数を取得
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
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
  window.RouteNameTranslator = RouteNameTranslator;
}

// Node.js環境での使用に対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RouteNameTranslator;
}

