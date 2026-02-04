/**
 * プロパティテスト: 路線検索結果の構造
 * 
 * プロパティ3: 路線検索結果の構造
 * 任意のバス停IDペアに対して、返される路線情報は全て必須フィールド
 * （route_id, route_name, departure_time, arrival_time, duration_minutes, fare）を含む
 * 
 * **検証: 要件3.2**
 * 
 * Feature: mcp-apps, Property 3: 路線検索結果の構造
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { executeSearchRoutes } from '../../lib/mcp/tools/search-routes';

describe('Property 3: Route Search Result Structure', () => {
  beforeEach(() => {
    // fetchをモック
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return routes with all required fields for any bus stop ID pair', () => {
    // バス停IDペアの生成器
    const busStopIdPairArbitrary = fc.record({
      from_stop_id: fc.oneof(
        // 実際のバス停名パターン
        fc.constantFrom('佐賀駅', '県庁前', '市役所前', '佐賀大学', 'バスセンター'),
        // ランダムな文字列
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0)
      ),
      to_stop_id: fc.oneof(
        fc.constantFrom('県庁前', '市役所前', '佐賀大学', 'バスセンター', '佐賀駅'),
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0)
      ),
    });

    fc.assert(
      fc.asyncProperty(busStopIdPairArbitrary, async ({ from_stop_id, to_stop_id }) => {
        // モックレスポンスを生成
        const mockRoutes = generateMockRoutes(from_stop_id, to_stop_id, Math.floor(Math.random() * 5) + 1);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ routes: mockRoutes, count: mockRoutes.length }),
        });

        const result = await executeSearchRoutes({ from_stop_id, to_stop_id }, 'http://localhost');

        // エラーでない場合のみ検証
        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // プロパティ3: 全ての路線が必須フィールドを含む
          response.routes.forEach((route: any) => {
            // 必須フィールドの存在確認
            expect(route).toHaveProperty('route_id');
            expect(route).toHaveProperty('route_name');
            expect(route).toHaveProperty('departure_time');
            expect(route).toHaveProperty('arrival_time');
            expect(route).toHaveProperty('duration_minutes');
            expect(route).toHaveProperty('fare');

            // 型チェック
            expect(typeof route.route_id).toBe('string');
            expect(typeof route.route_name).toBe('string');
            expect(typeof route.departure_time).toBe('string');
            expect(typeof route.arrival_time).toBe('string');
            expect(typeof route.duration_minutes).toBe('number');
            expect(typeof route.fare).toBe('object');

            // fareオブジェクトの構造確認
            expect(route.fare).toHaveProperty('adult');
            expect(route.fare).toHaveProperty('child');
            expect(typeof route.fare.adult).toBe('number');
            expect(typeof route.fare.child).toBe('number');

            // 値の妥当性確認
            expect(route.route_id.length).toBeGreaterThan(0);
            expect(route.route_name.length).toBeGreaterThan(0);
            expect(route.departure_time).toMatch(/^\d{2}:\d{2}$/);
            expect(route.arrival_time).toMatch(/^\d{2}:\d{2}$/);
            expect(Number.isFinite(route.duration_minutes)).toBe(true);
            expect(route.duration_minutes).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(route.fare.adult)).toBe(true);
            expect(Number.isFinite(route.fare.child)).toBe(true);
            expect(route.fare.adult).toBeGreaterThanOrEqual(0);
            expect(route.fare.child).toBeGreaterThanOrEqual(0);
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain field structure consistency across multiple routes', () => {
    const busStopPairArbitrary = fc.record({
      from_stop_id: fc.constantFrom('佐賀駅', '県庁前', '市役所前'),
      to_stop_id: fc.constantFrom('県庁前', '市役所前', '佐賀大学'),
    });

    fc.assert(
      fc.asyncProperty(busStopPairArbitrary, async ({ from_stop_id, to_stop_id }) => {
        // 複数の路線を生成（1〜5件）
        const routeCount = Math.floor(Math.random() * 5) + 1;
        const mockRoutes = generateMockRoutes(from_stop_id, to_stop_id, routeCount);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ routes: mockRoutes, count: mockRoutes.length }),
        });

        const result = await executeSearchRoutes({ from_stop_id, to_stop_id }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // 全ての路線が同じフィールド構造を持つ
          const firstRoute = response.routes[0];
          const expectedKeys = Object.keys(firstRoute).sort();

          response.routes.forEach((route: any) => {
            const routeKeys = Object.keys(route).sort();
            expect(routeKeys).toEqual(expectedKeys);

            // 各フィールドの型も一致
            expectedKeys.forEach(key => {
              expect(typeof route[key]).toBe(typeof firstRoute[key]);
            });
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle empty results with correct structure', () => {
    const busStopPairArbitrary = fc.record({
      from_stop_id: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
      to_stop_id: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
    });

    fc.assert(
      fc.asyncProperty(busStopPairArbitrary, async ({ from_stop_id, to_stop_id }) => {
        // 空の結果を返すモック
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ routes: [], count: 0 }),
        });

        const result = await executeSearchRoutes({ from_stop_id, to_stop_id }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // 空の結果でも正しい構造
          expect(response).toHaveProperty('routes');
          expect(response).toHaveProperty('count');
          expect(Array.isArray(response.routes)).toBe(true);
          expect(response.routes.length).toBe(0);
          expect(response.count).toBe(0);
        }
      }),
      { numRuns: 50 }
    );
  });

  it('should validate time format in departure_time and arrival_time', () => {
    const busStopPairArbitrary = fc.record({
      from_stop_id: fc.constantFrom('佐賀駅', '県庁前', '市役所前'),
      to_stop_id: fc.constantFrom('県庁前', '市役所前', '佐賀大学'),
    });

    fc.assert(
      fc.asyncProperty(busStopPairArbitrary, async ({ from_stop_id, to_stop_id }) => {
        const mockRoutes = generateMockRoutes(from_stop_id, to_stop_id, 3);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ routes: mockRoutes, count: mockRoutes.length }),
        });

        const result = await executeSearchRoutes({ from_stop_id, to_stop_id }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          response.routes.forEach((route: any) => {
            // HH:MM形式の検証
            expect(route.departure_time).toMatch(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/);
            expect(route.arrival_time).toMatch(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/);

            // 時刻の妥当性確認
            const [depHour, depMin] = route.departure_time.split(':').map(Number);
            const [arrHour, arrMin] = route.arrival_time.split(':').map(Number);

            expect(depHour).toBeGreaterThanOrEqual(0);
            expect(depHour).toBeLessThan(24);
            expect(depMin).toBeGreaterThanOrEqual(0);
            expect(depMin).toBeLessThan(60);

            expect(arrHour).toBeGreaterThanOrEqual(0);
            expect(arrHour).toBeLessThan(24);
            expect(arrMin).toBeGreaterThanOrEqual(0);
            expect(arrMin).toBeLessThan(60);
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should ensure duration_minutes matches time difference', () => {
    const busStopPairArbitrary = fc.record({
      from_stop_id: fc.constantFrom('佐賀駅', '県庁前', '市役所前'),
      to_stop_id: fc.constantFrom('県庁前', '市役所前', '佐賀大学'),
    });

    fc.assert(
      fc.asyncProperty(busStopPairArbitrary, async ({ from_stop_id, to_stop_id }) => {
        const mockRoutes = generateMockRoutes(from_stop_id, to_stop_id, 3);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ routes: mockRoutes, count: mockRoutes.length }),
        });

        const result = await executeSearchRoutes({ from_stop_id, to_stop_id }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          response.routes.forEach((route: any) => {
            // 所要時間の計算が正しいか検証
            const [depHour, depMin] = route.departure_time.split(':').map(Number);
            const [arrHour, arrMin] = route.arrival_time.split(':').map(Number);

            const depMinutes = depHour * 60 + depMin;
            const arrMinutes = arrHour * 60 + arrMin;
            const expectedDuration = arrMinutes - depMinutes;

            expect(route.duration_minutes).toBe(expectedDuration);
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle various time parameter formats', () => {
    const searchParamsArbitrary = fc.record({
      from_stop_id: fc.constantFrom('佐賀駅', '県庁前', '市役所前'),
      to_stop_id: fc.constantFrom('県庁前', '市役所前', '佐賀大学'),
      time: fc.option(
        fc.record({
          hour: fc.integer({ min: 0, max: 23 }),
          minute: fc.integer({ min: 0, max: 59 }),
        }).map(({ hour, minute }) => 
          `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        ),
        { nil: undefined }
      ),
    });

    fc.assert(
      fc.asyncProperty(searchParamsArbitrary, async ({ from_stop_id, to_stop_id, time }) => {
        const mockRoutes = generateMockRoutes(from_stop_id, to_stop_id, 2);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ routes: mockRoutes, count: mockRoutes.length }),
        });

        const params: any = { from_stop_id, to_stop_id };
        if (time) {
          params.time = time;
        }

        const result = await executeSearchRoutes(params, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // timeパラメータの有無に関わらず、結果構造は同じ
          response.routes.forEach((route: any) => {
            expect(route).toHaveProperty('route_id');
            expect(route).toHaveProperty('route_name');
            expect(route).toHaveProperty('departure_time');
            expect(route).toHaveProperty('arrival_time');
            expect(route).toHaveProperty('duration_minutes');
            expect(route).toHaveProperty('fare');
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should respect limit parameter while maintaining field structure', () => {
    const searchParamsArbitrary = fc.record({
      from_stop_id: fc.constantFrom('佐賀駅', '県庁前', '市役所前'),
      to_stop_id: fc.constantFrom('県庁前', '市役所前', '佐賀大学'),
      limit: fc.integer({ min: 1, max: 10 }),
    });

    fc.assert(
      fc.asyncProperty(searchParamsArbitrary, async ({ from_stop_id, to_stop_id, limit }) => {
        // limitより多くの路線を生成
        const mockRoutes = generateMockRoutes(from_stop_id, to_stop_id, 10);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ 
            routes: mockRoutes.slice(0, limit), 
            count: limit 
          }),
        });

        const result = await executeSearchRoutes({ from_stop_id, to_stop_id, limit }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // 結果数がlimit以下
          expect(response.routes.length).toBeLessThanOrEqual(limit);

          // 全ての路線が必須フィールドを含む
          response.routes.forEach((route: any) => {
            expect(route).toHaveProperty('route_id');
            expect(route).toHaveProperty('route_name');
            expect(route).toHaveProperty('departure_time');
            expect(route).toHaveProperty('arrival_time');
            expect(route).toHaveProperty('duration_minutes');
            expect(route).toHaveProperty('fare');
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle fare information correctly', () => {
    const busStopPairArbitrary = fc.record({
      from_stop_id: fc.constantFrom('佐賀駅', '県庁前', '市役所前'),
      to_stop_id: fc.constantFrom('県庁前', '市役所前', '佐賀大学'),
    });

    fc.assert(
      fc.asyncProperty(busStopPairArbitrary, async ({ from_stop_id, to_stop_id }) => {
        const mockRoutes = generateMockRoutes(from_stop_id, to_stop_id, 3);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ routes: mockRoutes, count: mockRoutes.length }),
        });

        const result = await executeSearchRoutes({ from_stop_id, to_stop_id }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          response.routes.forEach((route: any) => {
            // fareオブジェクトの構造
            expect(route.fare).toHaveProperty('adult');
            expect(route.fare).toHaveProperty('child');

            // 運賃は非負の数値
            expect(typeof route.fare.adult).toBe('number');
            expect(typeof route.fare.child).toBe('number');
            expect(route.fare.adult).toBeGreaterThanOrEqual(0);
            expect(route.fare.child).toBeGreaterThanOrEqual(0);

            // 子供運賃は大人運賃以下（一般的なルール）
            expect(route.fare.child).toBeLessThanOrEqual(route.fare.adult);
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain response structure consistency', () => {
    const busStopPairArbitrary = fc.record({
      from_stop_id: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
      to_stop_id: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
    });

    fc.assert(
      fc.asyncProperty(busStopPairArbitrary, async ({ from_stop_id, to_stop_id }) => {
        const routeCount = Math.floor(Math.random() * 5);
        const mockRoutes = generateMockRoutes(from_stop_id, to_stop_id, routeCount);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ routes: mockRoutes, count: mockRoutes.length }),
        });

        const result = await executeSearchRoutes({ from_stop_id, to_stop_id }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // レスポンスの基本構造
          expect(response).toHaveProperty('from_stop');
          expect(response).toHaveProperty('to_stop');
          expect(response).toHaveProperty('routes');
          expect(response).toHaveProperty('count');

          // routesは配列
          expect(Array.isArray(response.routes)).toBe(true);

          // countと配列長が一致
          expect(response.count).toBe(response.routes.length);

          // from_stopとto_stopが入力と一致（trimされた値）
          expect(response.from_stop).toBe(from_stop_id.trim());
          expect(response.to_stop).toBe(to_stop_id.trim());
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * モック路線データを生成
 */
function generateMockRoutes(fromStop: string, toStop: string, count: number) {
  const routes = [];
  const routeNames = [
    '佐賀市営バス1号線',
    '佐賀市営バス2号線',
    '祐徳バス',
    '西鉄バス',
    '昭和バス',
  ];

  for (let i = 0; i < count; i++) {
    const departureHour = 8 + Math.floor(Math.random() * 10);
    const departureMinute = Math.floor(Math.random() * 60);
    const durationMinutes = 10 + Math.floor(Math.random() * 50);

    const arrivalMinutes = departureHour * 60 + departureMinute + durationMinutes;
    const arrivalHour = Math.floor(arrivalMinutes / 60);
    const arrivalMinute = arrivalMinutes % 60;

    routes.push({
      tripId: `trip_${i}_${fromStop}_${toStop}`,
      routeName: routeNames[i % routeNames.length],
      headsign: `${toStop}行き`,
      departureTime: `${departureHour.toString().padStart(2, '0')}:${departureMinute.toString().padStart(2, '0')}`,
      arrivalTime: `${arrivalHour.toString().padStart(2, '0')}:${arrivalMinute.toString().padStart(2, '0')}`,
      fromStop: fromStop,
      toStop: toStop,
    });
  }

  return routes;
}
