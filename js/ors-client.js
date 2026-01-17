/**
 * ORSClient - OpenRouteService Directions API クライアント
 *
 * 責務:
 * - API設定管理（APIキー、ベースURL、プロファイル）
 * - 座標変換（[lat, lon] → [lon, lat]）
 * - 座標検証
 * - HTTPリクエスト送信（再試行/指数バックオフ）
 * - GeoJSONレスポンスの検証/パース
 * - レート制限（分次・日次）
 */

class ORSClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openrouteservice.org/v2';
    this.profile = config.profile || 'driving-car';

    // 送信座標数上限（要件9.5）
    this.maxCoordinatesPerRequest =
      config.maxCoordinatesPerRequest !== undefined ? config.maxCoordinatesPerRequest : 50;

    // レート制限
    const RateLimiterClass = config.RateLimiter || (typeof RateLimiter !== 'undefined' ? RateLimiter : null);
    if (!RateLimiterClass) {
      throw new Error('RateLimiterが利用できません（/js/rate-limiter.js の読み込みを確認してください）');
    }
    this.minuteLimiter = config.minuteLimiter || new RateLimiterClass(40, 60_000);
    this.dailyLimiter = config.dailyLimiter || new RateLimiterClass(2000, 86_400_000);

    // 分次制限到達時の最大待機
    this.maxWaitOnMinuteLimitMs =
      config.maxWaitOnMinuteLimitMs !== undefined ? config.maxWaitOnMinuteLimitMs : 4000;

    // 診断用
    this.requestCount = 0;
  }

  /**
   * 座標を [lat, lon] 形式から [lon, lat] に変換
   * stopは {lat, lon} または {lat, lng} を許容する
   *
   * @param {Array<{lat:number, lon?:number, lng?:number}>} stops
   * @returns {Array<[number, number]>}
   */
  convertCoordinates(stops) {
    return (stops || []).map((s) => {
      const lon = typeof s.lon === 'number' ? s.lon : s.lng;
      return [lon, s.lat];
    });
  }

  /**
   * 座標の妥当性を検証（要件7.3, 7.4）
   *
   * @param {Array<{lat:number, lon?:number, lng?:number}>} stops
   * @returns {boolean}
   */
  validateCoordinates(stops) {
    return (stops || []).every((s) => {
      const lon = typeof s.lon === 'number' ? s.lon : s.lng;
      return (
        typeof s.lat === 'number' &&
        typeof lon === 'number' &&
        !Number.isNaN(s.lat) &&
        !Number.isNaN(lon) &&
        s.lat >= -90 &&
        s.lat <= 90 &&
        lon >= -180 &&
        lon <= 180
      );
    });
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchWithRetry(url, options, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fetch(url, options);
      } catch (error) {
        lastError = error;
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await this.sleep(delay);
      }
    }
    throw lastError;
  }

  async waitForRateLimitSlot() {
    // 日次は待機しない（実質不可）
    if (!this.dailyLimiter.canMakeRequest()) {
      const err = new Error('日次レート制限に達しました');
      err.code = 'RATE_LIMIT_DAILY';
      throw err;
    }

    if (this.minuteLimiter.canMakeRequest()) return;

    const waitMs = this.minuteLimiter.getWaitTime();
    if (waitMs <= 0) return;

    if (this.maxWaitOnMinuteLimitMs <= 0 || waitMs > this.maxWaitOnMinuteLimitMs) {
      const err = new Error('分次レート制限に達しました');
      err.code = 'RATE_LIMIT_MINUTE';
      err.waitMs = waitMs;
      throw err;
    }

    await this.sleep(waitMs);
  }

  validateGeoJSONResponse(data) {
    if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length === 0) {
      return false;
    }
    const feature = data.features[0];
    if (!feature || !feature.geometry || !feature.geometry.type || !Array.isArray(feature.geometry.coordinates)) {
      return false;
    }
    return true;
  }

  buildUrl() {
    const base = this.baseUrl.replace(/\/$/, '');
    return `${base}/directions/${encodeURIComponent(this.profile)}/geojson`;
  }

  /**
   * 座標配列から経路を取得（GeoJSON）
   *
   * @param {Array<{lat:number, lon?:number, lng?:number}>} stops
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  async getRoute(stops) {
    if (!this.apiKey) {
      const err = new Error('ORS APIキーが設定されていません');
      err.code = 'NO_API_KEY';
      throw err;
    }

    if (!Array.isArray(stops) || stops.length < 2) {
      const err = new Error('経路取得には2点以上の座標が必要です');
      err.code = 'INVALID_COORDINATES';
      throw err;
    }

    // 座標検証（要件6.4, 7.3, 7.4, 7.5）
    if (!this.validateCoordinates(stops)) {
      const err = new Error('無効な座標が含まれています');
      err.code = 'INVALID_COORDINATES';
      throw err;
    }

    // 座標数制限（要件9.5）
    if (stops.length > this.maxCoordinatesPerRequest) {
      const err = new Error(`座標数が上限を超えています（max=${this.maxCoordinatesPerRequest}）`);
      err.code = 'TOO_MANY_COORDINATES';
      err.max = this.maxCoordinatesPerRequest;
      err.count = stops.length;
      throw err;
    }

    await this.waitForRateLimitSlot();

    const url = this.buildUrl();
    const coordinates = this.convertCoordinates(stops);

    const body = {
      coordinates
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: this.apiKey, // 要件1.1
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    // 送信成功時点でカウント（要件3.5）
    this.minuteLimiter.recordRequest();
    this.dailyLimiter.recordRequest();
    this.requestCount++;

    if (!response.ok) {
      const err = new Error(`ORS APIエラー: ${response.status}`);
      err.status = response.status;
      err.code = response.status === 429 ? 'RATE_LIMIT' : 'API_ERROR';
      throw err;
    }

    const data = await response.json();
    if (!this.validateGeoJSONResponse(data)) {
      const err = new Error('ORSレスポンスのGeoJSON形式が不正です');
      err.code = 'INVALID_GEOJSON';
      throw err;
    }

    return data;
  }
}

// Node.js環境でのエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ORSClient;
}

// ブラウザ環境での公開
if (typeof window !== 'undefined') {
  window.ORSClient = ORSClient;
}

