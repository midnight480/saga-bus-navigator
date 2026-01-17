/**
 * ORSClientクラスのユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RateLimiter from '../js/rate-limiter.js';
import ORSClient from '../js/ors-client.js';

function createOkGeoJson() {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [130.3009, 33.2636],
            [130.2965, 33.2618]
          ]
        },
        properties: {}
      }
    ]
  };
}

describe('ORSClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('convertCoordinates: {lat, lon} を [lon, lat] に変換する', () => {
    const client = new ORSClient({ apiKey: 'x', RateLimiter });
    const result = client.convertCoordinates([{ lat: 33.2636, lon: 130.3009 }]);
    expect(result).toEqual([[130.3009, 33.2636]]);
  });

  it('convertCoordinates: {lat, lng} も許容する', () => {
    const client = new ORSClient({ apiKey: 'x', RateLimiter });
    const result = client.convertCoordinates([{ lat: 33.2636, lng: 130.3009 }]);
    expect(result).toEqual([[130.3009, 33.2636]]);
  });

  it('validateCoordinates: 範囲外はfalse', () => {
    const client = new ORSClient({ apiKey: 'x', RateLimiter });
    expect(client.validateCoordinates([{ lat: 100, lon: 130 }])).toBe(false);
    expect(client.validateCoordinates([{ lat: 33, lon: 200 }])).toBe(false);
  });

  it('getRoute: Authorizationヘッダーとcoordinatesボディを含める', async () => {
    const client = new ORSClient({
      apiKey: 'test-key',
      RateLimiter,
      minuteLimiter: { canMakeRequest: () => true, recordRequest: vi.fn(), getWaitTime: () => 0 },
      dailyLimiter: { canMakeRequest: () => true, recordRequest: vi.fn(), getWaitTime: () => 0 }
    });

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => createOkGeoJson()
    });

    await client.getRoute([
      { lat: 33.2636, lon: 130.3009 },
      { lat: 33.2618, lon: 130.2965 }
    ]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];

    expect(url).toContain('/directions/');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('test-key');

    const body = JSON.parse(options.body);
    expect(Array.isArray(body.coordinates)).toBe(true);
    expect(body.coordinates[0]).toEqual([130.3009, 33.2636]);
  });

  it('getRoute: ネットワークエラー時に指数バックオフで最大3回リトライする', async () => {
    const client = new ORSClient({
      apiKey: 'test-key',
      RateLimiter,
      minuteLimiter: { canMakeRequest: () => true, recordRequest: vi.fn(), getWaitTime: () => 0 },
      dailyLimiter: { canMakeRequest: () => true, recordRequest: vi.fn(), getWaitTime: () => 0 }
    });

    const okResponse = {
      ok: true,
      status: 200,
      json: async () => createOkGeoJson()
    };

    global.fetch
      .mockRejectedValueOnce(new Error('network1'))
      .mockRejectedValueOnce(new Error('network2'))
      .mockResolvedValueOnce(okResponse);

    const promise = client.getRoute([
      { lat: 33.2636, lon: 130.3009 },
      { lat: 33.2618, lon: 130.2965 }
    ]);

    // 1回目失敗 → 1秒待機
    await vi.advanceTimersByTimeAsync(1000);
    // 2回目失敗 → 2秒待機
    await vi.advanceTimersByTimeAsync(2000);

    await promise;
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('getRoute: apiKey未設定ならNO_API_KEYで失敗する', async () => {
    const client = new ORSClient({
      apiKey: null,
      RateLimiter,
      minuteLimiter: { canMakeRequest: () => true, recordRequest: vi.fn(), getWaitTime: () => 0 },
      dailyLimiter: { canMakeRequest: () => true, recordRequest: vi.fn(), getWaitTime: () => 0 }
    });

    await expect(
      client.getRoute([
        { lat: 33.2636, lon: 130.3009 },
        { lat: 33.2618, lon: 130.2965 }
      ])
    ).rejects.toMatchObject({ code: 'NO_API_KEY' });
  });
});

