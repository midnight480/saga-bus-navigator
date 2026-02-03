/**
 * 始発・終電検索ツールのプロパティベーステスト
 * 
 * 始発・終電検索機能の普遍的なプロパティを検証するプロパティベーステスト
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { getFirstLastBus, type GetFirstLastBusArgs, type GetFirstLastBusResponse } from './get-first-last-bus.js';
import * as apiClientModule from '../api-client.js';

describe('始発・終電検索ツール Properties', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Feature: mcp-server, Property 1: ツール呼び出しのAPI転送
  // **Validates: Requirements 3.1, 3.2, 3.3**
  describe('Property 1: ツール呼び出しのAPI転送', () => {
    it('任意のツール呼び出しに対して、MCPサーバは対応するREST APIエンドポイントに正しくリクエストを転送する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            stop: fc.string({ minLength: 1, maxLength: 50 }),
            to: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            weekday: fc.option(fc.constantFrom('weekday', 'saturday', 'holiday'), { nil: undefined })
          }),
          async ({ stop, to, weekday }) => {
            // モックレスポンスの生成
            const mockResponse: GetFirstLastBusResponse = {
              data: {
                stop_name: stop,
                destination: to,
                first_bus: {
                  time: '06:00',
                  route_name: '1号線',
                  destination: to || '市役所前'
                },
                last_bus: {
                  time: '22:30',
                  route_name: '1号線',
                  destination: to || '市役所前'
                },
                weekday_type: weekday || 'weekday'
              }
            };

            // API Clientのgetメソッドをモック
            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            // ツールを呼び出し
            const args: GetFirstLastBusArgs = { stop };
            if (to !== undefined) args.to = to;
            if (weekday !== undefined) args.weekday = weekday;
            
            await getFirstLastBus(args);

            // 正しいエンドポイントが呼び出されたことを確認
            expect(mockGet).toHaveBeenCalledTimes(1);
            expect(mockGet).toHaveBeenCalledWith(
              '/stops/first-last',
              expect.objectContaining({
                stop: stop,
                to: to,
                weekday: weekday
              })
            );

            // エンドポイントが正しいことを確認
            const callArgs = mockGet.mock.calls[0];
            expect(callArgs[0]).toBe('/stops/first-last');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('任意のバス停名検索に対して、/stops/first-lastエンドポイントが呼び出される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('佐賀駅バスセンター'),
            fc.constant('市役所前'),
            fc.constant('県庁前'),
            fc.string({ minLength: 1, maxLength: 30 })
          ),
          async (busStopName) => {
            const mockResponse: GetFirstLastBusResponse = {
              data: {
                stop_name: busStopName,
                first_bus: {
                  time: '06:00',
                  route_name: '1号線',
                  destination: '市役所前'
                },
                last_bus: {
                  time: '22:30',
                  route_name: '1号線',
                  destination: '市役所前'
                },
                weekday_type: 'weekday'
              }
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await getFirstLastBus({ stop: busStopName });

            // 正しいエンドポイントが呼び出されたことを確認
            expect(mockGet).toHaveBeenCalledWith(
              '/stops/first-last',
              expect.any(Object)
            );

            // エンドポイントパスが正確に一致することを確認
            const endpoint = mockGet.mock.calls[0][0];
            expect(endpoint).toBe('/stops/first-last');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: mcp-server, Property 2: パラメータの完全な転送
  // **Validates: Requirements 3.1, 3.2, 3.3**
  describe('Property 2: パラメータの完全な転送', () => {
    it('任意のツールパラメータに対して、MCPサーバはそのパラメータを欠落なくREST APIに渡す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            stop: fc.string({ minLength: 1, maxLength: 50 }),
            to: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            weekday: fc.option(fc.constantFrom('weekday', 'saturday', 'holiday'), { nil: undefined })
          }),
          async ({ stop, to, weekday }) => {
            const mockResponse: GetFirstLastBusResponse = {
              data: {
                stop_name: stop,
                destination: to,
                first_bus: {
                  time: '06:00',
                  route_name: '1号線',
                  destination: to || '市役所前'
                },
                last_bus: {
                  time: '22:30',
                  route_name: '1号線',
                  destination: to || '市役所前'
                },
                weekday_type: weekday || 'weekday'
              }
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            // ツールを呼び出し
            const args: GetFirstLastBusArgs = { stop };
            if (to !== undefined) args.to = to;
            if (weekday !== undefined) args.weekday = weekday;
            
            await getFirstLastBus(args);

            // パラメータが完全に転送されたことを確認
            const callParams = mockGet.mock.calls[0][1];
            
            // stopパラメータが正しく転送されている
            expect(callParams).toHaveProperty('stop', stop);
            
            // toパラメータが正しく転送されている
            if (to !== undefined) {
              expect(callParams).toHaveProperty('to', to);
            } else {
              expect(callParams?.to).toBeUndefined();
            }

            // weekdayパラメータが正しく転送されている
            if (weekday !== undefined) {
              expect(callParams).toHaveProperty('weekday', weekday);
            } else {
              expect(callParams?.weekday).toBeUndefined();
            }

            // 必須パラメータが含まれていることを確認
            const paramKeys = Object.keys(callParams || {});
            expect(paramKeys).toContain('stop');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('stopパラメータは常に元の値のまま転送される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (stopName) => {
            const mockResponse: GetFirstLastBusResponse = {
              data: {
                stop_name: stopName,
                first_bus: {
                  time: '06:00',
                  route_name: '1号線',
                  destination: '市役所前'
                },
                last_bus: {
                  time: '22:30',
                  route_name: '1号線',
                  destination: '市役所前'
                },
                weekday_type: 'weekday'
              }
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await getFirstLastBus({ stop: stopName });

            // stopパラメータが変更されずに転送されている
            const callParams = mockGet.mock.calls[0][1];
            expect(callParams?.stop).toBe(stopName);
            
            // 文字列の長さも変わっていない
            expect(callParams?.stop.length).toBe(stopName.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('toパラメータが指定された場合、その値がそのまま転送される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            stop: fc.string({ minLength: 1, maxLength: 30 }),
            to: fc.string({ minLength: 1, maxLength: 30 })
          }),
          async ({ stop, to }) => {
            const mockResponse: GetFirstLastBusResponse = {
              data: {
                stop_name: stop,
                destination: to,
                first_bus: {
                  time: '06:00',
                  route_name: '1号線',
                  destination: to
                },
                last_bus: {
                  time: '22:30',
                  route_name: '1号線',
                  destination: to
                },
                weekday_type: 'weekday'
              }
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await getFirstLastBus({ stop, to });

            // toパラメータが変更されずに転送されている
            const callParams = mockGet.mock.calls[0][1];
            expect(callParams?.to).toBe(to);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('weekdayパラメータが指定された場合、その値がそのまま転送される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            stop: fc.string({ minLength: 1, maxLength: 30 }),
            weekday: fc.constantFrom('weekday', 'saturday', 'holiday')
          }),
          async ({ stop, weekday }) => {
            const mockResponse: GetFirstLastBusResponse = {
              data: {
                stop_name: stop,
                first_bus: {
                  time: '06:00',
                  route_name: '1号線',
                  destination: '市役所前'
                },
                last_bus: {
                  time: '22:30',
                  route_name: '1号線',
                  destination: '市役所前'
                },
                weekday_type: weekday
              }
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await getFirstLastBus({ stop, weekday });

            // weekdayパラメータが変更されずに転送されている
            const callParams = mockGet.mock.calls[0][1];
            expect(callParams?.weekday).toBe(weekday);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('オプションパラメータが未指定の場合、undefinedとして転送される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }),
          async (stop) => {
            const mockResponse: GetFirstLastBusResponse = {
              data: {
                stop_name: stop,
                first_bus: {
                  time: '06:00',
                  route_name: '1号線',
                  destination: '市役所前'
                },
                last_bus: {
                  time: '22:30',
                  route_name: '1号線',
                  destination: '市役所前'
                },
                weekday_type: 'weekday'
              }
            };

            const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            await getFirstLastBus({ stop });

            // オプションパラメータがundefinedとして転送されている
            const callParams = mockGet.mock.calls[0][1];
            expect(callParams?.to).toBeUndefined();
            expect(callParams?.weekday).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: mcp-server, Property 3: レスポンス構造の完全性
  // **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
  describe('Property 3: レスポンス構造の完全性', () => {
    it('任意のAPIレスポンスに対して、MCPサーバは要求された全てのフィールドを含むレスポンスを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            stop: fc.string({ minLength: 1, maxLength: 30 }),
            stop_name: fc.string({ minLength: 1, maxLength: 50 }),
            destination: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
            first_time: fc.string({ minLength: 5, maxLength: 5 }), // HH:MM
            first_route: fc.string({ minLength: 1, maxLength: 30 }),
            first_dest: fc.string({ minLength: 1, maxLength: 30 }),
            last_time: fc.string({ minLength: 5, maxLength: 5 }), // HH:MM
            last_route: fc.string({ minLength: 1, maxLength: 30 }),
            last_dest: fc.string({ minLength: 1, maxLength: 30 }),
            weekday_type: fc.constantFrom('weekday', 'saturday', 'holiday')
          }),
          async ({ stop, stop_name, destination, first_time, first_route, first_dest, last_time, last_route, last_dest, weekday_type }) => {
            const mockResponse: GetFirstLastBusResponse = {
              data: {
                stop_name,
                destination,
                first_bus: {
                  time: first_time,
                  route_name: first_route,
                  destination: first_dest
                },
                last_bus: {
                  time: last_time,
                  route_name: last_route,
                  destination: last_dest
                },
                weekday_type
              }
            };

            vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await getFirstLastBus({ stop });

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
            expect(parsedResponse).toHaveProperty('data');
            expect(parsedResponse.data).toHaveProperty('stop_name', stop_name);
            expect(parsedResponse.data).toHaveProperty('first_bus');
            expect(parsedResponse.data).toHaveProperty('last_bus');
            expect(parsedResponse.data).toHaveProperty('weekday_type', weekday_type);

            // 始発情報の全フィールドが保持されていることを確認
            expect(parsedResponse.data.first_bus).toHaveProperty('time', first_time);
            expect(parsedResponse.data.first_bus).toHaveProperty('route_name', first_route);
            expect(parsedResponse.data.first_bus).toHaveProperty('destination', first_dest);

            // 終電情報の全フィールドが保持されていることを確認
            expect(parsedResponse.data.last_bus).toHaveProperty('time', last_time);
            expect(parsedResponse.data.last_bus).toHaveProperty('route_name', last_route);
            expect(parsedResponse.data.last_bus).toHaveProperty('destination', last_dest);

            // destinationフィールドが正しく保持されていることを確認
            if (destination !== undefined) {
              expect(parsedResponse.data).toHaveProperty('destination', destination);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('始発・終電の時刻情報が正しく保持される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            stop: fc.string({ minLength: 1, maxLength: 30 }),
            first_hour: fc.integer({ min: 5, max: 9 }),
            first_minute: fc.integer({ min: 0, max: 59 }),
            last_hour: fc.integer({ min: 20, max: 23 }),
            last_minute: fc.integer({ min: 0, max: 59 })
          }),
          async ({ stop, first_hour, first_minute, last_hour, last_minute }) => {
            const first_time = `${String(first_hour).padStart(2, '0')}:${String(first_minute).padStart(2, '0')}`;
            const last_time = `${String(last_hour).padStart(2, '0')}:${String(last_minute).padStart(2, '0')}`;

            const mockResponse: GetFirstLastBusResponse = {
              data: {
                stop_name: stop,
                first_bus: {
                  time: first_time,
                  route_name: '1号線',
                  destination: '市役所前'
                },
                last_bus: {
                  time: last_time,
                  route_name: '1号線',
                  destination: '市役所前'
                },
                weekday_type: 'weekday'
              }
            };

            vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await getFirstLastBus({ stop });
            const parsedResponse = JSON.parse(result.content[0].text);

            // 時刻情報が正確に保持されていることを確認
            expect(parsedResponse.data.first_bus.time).toBe(first_time);
            expect(parsedResponse.data.last_bus.time).toBe(last_time);

            // 文字列型であることを確認
            expect(typeof parsedResponse.data.first_bus.time).toBe('string');
            expect(typeof parsedResponse.data.last_bus.time).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('路線名と行先情報が正しく保持される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            stop: fc.string({ minLength: 1, maxLength: 30 }),
            first_route: fc.string({ minLength: 1, maxLength: 30 }),
            first_dest: fc.string({ minLength: 1, maxLength: 30 }),
            last_route: fc.string({ minLength: 1, maxLength: 30 }),
            last_dest: fc.string({ minLength: 1, maxLength: 30 })
          }),
          async ({ stop, first_route, first_dest, last_route, last_dest }) => {
            const mockResponse: GetFirstLastBusResponse = {
              data: {
                stop_name: stop,
                first_bus: {
                  time: '06:00',
                  route_name: first_route,
                  destination: first_dest
                },
                last_bus: {
                  time: '22:30',
                  route_name: last_route,
                  destination: last_dest
                },
                weekday_type: 'weekday'
              }
            };

            vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await getFirstLastBus({ stop });
            const parsedResponse = JSON.parse(result.content[0].text);

            // 路線名と行先が正確に保持されていることを確認
            expect(parsedResponse.data.first_bus.route_name).toBe(first_route);
            expect(parsedResponse.data.first_bus.destination).toBe(first_dest);
            expect(parsedResponse.data.last_bus.route_name).toBe(last_route);
            expect(parsedResponse.data.last_bus.destination).toBe(last_dest);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('曜日区分が正しく保持される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            stop: fc.string({ minLength: 1, maxLength: 30 }),
            weekday_type: fc.constantFrom('weekday', 'saturday', 'holiday')
          }),
          async ({ stop, weekday_type }) => {
            const mockResponse: GetFirstLastBusResponse = {
              data: {
                stop_name: stop,
                first_bus: {
                  time: '06:00',
                  route_name: '1号線',
                  destination: '市役所前'
                },
                last_bus: {
                  time: '22:30',
                  route_name: '1号線',
                  destination: '市役所前'
                },
                weekday_type
              }
            };

            vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await getFirstLastBus({ stop });
            const parsedResponse = JSON.parse(result.content[0].text);

            // 曜日区分が正確に保持されていることを確認
            expect(parsedResponse.data.weekday_type).toBe(weekday_type);
            
            // 有効な値であることを確認
            expect(['weekday', 'saturday', 'holiday']).toContain(parsedResponse.data.weekday_type);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('行先フィルタが指定された場合、destination フィールドが保持される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            stop: fc.string({ minLength: 1, maxLength: 30 }),
            destination: fc.string({ minLength: 1, maxLength: 30 })
          }),
          async ({ stop, destination }) => {
            const mockResponse: GetFirstLastBusResponse = {
              data: {
                stop_name: stop,
                destination,
                first_bus: {
                  time: '06:00',
                  route_name: '1号線',
                  destination
                },
                last_bus: {
                  time: '22:30',
                  route_name: '1号線',
                  destination
                },
                weekday_type: 'weekday'
              }
            };

            vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

            const result = await getFirstLastBus({ stop, to: destination });
            const parsedResponse = JSON.parse(result.content[0].text);

            // destinationフィールドが正確に保持されていることを確認
            expect(parsedResponse.data.destination).toBe(destination);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
