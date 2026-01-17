/**
 * ORSClientクラスのプロパティベーステスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import RateLimiter from '../js/rate-limiter.js';
import ORSClient from '../js/ors-client.js';

function createOkGeoJsonFrom(coordsLonLat) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coordsLonLat },
        properties: {}
      }
    ]
  };
}

describe('ORSClient - プロパティベーステスト', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /**
   * Feature: ors-route-rendering, Property 1: 座標変換の正確性
   */
  it('プロパティ1: 任意の有効座標を [lon, lat] に正しく変換する', () => {
    const client = new ORSClient({ apiKey: 'x', RateLimiter });

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            lat: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
            lon: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true })
          }),
          { minLength: 2, maxLength: 50 }
        ),
        (stops) => {
          const converted = client.convertCoordinates(stops);
          expect(converted).toHaveLength(stops.length);
          expect(converted.every((c, i) => c[0] === stops[i].lon && c[1] === stops[i].lat)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: ors-route-rendering, Property 2/5: Authorizationヘッダーとリクエストボディ構造
   */
  it('プロパティ2/5: Authorizationヘッダーとcoordinatesフィールドを必ず含める', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            lat: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
            lon: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true })
          }),
          { minLength: 2, maxLength: 50 }
        ),
        async (stops) => {
          const client = new ORSClient({
            apiKey: 'test-key',
            RateLimiter,
            minuteLimiter: { canMakeRequest: () => true, recordRequest: vi.fn(), getWaitTime: () => 0 },
            dailyLimiter: { canMakeRequest: () => true, recordRequest: vi.fn(), getWaitTime: () => 0 }
          });

          const coordsLonLat = client.convertCoordinates(stops);
          global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => createOkGeoJsonFrom(coordsLonLat)
          });

          await client.getRoute(stops);

          const [, options] = global.fetch.mock.calls.at(-1);
          expect(options.headers.Authorization).toBe('test-key');
          const body = JSON.parse(options.body);
          expect(Array.isArray(body.coordinates)).toBe(true);
          expect(body.coordinates).toEqual(coordsLonLat);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Feature: ors-route-rendering, Property 27: 座標数の制限
   */
  it('プロパティ27: 51点以上はTOO_MANY_COORDINATESで拒否する', async () => {
    const client = new ORSClient({
      apiKey: 'test-key',
      RateLimiter,
      maxCoordinatesPerRequest: 50,
      minuteLimiter: { canMakeRequest: () => true, recordRequest: vi.fn(), getWaitTime: () => 0 },
      dailyLimiter: { canMakeRequest: () => true, recordRequest: vi.fn(), getWaitTime: () => 0 }
    });

    const stops = Array.from({ length: 51 }, (_, i) => ({ lat: 33 + i * 0.0001, lon: 130 + i * 0.0001 }));
    await expect(client.getRoute(stops)).rejects.toMatchObject({ code: 'TOO_MANY_COORDINATES' });
  });

  /**
   * Feature: ors-route-rendering, Property 28/30: プロファイル設定とデフォルト値
   */
  it('プロパティ28/30: profileがURLに反映され、未指定時はdriving-carを使う', async () => {
    const okResponse = {
      ok: true,
      status: 200,
      json: async () =>
        createOkGeoJsonFrom([
          [130.3009, 33.2636],
          [130.2965, 33.2618]
        ])
    };

    const clientDefault = new ORSClient({
      apiKey: 'k',
      RateLimiter,
      minuteLimiter: { canMakeRequest: () => true, recordRequest: vi.fn(), getWaitTime: () => 0 },
      dailyLimiter: { canMakeRequest: () => true, recordRequest: vi.fn(), getWaitTime: () => 0 }
    });
    global.fetch.mockResolvedValueOnce(okResponse);
    await clientDefault.getRoute([
      { lat: 33.2636, lon: 130.3009 },
      { lat: 33.2618, lon: 130.2965 }
    ]);
    expect(global.fetch.mock.calls[0][0]).toContain('/directions/driving-car/geojson');

    const clientCustom = new ORSClient({
      apiKey: 'k',
      RateLimiter,
      profile: 'foot-walking',
      minuteLimiter: { canMakeRequest: () => true, recordRequest: vi.fn(), getWaitTime: () => 0 },
      dailyLimiter: { canMakeRequest: () => true, recordRequest: vi.fn(), getWaitTime: () => 0 }
    });
    global.fetch.mockResolvedValueOnce(okResponse);
    await clientCustom.getRoute([
      { lat: 33.2636, lon: 130.3009 },
      { lat: 33.2618, lon: 130.2965 }
    ]);
    expect(global.fetch.mock.calls[1][0]).toContain('/directions/foot-walking/geojson');
  });
});

