/**
 * CacheManagerクラスのユニットテスト
 * 
 * 特定の例とエッジケースを検証します。
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import CacheManager from '../js/cache-manager.js';

describe('CacheManager', () => {
  let cacheManager;
  let mockStorage;
  
  beforeEach(() => {
    // モックストレージを作成
    mockStorage = {
      data: {},
      get length() {
        return Object.keys(this.data).length;
      },
      key(index) {
        const keys = Object.keys(this.data);
        return keys[index] || null;
      },
      getItem(key) {
        return this.data[key] || null;
      },
      setItem(key, value) {
        this.data[key] = value;
      },
      removeItem(key) {
        delete this.data[key];
      },
      clear() {
        this.data = {};
      }
    };
    
    // タイマーをモック（Date.nowを含む）
    vi.useFakeTimers({ now: new Date('2024-01-01T00:00:00Z') });
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('基本機能', () => {
    it('デフォルト設定で初期化できる', () => {
      cacheManager = new CacheManager({ storage: mockStorage });
      expect(cacheManager.prefix).toBe('ors_route_');
      expect(cacheManager.ttl).toBe(86400000); // 24時間
    });

    it('カスタム設定で初期化できる', () => {
      cacheManager = new CacheManager({
        storage: mockStorage,
        prefix: 'custom_',
        ttl: 3600000 // 1時間
      });
      expect(cacheManager.prefix).toBe('custom_');
      expect(cacheManager.ttl).toBe(3600000);
    });

    it('ストレージが指定されない場合でもエラーにならない', () => {
      cacheManager = new CacheManager({ storage: null });
      expect(cacheManager.storage).toBeNull();
    });
  });

  describe('キャッシュキー生成', () => {
    beforeEach(() => {
      cacheManager = new CacheManager({ storage: mockStorage });
    });

    it('座標配列から一意のキーを生成できる', () => {
      const coords = [[130.3009, 33.2636], [130.2965, 33.2618]];
      const key = cacheManager.generateKey(coords);
      expect(key).toBe('130.3009,33.2636|130.2965,33.2618');
    });

    it('空の座標配列から空文字列を生成する', () => {
      const coords = [];
      const key = cacheManager.generateKey(coords);
      expect(key).toBe('');
    });

    it('単一座標から正しいキーを生成する', () => {
      const coords = [[130.3009, 33.2636]];
      const key = cacheManager.generateKey(coords);
      expect(key).toBe('130.3009,33.2636');
    });

    it('座標が小数点以下4桁に丸められる', () => {
      const coords = [[130.30091234, 33.26361234]];
      const key = cacheManager.generateKey(coords);
      expect(key).toBe('130.3009,33.2636');
    });

    it('同じ座標配列は同じキーを生成する', () => {
      const coords1 = [[130.3009, 33.2636], [130.2965, 33.2618]];
      const coords2 = [[130.3009, 33.2636], [130.2965, 33.2618]];
      const key1 = cacheManager.generateKey(coords1);
      const key2 = cacheManager.generateKey(coords2);
      expect(key1).toBe(key2);
    });

    it('異なる座標配列は異なるキーを生成する', () => {
      const coords1 = [[130.3009, 33.2636]];
      const coords2 = [[130.2965, 33.2618]];
      const key1 = cacheManager.generateKey(coords1);
      const key2 = cacheManager.generateKey(coords2);
      expect(key1).not.toBe(key2);
    });
  });

  describe('キャッシュの保存と取得', () => {
    beforeEach(() => {
      cacheManager = new CacheManager({ storage: mockStorage });
    });

    it('GeoJSONをキャッシュに保存できる', () => {
      const coords = [[130.3009, 33.2636], [130.2965, 33.2618]];
      const geojson = {
        type: 'FeatureCollection',
        features: []
      };
      
      cacheManager.set(coords, geojson);
      
      const cached = cacheManager.get(coords);
      expect(cached).toEqual(geojson);
    });

    it('存在しないキャッシュはnullを返す', () => {
      const coords = [[130.3009, 33.2636]];
      const cached = cacheManager.get(coords);
      expect(cached).toBeNull();
    });

    it('複数の異なる経路をキャッシュできる', () => {
      const coords1 = [[130.3009, 33.2636], [130.2965, 33.2618]];
      const coords2 = [[130.2965, 33.2618], [130.2920, 33.2600]];
      const geojson1 = { type: 'FeatureCollection', features: [{ id: 1 }] };
      const geojson2 = { type: 'FeatureCollection', features: [{ id: 2 }] };
      
      cacheManager.set(coords1, geojson1);
      cacheManager.set(coords2, geojson2);
      
      expect(cacheManager.get(coords1)).toEqual(geojson1);
      expect(cacheManager.get(coords2)).toEqual(geojson2);
    });

    it('同じキーで上書き保存できる', () => {
      const coords = [[130.3009, 33.2636]];
      const geojson1 = { type: 'FeatureCollection', features: [{ id: 1 }] };
      const geojson2 = { type: 'FeatureCollection', features: [{ id: 2 }] };
      
      cacheManager.set(coords, geojson1);
      cacheManager.set(coords, geojson2);
      
      const cached = cacheManager.get(coords);
      expect(cached).toEqual(geojson2);
    });
  });

  describe('TTL（有効期限）管理', () => {
    beforeEach(() => {
      cacheManager = new CacheManager({
        storage: mockStorage,
        ttl: 1000 // 1秒
      });
    });

    it('TTL内のキャッシュは取得できる', () => {
      const coords = [[130.3009, 33.2636]];
      const geojson = { type: 'FeatureCollection', features: [] };
      
      cacheManager.set(coords, geojson);
      
      // 500ms経過
      vi.setSystemTime(new Date('2024-01-01T00:00:00.500Z'));
      
      const cached = cacheManager.get(coords);
      expect(cached).toEqual(geojson);
    });

    it('TTL経過後のキャッシュはnullを返す', () => {
      const coords = [[130.3009, 33.2636]];
      const geojson = { type: 'FeatureCollection', features: [] };
      
      cacheManager.set(coords, geojson);
      
      // 1001ms経過（TTLの1000msを超える）
      vi.setSystemTime(new Date('2024-01-01T00:00:01.001Z'));
      
      const cached = cacheManager.get(coords);
      expect(cached).toBeNull();
    });

    it('TTL経過後のキャッシュは自動的に削除される', () => {
      const coords = [[130.3009, 33.2636]];
      const geojson = { type: 'FeatureCollection', features: [] };
      
      cacheManager.set(coords, geojson);
      
      const key = cacheManager.prefix + cacheManager.generateKey(coords);
      expect(mockStorage.getItem(key)).not.toBeNull();
      
      // 1001ms経過（TTLの1000msを超える）
      vi.setSystemTime(new Date('2024-01-01T00:00:01.001Z'));
      
      // getを呼び出すと削除される
      cacheManager.get(coords);
      expect(mockStorage.getItem(key)).toBeNull();
    });

    it('TTLが0の場合は即座に期限切れになる', () => {
      cacheManager = new CacheManager({
        storage: mockStorage,
        ttl: 0
      });
      
      const coords = [[130.3009, 33.2636]];
      const geojson = { type: 'FeatureCollection', features: [] };
      
      cacheManager.set(coords, geojson);
      
      // 1ms経過（TTLの0msを超える）
      vi.setSystemTime(new Date('2024-01-01T00:00:00.001Z'));
      
      const cached = cacheManager.get(coords);
      expect(cached).toBeNull();
    });
  });

  describe('エラーハンドリング', () => {
    it('ストレージ読み込みエラーでもnullを返す', () => {
      const errorStorage = {
        getItem() {
          throw new Error('Storage error');
        }
      };
      
      cacheManager = new CacheManager({ storage: errorStorage });
      
      const coords = [[130.3009, 33.2636]];
      const cached = cacheManager.get(coords);
      expect(cached).toBeNull();
    });

    it('ストレージ書き込みエラーでも例外をスローしない', () => {
      const errorStorage = {
        setItem() {
          throw new Error('Storage error');
        }
      };
      
      cacheManager = new CacheManager({ storage: errorStorage });
      
      const coords = [[130.3009, 33.2636]];
      const geojson = { type: 'FeatureCollection', features: [] };
      
      expect(() => {
        cacheManager.set(coords, geojson);
      }).not.toThrow();
    });

    it('不正なJSON形式のキャッシュはnullを返す', () => {
      cacheManager = new CacheManager({ storage: mockStorage });
      
      const coords = [[130.3009, 33.2636]];
      const key = cacheManager.prefix + cacheManager.generateKey(coords);
      
      // 不正なJSONを直接設定
      mockStorage.setItem(key, 'invalid json');
      
      const cached = cacheManager.get(coords);
      expect(cached).toBeNull();
    });

    it('ストレージがnullの場合、setは何もしない', () => {
      cacheManager = new CacheManager({ storage: null });
      
      const coords = [[130.3009, 33.2636]];
      const geojson = { type: 'FeatureCollection', features: [] };
      
      expect(() => {
        cacheManager.set(coords, geojson);
      }).not.toThrow();
    });

    it('ストレージがnullの場合、getはnullを返す', () => {
      cacheManager = new CacheManager({ storage: null });
      
      const coords = [[130.3009, 33.2636]];
      const cached = cacheManager.get(coords);
      expect(cached).toBeNull();
    });
  });

  describe('キャッシュ管理機能', () => {
    beforeEach(() => {
      cacheManager = new CacheManager({ storage: mockStorage });
    });

    it('特定のキャッシュエントリを削除できる', () => {
      const coords = [[130.3009, 33.2636]];
      const geojson = { type: 'FeatureCollection', features: [] };
      
      cacheManager.set(coords, geojson);
      expect(cacheManager.get(coords)).toEqual(geojson);
      
      cacheManager.remove(coords);
      expect(cacheManager.get(coords)).toBeNull();
    });

    it('全てのキャッシュをクリアできる', () => {
      const coords1 = [[130.3009, 33.2636]];
      const coords2 = [[130.2965, 33.2618]];
      const geojson = { type: 'FeatureCollection', features: [] };
      
      cacheManager.set(coords1, geojson);
      cacheManager.set(coords2, geojson);
      
      cacheManager.clear();
      
      expect(cacheManager.get(coords1)).toBeNull();
      expect(cacheManager.get(coords2)).toBeNull();
    });

    it('clearは他のプレフィックスのキャッシュに影響しない', () => {
      const coords = [[130.3009, 33.2636]];
      const geojson = { type: 'FeatureCollection', features: [] };
      
      cacheManager.set(coords, geojson);
      
      // 別のプレフィックスでデータを保存
      mockStorage.setItem('other_key', 'other_value');
      
      cacheManager.clear();
      
      expect(cacheManager.get(coords)).toBeNull();
      expect(mockStorage.getItem('other_key')).toBe('other_value');
    });

    it('キャッシュエントリの存在を確認できる', () => {
      const coords = [[130.3009, 33.2636]];
      const geojson = { type: 'FeatureCollection', features: [] };
      
      expect(cacheManager.has(coords)).toBe(false);
      
      cacheManager.set(coords, geojson);
      expect(cacheManager.has(coords)).toBe(true);
      
      cacheManager.remove(coords);
      expect(cacheManager.has(coords)).toBe(false);
    });

    it('キャッシュサイズを取得できる', () => {
      const coords1 = [[130.3009, 33.2636]];
      const coords2 = [[130.2965, 33.2618]];
      const geojson = { type: 'FeatureCollection', features: [] };
      
      expect(cacheManager.size()).toBe(0);
      
      cacheManager.set(coords1, geojson);
      expect(cacheManager.size()).toBe(1);
      
      cacheManager.set(coords2, geojson);
      expect(cacheManager.size()).toBe(2);
      
      cacheManager.remove(coords1);
      expect(cacheManager.size()).toBe(1);
      
      cacheManager.clear();
      expect(cacheManager.size()).toBe(0);
    });
  });

  describe('実際のユースケース', () => {
    beforeEach(() => {
      cacheManager = new CacheManager({
        storage: mockStorage,
        ttl: 86400000 // 24時間
      });
    });

    it('佐賀駅から佐賀城跡への経路をキャッシュ', () => {
      const sagaStation = [130.3009, 33.2636];
      const sagaCastle = [130.2965, 33.2618];
      const coords = [sagaStation, sagaCastle];
      
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [sagaStation, sagaCastle]
          },
          properties: {
            distance: 500,
            duration: 120
          }
        }]
      };
      
      cacheManager.set(coords, geojson);
      
      const cached = cacheManager.get(coords);
      expect(cached).toEqual(geojson);
      expect(cached.features[0].properties.distance).toBe(500);
    });

    it('複数のバス停を含む経路をキャッシュ', () => {
      const stops = [
        [130.3009, 33.2636], // 佐賀駅
        [130.2965, 33.2618], // 佐賀城跡
        [130.2920, 33.2600], // 県庁前
        [130.2880, 33.2580]  // 市役所前
      ];
      
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: stops
          }
        }]
      };
      
      cacheManager.set(stops, geojson);
      
      const cached = cacheManager.get(stops);
      expect(cached).toEqual(geojson);
      expect(cached.features[0].geometry.coordinates).toHaveLength(4);
    });

    it('キャッシュヒット率の向上を確認', () => {
      const coords = [[130.3009, 33.2636], [130.2965, 33.2618]];
      const geojson = { type: 'FeatureCollection', features: [] };
      
      // 最初はキャッシュミス
      expect(cacheManager.has(coords)).toBe(false);
      
      // キャッシュに保存
      cacheManager.set(coords, geojson);
      
      // 2回目以降はキャッシュヒット
      expect(cacheManager.has(coords)).toBe(true);
      expect(cacheManager.get(coords)).toEqual(geojson);
      expect(cacheManager.get(coords)).toEqual(geojson);
    });
  });

  describe('エッジケース', () => {
    beforeEach(() => {
      cacheManager = new CacheManager({ storage: mockStorage });
    });

    it('非常に長い座標配列でも正しく動作する', () => {
      const coords = Array.from({ length: 50 }, (_, i) => [130.3 + i * 0.001, 33.26 + i * 0.001]);
      const geojson = { type: 'FeatureCollection', features: [] };
      
      cacheManager.set(coords, geojson);
      const cached = cacheManager.get(coords);
      expect(cached).toEqual(geojson);
    });

    it('負の座標でも正しく動作する', () => {
      const coords = [[-130.3009, -33.2636]];
      const geojson = { type: 'FeatureCollection', features: [] };
      
      cacheManager.set(coords, geojson);
      const cached = cacheManager.get(coords);
      expect(cached).toEqual(geojson);
    });

    it('0座標でも正しく動作する', () => {
      const coords = [[0, 0]];
      const geojson = { type: 'FeatureCollection', features: [] };
      
      cacheManager.set(coords, geojson);
      const cached = cacheManager.get(coords);
      expect(cached).toEqual(geojson);
    });

    it('非常に大きなGeoJSONオブジェクトでも保存できる', () => {
      const coords = [[130.3009, 33.2636]];
      const geojson = {
        type: 'FeatureCollection',
        features: Array.from({ length: 100 }, (_, i) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [130.3 + i * 0.001, 33.26 + i * 0.001]
          },
          properties: { id: i }
        }))
      };
      
      cacheManager.set(coords, geojson);
      const cached = cacheManager.get(coords);
      expect(cached).toEqual(geojson);
      expect(cached.features).toHaveLength(100);
    });
  });
});
