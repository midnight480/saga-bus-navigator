/**
 * 路線検索ツールの単体テスト
 * 
 * タスク6.2: 路線検索ツールの単体テスト
 * - パラメータバリデーションのテスト
 * - REST API呼び出しのモックテスト
 * - 空の結果のテスト（エッジケース）
 * 
 * 要件: 3.1, 3.2, 3.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { searchRoutesTool, executeSearchRoutes } from '../../lib/mcp/tools/search-routes';

describe('路線検索ツール', () => {
  describe('ツールスキーマ定義', () => {
    it('正しいツール名を持つ', () => {
      expect(searchRoutesTool.name).toBe('search_routes');
    });

    it('説明文を持つ', () => {
      expect(searchRoutesTool.description).toBeTruthy();
      expect(typeof searchRoutesTool.description).toBe('string');
    });

    it('正しい入力スキーマを持つ', () => {
      expect(searchRoutesTool.inputSchema.type).toBe('object');
      expect(searchRoutesTool.inputSchema.properties).toHaveProperty('from_stop_id');
      expect(searchRoutesTool.inputSchema.properties).toHaveProperty('to_stop_id');
      expect(searchRoutesTool.inputSchema.properties).toHaveProperty('time');
      expect(searchRoutesTool.inputSchema.properties).toHaveProperty('limit');
      expect(searchRoutesTool.inputSchema.required).toContain('from_stop_id');
      expect(searchRoutesTool.inputSchema.required).toContain('to_stop_id');
    });

    it('from_stop_idパラメータは文字列型', () => {
      expect(searchRoutesTool.inputSchema.properties.from_stop_id.type).toBe('string');
    });

    it('to_stop_idパラメータは文字列型', () => {
      expect(searchRoutesTool.inputSchema.properties.to_stop_id.type).toBe('string');
    });

    it('timeパラメータは文字列型でオプション', () => {
      expect(searchRoutesTool.inputSchema.properties.time.type).toBe('string');
      expect(searchRoutesTool.inputSchema.required).not.toContain('time');
    });

    it('limitパラメータは数値型でデフォルト値を持つ', () => {
      expect(searchRoutesTool.inputSchema.properties.limit.type).toBe('number');
      expect(searchRoutesTool.inputSchema.properties.limit.default).toBe(5);
      expect(searchRoutesTool.inputSchema.properties.limit.minimum).toBe(1);
      expect(searchRoutesTool.inputSchema.properties.limit.maximum).toBe(10);
    });
  });

  describe('パラメータバリデーション', () => {
    it('from_stop_idパラメータが必須', async () => {
      const result = await executeSearchRoutes({ to_stop_id: '県庁前' }, 'http://localhost');
      
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('from_stop_id');
      expect(response.error).toContain('必須');
    });

    it('to_stop_idパラメータが必須', async () => {
      const result = await executeSearchRoutes({ from_stop_id: '佐賀駅' }, 'http://localhost');
      
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('to_stop_id');
      expect(response.error).toContain('必須');
    });

    it('from_stop_idパラメータが文字列でない場合はエラー', async () => {
      const result = await executeSearchRoutes(
        { from_stop_id: 123, to_stop_id: '県庁前' },
        'http://localhost'
      );
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('from_stop_id');
      expect(response.error).toContain('文字列');
    });

    it('to_stop_idパラメータが文字列でない場合はエラー', async () => {
      const result = await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: 456 },
        'http://localhost'
      );
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('to_stop_id');
      expect(response.error).toContain('文字列');
    });

    it('from_stop_idパラメータが空文字列の場合はエラー', async () => {
      const result = await executeSearchRoutes(
        { from_stop_id: '', to_stop_id: '県庁前' },
        'http://localhost'
      );
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('from_stop_id');
      expect(response.error).toContain('空文字列');
    });

    it('to_stop_idパラメータが空文字列の場合はエラー', async () => {
      const result = await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: '' },
        'http://localhost'
      );
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('to_stop_id');
      expect(response.error).toContain('空文字列');
    });

    it('from_stop_idパラメータが空白のみの場合はエラー', async () => {
      const result = await executeSearchRoutes(
        { from_stop_id: '   ', to_stop_id: '県庁前' },
        'http://localhost'
      );
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('from_stop_id');
      expect(response.error).toContain('空文字列');
    });

    it('to_stop_idパラメータが空白のみの場合はエラー', async () => {
      const result = await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: '   ' },
        'http://localhost'
      );
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('to_stop_id');
      expect(response.error).toContain('空文字列');
    });

    it('timeパラメータが文字列でない場合はエラー', async () => {
      const result = await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: '県庁前', time: 930 },
        'http://localhost'
      );
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('time');
      expect(response.error).toContain('文字列');
    });

    it('timeパラメータが無効な形式の場合はエラー', async () => {
      const result = await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: '県庁前', time: '25:00' },
        'http://localhost'
      );
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('HH:MM');
    });

    it('timeパラメータが正しいHH:MM形式の場合は受け入れる', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ routes: [], count: 0 }),
      });

      const result = await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: '県庁前', time: '09:30' },
        'http://localhost'
      );

      expect(result.isError).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('time=09%3A30')
      );
    });

    it('limitパラメータが数値でない場合はエラー', async () => {
      const result = await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: '県庁前', limit: '5' },
        'http://localhost'
      );
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('limit');
      expect(response.error).toContain('数値');
    });

    it('limitパラメータが整数でない場合はエラー', async () => {
      const result = await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: '県庁前', limit: 3.5 },
        'http://localhost'
      );
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('limit');
      expect(response.error).toContain('整数');
    });

    it('limitパラメータが範囲外（小さすぎる）の場合はエラー', async () => {
      const result = await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: '県庁前', limit: 0 },
        'http://localhost'
      );
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('1〜10');
    });

    it('limitパラメータが範囲外（大きすぎる）の場合はエラー', async () => {
      const result = await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: '県庁前', limit: 11 },
        'http://localhost'
      );
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('1〜10');
    });

    it('limitパラメータが省略された場合はデフォルト値5を使用', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ routes: [], count: 0 }),
      });

      await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: '県庁前' },
        'http://localhost'
      );
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=5')
      );
    });

    it('パラメータがオブジェクトでない場合はエラー', async () => {
      const result = await executeSearchRoutes(null as any, 'http://localhost');
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('オブジェクト');
    });
  });

  describe('REST API呼び出し', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('正しいURLでREST APIを呼び出す', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ routes: [], count: 0 }),
      });

      await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: '県庁前', limit: 3 },
        'http://localhost'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost/api/routes/search?from=%E4%BD%90%E8%B3%80%E9%A7%85&to=%E7%9C%8C%E5%BA%81%E5%89%8D&limit=3'
      );
    });

    it('timeパラメータが指定された場合はURLに含める', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ routes: [], count: 0 }),
      });

      await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: '県庁前', time: '09:30' },
        'http://localhost'
      );

      const call = (global.fetch as any).mock.calls[0][0];
      expect(call).toContain('time=09%3A30');
    });

    it('クエリパラメータを正しくURLエンコード', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ routes: [], count: 0 }),
      });

      await executeSearchRoutes(
        { from_stop_id: '佐賀駅 バスセンター', to_stop_id: '県庁前 北口' },
        'http://localhost'
      );

      const call = (global.fetch as any).mock.calls[0][0];
      // URLSearchParamsはスペースを+にエンコードする（RFC 3986準拠）
      expect(call).toContain('%E4%BD%90%E8%B3%80%E9%A7%85');
      expect(call).toContain('%E3%83%90%E3%82%B9%E3%82%BB%E3%83%B3%E3%82%BF%E3%83%BC');
      expect(call).toContain('%E7%9C%8C%E5%BA%81%E5%89%8D');
      expect(call).toContain('%E5%8C%97%E5%8F%A3');
    });

    it('REST APIエラー時にエラーレスポンスを返す', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Database error' }),
      });

      const result = await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: '県庁前' },
        'http://localhost'
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('REST API呼び出しエラー');
      expect(response.error).toContain('500');
    });

    it('ネットワークエラー時にエラーレスポンスを返す', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: '県庁前' },
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

    it('REST APIレスポンスを正しく変換（要件3.2）', async () => {
      const mockRoutes = [
        {
          tripId: 'trip1',
          routeName: '佐賀市営バス1号線',
          headsign: '県庁前行き',
          departureTime: '09:00',
          arrivalTime: '09:15',
          fromStop: '佐賀駅',
          toStop: '県庁前',
        },
        {
          tripId: 'trip2',
          routeName: '佐賀市営バス2号線',
          headsign: '市役所前行き',
          departureTime: '09:30',
          arrivalTime: '09:50',
          fromStop: '佐賀駅',
          toStop: '県庁前',
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ routes: mockRoutes, count: 2 }),
      });

      const result = await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: '県庁前' },
        'http://localhost'
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.from_stop).toBe('佐賀駅');
      expect(response.to_stop).toBe('県庁前');
      expect(response.count).toBe(2);
      expect(response.routes).toHaveLength(2);

      // 各路線が必須フィールドを含む（要件3.2）
      response.routes.forEach((route: any) => {
        expect(route).toHaveProperty('route_id');
        expect(route).toHaveProperty('route_name');
        expect(route).toHaveProperty('departure_time');
        expect(route).toHaveProperty('arrival_time');
        expect(route).toHaveProperty('duration_minutes');
        expect(route).toHaveProperty('fare');
        expect(route.fare).toHaveProperty('adult');
        expect(route.fare).toHaveProperty('child');
      });
    });

    it('所要時間を正しく計算', async () => {
      const mockRoutes = [
        {
          tripId: 'trip1',
          routeName: 'テスト路線',
          headsign: 'テスト行き',
          departureTime: '09:00',
          arrivalTime: '09:25',
          fromStop: '出発地',
          toStop: '目的地',
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ routes: mockRoutes, count: 1 }),
      });

      const result = await executeSearchRoutes(
        { from_stop_id: '出発地', to_stop_id: '目的地' },
        'http://localhost'
      );

      const response = JSON.parse(result.content[0].text);
      expect(response.routes[0].duration_minutes).toBe(25);
    });

    it('空の結果を正しく処理（要件3.3）', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ routes: [], count: 0 }),
      });

      const result = await executeSearchRoutes(
        { from_stop_id: '存在しないバス停A', to_stop_id: '存在しないバス停B' },
        'http://localhost'
      );

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.routes).toEqual([]);
      expect(response.count).toBe(0);
    });

    it('該当する路線が存在しない場合は空のリストを返す（要件3.3）', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ routes: [], count: 0, message: '該当する路線が見つかりませんでした' }),
      });

      const result = await executeSearchRoutes(
        { from_stop_id: 'バス停A', to_stop_id: 'バス停B' },
        'http://localhost'
      );

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.routes).toEqual([]);
      expect(response.count).toBe(0);
      expect(response.message).toBe('該当する路線が見つかりませんでした');
    });

    it('全ての路線が必須フィールドを含む（要件3.2）', async () => {
      const mockRoutes = [
        {
          tripId: 'trip1',
          routeName: '路線1',
          headsign: '行き先1',
          departureTime: '09:00',
          arrivalTime: '09:15',
          fromStop: '出発地',
          toStop: '目的地',
        },
        {
          tripId: 'trip2',
          routeName: '路線2',
          headsign: '行き先2',
          departureTime: '09:30',
          arrivalTime: '09:50',
          fromStop: '出発地',
          toStop: '目的地',
        },
        {
          tripId: 'trip3',
          routeName: '路線3',
          headsign: '行き先3',
          departureTime: '10:00',
          arrivalTime: '10:20',
          fromStop: '出発地',
          toStop: '目的地',
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ routes: mockRoutes, count: 3 }),
      });

      const result = await executeSearchRoutes(
        { from_stop_id: '出発地', to_stop_id: '目的地' },
        'http://localhost'
      );

      const response = JSON.parse(result.content[0].text);
      
      // 全ての路線が必須フィールドを含む
      expect(response.routes).toHaveLength(3);
      response.routes.forEach((route: any) => {
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
        expect(typeof route.fare.adult).toBe('number');
        expect(typeof route.fare.child).toBe('number');
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
      const mockRoutes = [
        {
          tripId: 'saga_bus_001',
          routeName: '佐賀市営バス1号線',
          headsign: '県庁前行き',
          departureTime: '09:00',
          arrivalTime: '09:15',
          fromStop: '佐賀駅',
          toStop: '県庁前',
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ routes: mockRoutes, count: 1 }),
      });

      const result = await executeSearchRoutes(
        { from_stop_id: '佐賀駅', to_stop_id: '県庁前', time: '09:00', limit: 5 },
        'http://localhost'
      );

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.from_stop).toBe('佐賀駅');
      expect(response.to_stop).toBe('県庁前');
      expect(response.search_time).toBe('09:00');
      expect(response.routes).toHaveLength(1);
      expect(response.routes[0].route_name).toBe('佐賀市営バス1号線');
      expect(response.routes[0].duration_minutes).toBe(15);
    });

    it('異常系: 無効なパラメータでエラー', async () => {
      const result = await executeSearchRoutes(
        { from_stop_id: '', to_stop_id: '県庁前', limit: 20 },
        'http://localhost'
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBeTruthy();
    });

    it('エッジケース: 該当路線なし（要件3.3）', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ routes: [], count: 0 }),
      });

      const result = await executeSearchRoutes(
        { from_stop_id: '遠隔地A', to_stop_id: '遠隔地B' },
        'http://localhost'
      );

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.routes).toEqual([]);
      expect(response.count).toBe(0);
    });
  });
});
