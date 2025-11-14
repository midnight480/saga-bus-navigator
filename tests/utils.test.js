/**
 * 時刻ユーティリティの単体テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// TimeUtilsクラスをインポート
import '../js/utils.js';

describe('TimeUtils', () => {
  let timeUtils;

  beforeEach(() => {
    // 各テストの前に新しいインスタンスを作成
    timeUtils = new window.TimeUtils();
  });

  describe('formatTime', () => {
    it('1桁の時と分を2桁にゼロパディングする', () => {
      const result = timeUtils.formatTime(9, 5);
      expect(result).toBe('09:05');
    });

    it('2桁の時と分をそのまま表示する', () => {
      const result = timeUtils.formatTime(18, 50);
      expect(result).toBe('18:50');
    });

    it('0時0分を正しくフォーマットする', () => {
      const result = timeUtils.formatTime(0, 0);
      expect(result).toBe('00:00');
    });

    it('23時59分を正しくフォーマットする', () => {
      const result = timeUtils.formatTime(23, 59);
      expect(result).toBe('23:59');
    });

    it('正午を正しくフォーマットする', () => {
      const result = timeUtils.formatTime(12, 0);
      expect(result).toBe('12:00');
    });
  });

  describe('calculateDuration', () => {
    it('同じ時間帯の所要時間を計算する', () => {
      const result = timeUtils.calculateDuration(9, 0, 9, 30);
      expect(result).toBe(30);
    });

    it('時間をまたぐ所要時間を計算する', () => {
      const result = timeUtils.calculateDuration(18, 50, 19, 20);
      expect(result).toBe(30);
    });

    it('1時間の所要時間を計算する', () => {
      const result = timeUtils.calculateDuration(10, 0, 11, 0);
      expect(result).toBe(60);
    });

    it('1分の所要時間を計算する', () => {
      const result = timeUtils.calculateDuration(10, 0, 10, 1);
      expect(result).toBe(1);
    });

    it('複数時間をまたぐ所要時間を計算する', () => {
      const result = timeUtils.calculateDuration(6, 30, 9, 45);
      expect(result).toBe(195); // 3時間15分 = 195分
    });

    it('0分の所要時間を計算する', () => {
      const result = timeUtils.calculateDuration(10, 30, 10, 30);
      expect(result).toBe(0);
    });
  });

  describe('getCurrentTimeLocal', () => {
    it('Dateオブジェクトを返す', () => {
      const result = timeUtils.getCurrentTimeLocal();
      expect(result).toBeInstanceOf(Date);
    });

    it('現在時刻に近い値を返す', () => {
      const before = new Date();
      const result = timeUtils.getCurrentTimeLocal();
      const after = new Date();
      
      expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getCurrentTimeFromNTP', () => {
    it('NTP成功時にDateオブジェクトを返す', async () => {
      const mockNTPResponse = {
        st: 1700000000 // Unix timestamp (秒)
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockNTPResponse)
        })
      );

      const result = await timeUtils.getCurrentTimeFromNTP();
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(1700000000 * 1000);
    });

    it('NTP失敗時にローカル時刻を返す', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      );

      const result = await timeUtils.getCurrentTimeFromNTP();
      
      expect(result).toBeInstanceOf(Date);
      // ローカル時刻が返されることを確認
      const now = new Date();
      expect(Math.abs(result.getTime() - now.getTime())).toBeLessThan(1000);
    });

    it('NTPタイムアウト時にローカル時刻を返す', async () => {
      // AbortErrorをシミュレート（タイムアウト時に発生するエラー）
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      global.fetch = vi.fn(() => Promise.reject(abortError));

      const result = await timeUtils.getCurrentTimeFromNTP();
      
      expect(result).toBeInstanceOf(Date);
      // ローカル時刻が返されることを確認
      const now = new Date();
      expect(Math.abs(result.getTime() - now.getTime())).toBeLessThan(1000);
    });

    it('NTP HTTPエラー時にローカル時刻を返す', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500
        })
      );

      const result = await timeUtils.getCurrentTimeFromNTP();
      
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('loadHolidayCalendar', () => {
    it('祝日データを正しく読み込む', async () => {
      const mockHolidays = {
        '2025-01-01': '元日',
        '2025-01-13': '成人の日',
        '2025-02-11': '建国記念の日'
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHolidays)
        })
      );

      const result = await timeUtils.loadHolidayCalendar(2025);
      
      expect(result).toEqual(mockHolidays);
      expect(result['2025-01-01']).toBe('元日');
    });

    it('キャッシュされた祝日データを返す', async () => {
      const mockHolidays = {
        '2025-01-01': '元日'
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHolidays)
        })
      );

      // 1回目の呼び出し
      await timeUtils.loadHolidayCalendar(2025);
      
      // 2回目の呼び出し
      await timeUtils.loadHolidayCalendar(2025);

      // fetchは1回だけ呼ばれる
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('API失敗時に空オブジェクトを返す', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      );

      const result = await timeUtils.loadHolidayCalendar(2025);
      
      expect(result).toEqual({});
    });

    it('HTTPエラー時に空オブジェクトを返す', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404
        })
      );

      const result = await timeUtils.loadHolidayCalendar(2025);
      
      expect(result).toEqual({});
    });
  });

  describe('isHoliday', () => {
    it('祝日の場合trueを返す', async () => {
      const mockHolidays = {
        '2025-01-01': '元日',
        '2025-01-13': '成人の日'
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHolidays)
        })
      );

      const date = new Date('2025-01-01');
      const result = await timeUtils.isHoliday(date);
      
      expect(result).toBe(true);
    });

    it('平日の場合falseを返す', async () => {
      const mockHolidays = {
        '2025-01-01': '元日'
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHolidays)
        })
      );

      const date = new Date('2025-01-02');
      const result = await timeUtils.isHoliday(date);
      
      expect(result).toBe(false);
    });

    it('API失敗時はfalseを返す', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      );

      const date = new Date('2025-01-01');
      const result = await timeUtils.isHoliday(date);
      
      expect(result).toBe(false);
    });
  });

  describe('getWeekdayType', () => {
    it('月曜日（非祝日）は平日を返す', async () => {
      const mockHolidays = {};

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHolidays)
        })
      );

      // 2025-01-06は月曜日
      const date = new Date('2025-01-06');
      const result = await timeUtils.getWeekdayType(date);
      
      expect(result).toBe('平日');
    });

    it('金曜日（非祝日）は平日を返す', async () => {
      const mockHolidays = {};

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHolidays)
        })
      );

      // 2025-01-10は金曜日
      const date = new Date('2025-01-10');
      const result = await timeUtils.getWeekdayType(date);
      
      expect(result).toBe('平日');
    });

    it('土曜日は土日祝を返す', async () => {
      const mockHolidays = {};

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHolidays)
        })
      );

      // 2025-01-11は土曜日
      const date = new Date('2025-01-11');
      const result = await timeUtils.getWeekdayType(date);
      
      expect(result).toBe('土日祝');
    });

    it('日曜日は土日祝を返す', async () => {
      const mockHolidays = {};

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHolidays)
        })
      );

      // 2025-01-12は日曜日
      const date = new Date('2025-01-12');
      const result = await timeUtils.getWeekdayType(date);
      
      expect(result).toBe('土日祝');
    });

    it('平日の祝日は土日祝を返す', async () => {
      const mockHolidays = {
        '2025-01-13': '成人の日'
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHolidays)
        })
      );

      // 2025-01-13は月曜日だが成人の日
      const date = new Date('2025-01-13');
      const result = await timeUtils.getWeekdayType(date);
      
      expect(result).toBe('土日祝');
    });

    it('API失敗時は曜日のみで判定する', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      );

      // 2025-01-06は月曜日
      const date = new Date('2025-01-06');
      const result = await timeUtils.getWeekdayType(date);
      
      expect(result).toBe('平日');
    });
  });
});
