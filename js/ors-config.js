/**
 * ORS設定ファイル
 *
 * 注意: ORS APIキーは本来サーバー側で秘匿することが推奨です。
 * 仕様（requirements/design）に合わせて、クライアント側でAuthorizationヘッダーに設定できる形で用意しています。
 *
 * このファイルは `index.html` から読み込まれ、`window.ORS_CONFIG` として参照されます。
 */

(function initializeOrsConfig() {
  const DEFAULTS = {
    // ORS Directions API Base URL
    baseUrl: 'https://api.openrouteservice.org/v2',
    // ルーティングプロファイル（例: driving-car, foot-walking）
    profile: 'driving-car',
    // キャッシュTTL（ミリ秒）
    cacheTtlMs: 24 * 60 * 60 * 1000,
    // レート制限
    rateLimitPerMinute: 40,
    rateLimitPerDay: 2000,
    // 1リクエストあたりの座標点数上限（要件9.5）
    maxCoordinatesPerRequest: 50,
    // 連続リクエストのデバウンス（ミリ秒）
    debounceMs: 300,
    // ズームアウト時に経路を隠す閾値（要件5.4）
    hideRouteBelowZoom: 12,
    // 分次レート制限到達時の最大待機（ミリ秒、0なら待機しない）
    maxWaitOnMinuteLimitMs: 4000,
    // ORS利用有効フラグ（apiKeyが未設定の場合は自動的にfalse扱い）
    enabled: true
  };

  // APIキーは `.dev.vars` / Pages環境変数を `runtime-env.js` 経由で注入する想定
  // eslint-disable-next-line no-unused-vars
  const apiKey =
    (typeof window !== 'undefined' && window.__RUNTIME_ENV__ && window.__RUNTIME_ENV__.ORS_API_KEY) || null;

  const config = {
    ...DEFAULTS,
    apiKey
  };

  // apiKeyが無い場合は無効化（フォールバック: 直線描画）
  if (!config.apiKey) {
    config.enabled = false;
  }

  window.ORS_CONFIG = config;
})();

