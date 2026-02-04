/**
 * プロパティテスト: バス停検索結果の妥当性
 * 
 * プロパティ2: バス停検索結果の妥当性
 * 任意の検索クエリに対して、返されるバス停は全て以下を満たす：
 * (1) 名前がクエリに部分一致する
 * (2) 結果数が10件以下
 * (3) 必須フィールド（id, name, lat, lng）を含む
 * 
 * 検証: 要件2.1, 2.2, 2.3
 * 
 * Feature: mcp-apps, Property 2: バス停検索結果の妥当性
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { executeSearchBusStops } from '../../lib/mcp/tools/search-bus-stops';

describe('Property 2: Bus Stop Search Result Validity', () => {
  beforeEach(() => {
    // fetchをモック
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return valid bus stops for any search query', () => {
    // 検索クエリの生成器（日本語文字列を含む）
    const searchQueryArbitrary = fc.oneof(
      // 日本語のバス停名パターン
      fc.constantFrom('佐賀駅', '県庁', '市役所', '病院', '学校', '公園', 'バスセンター'),
      // ランダムな日本語文字列
      fc.string({ minLength: 1, maxLength: 20 }),
      // 英数字
      fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0)
    );

    fc.assert(
      fc.asyncProperty(searchQueryArbitrary, async (query) => {
        // モックレスポンスを生成（クエリに部分一致するバス停）
        const mockStops = generateMockStops(query, Math.floor(Math.random() * 10) + 1);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ stops: mockStops, count: mockStops.length }),
        });

        const result = await executeSearchBusStops({ query }, 'http://localhost');

        // エラーでない場合のみ検証
        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // プロパティ2.2: 結果数が10件以下
          expect(response.stops.length).toBeLessThanOrEqual(10);

          // プロパティ2.3: 全てのバス停が必須フィールドを含む
          response.stops.forEach((stop: any) => {
            expect(stop).toHaveProperty('id');
            expect(stop).toHaveProperty('name');
            expect(stop).toHaveProperty('lat');
            expect(stop).toHaveProperty('lng');

            // 型チェック
            expect(typeof stop.id).toBe('string');
            expect(typeof stop.name).toBe('string');
            expect(typeof stop.lat).toBe('number');
            expect(typeof stop.lng).toBe('number');

            // プロパティ2.1: 名前がクエリに部分一致する
            // 大文字小文字を区別しない部分一致
            const normalizedStopName = stop.name.toLowerCase();
            const normalizedQuery = query.toLowerCase();
            expect(normalizedStopName).toContain(normalizedQuery);
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should respect limit parameter and return at most the specified number of results', () => {
    // limitパラメータの生成器（1〜10）
    const limitArbitrary = fc.integer({ min: 1, max: 10 });
    const queryArbitrary = fc.constantFrom('佐賀', '駅', 'バス');

    fc.assert(
      fc.asyncProperty(
        queryArbitrary,
        limitArbitrary,
        async (query, limit) => {
          // limitより多くのバス停を生成
          const mockStops = generateMockStops(query, 15);
          
          (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ 
              stops: mockStops.slice(0, limit), 
              count: limit 
            }),
          });

          const result = await executeSearchBusStops({ query, limit }, 'http://localhost');

          if (!result.isError) {
            const response = JSON.parse(result.content[0].text);

            // プロパティ2.2: 結果数がlimit以下
            expect(response.stops.length).toBeLessThanOrEqual(limit);
            expect(response.stops.length).toBeLessThanOrEqual(10);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should always include required fields with correct types', () => {
    const queryArbitrary = fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0);

    fc.assert(
      fc.asyncProperty(queryArbitrary, async (query) => {
        const mockStops = generateMockStops(query, 5);
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ stops: mockStops, count: mockStops.length }),
        });

        const result = await executeSearchBusStops({ query }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // プロパティ2.3: 全てのバス停が必須フィールドを正しい型で含む
          response.stops.forEach((stop: any) => {
            // フィールドの存在確認
            expect(stop).toHaveProperty('id');
            expect(stop).toHaveProperty('name');
            expect(stop).toHaveProperty('lat');
            expect(stop).toHaveProperty('lng');

            // 型の確認
            expect(typeof stop.id).toBe('string');
            expect(typeof stop.name).toBe('string');
            expect(typeof stop.lat).toBe('number');
            expect(typeof stop.lng).toBe('number');

            // 値の妥当性確認
            expect(stop.id.length).toBeGreaterThan(0);
            expect(stop.name.length).toBeGreaterThan(0);
            expect(Number.isFinite(stop.lat)).toBe(true);
            expect(Number.isFinite(stop.lng)).toBe(true);

            // 座標の範囲確認（佐賀市周辺）
            expect(stop.lat).toBeGreaterThan(30);
            expect(stop.lat).toBeLessThan(35);
            expect(stop.lng).toBeGreaterThan(128);
            expect(stop.lng).toBeLessThan(132);
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle partial matching correctly', () => {
    const partialQueryArbitrary = fc.record({
      fullName: fc.constantFrom(
        '佐賀駅バスセンター',
        '佐賀県庁前',
        '佐賀市役所',
        '佐賀大学前',
        '佐賀空港'
      ),
      partialQuery: fc.constantFrom('佐賀', '駅', '県庁', '市役所', '大学', '空港')
    }).filter(({ fullName, partialQuery }) => 
      fullName.toLowerCase().includes(partialQuery.toLowerCase())
    );

    fc.assert(
      fc.asyncProperty(partialQueryArbitrary, async ({ fullName, partialQuery }) => {
        const mockStops = [{
          id: 'test_stop',
          name: fullName,
          lat: 33.2653,
          lon: 130.3000,
        }];
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ stops: mockStops, count: 1 }),
        });

        const result = await executeSearchBusStops({ query: partialQuery }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // プロパティ2.1: 部分一致が正しく動作
          expect(response.stops.length).toBeGreaterThan(0);
          response.stops.forEach((stop: any) => {
            expect(stop.name.toLowerCase()).toContain(partialQuery.toLowerCase());
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle empty results correctly', () => {
    const nonExistentQueryArbitrary = fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => s.trim().length > 0);

    fc.assert(
      fc.asyncProperty(nonExistentQueryArbitrary, async (query) => {
        // 空の結果を返すモック
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ stops: [], count: 0 }),
        });

        const result = await executeSearchBusStops({ query }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // プロパティ2.2: 空の結果も10件以下
          expect(response.stops.length).toBeLessThanOrEqual(10);
          expect(response.stops.length).toBe(0);
          expect(response.count).toBe(0);
        }
      }),
      { numRuns: 50 }
    );
  });

  it('should convert lon to lng in response', () => {
    const queryArbitrary = fc.constantFrom('佐賀駅', '県庁', '市役所');

    fc.assert(
      fc.asyncProperty(queryArbitrary, async (query) => {
        const mockStops = [{
          id: 'test_stop',
          name: query,
          lat: 33.2653,
          lon: 130.3000, // REST APIはlonを使用
        }];
        
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ stops: mockStops, count: 1 }),
        });

        const result = await executeSearchBusStops({ query }, 'http://localhost');

        if (!result.isError) {
          const response = JSON.parse(result.content[0].text);

          // プロパティ2.3: lonがlngに変換されている
          response.stops.forEach((stop: any) => {
            expect(stop).toHaveProperty('lng');
            expect(stop).not.toHaveProperty('lon');
            expect(stop.lng).toBe(130.3000);
          });
        }
      }),
      { numRuns: 50 }
    );
  });

  it('should maintain result count consistency', () => {
    const queryArbitrary = fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0);
    const countArbitrary = fc.integer({ min: 0, max: 10 });

    fc.assert(
      fc.asyncProperty(
        queryArbitrary,
        countArbitrary,
        async (query, count) => {
          const mockStops = generateMockStops(query, count);
          
          (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ stops: mockStops, count: mockStops.length }),
          });

          const result = await executeSearchBusStops({ query }, 'http://localhost');

          if (!result.isError) {
            const response = JSON.parse(result.content[0].text);

            // プロパティ: countフィールドと実際の配列長が一致
            expect(response.count).toBe(response.stops.length);
            expect(response.stops.length).toBeLessThanOrEqual(10);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * モックバス停データを生成
 * クエリに部分一致するバス停名を生成
 */
function generateMockStops(query: string, count: number) {
  const stops = [];
  const baseNames = [
    `${query}駅`,
    `${query}バスセンター`,
    `${query}前`,
    `${query}入口`,
    `${query}北口`,
    `${query}南口`,
    `${query}東口`,
    `${query}西口`,
    `新${query}`,
    `${query}中央`,
  ];

  for (let i = 0; i < Math.min(count, 10); i++) {
    stops.push({
      id: `stop_${i}_${query}`,
      name: baseNames[i % baseNames.length],
      lat: 33.0 + Math.random() * 0.5,
      lon: 130.0 + Math.random() * 0.5,
    });
  }

  return stops;
}
