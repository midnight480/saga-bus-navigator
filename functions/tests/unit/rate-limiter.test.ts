/**
 * レート制限の単体テスト
 * 要件7.1, 7.2, 7.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter, RateLimitResult } from '../../lib/mcp/rate-limiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
    vi.useFakeTimers();
  });

  describe('リクエスト追跡', () => {
    it('初回リクエストは許可される', () => {
      const result = rateLimiter.check('192.168.1.1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59); // 60 - 1
    });

    it('複数のIPアドレスを独立して追跡する', () => {
      const result1 = rateLimiter.check('192.168.1.1');
      const result2 = rateLimiter.check('192.168.1.2');

      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(59);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(59);
    });

    it('同一IPからの連続リクエストをカウントする', () => {
      rateLimiter.check('192.168.1.1'); // 1回目
      rateLimiter.check('192.168.1.1'); // 2回目
      const result = rateLimiter.check('192.168.1.1'); // 3回目

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(57); // 60 - 3
    });

    it('残りリクエスト数が正しく計算される', () => {
      for (let i = 0; i < 10; i++) {
        const result = rateLimiter.check('192.168.1.1');
        expect(result.remaining).toBe(60 - (i + 1));
      }
    });
  });

  describe('制限超過時の動作（要件7.2）', () => {
    it('制限を超えるとリクエストが拒否される', () => {
      // 60回リクエスト（制限まで）
      for (let i = 0; i < 60; i++) {
        const result = rateLimiter.check('192.168.1.1');
        expect(result.allowed).toBe(true);
      }

      // 61回目は拒否される
      const result = rateLimiter.check('192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('制限超過後も同じIPからのリクエストは拒否され続ける', () => {
      // 制限まで到達
      for (let i = 0; i < 60; i++) {
        rateLimiter.check('192.168.1.1');
      }

      // 複数回拒否される
      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.check('192.168.1.1');
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      }
    });

    it('制限超過しても他のIPには影響しない', () => {
      // IP1を制限まで到達
      for (let i = 0; i < 60; i++) {
        rateLimiter.check('192.168.1.1');
      }

      // IP2は正常にリクエストできる
      const result = rateLimiter.check('192.168.1.2');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59);
    });
  });

  describe('Retry-Afterヘッダー情報（要件7.3）', () => {
    it('resetAtにウィンドウのリセット時刻が含まれる', () => {
      const now = Date.now();
      const result = rateLimiter.check('192.168.1.1');

      expect(result.resetAt).toBeGreaterThan(now);
      expect(result.resetAt).toBeLessThanOrEqual(now + 60000); // 1分以内
    });

    it('制限超過時のresetAtが正しい', () => {
      const firstResult = rateLimiter.check('192.168.1.1');
      const expectedResetAt = firstResult.resetAt;

      // 制限まで到達
      for (let i = 1; i < 60; i++) {
        rateLimiter.check('192.168.1.1');
      }

      // 制限超過
      const result = rateLimiter.check('192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.resetAt).toBe(expectedResetAt);
    });

    it('resetAtから経過秒数を計算できる', () => {
      const now = Date.now();
      const result = rateLimiter.check('192.168.1.1');

      const retryAfterSeconds = Math.ceil((result.resetAt - now) / 1000);
      expect(retryAfterSeconds).toBeGreaterThan(0);
      expect(retryAfterSeconds).toBeLessThanOrEqual(60);
    });
  });

  describe('タイムウィンドウのリセット', () => {
    it('ウィンドウ期限後は新しいウィンドウが開始される', () => {
      // 制限まで到達
      for (let i = 0; i < 60; i++) {
        rateLimiter.check('192.168.1.1');
      }

      // 制限超過を確認
      let result = rateLimiter.check('192.168.1.1');
      expect(result.allowed).toBe(false);

      // 1分経過
      vi.advanceTimersByTime(60000);

      // 新しいウィンドウで再度リクエスト可能
      result = rateLimiter.check('192.168.1.1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59);
    });

    it('ウィンドウ期限前はリセットされない', () => {
      // 制限まで到達
      for (let i = 0; i < 60; i++) {
        rateLimiter.check('192.168.1.1');
      }

      // 59秒経過（1秒足りない）
      vi.advanceTimersByTime(59000);

      // まだ制限中
      const result = rateLimiter.check('192.168.1.1');
      expect(result.allowed).toBe(false);
    });
  });

  describe('カスタム設定', () => {
    it('カスタムの最大リクエスト数を設定できる', () => {
      const customLimiter = new RateLimiter({ maxRequests: 10 });

      // 10回まで許可
      for (let i = 0; i < 10; i++) {
        const result = customLimiter.check('192.168.1.1');
        expect(result.allowed).toBe(true);
      }

      // 11回目は拒否
      const result = customLimiter.check('192.168.1.1');
      expect(result.allowed).toBe(false);
    });

    it('カスタムのウィンドウ時間を設定できる', () => {
      const customLimiter = new RateLimiter({
        windowMs: 5000, // 5秒
        maxRequests: 10,
      });

      // 制限まで到達
      for (let i = 0; i < 10; i++) {
        customLimiter.check('192.168.1.1');
      }

      // 制限超過
      let result = customLimiter.check('192.168.1.1');
      expect(result.allowed).toBe(false);

      // 5秒経過
      vi.advanceTimersByTime(5000);

      // リセットされる
      result = customLimiter.check('192.168.1.1');
      expect(result.allowed).toBe(true);
    });

    it('設定を取得できる', () => {
      const config = rateLimiter.getConfig();

      expect(config.windowMs).toBe(60000);
      expect(config.maxRequests).toBe(60);
    });
  });

  describe('リセット機能', () => {
    it('特定IPのレート制限をリセットできる', () => {
      // 制限まで到達
      for (let i = 0; i < 60; i++) {
        rateLimiter.check('192.168.1.1');
      }

      // 制限超過を確認
      let result = rateLimiter.check('192.168.1.1');
      expect(result.allowed).toBe(false);

      // リセット
      rateLimiter.reset('192.168.1.1');

      // 再度リクエスト可能
      result = rateLimiter.check('192.168.1.1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59);
    });

    it('全てのレート制限をクリアできる', () => {
      rateLimiter.check('192.168.1.1');
      rateLimiter.check('192.168.1.2');

      expect(rateLimiter.getTrackedIpCount()).toBe(2);

      rateLimiter.clear();

      expect(rateLimiter.getTrackedIpCount()).toBe(0);
    });
  });

  describe('クリーンアップ', () => {
    it('期限切れのエントリをクリーンアップできる', () => {
      rateLimiter.check('192.168.1.1');
      rateLimiter.check('192.168.1.2');

      // 1分経過
      vi.advanceTimersByTime(60000);

      const cleanedCount = rateLimiter.cleanup();

      expect(cleanedCount).toBe(2);
      expect(rateLimiter.getTrackedIpCount()).toBe(0);
    });

    it('期限内のエントリは残る', () => {
      rateLimiter.check('192.168.1.1');

      // 30秒経過
      vi.advanceTimersByTime(30000);

      rateLimiter.check('192.168.1.2');

      // さらに35秒経過（IP1は65秒、IP2は35秒）
      vi.advanceTimersByTime(35000);

      const cleanedCount = rateLimiter.cleanup();

      expect(cleanedCount).toBe(1); // IP1のみクリーンアップ
      expect(rateLimiter.getTrackedIpCount()).toBe(1);
    });

    it('クリーンアップ対象がない場合は0を返す', () => {
      rateLimiter.check('192.168.1.1');

      // 30秒経過
      vi.advanceTimersByTime(30000);

      const cleanedCount = rateLimiter.cleanup();

      expect(cleanedCount).toBe(0);
      expect(rateLimiter.getTrackedIpCount()).toBe(1);
    });
  });

  describe('エッジケース', () => {
    it('空のIPアドレスでもエラーにならない', () => {
      const result = rateLimiter.check('');

      expect(result.allowed).toBe(true);
    });

    it('同時に大量のIPを追跡できる', () => {
      for (let i = 0; i < 1000; i++) {
        const result = rateLimiter.check(`192.168.1.${i}`);
        expect(result.allowed).toBe(true);
      }

      expect(rateLimiter.getTrackedIpCount()).toBe(1000);
    });

    it('制限ギリギリのリクエストが正しく処理される', () => {
      // 59回リクエスト
      for (let i = 0; i < 59; i++) {
        rateLimiter.check('192.168.1.1');
      }

      // 60回目（最後の許可）
      const result60 = rateLimiter.check('192.168.1.1');
      expect(result60.allowed).toBe(true);
      expect(result60.remaining).toBe(0);

      // 61回目（拒否）
      const result61 = rateLimiter.check('192.168.1.1');
      expect(result61.allowed).toBe(false);
    });
  });
});
