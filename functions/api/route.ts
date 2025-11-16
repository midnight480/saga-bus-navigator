/**
 * Cloudflare Functions: route.pbプロキシ
 * 
 * 佐賀バスオープンデータのroute.pb（ルート最新情報/TripUpdates）を
 * CORSヘッダー付きでプロキシし、30秒間エッジキャッシュする
 */

interface Env {
  // Cloudflare環境変数（必要に応じて追加）
}

/**
 * OPTIONSリクエストハンドラー（CORSプリフライト対応）
 */
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://saga-bus.midnight480.com",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin",
    },
  });
};

/**
 * GETリクエストハンドラー（route.pbの取得とキャッシュ）
 */
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const upstreamUrl = "http://opendata.sagabus.info/route.pb";
  const cache = caches.default;
  
  // キャッシュキーとしてリクエストを作成
  const cacheKey = new Request(upstreamUrl, {
    headers: { "Cache-Control": "no-cache" }
  });

  try {
    // キャッシュを確認
    let response = await cache.match(cacheKey);
    
    if (!response) {
      // キャッシュミス: アップストリームから取得
      const upstreamResponse = await fetch(upstreamUrl);
      
      if (!upstreamResponse.ok) {
        // アップストリームエラー
        return new Response(
          `Upstream error: ${upstreamResponse.status} ${upstreamResponse.statusText}`,
          { 
            status: 502,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Access-Control-Allow-Origin": "https://saga-bus.midnight480.com",
              "Vary": "Origin",
            }
          }
        );
      }

      // レスポンスを作成（CORSヘッダーとキャッシュ設定を追加）
      response = new Response(upstreamResponse.body, {
        status: 200,
        headers: {
          "Content-Type": "application/x-protobuf",
          "Cache-Control": "public, max-age=30, s-maxage=30",
          "Access-Control-Allow-Origin": "https://saga-bus.midnight480.com",
          "Vary": "Origin",
        },
      });

      // エッジキャッシュに保存（非同期）
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  } catch (error) {
    // ネットワークエラーなど
    console.error("Error fetching route.pb:", error);
    return new Response(
      `Proxy error: ${error instanceof Error ? error.message : "Unknown error"}`,
      {
        status: 502,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Access-Control-Allow-Origin": "https://saga-bus.midnight480.com",
          "Vary": "Origin",
        }
      }
    );
  }
};
