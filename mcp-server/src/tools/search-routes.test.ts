/**
 * 経路検索ツールのユニットテスト
 * 
 * 具体的な例とエッジケースを検証するユニットテスト
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchRoutes, type SearchRoutesResponse } from './search-routes.js';
import * as apiClientModule from '../api-client.js';

describe('経路検索ツール', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本的な検索', () => {
    it('佐賀駅からバスセンターへの経路を検索できる', async () => {
      const mockResponse: SearchRoutesResponse = {
        routes: [
          {
            route_id: '001',
            route_name: '佐賀駅バスセンター線',
            departure_stop: '佐賀駅',
            arrival_stop: 'バスセンター',
            departure_time: '09:00',
            arrival_time: '09:15',
            travel_time: 15,
            fare: 200,
            operator: '佐賀市営バス'
          }
        ],
        count: 1
      };

      const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      const result = await searchRoutes({ from: '佐賀駅', to: 'バスセンター' });

      expect(mockGet).toHaveBeenCalledWith('/routes/search', {
        from: '佐賀駅',
        to: 'バスセンター',
        time: undefined,
        type: 'departure',
        weekday: undefined,
        limit: 10
      });

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.routes).toHaveLength(1);
      expect(parsedResponse.routes[0].route_name).toBe('佐賀駅バスセンター線');
    });

    it('時刻指定で検索できる', async () => {
      const mockResponse: SearchRoutesResponse = {
        routes: [],
        count: 0
      };

      const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      await searchRoutes({ from: '佐賀駅', to: 'バスセンター', time: '14:30' });

      expect(mockGet).toHaveBeenCalledWith('/routes/search', {
        from: '佐賀駅',
        to: 'バスセンター',
        time: '14:30',
        type: 'departure',
        weekday: undefined,
        limit: 10
      });
    });
  });

  describe('検索タイプ', () => {
    it('出発時刻で検索できる', async () => {
      const mockResponse: SearchRoutesResponse = {
        routes: [],
        count: 0
      };

      const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      await searchRoutes({ from: '佐賀駅', to: 'バスセンター', type: 'departure' });

      expect(mockGet).toHaveBeenCalledWith('/routes/search', expect.objectContaining({
        type: 'departure'
      }));
    });

    it('到着時刻で検索できる', async () => {
      const mockResponse: SearchRoutesResponse = {
        routes: [],
        count: 0
      };

      const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      await searchRoutes({ from: '佐賀駅', to: 'バスセンター', type: 'arrival' });

      expect(mockGet).toHaveBeenCalledWith('/routes/search', expect.objectContaining({
        type: 'arrival'
      }));
    });
  });

  describe('曜日区分', () => {
    it('平日の経路を検索できる', async () => {
      const mockResponse: SearchRoutesResponse = {
        routes: [],
        count: 0
      };

      const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      await searchRoutes({ from: '佐賀駅', to: 'バスセンター', weekday: 'weekday' });

      expect(mockGet).toHaveBeenCalledWith('/routes/search', expect.objectContaining({
        weekday: 'weekday'
      }));
    });

    it('土曜の経路を検索できる', async () => {
      const mockResponse: SearchRoutesResponse = {
        routes: [],
        count: 0
      };

      const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      await searchRoutes({ from: '佐賀駅', to: 'バスセンター', weekday: 'saturday' });

      expect(mockGet).toHaveBeenCalledWith('/routes/search', expect.objectContaining({
        weekday: 'saturday'
      }));
    });

    it('日曜祝日の経路を検索できる', async () => {
      const mockResponse: SearchRoutesResponse = {
        routes: [],
        count: 0
      };

      const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      await searchRoutes({ from: '佐賀駅', to: 'バスセンター', weekday: 'holiday' });

      expect(mockGet).toHaveBeenCalledWith('/routes/search', expect.objectContaining({
        weekday: 'holiday'
      }));
    });
  });

  describe('結果数制限', () => {
    it('limitパラメータで結果数を制限できる', async () => {
      const mockResponse: SearchRoutesResponse = {
        routes: [],
        count: 0
      };

      const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      await searchRoutes({ from: '佐賀駅', to: 'バスセンター', limit: 5 });

      expect(mockGet).toHaveBeenCalledWith('/routes/search', expect.objectContaining({
        limit: 5
      }));
    });
  });

  describe('複数の経路', () => {
    it('複数の経路が返される場合、全て表示される', async () => {
      const mockResponse: SearchRoutesResponse = {
        routes: [
          {
            route_id: '001',
            route_name: '佐賀駅バスセンター線',
            departure_stop: '佐賀駅',
            arrival_stop: 'バスセンター',
            departure_time: '09:00',
            arrival_time: '09:15',
            travel_time: 15,
            fare: 200,
            operator: '佐賀市営バス'
          },
          {
            route_id: '002',
            route_name: '急行佐賀駅バスセンター線',
            departure_stop: '佐賀駅',
            arrival_stop: 'バスセンター',
            departure_time: '09:10',
            arrival_time: '09:20',
            travel_time: 10,
            fare: 250,
            operator: '佐賀市営バス'
          },
          {
            route_id: '003',
            route_name: '祐徳バス佐賀線',
            departure_stop: '佐賀駅',
            arrival_stop: 'バスセンター',
            departure_time: '09:15',
            arrival_time: '09:30',
            travel_time: 15,
            fare: 200,
            operator: '祐徳バス'
          }
        ],
        count: 3
      };

      vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      const result = await searchRoutes({ from: '佐賀駅', to: 'バスセンター' });
      const parsedResponse = JSON.parse(result.content[0].text);

      expect(parsedResponse.routes).toHaveLength(3);
      expect(parsedResponse.count).toBe(3);
      expect(parsedResponse.routes[0].operator).toBe('佐賀市営バス');
      expect(parsedResponse.routes[1].operator).toBe('佐賀市営バス');
      expect(parsedResponse.routes[2].operator).toBe('祐徳バス');
    });
  });

  describe('エッジケース', () => {
    it('経路が見つからない場合、空の配列を返す', async () => {
      const mockResponse: SearchRoutesResponse = {
        routes: [],
        count: 0
      };

      vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      const result = await searchRoutes({ from: '存在しないバス停A', to: '存在しないバス停B' });
      const parsedResponse = JSON.parse(result.content[0].text);

      expect(parsedResponse.routes).toEqual([]);
      expect(parsedResponse.count).toBe(0);
    });

    it('同じバス停を出発地と目的地に指定できる', async () => {
      const mockResponse: SearchRoutesResponse = {
        routes: [],
        count: 0
      };

      const mockGet = vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      await searchRoutes({ from: '佐賀駅', to: '佐賀駅' });

      expect(mockGet).toHaveBeenCalledWith('/routes/search', expect.objectContaining({
        from: '佐賀駅',
        to: '佐賀駅'
      }));
    });
  });

  describe('エラーハンドリング', () => {
    it('API呼び出しが失敗した場合、エラーをスローする', async () => {
      const mockError = new Error('API error: 500 Internal Server Error');
      vi.spyOn(apiClientModule.apiClient, 'get').mockRejectedValue(mockError);

      await expect(searchRoutes({ from: '佐賀駅', to: 'バスセンター' }))
        .rejects
        .toThrow('経路検索に失敗しました: API error: 500 Internal Server Error');
    });

    it('タイムアウトエラーの場合、適切なエラーメッセージを返す', async () => {
      const mockError = new Error('Request timeout after 10000ms');
      vi.spyOn(apiClientModule.apiClient, 'get').mockRejectedValue(mockError);

      await expect(searchRoutes({ from: '佐賀駅', to: 'バスセンター' }))
        .rejects
        .toThrow('経路検索に失敗しました: Request timeout after 10000ms');
    });
  });

  describe('レスポンス形式', () => {
    it('MCP形式のレスポンスを返す', async () => {
      const mockResponse: SearchRoutesResponse = {
        routes: [],
        count: 0
      };

      vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      const result = await searchRoutes({ from: '佐賀駅', to: 'バスセンター' });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });

    it('レスポンスはJSON形式でパース可能', async () => {
      const mockResponse: SearchRoutesResponse = {
        routes: [],
        count: 0
      };

      vi.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockResponse);

      const result = await searchRoutes({ from: '佐賀駅', to: 'バスセンター' });

      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });
  });
});
