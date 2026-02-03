/**
 * バス停検索ツールのユニットテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchBusStops, searchBusStopsSchema, type SearchBusStopsArgs, type SearchBusStopsResponse } from './search-bus-stops.js';
import * as apiClientModule from '../api-client.js';

describe('search-bus-stops', () => {
  describe('型定義', () => {
    it('SearchBusStopsArgsインターフェースが正しく定義されている', () => {
      const args: SearchBusStopsArgs = {
        q: '佐賀駅',
        limit: 5
      };
      
      expect(args.q).toBe('佐賀駅');
      expect(args.limit).toBe(5);
    });

    it('SearchBusStopsArgsのlimitはオプショナル', () => {
      const args: SearchBusStopsArgs = {
        q: '佐賀駅'
      };
      
      expect(args.q).toBe('佐賀駅');
      expect(args.limit).toBeUndefined();
    });

    it('BusStopインターフェースが正しく定義されている', () => {
      const busStop: SearchBusStopsResponse['stops'][0] = {
        stop_id: '001',
        stop_name: '佐賀駅バスセンター',
        stop_lat: 33.2653,
        stop_lon: 130.3000,
        next_departure: {
          route_name: '佐賀駅線',
          departure_time: '09:30',
          destination: '佐賀空港'
        }
      };
      
      expect(busStop.stop_id).toBe('001');
      expect(busStop.stop_name).toBe('佐賀駅バスセンター');
      expect(busStop.next_departure?.route_name).toBe('佐賀駅線');
    });

    it('BusStopのnext_departureはオプショナル', () => {
      const busStop: SearchBusStopsResponse['stops'][0] = {
        stop_id: '001',
        stop_name: '佐賀駅バスセンター',
        stop_lat: 33.2653,
        stop_lon: 130.3000
      };
      
      expect(busStop.next_departure).toBeUndefined();
    });

    it('SearchBusStopsResponseインターフェースが正しく定義されている', () => {
      const response: SearchBusStopsResponse = {
        stops: [
          {
            stop_id: '001',
            stop_name: '佐賀駅バスセンター',
            stop_lat: 33.2653,
            stop_lon: 130.3000
          }
        ],
        count: 1
      };
      
      expect(response.stops).toHaveLength(1);
      expect(response.count).toBe(1);
    });
  });

  describe('searchBusStopsSchema', () => {
    it('スキーマ名が正しく定義されている', () => {
      expect(searchBusStopsSchema.name).toBe('search_bus_stops');
    });

    it('スキーマの説明が日本語で定義されている', () => {
      expect(searchBusStopsSchema.description).toContain('佐賀市内のバス停');
      expect(searchBusStopsSchema.description).toContain('検索');
    });

    it('inputSchemaがobject型である', () => {
      expect(searchBusStopsSchema.inputSchema.type).toBe('object');
    });

    it('qパラメータが必須として定義されている', () => {
      expect(searchBusStopsSchema.inputSchema.required).toContain('q');
    });

    it('qパラメータがstring型として定義されている', () => {
      expect(searchBusStopsSchema.inputSchema.properties.q.type).toBe('string');
      expect(searchBusStopsSchema.inputSchema.properties.q.description).toContain('検索するバス停名');
    });

    it('limitパラメータがnumber型として定義されている', () => {
      expect(searchBusStopsSchema.inputSchema.properties.limit.type).toBe('number');
      expect(searchBusStopsSchema.inputSchema.properties.limit.description).toContain('最大数');
    });

    it('limitパラメータのデフォルト値が10である', () => {
      expect(searchBusStopsSchema.inputSchema.properties.limit.default).toBe(10);
    });

    it('limitパラメータは必須ではない', () => {
      expect(searchBusStopsSchema.inputSchema.required).not.toContain('limit');
    });
  });

  describe('searchBusStops関数', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('API呼び出しが成功した場合、MCP形式でレスポンスを返す', async () => {
      const mockResponse: SearchBusStopsResponse = {
        stops: [
          {
            stop_id: '001',
            stop_name: '佐賀駅バスセンター',
            stop_lat: 33.2653,
            stop_lon: 130.3000,
            next_departure: {
              route_name: '佐賀駅線',
              departure_time: '09:30',
              destination: '佐賀空港'
            }
          }
        ],
        count: 1
      };

      const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      const result = await searchBusStops({ q: '佐賀駅', limit: 5 });

      expect(mockGet).toHaveBeenCalledWith('/stops/search', { q: '佐賀駅', limit: 5 });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('佐賀駅バスセンター');
    });

    it('limitが指定されていない場合、デフォルト値10を使用する', async () => {
      const mockResponse: SearchBusStopsResponse = {
        stops: [],
        count: 0
      };

      const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      await searchBusStops({ q: '佐賀駅' });

      expect(mockGet).toHaveBeenCalledWith('/stops/search', { q: '佐賀駅', limit: 10 });
    });

    it('API呼び出しが失敗した場合、エラーメッセージを含むエラーをスローする', async () => {
      const mockError = new Error('API error: 500 Internal Server Error');
      vi.spyOn(apiClientModule.apiClient, 'get').mockRejectedValue(mockError);

      await expect(searchBusStops({ q: '佐賀駅' }))
        .rejects
        .toThrow('バス停検索に失敗しました: API error: 500 Internal Server Error');
    });

    it('レスポンスがJSON形式で整形されている', async () => {
      const mockResponse: SearchBusStopsResponse = {
        stops: [
          {
            stop_id: '001',
            stop_name: '佐賀駅バスセンター',
            stop_lat: 33.2653,
            stop_lon: 130.3000
          }
        ],
        count: 1
      };

      vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      const result = await searchBusStops({ q: '佐賀駅' });
      const parsedResponse = JSON.parse(result.content[0].text);

      expect(parsedResponse).toEqual(mockResponse);
      expect(parsedResponse.stops[0].stop_name).toBe('佐賀駅バスセンター');
    });

    it('空の検索結果を正しく処理する', async () => {
      const mockResponse: SearchBusStopsResponse = {
        stops: [],
        count: 0
      };

      vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      const result = await searchBusStops({ q: '存在しないバス停' });
      const parsedResponse = JSON.parse(result.content[0].text);

      expect(parsedResponse.stops).toHaveLength(0);
      expect(parsedResponse.count).toBe(0);
    });
  });
});
