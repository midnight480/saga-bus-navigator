/**
 * 経路検索ツールのプロパティベーステスト
 * 
 * 経路検索機能の普遍的なプロパティを検証するプロパティベーステスト
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { searchRoutes, type SearchRoutesArgs, type SearchRoutesResponse } from './search-routes.js';
import * as apiClientModule from '../api-client.js';

describe('経路検索ツール Properties', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Feature: mcp-server, Property 1: ツール呼び出しのAPI転送
  // **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
  describe('Property 1: ツール呼び出しのAPI転送', () => {
    it('任意のツール呼び出しに対して、MCPサーバは対応するREST APIエンドポイントに正しくリクエストを転送する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 50 }),
            to: fc.string({ minLength: 1, maxLength: 50 }),
            time: fc.option(fc.string({ minLength: 5, maxLength: 5 }), { nil: undefined }),
            type: fc.option(fc.constantFrom('departure' as const, 'arrival' as const), { nil: undefined }),
            weekday: fc.option(fc.constantFrom('weekday' as const, 'saturday' as const, 'holiday' as const), { nil: undefined }),
            limit: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined })
          }),
          async ({ from, to, time, type, weekday, limit }) => {
            // モックレスポンスの生成
            const mockResponse: SearchRoutesResponse = {
              routes: [],
              count: 0
            };

            // API Clientのgetメソッドをモック
            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            // ツールを呼び出し
            const args: SearchRoutesArgs = { from, to };
            if (time !== undefined) args.time = time;
            if (type !== undefined) args.type = type;
            if (weekday !== undefined) args.weekday = weekday;
            if (limit !== undefined) args.limit = limit;

            await searchRoutes(args);

            // 正しいエンドポイントが呼び出されたことを確認
            expect(mockGet).toHaveBeenCalledTimes(1);
            expect(mockGet).toHaveBeenCalledWith(
              '/routes/search',
              expect.objectContaining({
                from: from,
                to: to,
                time: time,
                type: type !== undefined ? type : 'departure',
                weekday: weekday,
                limit: limit !== undefined ? limit : 10
              })
            );

            // エンドポイントが正しいことを確認
            const callArgs = mockGet.mock.calls[0];
            expect(callArgs[0]).toBe('/routes/search');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('任意の経路検索に対して、/routes/searchエンドポイントが呼び出される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.oneof(
              fc.constant('佐賀駅'),
              fc.constant('バスセンター'),
              fc.constant('市役所'),
              fc.string({ minLength: 1, maxLength: 20 })
            ),
            to: fc.oneof(
              fc.constant('佐賀駅'),
              fc.constant('バスセンター'),
              fc.constant('市役所'),
              fc.string({ minLength: 1, maxLength: 20 })
            )
          }),
          async ({ from, to }) => {
            const mockResponse: SearchRoutesResponse = {
              routes: [],
              count: 0
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await searchRoutes({ from, to });

            // 正しいエンドポイントが呼び出されたことを確認
            expect(mockGet).toHaveBeenCalledWith(
              '/routes/search',
              expect.any(Object)
            );

            // エンドポイントパスが正確に一致することを確認
            const endpoint = mockGet.mock.calls[0][0];
            expect(endpoint).toBe('/routes/search');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: mcp-server, Property 2: パラメータの完全な転送
  // **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
  describe('Property 2: パラメータの完全な転送', () => {
    it('任意のツールパラメータに対して、MCPサーバはそのパラメータを欠落なくREST APIに渡す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 50 }),
            to: fc.string({ minLength: 1, maxLength: 50 }),
            time: fc.option(fc.string({ minLength: 5, maxLength: 5 }), { nil: undefined }),
            type: fc.option(fc.constantFrom('departure' as const, 'arrival' as const), { nil: undefined }),
            weekday: fc.option(fc.constantFrom('weekday' as const, 'saturday' as const, 'holiday' as const), { nil: undefined }),
            limit: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined })
          }),
          async ({ from, to, time, type, weekday, limit }) => {
            const mockResponse: SearchRoutesResponse = {
              routes: [],
              count: 0
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            // ツールを呼び出し
            const args: SearchRoutesArgs = { from, to };
            if (time !== undefined) args.time = time;
            if (type !== undefined) args.type = type;
            if (weekday !== undefined) args.weekday = weekday;
            if (limit !== undefined) args.limit = limit;

            await searchRoutes(args);

            // パラメータが完全に転送されたことを確認
            const callParams = mockGet.mock.calls[0][1];
            
            // 必須パラメータが正しく転送されている
            expect(callParams).toHaveProperty('from', from);
            expect(callParams).toHaveProperty('to', to);
            
            // オプションパラメータが正しく転送されている
            if (time !== undefined) {
              expect(callParams).toHaveProperty('time', time);
            } else {
              expect(callParams?.time).toBeUndefined();
            }
            
            // typeパラメータ（指定された場合はその値、未指定の場合はデフォルト値'departure'）
            expect(callParams).toHaveProperty('type', type !== undefined ? type : 'departure');
            
            // weekdayパラメータ
            if (weekday !== undefined) {
              expect(callParams).toHaveProperty('weekday', weekday);
            } else {
              expect(callParams?.weekday).toBeUndefined();
            }
            
            // limitパラメータ（指定された場合はその値、未指定の場合はデフォルト値10）
            expect(callParams).toHaveProperty('limit', limit !== undefined ? limit : 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('fromとtoパラメータは常に元の値のまま転送される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 100 }),
            to: fc.string({ minLength: 1, maxLength: 100 })
          }),
          async ({ from, to }) => {
            const mockResponse: SearchRoutesResponse = {
              routes: [],
              count: 0
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await searchRoutes({ from, to });

            // fromとtoパラメータが変更されずに転送されている
            const callParams = mockGet.mock.calls[0][1];
            expect(callParams?.from).toBe(from);
            expect(callParams?.to).toBe(to);
            
            // 文字列の長さも変わっていない
            expect(callParams?.from.length).toBe(from.length);
            expect(callParams?.to.length).toBe(to.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('timeパラメータが指定された場合、その値がそのまま転送される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 20 }),
            to: fc.string({ minLength: 1, maxLength: 20 }),
            time: fc.string({ minLength: 5, maxLength: 5 })
          }),
          async ({ from, to, time }) => {
            const mockResponse: SearchRoutesResponse = {
              routes: [],
              count: 0
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await searchRoutes({ from, to, time });

            // timeパラメータが変更されずに転送されている
            const callParams = mockGet.mock.calls[0][1];
            expect(callParams?.time).toBe(time);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('typeパラメータが指定された場合、その値がそのまま転送される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 20 }),
            to: fc.string({ minLength: 1, maxLength: 20 }),
            type: fc.constantFrom('departure' as const, 'arrival' as const)
          }),
          async ({ from, to, type }) => {
            const mockResponse: SearchRoutesResponse = {
              routes: [],
              count: 0
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await searchRoutes({ from, to, type });

            // typeパラメータが変更されずに転送されている
            const callParams = mockGet.mock.calls[0][1];
            expect(callParams?.type).toBe(type);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('typeパラメータが未指定の場合、デフォルト値departureが転送される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 20 }),
            to: fc.string({ minLength: 1, maxLength: 20 })
          }),
          async ({ from, to }) => {
            const mockResponse: SearchRoutesResponse = {
              routes: [],
              count: 0
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await searchRoutes({ from, to });

            // デフォルト値'departure'が転送されている
            const callParams = mockGet.mock.calls[0][1];
            expect(callParams?.type).toBe('departure');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('weekdayパラメータが指定された場合、その値がそのまま転送される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 20 }),
            to: fc.string({ minLength: 1, maxLength: 20 }),
            weekday: fc.constantFrom('weekday' as const, 'saturday' as const, 'holiday' as const)
          }),
          async ({ from, to, weekday }) => {
            const mockResponse: SearchRoutesResponse = {
              routes: [],
              count: 0
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await searchRoutes({ from, to, weekday });

            // weekdayパラメータが変更されずに転送されている
            const callParams = mockGet.mock.calls[0][1];
            expect(callParams?.weekday).toBe(weekday);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('limitパラメータが指定された場合、その値がそのまま転送される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 20 }),
            to: fc.string({ minLength: 1, maxLength: 20 }),
            limit: fc.integer({ min: 1, max: 100 })
          }),
          async ({ from, to, limit }) => {
            const mockResponse: SearchRoutesResponse = {
              routes: [],
              count: 0
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await searchRoutes({ from, to, limit });

            // limitパラメータが変更されずに転送されている
            const callParams = mockGet.mock.calls[0][1];
            expect(callParams?.limit).toBe(limit);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('limitパラメータが未指定の場合、デフォルト値10が転送される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 20 }),
            to: fc.string({ minLength: 1, maxLength: 20 })
          }),
          async ({ from, to }) => {
            const mockResponse: SearchRoutesResponse = {
              routes: [],
              count: 0
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await searchRoutes({ from, to });

            // デフォルト値10が転送されている
            const callParams = mockGet.mock.calls[0][1];
            expect(callParams?.limit).toBe(10);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: mcp-server, Property 3: レスポンス構造の完全性
  // **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
  describe('Property 3: レスポンス構造の完全性', () => {
    it('任意のAPIレスポンスに対して、MCPサーバは要求された全てのフィールドを含むレスポンスを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 20 }),
            to: fc.string({ minLength: 1, maxLength: 20 }),
            routes: fc.array(
              fc.record({
                route_id: fc.string({ minLength: 1, maxLength: 10 }),
                route_name: fc.string({ minLength: 1, maxLength: 50 }),
                departure_stop: fc.string({ minLength: 1, maxLength: 50 }),
                arrival_stop: fc.string({ minLength: 1, maxLength: 50 }),
                departure_time: fc.string({ minLength: 5, maxLength: 5 }), // HH:MM
                arrival_time: fc.string({ minLength: 5, maxLength: 5 }), // HH:MM
                travel_time: fc.integer({ min: 1, max: 180 }),
                fare: fc.integer({ min: 100, max: 1000 }),
                operator: fc.string({ minLength: 1, maxLength: 30 })
              }),
              { minLength: 0, maxLength: 10 }
            ),
            count: fc.nat({ max: 100 })
          }),
          async ({ from, to, routes, count }) => {
            const mockResponse: SearchRoutesResponse = {
              routes,
              count
            };

            vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await searchRoutes({ from, to });

            // レスポンスがMCP形式であることを確認
            expect(result).toHaveProperty('content');
            expect(Array.isArray(result.content)).toBe(true);
            expect(result.content).toHaveLength(1);

            // コンテンツがtext型であることを確認
            expect(result.content[0]).toHaveProperty('type', 'text');
            expect(result.content[0]).toHaveProperty('text');

            // レスポンスがJSON形式でパース可能であることを確認
            const parsedResponse = JSON.parse(result.content[0].text);

            // 必須フィールドが存在することを確認
            expect(parsedResponse).toHaveProperty('routes');
            expect(parsedResponse).toHaveProperty('count');

            // routesが配列であることを確認
            expect(Array.isArray(parsedResponse.routes)).toBe(true);
            expect(parsedResponse.routes).toHaveLength(routes.length);

            // countが正しい値であることを確認
            expect(parsedResponse.count).toBe(count);

            // 各経路が必須フィールドを持つことを確認
            parsedResponse.routes.forEach((route: any, index: number) => {
              expect(route).toHaveProperty('route_id', routes[index].route_id);
              expect(route).toHaveProperty('route_name', routes[index].route_name);
              expect(route).toHaveProperty('departure_stop', routes[index].departure_stop);
              expect(route).toHaveProperty('arrival_stop', routes[index].arrival_stop);
              expect(route).toHaveProperty('departure_time', routes[index].departure_time);
              expect(route).toHaveProperty('arrival_time', routes[index].arrival_time);
              expect(route).toHaveProperty('travel_time', routes[index].travel_time);
              expect(route).toHaveProperty('fare', routes[index].fare);
              expect(route).toHaveProperty('operator', routes[index].operator);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('空の検索結果に対しても、正しい構造のレスポンスを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 20 }),
            to: fc.string({ minLength: 1, maxLength: 20 })
          }),
          async ({ from, to }) => {
            const mockResponse: SearchRoutesResponse = {
              routes: [],
              count: 0
            };

            vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await searchRoutes({ from, to });

            // レスポンスがMCP形式であることを確認
            expect(result).toHaveProperty('content');
            expect(result.content).toHaveLength(1);
            expect(result.content[0]).toHaveProperty('type', 'text');

            // レスポンスがJSON形式でパース可能であることを確認
            const parsedResponse = JSON.parse(result.content[0].text);

            // 必須フィールドが存在することを確認
            expect(parsedResponse).toHaveProperty('routes');
            expect(parsedResponse).toHaveProperty('count');

            // 空の配列と0のカウントが正しく返されることを確認
            expect(parsedResponse.routes).toEqual([]);
            expect(parsedResponse.count).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('時刻情報（出発時刻・到着時刻）が正しく保持される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 20 }),
            to: fc.string({ minLength: 1, maxLength: 20 }),
            departure_time: fc.string({ minLength: 5, maxLength: 5 }),
            arrival_time: fc.string({ minLength: 5, maxLength: 5 })
          }),
          async ({ from, to, departure_time, arrival_time }) => {
            const mockResponse: SearchRoutesResponse = {
              routes: [
                {
                  route_id: '001',
                  route_name: 'テスト路線',
                  departure_stop: from,
                  arrival_stop: to,
                  departure_time,
                  arrival_time,
                  travel_time: 30,
                  fare: 200,
                  operator: 'テスト事業者'
                }
              ],
              count: 1
            };

            vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await searchRoutes({ from, to });
            const parsedResponse = JSON.parse(result.content[0].text);

            // 時刻情報が正確に保持されていることを確認
            expect(parsedResponse.routes[0].departure_time).toBe(departure_time);
            expect(parsedResponse.routes[0].arrival_time).toBe(arrival_time);

            // 文字列型であることを確認
            expect(typeof parsedResponse.routes[0].departure_time).toBe('string');
            expect(typeof parsedResponse.routes[0].arrival_time).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('運賃と所要時間が正しく保持される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 20 }),
            to: fc.string({ minLength: 1, maxLength: 20 }),
            travel_time: fc.integer({ min: 1, max: 180 }),
            fare: fc.integer({ min: 100, max: 1000 })
          }),
          async ({ from, to, travel_time, fare }) => {
            const mockResponse: SearchRoutesResponse = {
              routes: [
                {
                  route_id: '001',
                  route_name: 'テスト路線',
                  departure_stop: from,
                  arrival_stop: to,
                  departure_time: '09:00',
                  arrival_time: '09:30',
                  travel_time,
                  fare,
                  operator: 'テスト事業者'
                }
              ],
              count: 1
            };

            vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await searchRoutes({ from, to });
            const parsedResponse = JSON.parse(result.content[0].text);

            // 運賃と所要時間が正確に保持されていることを確認
            expect(parsedResponse.routes[0].travel_time).toBe(travel_time);
            expect(parsedResponse.routes[0].fare).toBe(fare);

            // 数値型であることを確認
            expect(typeof parsedResponse.routes[0].travel_time).toBe('number');
            expect(typeof parsedResponse.routes[0].fare).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('事業者情報が正しく保持される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 20 }),
            to: fc.string({ minLength: 1, maxLength: 20 }),
            operator: fc.oneof(
              fc.constant('佐賀市営バス'),
              fc.constant('祐徳バス'),
              fc.constant('西鉄バス'),
              fc.string({ minLength: 1, maxLength: 30 })
            )
          }),
          async ({ from, to, operator }) => {
            const mockResponse: SearchRoutesResponse = {
              routes: [
                {
                  route_id: '001',
                  route_name: 'テスト路線',
                  departure_stop: from,
                  arrival_stop: to,
                  departure_time: '09:00',
                  arrival_time: '09:30',
                  travel_time: 30,
                  fare: 200,
                  operator
                }
              ],
              count: 1
            };

            vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await searchRoutes({ from, to });
            const parsedResponse = JSON.parse(result.content[0].text);

            // 事業者情報が正確に保持されていることを確認
            expect(parsedResponse.routes[0].operator).toBe(operator);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('複数の経路が返される場合、全ての経路情報が保持される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.string({ minLength: 1, maxLength: 20 }),
            to: fc.string({ minLength: 1, maxLength: 20 }),
            routeCount: fc.integer({ min: 1, max: 10 })
          }),
          async ({ from, to, routeCount }) => {
            const routes = Array.from({ length: routeCount }, (_, i) => ({
              route_id: `00${i + 1}`,
              route_name: `テスト路線${i + 1}`,
              departure_stop: from,
              arrival_stop: to,
              departure_time: `09:${String(i * 10).padStart(2, '0')}`,
              arrival_time: `09:${String((i + 1) * 10).padStart(2, '0')}`,
              travel_time: 30 + i * 5,
              fare: 200 + i * 50,
              operator: 'テスト事業者'
            }));

            const mockResponse: SearchRoutesResponse = {
              routes,
              count: routeCount
            };

            vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await searchRoutes({ from, to });
            const parsedResponse = JSON.parse(result.content[0].text);

            // 全ての経路が保持されていることを確認
            expect(parsedResponse.routes).toHaveLength(routeCount);
            expect(parsedResponse.count).toBe(routeCount);

            // 各経路の情報が正確に保持されていることを確認
            parsedResponse.routes.forEach((route: any, index: number) => {
              expect(route.route_id).toBe(routes[index].route_id);
              expect(route.route_name).toBe(routes[index].route_name);
              expect(route.departure_stop).toBe(routes[index].departure_stop);
              expect(route.arrival_stop).toBe(routes[index].arrival_stop);
              expect(route.departure_time).toBe(routes[index].departure_time);
              expect(route.arrival_time).toBe(routes[index].arrival_time);
              expect(route.travel_time).toBe(routes[index].travel_time);
              expect(route.fare).toBe(routes[index].fare);
              expect(route.operator).toBe(routes[index].operator);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
