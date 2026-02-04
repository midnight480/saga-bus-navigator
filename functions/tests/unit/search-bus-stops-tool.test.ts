/**
 * バス停検索ツールの単体テスト
 * 
 * タスク5.2: バス停検索ツールの単体テスト
 * - パラメータバリデーションのテスト
 * - REST API呼び出しのモックテスト
 * - レスポンス変換のテスト
 * 
 * 要件: 2.1, 2.2, 2.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { searchBusStopsTool, executeSearchBusStops } from '../../lib/mcp/tools/search-bus-stops';

describe('バス停検索ツール', () => {
  describe('ツールスキーマ定義', () => {
    it('正しいツール名を持つ', () => {
      expect(searchBusStopsTool.name).toBe('search_bus_stops');
    });

    it('説明文を持つ', () => {
      expect(searchBusStopsTool.description).toBeTruthy();
      expect(typeof searchBusStopsTool.description).toBe('string');
    });

    it('正しい入力スキーマを持つ', () => {
      expect(searchBusStopsTool.inputSchema.type).toBe('object');
      expect(searchBusStopsTool.inputSchema.properties).toHaveProperty('query');
      expect(searchBusStopsTool.inputSchema.properties).toHaveProperty('limit');
      expect(searchBusStopsTool.inputSchema.required).toContain('query');
    });

    it('queryパラメータは文字列型', () => {
      expect(searchBusStopsTool.inputSchema.properties.query.type).toBe('string');
    });

    it('limitパラメータは数値型でデフォルト値を持つ', () => {
      expect(searchBusStopsTool.inputSchema.properties.limit.type).toBe('number');
      expect(searchBusStopsTool.inputSchema.properties.limit.default).toBe(10);
      expect(searchBusStopsTool.inputSchema.properties.limit.minimum).toBe(1);
      expect(searchBusStopsTool.inputSchema.properties.limit.maximum).toBe(10);
    });
  });

  describe('パラメータバリデーション', () => {
    it('queryパラメータが必須', async () => {
      const result = await executeSearchBusStops({}, 'http://localhost');
      
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('query');
    });

    it('queryパラメータが文字列でない場合はエラー', async () => {
      const result = await executeSearchBusStops({ query: 123 }, 'http://localhost');
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('文字列');
    });

    it('queryパラメータが空文字列の場合はエラー', async () => {
      const result = await executeSearchBusStops({ query: '' }, 'http://localhost');
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('空文字列');
    });

    it('queryパラメータが空白のみの場合はエラー', async () => {
      const result = await executeSearchBusStops({ query: '   ' }, 'http://localhost');
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('空文字列');
    });

    it('limitパラメータが数値でない場合はエラー', async () => {
      const result = await executeSearchBusStops(
        { query: '佐賀駅', limit: '10' },
        'http://localhost'
      );
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('数値');
    });

    it('limitパラメータが整数でない場合はエラー', async () => {
      const result = await executeSearchBusStops(
        { query: '佐賀駅', limit: 5.5 },
        'http://localhost'
      );
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('整数');
    });

    it('limitパラメータが範囲外（小さすぎる）の場合はエラー', async () => {
      const result = await executeSearchBusStops(
        { query: '佐賀駅', limit: 0 },
        'http://localhost'
      );
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('1〜10');
    });

    it('limitパラメータが範囲外（大きすぎる）の場合はエラー', async () => {
      const result = await executeSearchBusStops(
        { query: '佐賀駅', limit: 11 },
        'http://localhost'
      );
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('1〜10');
    });

    it('limitパラメータが省略された場合はデフォルト値10を使用', async () => {
      // fetchをモック
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ stops: [], count: 0 }),
      });

      await executeSearchBusStops({ query: '佐賀駅' }, 'http://localhost');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10')
      );
    });
  });

  describe('REST API呼び出し', () => {
    beforeEach(() => {
      // fetchをモック
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('正しいURLでREST APIを呼び出す', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ stops: [], count: 0 }),
      });

      await executeSearchBusStops(
        { query: '佐賀駅', limit: 5 },
        'http://localhost'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost/api/stops/search?q=%E4%BD%90%E8%B3%80%E9%A7%85&limit=5'
      );
    });

    it('クエリパラメータを正しくURLエンコード', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ stops: [], count: 0 }),
      });

      await executeSearchBusStops(
        { query: '佐賀駅 バスセンター' },
        'http://localhost'
      );

      const call = (global.fetch as any).mock.calls[0][0];
      expect(call).toContain('q=%E4%BD%90%E8%B3%80%E9%A7%85%20%E3%83%90%E3%82%B9%E3%82%BB%E3%83%B3%E3%82%BF%E3%83%BC');
    });

    it('REST APIエラー時にエラーレスポンスを返す', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Database error' }),
      });

      const result = await executeSearchBusStops(
        { query: '佐賀駅' },
        'http://localhost'
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('REST API呼び出しエラー');
      expect(response.error).toContain('500');
    });

    it('ネットワークエラー時にエラーレスポンスを返す', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await executeSearchBusStops(
        { query: '佐賀駅' },
        'http://localhost'
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('エラーが発生しました');
      expect(response.details).toContain('Network error');
    });
  });

  describe('レスポンス変換', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('REST APIレスポンスを正しく変換（要件2.3）', async () => {
      const mockStops = [
        {
          id: 'stop1',
          name: '佐賀駅バスセンター',
          lat: 33.2653,
          lon: 130.3000,
        },
        {
          id: 'stop2',
          name: '佐賀駅北口',
          lat: 33.2660,
          lon: 130.3010,
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ stops: mockStops, count: 2 }),
      });

      const result = await executeSearchBusStops(
        { query: '佐賀駅' },
        'http://localhost'
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.query).toBe('佐賀駅');
      expect(response.count).toBe(2);
      expect(response.stops).toHaveLength(2);

      // 各バス停が必須フィールドを含む（要件2.3）
      response.stops.forEach((stop: any) => {
        expect(stop).toHaveProperty('id');
        expect(stop).toHaveProperty('name');
        expect(stop).toHaveProperty('lat');
        expect(stop).toHaveProperty('lng'); // REST APIのlonをlngに変換
      });

      // lonがlngに変換されていることを確認
      expect(response.stops[0].lng).toBe(130.3000);
      expect(response.stops[1].lng).toBe(130.3010);
    });

    it('部分一致検索が正しく動作（要件2.1）', async () => {
      const mockStops = [
        {
          id: 'stop1',
          name: '佐賀駅バスセンター',
          lat: 33.2653,
          lon: 130.3000,
        },
        {
          id: 'stop2',
          name: '佐賀駅北口',
          lat: 33.2660,
          lon: 130.3010,
        },
        {
          id: 'stop3',
          name: '佐賀県庁前',
          lat: 33.2500,
          lon: 130.2900,
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ stops: mockStops, count: 3 }),
      });

      const result = await executeSearchBusStops(
        { query: '佐賀' },
        'http://localhost'
      );

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);
      
      // 全ての結果が「佐賀」を含む（部分一致）
      expect(response.stops).toHaveLength(3);
      response.stops.forEach((stop: any) => {
        expect(stop.name).toContain('佐賀');
      });
    });

    it('空の結果を正しく処理', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ stops: [], count: 0 }),
      });

      const result = await executeSearchBusStops(
        { query: '存在しないバス停' },
        'http://localhost'
      );

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.stops).toEqual([]);
      expect(response.count).toBe(0);
    });

    it('結果数が最大10件に制限される（要件2.2）', async () => {
      const mockStops = Array.from({ length: 15 }, (_, i) => ({
        id: `stop${i}`,
        name: `バス停${i}`,
        lat: 33.0 + i * 0.01,
        lon: 130.0 + i * 0.01,
      }));

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ stops: mockStops.slice(0, 10), count: 10 }),
      });

      const result = await executeSearchBusStops(
        { query: 'バス停', limit: 10 },
        'http://localhost'
      );

      const response = JSON.parse(result.content[0].text);
      expect(response.stops.length).toBeLessThanOrEqual(10);
      expect(response.stops.length).toBe(10);
    });

    it('limit指定により結果数が制限される（要件2.2）', async () => {
      const mockStops = Array.from({ length: 5 }, (_, i) => ({
        id: `stop${i}`,
        name: `バス停${i}`,
        lat: 33.0 + i * 0.01,
        lon: 130.0 + i * 0.01,
      }));

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ stops: mockStops, count: 5 }),
      });

      const result = await executeSearchBusStops(
        { query: 'バス停', limit: 5 },
        'http://localhost'
      );

      const response = JSON.parse(result.content[0].text);
      expect(response.stops.length).toBeLessThanOrEqual(5);
      expect(response.stops.length).toBe(5);
    });

    it('全てのバス停が必須フィールドを含む（要件2.3）', async () => {
      const mockStops = [
        {
          id: 'stop1',
          name: 'バス停1',
          lat: 33.0,
          lon: 130.0,
        },
        {
          id: 'stop2',
          name: 'バス停2',
          lat: 33.1,
          lon: 130.1,
        },
        {
          id: 'stop3',
          name: 'バス停3',
          lat: 33.2,
          lon: 130.2,
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ stops: mockStops, count: 3 }),
      });

      const result = await executeSearchBusStops(
        { query: 'バス停' },
        'http://localhost'
      );

      const response = JSON.parse(result.content[0].text);
      
      // 全てのバス停が必須フィールドを含む
      expect(response.stops).toHaveLength(3);
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
      });
    });
  });

  describe('統合シナリオ', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('正常系: 有効なパラメータで検索成功', async () => {
      const mockStops = [
        {
          id: 'saga_station',
          name: '佐賀駅バスセンター',
          lat: 33.2653,
          lon: 130.3000,
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ stops: mockStops, count: 1 }),
      });

      const result = await executeSearchBusStops(
        { query: '佐賀駅', limit: 5 },
        'http://localhost'
      );

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.query).toBe('佐賀駅');
      expect(response.stops).toHaveLength(1);
      expect(response.stops[0].name).toBe('佐賀駅バスセンター');
    });

    it('異常系: 無効なパラメータでエラー', async () => {
      const result = await executeSearchBusStops(
        { query: '', limit: 20 },
        'http://localhost'
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBeTruthy();
    });
  });
});
