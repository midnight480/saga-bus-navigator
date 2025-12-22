/**
 * IndexedDBキャッシュマネージャー
 * GTFSデータをIndexedDBにキャッシュして、2回目以降のアクセスを高速化
 */

class IndexedDBCache {
  constructor() {
    this.dbName = 'saga-bus-navigator-cache';
    this.dbVersion = 1;
    this.storeName = 'gtfs-data';
    this.db = null;
  }

  /**
   * IndexedDBを開く
   * @returns {Promise<IDBDatabase>}
   */
  async openDB() {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDBのオープンに失敗しました:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // オブジェクトストアが存在しない場合は作成
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'key' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * データをキャッシュに保存
   * @param {string} key - キャッシュキー
   * @param {Object} data - 保存するデータ
   * @returns {Promise<void>}
   */
  async set(key, data) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const cacheData = {
        key: key,
        data: data,
        timestamp: Date.now()
      };
      
      await new Promise((resolve, reject) => {
        const request = store.put(cacheData);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      this.logDebug(`キャッシュに保存: ${key}`);
    } catch (error) {
      console.warn('IndexedDBへの保存に失敗しました:', error);
      // エラーが発生しても処理を続行
    }
  }

  /**
   * キャッシュからデータを取得
   * @param {string} key - キャッシュキー
   * @param {number} maxAge - キャッシュの有効期限（ミリ秒、デフォルト: 24時間）
   * @returns {Promise<Object|null>}
   */
  async get(key, maxAge = 24 * 60 * 60 * 1000) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const data = await new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (!data) {
        this.logDebug(`キャッシュに存在しません: ${key}`);
        return null;
      }
      
      // キャッシュの有効期限をチェック
      const age = Date.now() - data.timestamp;
      if (age > maxAge) {
        this.logDebug(`キャッシュが期限切れです: ${key} (${Math.floor(age / 1000 / 60)}分経過)`);
        // 期限切れのキャッシュを削除
        await this.delete(key);
        return null;
      }
      
      this.logDebug(`キャッシュから取得: ${key} (${Math.floor(age / 1000)}秒前)`);
      return data.data;
    } catch (error) {
      console.warn('IndexedDBからの取得に失敗しました:', error);
      return null;
    }
  }

  /**
   * キャッシュを削除
   * @param {string} key - キャッシュキー
   * @returns {Promise<void>}
   */
  async delete(key) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      this.logDebug(`キャッシュを削除: ${key}`);
    } catch (error) {
      console.warn('IndexedDBからの削除に失敗しました:', error);
    }
  }

  /**
   * すべてのキャッシュをクリア
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      this.logDebug('すべてのキャッシュをクリアしました');
    } catch (error) {
      console.warn('IndexedDBのクリアに失敗しました:', error);
    }
  }

  /**
   * デバッグログを出力
   * @param {string} message - ログメッセージ
   */
  logDebug(message) {
    // デバッグモードが有効な場合のみログ出力
    if (window.DEBUG_MODE) {
      console.log(`[IndexedDBCache] ${message}`);
    }
  }
}

// グローバルに公開
window.IndexedDBCache = IndexedDBCache;

