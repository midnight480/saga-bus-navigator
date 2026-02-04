/**
 * プロパティテスト: 始発・終バス情報の構造
 * 
 * プロパティ4: 始発・終バス情報の構造
 * 任意の有効な路線IDに対して、返される始発・終バス情報は必須フィールド
 * （trip_id, departure_time, arrival_time）を含む
 * 
 * **検証: 要件4.2**
 * 
 * Feature: mcp-apps, Property 4: 始発・終バス情報の構造
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { executeGetFirstLastBus } from '../../lib/mcp/tools/get-first-last-bus';

describe('Property 4: First and Last Bus Information Structure', () => {
  beforeEach(() => {
    // fetchをモック
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return first and last bus info with all required fields for any valid route ID', () => {
    // 路線IDの生成器
    const routeIdArbitrary = fc.oneof(
      // 実際の路線IDパターン（数値）
      fc.integer({ min: 1, max: 100 }).map(n => n.toString()),
      // 実際の路線IDパターン（文字列）
      fc.constantFrom('1', '2', '3', 'route-1', 'route-2', 'route-3'),
      // ランダムな文字列
      fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0)
    );

    fc.assert(
      fc.asyncProperty(routeIdArbitrary, async (route_id) => {
        // モックレスポンスを生成
        const mockResponse = generateMockFirstLastBusResponse(route_id);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await executeGetFirstLastBus({ route_id }, 'http://localhost');

        // エラーでない場合のみ検証
        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // プロパティ4: 始発・終バス情報が必須フィールドを含む

          // 始発バス情報の検証
          expect(response).toHaveProperty('first_bus');
          expect(response.first_bus).toHaveProperty('trip_id');
          expect(response.first_bus).toHaveProperty('departure_time');
          expect(response.first_bus).toHaveProperty('arrival_time');

          // 型チェック
          expect(typeof response.first_bus.trip_id).toBe('string');
          expect(typeof response.first_bus.departure_time).toBe('string');
          expect(typeof response.first_bus.arrival_time).toBe('string');

          // 値の妥当性確認
          expect(response.first_bus.trip_id.length).toBeGreaterThan(0);
          expect(response.first_bus.departure_time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
          expect(response.first_bus.arrival_time).toMatch(/^\d{2}:\d{2}:\d{2}$/);

          // 終バス情報の検証
          expect(response).toHaveProperty('last_bus');
          expect(response.last_bus).toHaveProperty('trip_id');
          expect(response.last_bus).toHaveProperty('departure_time');
          expect(response.last_bus).toHaveProperty('arrival_time');

          // 型チェック
          expect(typeof response.last_bus.trip_id).toBe('string');
          expect(typeof response.last_bus.departure_time).toBe('string');
          expect(typeof response.last_bus.arrival_time).toBe('string');

          // 値の妥当性確認
          expect(response.last_bus.trip_id.length).toBeGreaterThan(0);
          expect(response.last_bus.departure_time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
          expect(response.last_bus.arrival_time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain field structure consistency between first and last bus', () => {
    const routeIdArbitrary = fc.oneof(
      fc.integer({ min: 1, max: 50 }).map(n => n.toString()),
      fc.constantFrom('1', '2', '3', 'route-1', 'route-2')
    );

    fc.assert(
      fc.asyncProperty(routeIdArbitrary, async (route_id) => {
        const mockResponse = generateMockFirstLastBusResponse(route_id);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await executeGetFirstLastBus({ route_id }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // 始発と終バスが同じフィールド構造を持つ
          const firstBusKeys = Object.keys(response.first_bus).sort();
          const lastBusKeys = Object.keys(response.last_bus).sort();

          expect(firstBusKeys).toEqual(lastBusKeys);

          // 各フィールドの型も一致
          firstBusKeys.forEach(key => {
            expect(typeof response.first_bus[key]).toBe(typeof response.last_bus[key]);
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should validate time format in departure_time and arrival_time', () => {
    const routeIdArbitrary = fc.oneof(
      fc.integer({ min: 1, max: 50 }).map(n => n.toString()),
      fc.constantFrom('1', '2', '3')
    );

    fc.assert(
      fc.asyncProperty(routeIdArbitrary, async (route_id) => {
        const mockResponse = generateMockFirstLastBusResponse(route_id);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await executeGetFirstLastBus({ route_id }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // 始発バスの時刻形式検証（HH:MM:SS形式）
          expect(response.first_bus.departure_time).toMatch(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/);
          expect(response.first_bus.arrival_time).toMatch(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/);

          // 時刻の妥当性確認
          const [firstDepHour, firstDepMin, firstDepSec] = response.first_bus.departure_time.split(':').map(Number);
          const [firstArrHour, firstArrMin, firstArrSec] = response.first_bus.arrival_time.split(':').map(Number);

          expect(firstDepHour).toBeGreaterThanOrEqual(0);
          expect(firstDepHour).toBeLessThan(24);
          expect(firstDepMin).toBeGreaterThanOrEqual(0);
          expect(firstDepMin).toBeLessThan(60);
          expect(firstDepSec).toBeGreaterThanOrEqual(0);
          expect(firstDepSec).toBeLessThan(60);

          expect(firstArrHour).toBeGreaterThanOrEqual(0);
          expect(firstArrHour).toBeLessThan(24);
          expect(firstArrMin).toBeGreaterThanOrEqual(0);
          expect(firstArrMin).toBeLessThan(60);
          expect(firstArrSec).toBeGreaterThanOrEqual(0);
          expect(firstArrSec).toBeLessThan(60);

          // 終バスの時刻形式検証（HH:MM:SS形式）
          expect(response.last_bus.departure_time).toMatch(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/);
          expect(response.last_bus.arrival_time).toMatch(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/);

          // 時刻の妥当性確認
          const [lastDepHour, lastDepMin, lastDepSec] = response.last_bus.departure_time.split(':').map(Number);
          const [lastArrHour, lastArrMin, lastArrSec] = response.last_bus.arrival_time.split(':').map(Number);

          expect(lastDepHour).toBeGreaterThanOrEqual(0);
          expect(lastDepHour).toBeLessThan(24);
          expect(lastDepMin).toBeGreaterThanOrEqual(0);
          expect(lastDepMin).toBeLessThan(60);
          expect(lastDepSec).toBeGreaterThanOrEqual(0);
          expect(lastDepSec).toBeLessThan(60);

          expect(lastArrHour).toBeGreaterThanOrEqual(0);
          expect(lastArrHour).toBeLessThan(24);
          expect(lastArrMin).toBeGreaterThanOrEqual(0);
          expect(lastArrMin).toBeLessThan(60);
          expect(lastArrSec).toBeGreaterThanOrEqual(0);
          expect(lastArrSec).toBeLessThan(60);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should ensure first bus departs before last bus', () => {
    const routeIdArbitrary = fc.oneof(
      fc.integer({ min: 1, max: 50 }).map(n => n.toString()),
      fc.constantFrom('1', '2', '3')
    );

    fc.assert(
      fc.asyncProperty(routeIdArbitrary, async (route_id) => {
        const mockResponse = generateMockFirstLastBusResponse(route_id);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await executeGetFirstLastBus({ route_id }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // 始発の出発時刻を秒に変換
          const [firstDepHour, firstDepMin, firstDepSec] = response.first_bus.departure_time.split(':').map(Number);
          const firstDepSeconds = firstDepHour * 3600 + firstDepMin * 60 + firstDepSec;

          // 終バスの出発時刻を秒に変換
          const [lastDepHour, lastDepMin, lastDepSec] = response.last_bus.departure_time.split(':').map(Number);
          const lastDepSeconds = lastDepHour * 3600 + lastDepMin * 60 + lastDepSec;

          // 始発は終バスより前に出発する（または同じ時刻）
          expect(firstDepSeconds).toBeLessThanOrEqual(lastDepSeconds);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should include route metadata in response', () => {
    const routeIdArbitrary = fc.oneof(
      fc.integer({ min: 1, max: 50 }).map(n => n.toString()),
      fc.constantFrom('1', '2', '3', 'route-1')
    );

    fc.assert(
      fc.asyncProperty(routeIdArbitrary, async (route_id) => {
        const mockResponse = generateMockFirstLastBusResponse(route_id);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await executeGetFirstLastBus({ route_id }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // 路線メタデータの検証
          expect(response).toHaveProperty('route_id');
          expect(response).toHaveProperty('route_name');
          expect(response).toHaveProperty('total_trips');

          // 型チェック
          expect(typeof response.route_id).toBe('string');
          expect(typeof response.route_name).toBe('string');
          expect(typeof response.total_trips).toBe('number');

          // 値の妥当性確認
          expect(response.route_id).toBe(route_id);
          expect(response.route_name.length).toBeGreaterThan(0);
          expect(response.total_trips).toBeGreaterThanOrEqual(1);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should include additional fields in bus information', () => {
    const routeIdArbitrary = fc.oneof(
      fc.integer({ min: 1, max: 50 }).map(n => n.toString()),
      fc.constantFrom('1', '2', '3')
    );

    fc.assert(
      fc.asyncProperty(routeIdArbitrary, async (route_id) => {
        const mockResponse = generateMockFirstLastBusResponse(route_id);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await executeGetFirstLastBus({ route_id }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // 始発バスの追加フィールド
          expect(response.first_bus).toHaveProperty('trip_headsign');
          expect(response.first_bus).toHaveProperty('departure_stop_id');
          expect(response.first_bus).toHaveProperty('arrival_stop_id');

          expect(typeof response.first_bus.trip_headsign).toBe('string');
          expect(typeof response.first_bus.departure_stop_id).toBe('string');
          expect(typeof response.first_bus.arrival_stop_id).toBe('string');

          // 終バスの追加フィールド
          expect(response.last_bus).toHaveProperty('trip_headsign');
          expect(response.last_bus).toHaveProperty('departure_stop_id');
          expect(response.last_bus).toHaveProperty('arrival_stop_id');

          expect(typeof response.last_bus.trip_headsign).toBe('string');
          expect(typeof response.last_bus.departure_stop_id).toBe('string');
          expect(typeof response.last_bus.arrival_stop_id).toBe('string');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain response structure consistency', () => {
    const routeIdArbitrary = fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0);

    fc.assert(
      fc.asyncProperty(routeIdArbitrary, async (route_id) => {
        const mockResponse = generateMockFirstLastBusResponse(route_id);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await executeGetFirstLastBus({ route_id }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // レスポンスの基本構造
          expect(response).toHaveProperty('route_id');
          expect(response).toHaveProperty('route_name');
          expect(response).toHaveProperty('first_bus');
          expect(response).toHaveProperty('last_bus');
          expect(response).toHaveProperty('total_trips');

          // route_idが入力と一致（trimされた値）
          expect(response.route_id).toBe(route_id.trim());

          // first_busとlast_busはオブジェクト
          expect(typeof response.first_bus).toBe('object');
          expect(typeof response.last_bus).toBe('object');
          expect(response.first_bus).not.toBeNull();
          expect(response.last_bus).not.toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle various route ID formats', () => {
    const routeIdArbitrary = fc.oneof(
      // 数値のみ
      fc.integer({ min: 1, max: 999 }).map(n => n.toString()),
      // 英数字
      fc.stringOf(fc.constantFrom('a', 'b', 'c', '1', '2', '3', '-', '_'), { minLength: 1, maxLength: 20 }),
      // 実際のパターン
      fc.constantFrom('route-1', 'route-2', 'line-a', 'line-b', '1', '2', '3')
    ).filter(s => s.trim().length > 0);

    fc.assert(
      fc.asyncProperty(routeIdArbitrary, async (route_id) => {
        const mockResponse = generateMockFirstLastBusResponse(route_id);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await executeGetFirstLastBus({ route_id }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // 必須フィールドが存在
          expect(response.first_bus).toHaveProperty('trip_id');
          expect(response.first_bus).toHaveProperty('departure_time');
          expect(response.first_bus).toHaveProperty('arrival_time');

          expect(response.last_bus).toHaveProperty('trip_id');
          expect(response.last_bus).toHaveProperty('departure_time');
          expect(response.last_bus).toHaveProperty('arrival_time');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should ensure arrival time is after departure time for both buses', () => {
    const routeIdArbitrary = fc.oneof(
      fc.integer({ min: 1, max: 50 }).map(n => n.toString()),
      fc.constantFrom('1', '2', '3')
    );

    fc.assert(
      fc.asyncProperty(routeIdArbitrary, async (route_id) => {
        const mockResponse = generateMockFirstLastBusResponse(route_id);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await executeGetFirstLastBus({ route_id }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // 始発バス: 到着時刻が出発時刻より後
          const [firstDepHour, firstDepMin, firstDepSec] = response.first_bus.departure_time.split(':').map(Number);
          const firstDepSeconds = firstDepHour * 3600 + firstDepMin * 60 + firstDepSec;

          const [firstArrHour, firstArrMin, firstArrSec] = response.first_bus.arrival_time.split(':').map(Number);
          const firstArrSeconds = firstArrHour * 3600 + firstArrMin * 60 + firstArrSec;

          expect(firstArrSeconds).toBeGreaterThan(firstDepSeconds);

          // 終バス: 到着時刻が出発時刻より後
          const [lastDepHour, lastDepMin, lastDepSec] = response.last_bus.departure_time.split(':').map(Number);
          const lastDepSeconds = lastDepHour * 3600 + lastDepMin * 60 + lastDepSec;

          const [lastArrHour, lastArrMin, lastArrSec] = response.last_bus.arrival_time.split(':').map(Number);
          const lastArrSeconds = lastArrHour * 3600 + lastArrMin * 60 + lastArrSec;

          expect(lastArrSeconds).toBeGreaterThan(lastDepSeconds);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should validate trip_id format and uniqueness', () => {
    const routeIdArbitrary = fc.oneof(
      fc.integer({ min: 1, max: 50 }).map(n => n.toString()),
      fc.constantFrom('1', '2', '3')
    );

    fc.assert(
      fc.asyncProperty(routeIdArbitrary, async (route_id) => {
        const mockResponse = generateMockFirstLastBusResponse(route_id);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await executeGetFirstLastBus({ route_id }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // trip_idは空でない文字列
          expect(response.first_bus.trip_id.length).toBeGreaterThan(0);
          expect(response.last_bus.trip_id.length).toBeGreaterThan(0);

          // 始発と終バスのtrip_idは異なる（同じ便でない限り）
          if (response.total_trips > 1) {
            expect(response.first_bus.trip_id).not.toBe(response.last_bus.trip_id);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * モック始発・終バスレスポンスを生成
 */
