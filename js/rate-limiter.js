/**
 * RateLimiter - APIレート制限を管理するクラス
 * 
 * ORS APIの無料プランの制限を遵守するため、リクエスト数を追跡し、
 * レート制限を超えないように制御します。
 * 
 * 制限:
 * - 40リクエスト/分
 * - 2000リクエスト/日
 * 
 * @class RateLimiter
 */
class RateLimiter {
  /**
   * RateLimiterのコンストラクタ
   * 
   * @param {number} maxRequests - 時間枠内の最大リクエスト数
   * @param {number} timeWindow - 時間枠（ミリ秒）
   * 
   * @example
   * // 40リクエスト/分の制限
   * const limiter = new RateLimiter(40, 60000);
   * 
   * @example
   * // 2000リクエスト/日の制限
   * const dailyLimiter = new RateLimiter(2000, 86400000);
   */
  constructor(maxRequests, timeWindow) {
    this.maxRequests = maxRequests; // 最大リクエスト数
    this.timeWindow = timeWindow; // 時間枠（ミリ秒）
    this.requests = []; // タイムスタンプの配列
  }

  /**
   * リクエストが許可されるか確認
   * 
   * 古いリクエスト記録をクリーンアップした後、
   * 現在のリクエスト数が最大値未満かどうかを判定します。
   * 
   * @returns {boolean} リクエストが許可される場合はtrue
   * 
   * @example
   * if (limiter.canMakeRequest()) {
   *   // リクエストを実行
   *   limiter.recordRequest();
   * } else {
   *   // 待機が必要
   *   const waitTime = limiter.getWaitTime();
   *   console.log(`${waitTime}ms待機してください`);
   * }
   */
  canMakeRequest() {
    this.cleanOldRequests();
    return this.requests.length < this.maxRequests;
  }

  /**
   * リクエストを記録
   * 
   * 現在のタイムスタンプをリクエスト履歴に追加します。
   * この関数は、実際にAPIリクエストを行った後に呼び出す必要があります。
   * 
   * @example
   * if (limiter.canMakeRequest()) {
   *   await fetch(apiUrl);
   *   limiter.recordRequest();
   * }
   */
  recordRequest() {
    this.requests.push(Date.now());
  }

  /**
   * 古いリクエスト記録を削除
   * 
   * 時間枠外（timeWindow以前）のリクエスト記録を削除します。
   * これにより、現在の時間枠内のリクエスト数のみを追跡できます。
   * 
   * @private
   */
  cleanOldRequests() {
    const now = Date.now();
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.timeWindow
    );
  }

  /**
   * 次のリクエストまでの待機時間を取得
   * 
   * レート制限に達している場合、最も古いリクエストが
   * 時間枠外になるまでの待機時間を計算します。
   * 
   * @returns {number} 待機時間（ミリ秒）。リクエスト可能な場合は0
   * 
   * @example
   * const waitTime = limiter.getWaitTime();
   * if (waitTime > 0) {
   *   await new Promise(resolve => setTimeout(resolve, waitTime));
   * }
   * // リクエストを実行
   */
  getWaitTime() {
    if (this.canMakeRequest()) return 0;
    
    this.cleanOldRequests();
    if (this.requests.length === 0) return 0;
    
    const oldestRequest = this.requests[0];
    return this.timeWindow - (Date.now() - oldestRequest);
  }

  /**
   * 現在のリクエスト数を取得
   * 
   * 時間枠内のリクエスト数を返します。
   * デバッグやモニタリングに使用できます。
   * 
   * @returns {number} 現在のリクエスト数
   * 
   * @example
   * console.log(`現在のリクエスト数: ${limiter.getCurrentRequestCount()}/${limiter.maxRequests}`);
   */
  getCurrentRequestCount() {
    this.cleanOldRequests();
    return this.requests.length;
  }

  /**
   * リクエスト履歴をリセット
   * 
   * 全てのリクエスト記録をクリアします。
   * テストやデバッグ時に使用できます。
   * 
   * @example
   * limiter.reset();
   */
  reset() {
    this.requests = [];
  }
}

// Node.js環境でのエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RateLimiter;
}
