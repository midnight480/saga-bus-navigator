/**
 * 始発・終バス検索ツールの単体テスト
 * 
 * タスク7.2: 始発・終バス検索ツールの単体テスト
 * - パラメータバリデーションのテスト
 * - REST API呼び出しのモックテスト
 * - エラーハンドリングのテスト（エッジケース）
 * 
 * 要件: 4.1, 4.2, 4.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getFirstLastBusTool, executeGetFirstLastBus } from '../../lib/mcp/tools/get-first-last-bus';

describe('始発・終バス検索ツール', () => {
  describe('ツールスキーマ定義', () => {
    it('正しいツール名を持つ', () => {
      expect(getFirstLastBusTool.name).toBe('get_first_last_bus');
    });

    it('説明文を持つ', () => {
      expect(getFirstLastBusTool.description).toBeTruthy();
      expect(typeof getFirstLastBusTool.description).toBe('string');
    });

    it('正しい入力スキーマを持つ（要件4.4）', () => {
      expect(getFirstLastBusTool.inputSchema.type).toBe('object');
      expect(getFirstLastBusTool.inputSchema.properties).toHaveProperty('route_id');
      expect(getFirstLastBusTool.inputSchema.required).toContain('route_id');
    });

    it('route_idパラメータは文字列型', () => {
      expect(getFirstLastBusTool.inputSchema.properties.route_id.type).toBe('string');
    });
  });

  describe('パラメータバリデーション', () => {
    it('route_idパラメータが必須', async () => {
      const result = await executeGetFirstLastBus({}, 'http://localhost');
      
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('route_id');
    });

    it('route_idパラメータがnullの場合はエラー', async () => {
      const result = await executeGetFirstLastBus({ route_id: null }, 'http://localhost');
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('route_id');
    });

    it('route_idパラメータが文字列でない場合はエラー', async () => {
      const result = await executeGetFirstLastBus({ route_id: 123 }, 'http://localhost');
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('文字列');
    });

    it('route_idパラメータが空文字列の場合はエラー', async () => {
      const result = await executeGetFirstLastBus({ route_id: '' }, 'http://localhost');
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('空文字列');
    });

    it('route_idパラメータが空白のみの場合はエラー', async () => {
      const result = await executeGetFirstLastBus({ route_id: '   ' }, 'http://localhost');
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('空文字列');
    });

    it('argsがオブジェクトでない場合はエラー', async () => {
      const result = await executeGetFirstLastBus('invalid', 'http://localhost');
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('オブジェクト');
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
      const mockResponse = {
        route_id: '1',
        route_name: '佐賀駅～県庁前',
        first_bus: {
          trip_id: 'trip1',
          trip_headsign: '県庁前行き',
          departure_time: '06:00:00',
          arrival_time: '06:30:00',
          departure_stop_id: 'stop1',
          arrival_stop_id: 'stop2',
        },
        last_bus: {
          trip_id: 'trip2',
          trip_headsign: '県庁前行き',
          departure_time: '22:00:00',
          arrival_time: '22:30:00',
          departure_stop_id: 'stop1',
          arrival_stop_id: 'stop2',
        },
        total_trips: 20,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await executeGetFirstLastBus(
        { route_id: '1' },
        'http://localhost'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost/api/routes/first-last?route_id=1'
      );
    });

    it('route_idを正しくURLエンコード', async () => {
      const mockResponse = {
        route_id: 'route-1',
        route_name: 'テスト路線',
        first_bus: {
          trip_id: 'trip1',
          trip_headsign: 'テスト',
          departure_time: '06:00:00',
          arrival_time: '06:30:00',
          departure_stop_id: 'stop1',
          arrival_stop_id: 'stop2',
        },
        last_bus: {
          trip_id: 'trip2',
          trip_headsign: 'テスト',
          departure_time: '22:00:00',
          arrival_time: '22:30:00',
          departure_stop_id: 'stop1',
          arrival_stop_id: 'stop2',
        },
        total_trips: 10,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await executeGetFirstLastBus(
        { route_id: 'route-1' },
        'http://localhost'
      );

      const call = (global.fetch as any).mock.calls[0][0];
      expect(call).toContain('route_id=route-1');
    });

    it('REST APIエラー時にエラーレスポンスを返す', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Database error' }),
      });

      const result = await executeGetFirstLastBus(
        { route_id: '1' },
        'http://localhost'
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('REST API呼び出しエラー');
      expect(response.error).toContain('500');
    });

    it('存在しない路線IDの場合は404エラー（要件4.3）', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ 
          error: '指定された路線が見つかりません',
          route_id: '999'
        }),
      });

      const result = await executeGetFirstLastBus(
        { route_id: '999' },
        'http://localhost'
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('見つかりません');
      expect(response.route_id).toBe('999');
    });

    it('ネットワークエラー時にエラーレスポンスを返す', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await executeGetFirstLastBus(
        { route_id: '1' },
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

    it('REST APIレスポンスを正しく変換（要件4.1, 4.2）', async () => {
      const mockResponse = {
        route_id: '1',
        route_name: '佐賀駅～県庁前',
        first_bus: {
          trip_id: 'trip_first',
          trip_headsign: '県庁前行き',
          departure_time: '06:00:00',
          arrival_time: '06:30:00',
          departure_stop_id: 'saga_station',
          arrival_stop_id: 'kencho_mae',
        },
        last_bus: {
          trip_id: 'trip_last',
          trip_headsign: '県庁前行き',
          departure_time: '22:00:00',
          arrival_time: '22:30:00',
          departure_stop_id: 'saga_station',
          arrival_stop_id: 'kencho_mae',
        },
        total_trips: 20,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await executeGetFirstLastBus(
        { route_id: '1' },
        'http://localhost'
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.route_id).toBe('1');
      expect(response.route_name).toBe('佐賀駅～県庁前');
      expect(response.total_trips).toBe(20);

      // 始発バス情報が必須フィールドを含む（要件4.2）
      expect(response.first_bus).toHaveProperty('trip_id');
      expect(response.first_bus).toHaveProperty('departure_time');
      expect(response.first_bus).toHaveProperty('arrival_time');
      expect(response.first_bus.trip_id).toBe('trip_first');
      expect(response.first_bus.departure_time).toBe('06:00:00');
      expect(response.first_bus.arrival_time).toBe('06:30:00');

      // 終バス情報が必須フィールドを含む（要件4.2）
      expect(response.last_bus).toHaveProperty('trip_id');
      expect(response.last_bus).toHaveProperty('departure_time');
      expect(response.last_bus).toHaveProperty('arrival_time');
      expect(response.last_bus.trip_id).toBe('trip_last');
      expect(response.last_bus.departure_time).toBe('22:00:00');
      expect(response.last_bus.arrival_time).toBe('22:30:00');
    });

    it('始発・終バス情報に追加フィールドも含まれる', async () => {
      const mockResponse = {
        route_id: '2',
        route_name: 'テスト路線',
        first_bus: {
          trip_id: 'trip1',
          trip_headsign: '行き先1',
          departure_time: '05:30:00',
          arrival_time: '06:00:00',
          departure_stop_id: 'stop_a',
          arrival_stop_id: 'stop_b',
        },
        last_bus: {
          trip_id: 'trip2',
          trip_headsign: '行き先2',
          departure_time: '23:00:00',
          arrival_time: '23:30:00',
          departure_stop_id: 'stop_a',
          arrival_stop_id: 'stop_b',
        },
        total_trips: 15,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await executeGetFirstLastBus(
        { route_id: '2' },
        'http://localhost'
      );

      const response = JSON.parse(result.content[0].text);

      // 追加フィールドの確認
      expect(response.first_bus.trip_headsign).toBe('行き先1');
      expect(response.first_bus.departure_stop_id).toBe('stop_a');
      expect(response.first_bus.arrival_stop_id).toBe('stop_b');

      expect(response.last_bus.trip_headsign).toBe('行き先2');
      expect(response.last_bus.departure_stop_id).toBe('stop_a');
      expect(response.last_bus.arrival_stop_id).toBe('stop_b');
    });

    it('全ての必須フィールドが正しい型を持つ（要件4.2）', async () => {
      const mockResponse = {
        route_id: '3',
        route_name: '路線3',
        first_bus: {
          trip_id: 'trip_a',
          trip_headsign: 'テスト',
          departure_time: '07:00:00',
          arrival_time: '07:30:00',
          departure_stop_id: 'stop1',
          arrival_stop_id: 'stop2',
        },
        last_bus: {
          trip_id: 'trip_b',
          trip_headsign: 'テスト',
          departure_time: '21:00:00',
          arrival_time: '21:30:00',
          departure_stop_id: 'stop1',
          arrival_stop_id: 'stop2',
        },
        total_trips: 25,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await executeGetFirstLastBus(
        { route_id: '3' },
        'http://localhost'
      );

      const response = JSON.parse(result.content[0].text);

      // 型チェック
      expect(typeof response.route_id).toBe('string');
      expect(typeof response.route_name).toBe('string');
      expect(typeof response.total_trips).toBe('number');

      expect(typeof response.first_bus.trip_id).toBe('string');
      expect(typeof response.first_bus.departure_time).toBe('string');
      expect(typeof response.first_bus.arrival_time).toBe('string');

      expect(typeof response.last_bus.trip_id).toBe('string');
      expect(typeof response.last_bus.departure_time).toBe('string');
      expect(typeof response.last_bus.arrival_time).toBe('string');
    });
  });

  describe('エラーハンドリング（エッジケース）', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('存在しない路線IDでエラーメッセージを返す（要件4.3）', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ 
          error: '指定された路線が見つかりません',
          route_id: 'invalid_route'
        }),
      });

      const result = await executeGetFirstLastBus(
        { route_id: 'invalid_route' },
        'http://localhost'
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBeTruthy();
      expect(response.route_id).toBe('invalid_route');
    });

    it('トリップが存在しない路線でエラー', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ 
          error: '指定された路線にトリップが見つかりません',
          route_id: 'no_trips_route'
        }),
      });

      const result = await executeGetFirstLastBus(
        { route_id: 'no_trips_route' },
        'http://localhost'
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('見つかりません');
    });

    it('JSONパースエラー時にエラーレスポンスを返す', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await executeGetFirstLastBus(
        { route_id: '1' },
        'http://localhost'
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('REST API呼び出しエラー');
    });
  });

  describe('統合シナリオ', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('正常系: 有効な路線IDで検索成功（要件4.1）', async () => {
      const mockResponse = {
        route_id: '1',
        route_name: '佐賀駅～県庁前',
        first_bus: {
          trip_id: 'morning_trip',
          trip_headsign: '県庁前行き',
          departure_time: '06:00:00',
          arrival_time: '06:30:00',
          departure_stop_id: 'saga_station',
          arrival_stop_id: 'kencho_mae',
        },
        last_bus: {
          trip_id: 'evening_trip',
          trip_headsign: '県庁前行き',
          departure_time: '22:00:00',
          arrival_time: '22:30:00',
          departure_stop_id: 'saga_station',
          arrival_stop_id: 'kencho_mae',
        },
        total_trips: 20,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await executeGetFirstLastBus(
        { route_id: '1' },
        'http://localhost'
      );

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.route_id).toBe('1');
      expect(response.first_bus.departure_time).toBe('06:00:00');
      expect(response.last_bus.departure_time).toBe('22:00:00');
    });

    it('異常系: 無効なパラメータでエラー', async () => {
      const result = await executeGetFirstLastBus(
        { route_id: '' },
        'http://localhost'
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBeTruthy();
    });

    it('異常系: 存在しない路線IDでエラー（要件4.3）', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ 
          error: '指定された路線が見つかりません',
          route_id: '999'
        }),
      });

      const result = await executeGetFirstLastBus(
        { route_id: '999' },
        'http://localhost'
      );

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBeTruthy();
      expect(response.route_id).toBe('999');
    });
  });
});
