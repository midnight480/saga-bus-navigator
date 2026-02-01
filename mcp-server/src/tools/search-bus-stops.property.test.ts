/**
 * バス停検索ツールのプロパティベーステスト
 * 
 * バス停検索機能の普遍的なプロパティを検証するプロパティベーステスト
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { searchBusStops, type SearchBusStopsArgs, type SearchBusStopsResponse } from './search-bus-stops.js';
import * as apiClientModule from '../api-client.js';

describe('バス停検索ツール Properties', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Feature: mcp-server, Property 1: ツール呼び出しのAPI転送
  // **Validates: Requirements 1.1, 1.2, 1.3**
  describe('Property 1: ツール呼び出しのAPI転送', () => {
    it('任意のツール呼び出しに対して、MCPサーバは対応するREST APIエンドポイントに正しくリクエストを転送する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            q: fc.string({ minLength: 1, maxLength: 50 }),
            limit: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined })
          }),
          async ({ q, limit }) => {
            // モックレスポンスの生成
            const mockResponse: SearchBusStopsResponse = {
              stops: [],
              count: 0
            };

            // API Clientのgetメソッドをモック
            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            // ツールを呼び出し
            const args: SearchBusStopsArgs = limit !== undefined ? { q, limit } : { q };
            await searchBusStops(args);

            // 正しいエンドポイントが呼び出されたことを確認
            expect(mockGet).toHaveBeenCalledTimes(1);
            expect(mockGet).toHaveBeenCalledWith(
              '/stops/search',
              expect.objectContaining({
                q: q,
                limit: limit !== undefined ? limit : 10
              })
            );

            // エンドポイントが正しいことを確認
            const callArgs = mockGet.mock.calls[0];
            expect(callArgs[0]).toBe('/stops/search');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('任意のバス停名検索に対して、/stops/searchエンドポイントが呼び出される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('佐賀駅'),
            fc.constant('バスセンター'),
            fc.constant('市役所'),
            fc.string({ minLength: 1, maxLength: 20 })
          ),
          async (busStopName) => {
            const mockResponse: SearchBusStopsResponse = {
              stops: [],
              count: 0
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await searchBusStops({ q: busStopName });

            // 正しいエンドポイントが呼び出されたことを確認
            expect(mockGet).toHaveBeenCalledWith(
              '/stops/search',
              expect.any(Object)
            );

            // エンドポイントパスが正確に一致することを確認
            const endpoint = mockGet.mock.calls[0][0];
            expect(endpoint).toBe('/stops/search');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: mcp-server, Property 2: パラメータの完全な転送
  // **Validates: Requirements 1.1, 1.2, 1.3**
  describe('Property 2: パラメータの完全な転送', () => {
    it('任意のツールパラメータに対して、MCPサーバはそのパラメータを欠落なくREST APIに渡す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            q: fc.string({ minLength: 1, maxLength: 50 }),
            limit: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined })
          }),
          async ({ q, limit }) => {
            const mockResponse: SearchBusStopsResponse = {
              stops: [],
              count: 0
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            // ツールを呼び出し
            const args: SearchBusStopsArgs = limit !== undefined ? { q, limit } : { q };
            await searchBusStops(args);

            // パラメータが完全に転送されたことを確認
            const callParams = mockGet.mock.calls[0][1];
            
            // qパラメータが正しく転送されている
            expect(callParams).toHaveProperty('q', q);
            
            // limitパラメータが正しく転送されている（指定された場合はその値、未指定の場合はデフォルト値10）
            if (limit !== undefined) {
              expect(callParams).toHaveProperty('limit', limit);
            } else {
              expect(callParams).toHaveProperty('limit', 10);
            }

            // 余分なパラメータが追加されていないことを確認
            const paramKeys = Object.keys(callParams || {});
            expect(paramKeys).toHaveLength(2); // q と limit のみ
            expect(paramKeys).toContain('q');
            expect(paramKeys).toContain('limit');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('qパラメータは常に元の値のまま転送される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (queryString) => {
            const mockResponse: SearchBusStopsResponse = {
              stops: [],
              count: 0
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await searchBusStops({ q: queryString });

            // qパラメータが変更されずに転送されている
            const callParams = mockGet.mock.calls[0][1];
            expect(callParams?.q).toBe(queryString);
            
            // 文字列の長さも変わっていない
            expect(callParams?.q.length).toBe(queryString.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('limitパラメータが指定された場合、その値がそのまま転送される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            q: fc.string({ minLength: 1, maxLength: 20 }),
            limit: fc.integer({ min: 1, max: 100 })
          }),
          async ({ q, limit }) => {
            const mockResponse: SearchBusStopsResponse = {
              stops: [],
              count: 0
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await searchBusStops({ q, limit });

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
          fc.string({ minLength: 1, maxLength: 20 }),
          async (q) => {
            const mockResponse: SearchBusStopsResponse = {
              stops: [],
              count: 0
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await searchBusStops({ q });

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
  // **Validates: Requirements 1.1, 1.2, 1.3**
  describe('Property 3: レスポンス構造の完全性', () => {
    it('任意のAPIレスポンスに対して、MCPサーバは要求された全てのフィールドを含むレスポンスを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            q: fc.string({ minLength: 1, maxLength: 20 }),
            stops: fc.array(
              fc.record({
                stop_id: fc.string({ minLength: 1, maxLength: 10 }),
                stop_name: fc.string({ minLength: 1, maxLength: 50 }),
                stop_lat: fc.double({ min: -90, max: 90 }),
                stop_lon: fc.double({ min: -180, max: 180 }),
                next_departure: fc.option(
                  fc.record({
                    route_name: fc.string({ minLength: 1, maxLength: 30 }),
                    departure_time: fc.string({ minLength: 5, maxLength: 5 }), // HH:MM
                    destination: fc.string({ minLength: 1, maxLength: 30 })
                  }),
                  { nil: undefined }
                )
              }),
              { minLength: 0, maxLength: 10 }
            ),
            count: fc.nat({ max: 100 })
          }),
          async ({ q, stops, count }) => {
            const mockResponse: SearchBusStopsResponse = {
              stops,
              count
            };

            vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await searchBusStops({ q });

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
            expect(parsedResponse).toHaveProperty('stops');
            expect(parsedResponse).toHaveProperty('count');

            // stopsが配列であることを確認
            expect(Array.isArray(parsedResponse.stops)).toBe(true);
            expect(parsedResponse.stops).toHaveLength(stops.length);

            // countが正しい値であることを確認
            expect(parsedResponse.count).toBe(count);

            // 各バス停が必須フィールドを持つことを確認
            parsedResponse.stops.forEach((stop: any, index: number) => {
              expect(stop).toHaveProperty('stop_id', stops[index].stop_id);
              expect(stop).toHaveProperty('stop_name', stops[index].stop_name);
              
              // JSON変換後の値で比較（-0は0に、NaNはnullに変換される）
              const expectedLat = JSON.parse(JSON.stringify(stops[index].stop_lat));
              const expectedLon = JSON.parse(JSON.stringify(stops[index].stop_lon));
              expect(stop).toHaveProperty('stop_lat', expectedLat);
              expect(stop).toHaveProperty('stop_lon', expectedLon);

              // next_departureが存在する場合、その構造を確認
              if (stops[index].next_departure) {
                expect(stop).toHaveProperty('next_departure');
                expect(stop.next_departure).toHaveProperty('route_name');
                expect(stop.next_departure).toHaveProperty('departure_time');
                expect(stop.next_departure).toHaveProperty('destination');
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('空の検索結果に対しても、正しい構造のレスポンスを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          async (q) => {
            const mockResponse: SearchBusStopsResponse = {
              stops: [],
              count: 0
            };

            vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await searchBusStops({ q });

            // レスポンスがMCP形式であることを確認
            expect(result).toHaveProperty('content');
            expect(result.content).toHaveLength(1);
            expect(result.content[0]).toHaveProperty('type', 'text');

            // レスポンスがJSON形式でパース可能であることを確認
            const parsedResponse = JSON.parse(result.content[0].text);

            // 必須フィールドが存在することを確認
            expect(parsedResponse).toHaveProperty('stops');
            expect(parsedResponse).toHaveProperty('count');

            // 空の配列と0のカウントが正しく返されることを確認
            expect(parsedResponse.stops).toEqual([]);
            expect(parsedResponse.count).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('バス停の位置情報（緯度・経度）が正しく保持される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            q: fc.string({ minLength: 1, maxLength: 20 }),
            stop_lat: fc.double({ min: 33.0, max: 34.0, noNaN: true }), // 佐賀市周辺の緯度
            stop_lon: fc.double({ min: 130.0, max: 131.0, noNaN: true }) // 佐賀市周辺の経度
          }),
          async ({ q, stop_lat, stop_lon }) => {
            const mockResponse: SearchBusStopsResponse = {
              stops: [
                {
                  stop_id: '001',
                  stop_name: 'テストバス停',
                  stop_lat,
                  stop_lon
                }
              ],
              count: 1
            };

            vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await searchBusStops({ q });
            const parsedResponse = JSON.parse(result.content[0].text);

            // JSON変換後の値で比較（-0は0に変換される）
            const expectedLat = JSON.parse(JSON.stringify(stop_lat));
            const expectedLon = JSON.parse(JSON.stringify(stop_lon));

            // 位置情報が正確に保持されていることを確認
            expect(parsedResponse.stops[0].stop_lat).toBe(expectedLat);
            expect(parsedResponse.stops[0].stop_lon).toBe(expectedLon);

            // 数値型であることを確認
            expect(typeof parsedResponse.stops[0].stop_lat).toBe('number');
            expect(typeof parsedResponse.stops[0].stop_lon).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('次の発車情報が存在する場合、全てのフィールドが保持される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            q: fc.string({ minLength: 1, maxLength: 20 }),
            route_name: fc.string({ minLength: 1, maxLength: 30 }),
            departure_time: fc.string({ minLength: 5, maxLength: 5 }),
            destination: fc.string({ minLength: 1, maxLength: 30 })
          }),
          async ({ q, route_name, departure_time, destination }) => {
            const mockResponse: SearchBusStopsResponse = {
              stops: [
                {
                  stop_id: '001',
                  stop_name: 'テストバス停',
                  stop_lat: 33.2653,
                  stop_lon: 130.3000,
                  next_departure: {
                    route_name,
                    departure_time,
                    destination
                  }
                }
              ],
              count: 1
            };

            vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await searchBusStops({ q });
            const parsedResponse = JSON.parse(result.content[0].text);

            // next_departureの全フィールドが保持されていることを確認
            expect(parsedResponse.stops[0].next_departure).toBeDefined();
            expect(parsedResponse.stops[0].next_departure.route_name).toBe(route_name);
            expect(parsedResponse.stops[0].next_departure.departure_time).toBe(departure_time);
            expect(parsedResponse.stops[0].next_departure.destination).toBe(destination);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('複数のバス停が返される場合、全てのバス停情報が保持される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            q: fc.string({ minLength: 1, maxLength: 20 }),
            stopCount: fc.integer({ min: 1, max: 10 })
          }),
          async ({ q, stopCount }) => {
            const stops = Array.from({ length: stopCount }, (_, i) => ({
              stop_id: `00${i + 1}`,
              stop_name: `テストバス停${i + 1}`,
              stop_lat: 33.2653 + i * 0.001,
              stop_lon: 130.3000 + i * 0.001
            }));

            const mockResponse: SearchBusStopsResponse = {
              stops,
              count: stopCount
            };

            vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await searchBusStops({ q });
            const parsedResponse = JSON.parse(result.content[0].text);

            // 全てのバス停が保持されていることを確認
            expect(parsedResponse.stops).toHaveLength(stopCount);
            expect(parsedResponse.count).toBe(stopCount);

            // 各バス停の情報が正確に保持されていることを確認
            parsedResponse.stops.forEach((stop: any, index: number) => {
              expect(stop.stop_id).toBe(stops[index].stop_id);
              expect(stop.stop_name).toBe(stops[index].stop_name);
              expect(stop.stop_lat).toBe(stops[index].stop_lat);
              expect(stop.stop_lon).toBe(stops[index].stop_lon);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
