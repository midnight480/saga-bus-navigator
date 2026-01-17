/**
 * RateLimiterクラスのユニットテスト
 * 
 * 特定の例とエッジケースを検証します。
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import RateLimiter from '../js/rate-limiter.js';

describe('RateLimiter', () => {
  let limiter;
  
  beforeEach(() => {
    // 各テストの前にタイマーをリセット
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    // 各テストの後にタイマーを復元
    vi.useRealTimers();
  });

  describe('基本機能', () => {
    it('初期状態ではリクエストが許可される', () => {
      limiter = new RateLimiter(40, 60000);
      expect(limiter.canMakeRequest()).toBe(true);
    });

    it('リクエストを記録できる', () => {
      limiter = new RateLimiter(40, 60000);
      limiter.recordRequest();
      expect(limiter.getCurrentRequestCount()).toBe(1);
    });

    it('複数のリクエストを記録できる', () => {
      limiter = new RateLimiter(40, 60000);
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.recordRequest();
      expect(limiter.getCurrentRequestCount()).toBe(3);
    });
  });

  describe('レート制限判定', () => {
    it('最大リクエスト数に達するとリクエストが拒否される', () => {
      limiter = new RateLimiter(3, 60000);
      
      // 3回リクエストを記録
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.recordRequest();
      
      // 4回目は拒否される
      expect(limiter.canMakeRequest()).toBe(false);
    });

    it('最大リクエスト数-1まではリクエストが許可される', () => {
      limiter = new RateLimiter(3, 60000);
      
      // 2回リクエストを記録
      limiter.recordRequest();
      limiter.recordRequest();
      
      // 3回目は許可される
      expect(limiter.canMakeRequest()).toBe(true);
    });

    it('時間枠が経過すると古いリクエストがクリアされる', () => {
      limiter = new RateLimiter(3, 1000); // 1秒の時間枠
      
      // 3回リクエストを記録
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.recordRequest();
      
      // 制限に達している
      expect(limiter.canMakeRequest()).toBe(false);
      
      // 1秒経過
      vi.advanceTimersByTime(1000);
      
      // 古いリクエストがクリアされ、再び許可される
      expect(limiter.canMakeRequest()).toBe(true);
    });

    it('部分的に時間枠が経過すると一部のリクエストがクリアされる', () => {
      limiter = new RateLimiter(3, 1000); // 1秒の時間枠
      
      // 最初のリクエスト
      limiter.recordRequest();
      
      // 500ms経過
      vi.advanceTimersByTime(500);
      
      // 2回目と3回目のリクエスト
      limiter.recordRequest();
      limiter.recordRequest();
      
      // 制限に達している
      expect(limiter.canMakeRequest()).toBe(false);
      expect(limiter.getCurrentRequestCount()).toBe(3);
      
      // さらに600ms経過（最初のリクエストから1100ms）
      vi.advanceTimersByTime(600);
      
      // 最初のリクエストのみクリアされる
      expect(limiter.getCurrentRequestCount()).toBe(2);
      expect(limiter.canMakeRequest()).toBe(true);
    });
  });

  describe('待機時間計算', () => {
    it('リクエスト可能な場合は待機時間が0', () => {
      limiter = new RateLimiter(3, 60000);
      expect(limiter.getWaitTime()).toBe(0);
    });

    it('制限に達した場合は待機時間が計算される', () => {
      limiter = new RateLimiter(3, 1000); // 1秒の時間枠
      
      // 3回リクエストを記録
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.recordRequest();
      
      // 待機時間は約1000ms
      const waitTime = limiter.getWaitTime();
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(1000);
    });

    it('時間経過により待機時間が減少する', () => {
      limiter = new RateLimiter(3, 1000); // 1秒の時間枠
      
      // 3回リクエストを記録
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.recordRequest();
      
      const initialWaitTime = limiter.getWaitTime();
      
      // 500ms経過
      vi.advanceTimersByTime(500);
      
      const laterWaitTime = limiter.getWaitTime();
      
      // 待機時間が減少している
      expect(laterWaitTime).toBeLessThan(initialWaitTime);
      expect(laterWaitTime).toBeGreaterThan(0);
    });
  });

  describe('エッジケース', () => {
    it('最大リクエスト数が0の場合は常に拒否される', () => {
      limiter = new RateLimiter(0, 60000);
      expect(limiter.canMakeRequest()).toBe(false);
    });

    it('最大リクエスト数が1の場合は1回のみ許可される', () => {
      limiter = new RateLimiter(1, 60000);
      expect(limiter.canMakeRequest()).toBe(true);
      
      limiter.recordRequest();
      expect(limiter.canMakeRequest()).toBe(false);
    });

    it('時間枠が非常に短い場合でも正しく動作する', () => {
      limiter = new RateLimiter(2, 100); // 100msの時間枠
      
      limiter.recordRequest();
      limiter.recordRequest();
      
      expect(limiter.canMakeRequest()).toBe(false);
      
      // 100ms経過
      vi.advanceTimersByTime(100);
      
      expect(limiter.canMakeRequest()).toBe(true);
    });

    it('時間枠が非常に長い場合でも正しく動作する', () => {
      limiter = new RateLimiter(2, 86400000); // 24時間の時間枠
      
      limiter.recordRequest();
      expect(limiter.getCurrentRequestCount()).toBe(1);
      
      // 1時間経過
      vi.advanceTimersByTime(3600000);
      
      // まだ時間枠内
      expect(limiter.getCurrentRequestCount()).toBe(1);
    });
  });

  describe('リセット機能', () => {
    it('リセットすると全てのリクエスト記録がクリアされる', () => {
      limiter = new RateLimiter(3, 60000);
      
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.recordRequest();
      
      expect(limiter.getCurrentRequestCount()).toBe(3);
      
      limiter.reset();
      
      expect(limiter.getCurrentRequestCount()).toBe(0);
      expect(limiter.canMakeRequest()).toBe(true);
    });
  });

  describe('実際のユースケース', () => {
    it('ORS API分次制限（40リクエスト/分）をシミュレート', () => {
      limiter = new RateLimiter(40, 60000);
      
      // 40回リクエストを記録
      for (let i = 0; i < 40; i++) {
        expect(limiter.canMakeRequest()).toBe(true);
        limiter.recordRequest();
      }
      
      // 41回目は拒否される
      expect(limiter.canMakeRequest()).toBe(false);
      
      // 1分経過
      vi.advanceTimersByTime(60000);
      
      // 再び許可される
      expect(limiter.canMakeRequest()).toBe(true);
    });

    it('ORS API日次制限（2000リクエスト/日）をシミュレート', () => {
      limiter = new RateLimiter(2000, 86400000);
      
      // 2000回リクエストを記録
      for (let i = 0; i < 2000; i++) {
        limiter.recordRequest();
      }
      
      // 2001回目は拒否される
      expect(limiter.canMakeRequest()).toBe(false);
      expect(limiter.getCurrentRequestCount()).toBe(2000);
      
      // 24時間経過
      vi.advanceTimersByTime(86400000);
      
      // 再び許可される
      expect(limiter.canMakeRequest()).toBe(true);
      expect(limiter.getCurrentRequestCount()).toBe(0);
    });

    it('連続リクエストと待機のシナリオ', () => {
      limiter = new RateLimiter(3, 1000);
      
      // 3回リクエスト
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.recordRequest();
      
      // 制限に達している
      expect(limiter.canMakeRequest()).toBe(false);
      
      // 待機時間を取得
      const waitTime = limiter.getWaitTime();
      expect(waitTime).toBeGreaterThan(0);
      
      // 待機時間分経過
      vi.advanceTimersByTime(waitTime);
      
      // 再び許可される
      expect(limiter.canMakeRequest()).toBe(true);
    });
  });

  describe('getCurrentRequestCount', () => {
    it('現在のリクエスト数を正確に返す', () => {
      limiter = new RateLimiter(10, 60000);
      
      expect(limiter.getCurrentRequestCount()).toBe(0);
      
      limiter.recordRequest();
      expect(limiter.getCurrentRequestCount()).toBe(1);
      
      limiter.recordRequest();
      limiter.recordRequest();
      expect(limiter.getCurrentRequestCount()).toBe(3);
    });

    it('古いリクエストを除外してカウントする', () => {
      limiter = new RateLimiter(10, 1000);
      
      limiter.recordRequest();
      limiter.recordRequest();
      
      expect(limiter.getCurrentRequestCount()).toBe(2);
      
      // 1秒経過
      vi.advanceTimersByTime(1000);
      
      expect(limiter.getCurrentRequestCount()).toBe(0);
    });
  });
});
