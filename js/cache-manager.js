/**
 * CacheManager - API応答のキャッシュを管理するクラス
 * 
 * ORS API応答をlocalStorageまたはsessionStorageにキャッシュし、
 * API呼び出しを最小化してパフォーマンスを向上させます。
 * 
 * 機能:
 * - 経路データのキャッシュ保存・取得
 * - キャッシュキーの生成
 * - TTLベースの有効期限管理
 * - ストレージエラーのハンドリング
 * 
 * @class CacheManager
 */
class CacheManager {
  /**
   * CacheManagerのコンストラクタ
   * 
   * @param {Object} config - 設定オブジェクト
   * @param {Storage} [config.storage=window.localStorage] - 使用するストレージ（localStorage/sessionStorage）
   * @param {string} [config.prefix='ors_route_'] - キャッシュキーのプレフィックス
   * @param {number} [config.ttl=86400000] - キャッシュの有効期限（ミリ秒）。デフォルトは24時間
   * 
   * @example
   * // デフォルト設定（localStorage、24時間TTL）
   * const cacheManager = new CacheManager({});
   * 
   * @example
   * // sessionStorageを使用、12時間TTL
   * const cacheManager = new CacheManager({
   *   storage: window.sessionStorage,
   *   ttl: 43200000
   * });
   */
  constructor(config = {}) {
    // config.storageが明示的にnullの場合はnullを使用、未定義の場合はlocalStorageを使用
    if (config.hasOwnProperty('storage')) {
      this.storage = config.storage;
    } else {
      this.storage = typeof window !== 'undefined' ? window.localStorage : null;
    }
    this.prefix = config.prefix || 'ors_route_';
    this.ttl = config.ttl !== undefined ? config.ttl : 86400000; // 24時間（ミリ秒）
  }

  /**
   * キャッシュから経路を取得
   * 
   * 座標配列をキーとしてキャッシュされた経路データを取得します。
   * キャッシュが存在しない、または有効期限切れの場合はnullを返します。
   * 
   * @param {Array<[number, number]>} coordinates - 座標配列（[経度, 緯度]のペア）
   * @returns {Object|null} キャッシュされたGeoJSON、または null
   * 
   * @example
   * const coordinates = [[130.3009, 33.2636], [130.2965, 33.2618]];
   * const cached = cacheManager.get(coordinates);
   * if (cached) {
   *   console.log('キャッシュヒット:', cached);
   * } else {
   *   console.log('キャッシュミス');
   * }
   */
  get(coordinates) {
    // ストレージが利用できない場合
    if (!this.storage) {
      return null;
    }

    const key = this.generateKey(coordinates);
    try {
      const cached = this.storage.getItem(this.prefix + key);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      
      // TTLチェック
      if (Date.now() - data.timestamp > this.ttl) {
        // 有効期限切れの場合は削除
        this.storage.removeItem(this.prefix + key);
        return null;
      }
      
      return data.geojson;
    } catch (error) {
      console.warn('Cache read error:', error);
      return null;
    }
  }

  /**
   * 経路をキャッシュに保存
   * 
   * 座標配列をキーとして、GeoJSON形式の経路データをキャッシュに保存します。
   * ストレージエラーが発生しても例外をスローせず、警告をログに記録します。
   * 
   * @param {Array<[number, number]>} coordinates - 座標配列（[経度, 緯度]のペア）
   * @param {Object} geojson - GeoJSON形式の経路データ
   * 
   * @example
   * const coordinates = [[130.3009, 33.2636], [130.2965, 33.2618]];
   * const geojson = {
   *   type: 'FeatureCollection',
   *   features: [...]
   * };
   * cacheManager.set(coordinates, geojson);
   */
  set(coordinates, geojson) {
    // ストレージが利用できない場合
    if (!this.storage) {
      return;
    }

    const key = this.generateKey(coordinates);
    try {
      const data = {
        geojson: geojson,
        timestamp: Date.now()
      };
      this.storage.setItem(this.prefix + key, JSON.stringify(data));
    } catch (error) {
      console.warn('Cache write error:', error);
      // エラーでも処理は続行（要件4.5）
    }
  }

  /**
   * 座標配列からキャッシュキーを生成
   * 
   * 座標配列を一意の文字列キーに変換します。
   * 座標は小数点以下4桁に丸められ、パイプ（|）で区切られます。
   * 
   * @param {Array<[number, number]>} coordinates - 座標配列（[経度, 緯度]のペア）
   * @returns {string} キャッシュキー
   * 
   * @example
   * const coords = [[130.3009, 33.2636], [130.2965, 33.2618]];
   * const key = cacheManager.generateKey(coords);
   * // 結果: "130.3009,33.2636|130.2965,33.2618"
   */
  generateKey(coordinates) {
    return coordinates.map(c => `${c[0].toFixed(4)},${c[1].toFixed(4)}`).join('|');
  }

  /**
   * 全てのキャッシュをクリア
   * 
   * プレフィックスに一致する全てのキャッシュエントリを削除します。
   * 
   * @example
   * cacheManager.clear();
   * console.log('全てのキャッシュをクリアしました');
   */
  clear() {
    if (!this.storage) {
      return;
    }

    try {
      // ストレージの全てのキーを取得
      const keys = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key);
        }
      }
      
      // プレフィックスに一致するキーを削除
      keys.forEach(key => {
        this.storage.removeItem(key);
      });
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  /**
   * 特定のキャッシュエントリを削除
   * 
   * 指定された座標配列に対応するキャッシュエントリを削除します。
   * 
   * @param {Array<[number, number]>} coordinates - 座標配列（[経度, 緯度]のペア）
   * 
   * @example
   * const coords = [[130.3009, 33.2636], [130.2965, 33.2618]];
   * cacheManager.remove(coords);
   */
  remove(coordinates) {
    if (!this.storage) {
      return;
    }

    const key = this.generateKey(coordinates);
    try {
      this.storage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn('Cache remove error:', error);
    }
  }

  /**
   * キャッシュエントリが存在するか確認
   * 
   * 指定された座標配列に対応する有効なキャッシュエントリが存在するか確認します。
   * 
   * @param {Array<[number, number]>} coordinates - 座標配列（[経度, 緯度]のペア）
   * @returns {boolean} キャッシュエントリが存在する場合はtrue
   * 
   * @example
   * const coords = [[130.3009, 33.2636], [130.2965, 33.2618]];
   * if (cacheManager.has(coords)) {
   *   console.log('キャッシュが存在します');
   * }
   */
  has(coordinates) {
    return this.get(coordinates) !== null;
  }

  /**
   * キャッシュサイズを取得
   * 
   * プレフィックスに一致するキャッシュエントリの数を返します。
   * 
   * @returns {number} キャッシュエントリの数
   * 
   * @example
   * const size = cacheManager.size();
   * console.log(`キャッシュエントリ数: ${size}`);
   */
  size() {
    if (!this.storage) {
      return 0;
    }

    try {
      let count = 0;
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(this.prefix)) {
          count++;
        }
      }
      return count;
    } catch (error) {
      console.warn('Cache size error:', error);
      return 0;
    }
  }
}

// Node.js環境でのエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CacheManager;
}
