/**
 * RateLimiterクラスのプロパティベーステスト
 * 
 * fast-checkライブラリを使用して、普遍的な正確性プロパティを検証します。
 * 各プロパティは、任意の有効な入力に対して真であるべき特性を表現します。
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import RateLimiter from '../js/rate-limiter.js';

describe('RateLimiter - プロパティベーステスト', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Feature: ors-route-rendering, Property 10: 日次レート制限
   * 
   * 任意の24時間の期間において、システムは2000回を超える
   * Directions APIリクエストを行ってはならない
   * 
   * **Validates: Requirements 3.1**
   */
  describe('プロパティ10: 日次レート制限', () => {
    it('24時間の期間内で2000回を超えるリクエストを許可しない', () => {
      fc.assert(
        fc.property(
          // 2000〜3000回のリクエスト試行を生成
          fc.integer({ min: 2000, max: 3000 }),
          (requestCount) => {
            const limiter = new RateLimiter(2000, 86400000); // 2000リクエスト/日
            let successfulRequests = 0;
            
            // requestCount回リクエストを試行
            for (let i = 0; i < requestCount; i++) {
              if (limiter.canMakeRequest()) {
                limiter.recordRequest();
                successfulRequests++;
              }
            }
            
            // 成功したリクエスト数は2000以下でなければならない
            return successfulRequests <= 2000;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('24時間経過後、新たに2000回のリクエストが許可される', () => {
      fc.assert(
        fc.property(
          // 最初のリクエスト数（1〜2000）
          fc.integer({ min: 1, max: 2000 }),
          (firstBatchCount) => {
            const limiter = new RateLimiter(2000, 86400000);
            
            // 最初のバッチのリクエストを記録
            for (let i = 0; i < firstBatchCount; i++) {
              limiter.recordRequest();
            }
            
            const remainingBefore = 2000 - firstBatchCount;
            
            // 24時間経過
            vi.advanceTimersByTime(86400000);
            
            // 24時間経過後、再び2000回のリクエストが可能
            let successfulRequests = 0;
            for (let i = 0; i < 2000; i++) {
              if (limiter.canMakeRequest()) {
                limiter.recordRequest();
                successfulRequests++;
              }
            }
            
            // 2000回全て成功する
            return successfulRequests === 2000;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('部分的な時間経過により、古いリクエストが段階的にクリアされる', () => {
      fc.assert(
        fc.property(
          // 時間経過（1時間〜23時間）
          fc.integer({ min: 1, max: 23 }),
          (hoursElapsed) => {
            const limiter = new RateLimiter(2000, 86400000);
            
            // 2000回リクエストを記録
            for (let i = 0; i < 2000; i++) {
              limiter.recordRequest();
            }
            
            // 制限に達している
            const canMakeBefore = limiter.canMakeRequest();
            
            // 指定時間経過（ミリ秒）
            vi.advanceTimersByTime(hoursElapsed * 3600000);
            
            // まだ24時間経過していないので、制限は継続
            const canMakeAfter = limiter.canMakeRequest();
            
            return !canMakeBefore && !canMakeAfter;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Feature: ors-route-rendering, Property 11: 分次レート制限
   * 
   * 任意の60秒の期間において、システムは40回を超える
   * Directions APIリクエストを行ってはならない
   * 
   * **Validates: Requirements 3.2**
   */
  describe('プロパティ11: 分次レート制限', () => {
    it('60秒の期間内で40回を超えるリクエストを許可しない', () => {
      fc.assert(
        fc.property(
          // 40〜100回のリクエスト試行を生成
          fc.integer({ min: 40, max: 100 }),
          (requestCount) => {
            const limiter = new RateLimiter(40, 60000); // 40リクエスト/分
            let successfulRequests = 0;
            
            // requestCount回リクエストを試行
            for (let i = 0; i < requestCount; i++) {
              if (limiter.canMakeRequest()) {
                limiter.recordRequest();
                successfulRequests++;
              }
            }
            
            // 成功したリクエスト数は40以下でなければならない
            return successfulRequests <= 40;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('60秒経過後、新たに40回のリクエストが許可される', () => {
      fc.assert(
        fc.property(
          // 最初のリクエスト数（1〜40）
          fc.integer({ min: 1, max: 40 }),
          (firstBatchCount) => {
            const limiter = new RateLimiter(40, 60000);
            
            // 最初のバッチのリクエストを記録
            for (let i = 0; i < firstBatchCount; i++) {
              limiter.recordRequest();
            }
            
            // 60秒経過
            vi.advanceTimersByTime(60000);
            
            // 60秒経過後、再び40回のリクエストが可能
            let successfulRequests = 0;
            for (let i = 0; i < 40; i++) {
              if (limiter.canMakeRequest()) {
                limiter.recordRequest();
                successfulRequests++;
              }
            }
            
            // 40回全て成功する
            return successfulRequests === 40;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('スライディングウィンドウ方式で制限が適用される', () => {
      fc.assert(
        fc.property(
          // 時間間隔（1〜59秒）
          fc.integer({ min: 1, max: 59 }),
          (secondsElapsed) => {
            const limiter = new RateLimiter(40, 60000);
            
            // 最初に20回リクエスト
            for (let i = 0; i < 20; i++) {
              limiter.recordRequest();
            }
            
            // 指定秒数経過
            vi.advanceTimersByTime(secondsElapsed * 1000);
            
            // さらに20回リクエスト
            for (let i = 0; i < 20; i++) {
              limiter.recordRequest();
            }
            
            // 合計40回記録されている
            const currentCount = limiter.getCurrentRequestCount();
            
            // 60秒未満の経過なので、両方のバッチが時間枠内
            return currentCount === 40;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('複数の時間枠にまたがるリクエストが正しく管理される', () => {
      fc.assert(
        fc.property(
          // 各バッチのリクエスト数（1〜20）
          fc.tuple(
            fc.integer({ min: 1, max: 20 }),
            fc.integer({ min: 1, max: 20 }),
            fc.integer({ min: 1, max: 20 })
          ),
          ([batch1, batch2, batch3]) => {
            const limiter = new RateLimiter(40, 60000);
            
            // バッチ1
            for (let i = 0; i < batch1; i++) {
              limiter.recordRequest();
            }
            
            // 30秒経過
            vi.advanceTimersByTime(30000);
            
            // バッチ2
            for (let i = 0; i < batch2; i++) {
              limiter.recordRequest();
            }
            
            // さらに30秒経過（バッチ1から60秒）
            vi.advanceTimersByTime(30000);
            
            // バッチ1はクリアされ、バッチ2のみ残る
            const countAfterFirstWindow = limiter.getCurrentRequestCount();
            
            // バッチ3
            for (let i = 0; i < batch3; i++) {
              limiter.recordRequest();
            }
            
            const finalCount = limiter.getCurrentRequestCount();
            
            // バッチ2とバッチ3の合計
            return countAfterFirstWindow === batch2 && 
                   finalCount === batch2 + batch3;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Feature: ors-route-rendering, Property 13: リクエストカウントの追跡
   * 
   * 任意の時点において、システムは現在の時間枠内で行われた
   * API呼び出しの正確な数を追跡していなければならない
   * 
   * **Validates: Requirements 3.5**
   */
  describe('プロパティ13: リクエストカウントの追跡', () => {
    it('記録されたリクエスト数が正確にカウントされる', () => {
      fc.assert(
        fc.property(
          // リクエスト数（0〜100）
          fc.integer({ min: 0, max: 100 }),
          (requestCount) => {
            const limiter = new RateLimiter(100, 60000);
            
            // requestCount回リクエストを記録
            for (let i = 0; i < requestCount; i++) {
              limiter.recordRequest();
            }
            
            // カウントが正確に一致する
            return limiter.getCurrentRequestCount() === requestCount;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('時間枠外のリクエストは除外される', () => {
      fc.assert(
        fc.property(
          // 最初のバッチのリクエスト数（1〜50）
          fc.integer({ min: 1, max: 50 }),
          // 2番目のバッチのリクエスト数（1〜50）
          fc.integer({ min: 1, max: 50 }),
          (firstBatch, secondBatch) => {
            const limiter = new RateLimiter(100, 60000);
            
            // 最初のバッチを記録
            for (let i = 0; i < firstBatch; i++) {
              limiter.recordRequest();
            }
            
            // 60秒経過（時間枠外）
            vi.advanceTimersByTime(60000);
            
            // 2番目のバッチを記録
            for (let i = 0; i < secondBatch; i++) {
              limiter.recordRequest();
            }
            
            // 最初のバッチは除外され、2番目のバッチのみカウント
            return limiter.getCurrentRequestCount() === secondBatch;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('部分的な時間経過により、一部のリクエストのみ除外される', () => {
      fc.assert(
        fc.property(
          // 時間間隔（ミリ秒、100〜59900）
          fc.integer({ min: 100, max: 59900 }),
          (timeElapsed) => {
            const limiter = new RateLimiter(100, 60000);
            
            // 最初のリクエスト
            limiter.recordRequest();
            
            // 指定時間経過
            vi.advanceTimersByTime(timeElapsed);
            
            // 2番目のリクエスト
            limiter.recordRequest();
            
            // 両方のリクエストが時間枠内
            const countBefore = limiter.getCurrentRequestCount();
            
            // さらに時間経過（最初のリクエストが時間枠外になる）
            vi.advanceTimersByTime(60000 - timeElapsed + 1);
            
            // 最初のリクエストのみ除外される
            const countAfter = limiter.getCurrentRequestCount();
            
            return countBefore === 2 && countAfter === 1;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('canMakeRequestの呼び出しがカウントに影響しない', () => {
      fc.assert(
        fc.property(
          // リクエスト数（1〜50）
          fc.integer({ min: 1, max: 50 }),
          // canMakeRequestの呼び出し回数（1〜100）
          fc.integer({ min: 1, max: 100 }),
          (requestCount, checkCount) => {
            const limiter = new RateLimiter(100, 60000);
            
            // リクエストを記録
            for (let i = 0; i < requestCount; i++) {
              limiter.recordRequest();
            }
            
            // canMakeRequestを複数回呼び出し
            for (let i = 0; i < checkCount; i++) {
              limiter.canMakeRequest();
            }
            
            // カウントは変わらない
            return limiter.getCurrentRequestCount() === requestCount;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getWaitTimeの呼び出しがカウントに影響しない', () => {
      fc.assert(
        fc.property(
          // リクエスト数（1〜50）
          fc.integer({ min: 1, max: 50 }),
          // getWaitTimeの呼び出し回数（1〜100）
          fc.integer({ min: 1, max: 100 }),
          (requestCount, checkCount) => {
            const limiter = new RateLimiter(100, 60000);
            
            // リクエストを記録
            for (let i = 0; i < requestCount; i++) {
              limiter.recordRequest();
            }
            
            // getWaitTimeを複数回呼び出し
            for (let i = 0; i < checkCount; i++) {
              limiter.getWaitTime();
            }
            
            // カウントは変わらない
            return limiter.getCurrentRequestCount() === requestCount;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('リセット後のカウントは0になる', () => {
      fc.assert(
        fc.property(
          // リクエスト数（1〜100）
          fc.integer({ min: 1, max: 100 }),
          (requestCount) => {
            const limiter = new RateLimiter(100, 60000);
            
            // リクエストを記録
            for (let i = 0; i < requestCount; i++) {
              limiter.recordRequest();
            }
            
            // リセット
            limiter.reset();
            
            // カウントは0
            return limiter.getCurrentRequestCount() === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('複数の時間枠にまたがるリクエストのカウントが正確', () => {
      fc.assert(
        fc.property(
          // 各時間枠のリクエスト数の配列（3つの時間枠）
          fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 3, maxLength: 3 }),
          ([count1, count2, count3]) => {
            const limiter = new RateLimiter(100, 60000);
            
            // 時間枠1
            for (let i = 0; i < count1; i++) {
              limiter.recordRequest();
            }
            const afterFirst = limiter.getCurrentRequestCount();
            
            // 30秒経過
            vi.advanceTimersByTime(30000);
            
            // 時間枠2
            for (let i = 0; i < count2; i++) {
              limiter.recordRequest();
            }
            const afterSecond = limiter.getCurrentRequestCount();
            
            // さらに30秒経過（時間枠1から60秒）
            vi.advanceTimersByTime(30000);
            
            // 時間枠3
            for (let i = 0; i < count3; i++) {
              limiter.recordRequest();
            }
            const afterThird = limiter.getCurrentRequestCount();
            
            // 各時点でのカウントが正確
            return afterFirst === count1 &&
                   afterSecond === count1 + count2 &&
                   afterThird === count2 + count3; // count1は時間枠外
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * 統合プロパティ: 日次と分次の制限が独立して動作する
   * 
   * 日次制限と分次制限を持つ2つのRateLimiterが、
   * それぞれ独立して正しく動作することを検証します。
   */
  describe('統合プロパティ: 複数のレート制限の独立性', () => {
    it('日次と分次の制限が独立して適用される', () => {
      fc.assert(
        fc.property(
          // リクエスト数（1〜100）
          fc.integer({ min: 1, max: 100 }),
          (requestCount) => {
            const minuteLimiter = new RateLimiter(40, 60000);
            const dailyLimiter = new RateLimiter(2000, 86400000);
            
            let minuteBlocked = 0;
            let dailyBlocked = 0;
            
            // requestCount回リクエストを試行
            for (let i = 0; i < requestCount; i++) {
              const canMinute = minuteLimiter.canMakeRequest();
              const canDaily = dailyLimiter.canMakeRequest();
              
              if (canMinute && canDaily) {
                minuteLimiter.recordRequest();
                dailyLimiter.recordRequest();
              } else {
                if (!canMinute) minuteBlocked++;
                if (!canDaily) dailyBlocked++;
              }
            }
            
            // 分次制限は40回で発動、日次制限は2000回まで発動しない
            const minuteCount = minuteLimiter.getCurrentRequestCount();
            const dailyCount = dailyLimiter.getCurrentRequestCount();
            
            return minuteCount <= 40 && 
                   dailyCount <= 2000 &&
                   minuteCount === dailyCount; // 同じリクエストを記録
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
