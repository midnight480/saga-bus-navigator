/**
 * CacheManagerクラスのプロパティベーステスト
 *
 * fast-checkライブラリを使用して、普遍的な正確性プロパティを検証します。
 * 各プロパティは、任意の有効な入力に対して真であるべき特性を表現します。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import CacheManager from '../js/cache-manager.js';

function createMockStorage() {
  return {
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
    }
  };
}

function geojsonLineFromCoordinates(coordsLonLat) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: coordsLonLat
        },
        properties: {
          test: true
        }
      }
    ]
  };
}

describe('CacheManager - プロパティベーステスト', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2024-01-01T00:00:00Z') });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Feature: ors-route-rendering, Property 14: キャッシュの保存と取得（ラウンドトリップ）
   *
   * 任意の座標配列とGeoJSONに対して、キャッシュに保存した後に同じ座標配列で取得すると、
   * 同じGeoJSONが返されなければならない
   *
   * **Validates: Requirements 4.1**
   */
  it('プロパティ14: set→getで同一GeoJSONが返る（ラウンドトリップ）', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
            fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true })
          ),
          { minLength: 2, maxLength: 50 }
        ),
        (coordsLonLat) => {
          const storage = createMockStorage();
          const cache = new CacheManager({ storage, ttl: 86400000 });
          const geojson = geojsonLineFromCoordinates(coordsLonLat);

          cache.set(coordsLonLat, geojson);
          const cached = cache.get(coordsLonLat);

          expect(cached).toEqual(geojson);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: ors-route-rendering, Property 15: キャッシュ優先の実行
   *
   * 任意のキャッシュされた経路に対して、経路リクエスト時にAPIが呼び出されず、
   * キャッシュされたGeoJSONが使用されなければならない
   *
   * ※ CacheManager単体ではAPI呼び出しを持たないため、
   * 「キャッシュヒット時にストレージ書き込み等の副作用が発生しない」ことを検証する。
   *
   * **Validates: Requirements 4.2, 4.3**
   */
  it('プロパティ15: キャッシュヒット時に読み取りが成功し、書き込み副作用がない', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
            fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true })
          ),
          { minLength: 2, maxLength: 50 }
        ),
        (coordsLonLat) => {
          const storage = createMockStorage();
          const originalSetItem = storage.setItem.bind(storage);
          const setItemSpy = vi.fn((k, v) => originalSetItem(k, v));
          storage.setItem = setItemSpy;

          const cache = new CacheManager({ storage, ttl: 86400000 });
          const geojson = geojsonLineFromCoordinates(coordsLonLat);

          cache.set(coordsLonLat, geojson);
          const writesAfterSet = setItemSpy.mock.calls.length;

          const cached = cache.get(coordsLonLat);
          const writesAfterGet = setItemSpy.mock.calls.length;

          expect(cached).toEqual(geojson);
          expect(writesAfterGet).toBe(writesAfterSet);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: ors-route-rendering, Property 16: キャッシュエラー耐性
   *
   * 任意のキャッシュストレージエラーに対して、システムはエラーをスローせずに
   * API呼び出しを続行しなければならない
   *
   * ※ CacheManager単体ではAPI呼び出しを持たないため、
   * 「ストレージエラーでも例外を投げずに安全にnull/無処理で返る」ことを検証する。
   *
   * **Validates: Requirements 4.5**
   */
  it('プロパティ16: ストレージエラーでも例外を投げない', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
            fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true })
          ),
          { minLength: 2, maxLength: 50 }
        ),
        (coordsLonLat) => {
          const errorStorage = {
            getItem() {
              throw new Error('Storage read error');
            },
            setItem() {
              throw new Error('Storage write error');
            },
            removeItem() {
              throw new Error('Storage remove error');
            },
            key() {
              throw new Error('Storage key error');
            },
            get length() {
              throw new Error('Storage length error');
            }
          };

          const cache = new CacheManager({ storage: errorStorage, ttl: 86400000 });
          const geojson = geojsonLineFromCoordinates(coordsLonLat);

          expect(() => cache.set(coordsLonLat, geojson)).not.toThrow();
          expect(() => cache.get(coordsLonLat)).not.toThrow();
          expect(cache.get(coordsLonLat)).toBeNull();
          expect(() => cache.clear()).not.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: ors-route-rendering, Property 29: キャッシュTTLの設定可能性
   *
   * 任意のTTL設定値に対して、キャッシュエントリはTTL経過後に無効となり、再取得されなければならない
   *
   * **Validates: Requirements 10.4**
   */
  it('プロパティ29: TTL経過後にキャッシュが無効化される', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 60_000 }), // 1ms〜60s
        fc.integer({ min: 0, max: 120_000 }), // 0〜120s 経過
        fc.array(
          fc.tuple(
            fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
            fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true })
          ),
          { minLength: 2, maxLength: 50 }
        ),
        (ttlMs, elapsedMs, coordsLonLat) => {
          const storage = createMockStorage();
          const cache = new CacheManager({ storage, ttl: ttlMs });
          const geojson = geojsonLineFromCoordinates(coordsLonLat);

          cache.set(coordsLonLat, geojson);

          // 経過させる
          vi.setSystemTime(new Date(Date.now() + elapsedMs));

          const cached = cache.get(coordsLonLat);
          if (elapsedMs > ttlMs) {
            expect(cached).toBeNull();
          } else {
            expect(cached).toEqual(geojson);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