function generateMockFirstLastBusResponse(routeId: string) {
  // route_idはtrimされた値を使用（実装の動作に合わせる）
  const trimmedRouteId = routeId.trim();
  
  const routeNames = [
    '佐賀駅～県庁前',
    '佐賀駅～市役所前',
    '佐賀駅～佐賀大学',
    '県庁前～バスセンター',
    '市役所前～佐賀大学',
  ];

  const headsigns = [
    '県庁前行き',
    '市役所前行き',
    '佐賀大学行き',
    'バスセンター行き',
    '佐賀駅行き',
  ];

  const stopIds = [
    'saga_station',
    'kencho_mae',
    'shiyakusho_mae',
    'saga_university',
    'bus_center',
  ];

  // 始発バスの時刻（早朝）
  const firstDepHour = 5 + Math.floor(Math.random() * 2); // 5-6時台
  const firstDepMin = Math.floor(Math.random() * 60);
  const firstDepSec = Math.floor(Math.random() * 60);
  const firstDuration = 10 + Math.floor(Math.random() * 30); // 10-40分

  const firstArrSeconds = firstDepHour * 3600 + firstDepMin * 60 + firstDepSec + firstDuration * 60;
  const firstArrHour = Math.floor(firstArrSeconds / 3600);
  const firstArrMin = Math.floor((firstArrSeconds % 3600) / 60);
  const firstArrSec = firstArrSeconds % 60;

  // 終バスの時刻（夜間）
  const lastDepHour = 21 + Math.floor(Math.random() * 2); // 21-22時台
  const lastDepMin = Math.floor(Math.random() * 60);
  const lastDepSec = Math.floor(Math.random() * 60);
  const lastDuration = 10 + Math.floor(Math.random() * 30); // 10-40分

  const lastArrSeconds = lastDepHour * 3600 + lastDepMin * 60 + lastDepSec + lastDuration * 60;
  const lastArrHour = Math.floor(lastArrSeconds / 3600);
  const lastArrMin = Math.floor((lastArrSeconds % 3600) / 60);
  const lastArrSec = lastArrSeconds % 60;

  const totalTrips = 10 + Math.floor(Math.random() * 40); // 10-50便

  return {
    route_id: trimmedRouteId,
    route_name: routeNames[Math.floor(Math.random() * routeNames.length)],
    first_bus: {
      trip_id: `trip_first_${trimmedRouteId}_${Date.now()}`,
      trip_headsign: headsigns[Math.floor(Math.random() * headsigns.length)],
      departure_time: `${firstDepHour.toString().padStart(2, '0')}:${firstDepMin.toString().padStart(2, '0')}:${firstDepSec.toString().padStart(2, '0')}`,
      arrival_time: `${firstArrHour.toString().padStart(2, '0')}:${firstArrMin.toString().padStart(2, '0')}:${firstArrSec.toString().padStart(2, '0')}`,
      departure_stop_id: stopIds[Math.floor(Math.random() * stopIds.length)],
      arrival_stop_id: stopIds[Math.floor(Math.random() * stopIds.length)],
    },
    last_bus: {
      trip_id: `trip_last_${trimmedRouteId}_${Date.now()}`,
      trip_headsign: headsigns[Math.floor(Math.random() * headsigns.length)],
      departure_time: `${lastDepHour.toString().padStart(2, '0')}:${lastDepMin.toString().padStart(2, '0')}:${lastDepSec.toString().padStart(2, '0')}`,
      arrival_time: `${lastArrHour.toString().padStart(2, '0')}:${lastArrMin.toString().padStart(2, '0')}:${lastArrSec.toString().padStart(2, '0')}`,
      departure_stop_id: stopIds[Math.floor(Math.random() * stopIds.length)],
      arrival_stop_id: stopIds[Math.floor(Math.random() * stopIds.length)],
    },
    total_trips: totalTrips,
  };
}
