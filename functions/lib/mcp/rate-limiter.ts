/**
 * レート制限
 * 
 * IPアドレス単位でリクエスト数を追跡し、レート制限を実施
 * 要件7.1, 7.2, 7.3, 7.4, 7.5
 */

/**
 * レート制限チェック結果
 */
export interface RateLimitResult {
  allowed: boolean; // リクエストが許可されるか
  remaining: number; // 残りリクエスト数
  resetAt: number; // リセット時刻（Unixタイムスタンプ、ミリ秒）
}

/**
 * IPアドレスごとのリクエスト情報
 */
interface RequestInfo {
  count: number; // リクエスト数
  windowStart: number; // ウィンドウ開始時刻（ミリ秒）
}

/**
 * レート制限設定
 */
export interface RateLimitConfig {
  windowMs: number; // タイムウィンドウ（ミリ秒）
  maxRequests: number; // 最大リクエスト数
}

/**
 * レート制限マネージャー
 */
export class RateLimiter {
  private requests: Map<string, RequestInfo> = new Map();
  private readonly config: RateLimitConfig;

  /**
   * コンストラクタ
   * @param config レート制限設定（デフォルト: 60リクエスト/分）
   */
  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      windowMs: config?.windowMs ?? 60000, // 1分
      maxRequests: config?.maxRequests ?? 60, // 60リクエスト/分
    };
  }

  /**
   * レート制限をチェック
   * @param ip IPアドレス
   * @returns レート制限チェック結果
   */
  check(ip: string): RateLimitResult {
    const now = Date.now();
    const requestInfo = this.requests.get(ip);

    // 初回リクエストまたはウィンドウ期限切れ
    if (!requestInfo || now - requestInfo.windowStart >= this.config.windowMs) {
      this.requests.set(ip, {
        count: 1,
        windowStart: now,
      });

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.windowMs,
      };
    }

    // ウィンドウ内のリクエスト
    const newCount = requestInfo.count + 1;

    // レート制限超過チェック
    if (newCount > this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: requestInfo.windowStart + this.config.windowMs,
      };
    }

    // リクエスト数を更新
    requestInfo.count = newCount;

    return {
      allowed: true,
      remaining: this.config.maxRequests - newCount,
      resetAt: requestInfo.windowStart + this.config.windowMs,
    };
  }

  /**
   * 特定IPのレート制限をリセット
   * @param ip IPアドレス
   */
  reset(ip: string): void {
    this.requests.delete(ip);
  }

  /**
   * 全てのレート制限をクリア
   */
  clear(): void {
    this.requests.clear();
  }

  /**
   * 期限切れのエントリをクリーンアップ
   * @returns クリーンアップされたエントリ数
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [ip, info] of this.requests.entries()) {
      if (now - info.windowStart >= this.config.windowMs) {
        this.requests.delete(ip);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * 追跡中のIP数を取得（テスト用）
   * @returns IP数
   */
  getTrackedIpCount(): number {
    return this.requests.size;
  }

  /**
   * 設定を取得（テスト用）
   * @returns レート制限設定
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }
}

/**
 * Cloudflare Workers KVを使用したレート制限マネージャー
 * 
 * 注意: この実装は将来的にCloudflare Workers KVを使用する際に使用します。
 * 現在はメモリベースのRateLimiterを使用してください。
 */
export class KVRateLimiter {
  private readonly config: RateLimitConfig;
  private readonly kv: any; // KVNamespace型

  constructor(kv: any, config?: Partial<RateLimitConfig>) {
    this.kv = kv;
    this.config = {
      windowMs: config?.windowMs ?? 60000,
      maxRequests: config?.maxRequests ?? 60,
    };
  }

  /**
   * レート制限をチェック
   * @param ip IPアドレス
   * @returns レート制限チェック結果
   */
  async check(ip: string): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `rate_limit:${ip}`;

    // KVから現在のリクエスト情報を取得
    const data = await this.kv.get(key, { type: 'json' });
    const requestInfo: RequestInfo | null = data;

    // 初回リクエストまたはウィンドウ期限切れ
    if (!requestInfo || now - requestInfo.windowStart >= this.config.windowMs) {
      const newInfo: RequestInfo = {
        count: 1,
        windowStart: now,
      };

      // KVに保存（TTL: ウィンドウ時間 + 余裕）
      await this.kv.put(key, JSON.stringify(newInfo), {
        expirationTtl: Math.ceil(this.config.windowMs / 1000) + 60,
      });

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.windowMs,
      };
    }

    // ウィンドウ内のリクエスト
    const newCount = requestInfo.count + 1;

    // レート制限超過チェック
    if (newCount > this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: requestInfo.windowStart + this.config.windowMs,
      };
    }

    // リクエスト数を更新
    requestInfo.count = newCount;
    await this.kv.put(key, JSON.stringify(requestInfo), {
      expirationTtl: Math.ceil(this.config.windowMs / 1000) + 60,
    });

    return {
      allowed: true,
      remaining: this.config.maxRequests - newCount,
      resetAt: requestInfo.windowStart + this.config.windowMs,
    };
  }

  /**
   * 特定IPのレート制限をリセット
   * @param ip IPアドレス
   */
  async reset(ip: string): Promise<void> {
    const key = `rate_limit:${ip}`;
    await this.kv.delete(key);
  }
}
