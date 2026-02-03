/**
 * バス停検索API
 * GET /api/stops/search
 * 
 * バス停名で曖昧検索し、次の発車時刻と路線情報を返す
 */

interface Env {
  GTFS_DATA: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    console.log('[API] Request received:', context.request.url);
    
    // クエリパラメータを取得
    const url = new URL(context.request.url);
    const query = url.searchParams.get('q');
    const limitParam = url.searchParams.get('limit');

    console.log('[API] Query params:', { query, limit: limitParam });

    // パラメータバリデーション
    if (!query || query.trim() === '') {
      console.log('[API] Bad request: query parameter missing');
      return new Response(
        JSON.stringify({ error: 'クエリパラメータ "q" は必須です' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return new Response(
        JSON.stringify({ error: 'limitは1〜50の範囲で指定してください' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // KVから現在のバージョンを取得
    const currentVersion = await context.env.GTFS_DATA.get('current_version');
    if (!currentVersion) {
      return new Response(
        JSON.stringify({ error: 'GTFSデータが利用できません' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // バス停データを取得
    const stops = await context.env.GTFS_DATA.get(`gtfs:v${currentVersion}:stops`, 'json');
    
    if (!Array.isArray(stops)) {
      return new Response(
        JSON.stringify({ error: 'バス停データが不正です' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // バス停を検索（部分一致）
    const matchedStops = stops
      .filter((stop: any) => stop.stop_name && stop.stop_name.includes(query.trim()))
      .slice(0, limit)
      .map((stop: any) => ({
        id: stop.stop_id,
        name: stop.stop_name,
        lat: parseFloat(stop.stop_lat),
        lon: parseFloat(stop.stop_lon)
      }));

    if (matchedStops.length === 0) {
      return new Response(
        JSON.stringify({
          stops: [],
          count: 0
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // レスポンスを返す
    return new Response(
      JSON.stringify({
        stops: matchedStops,
        count: matchedStops.length
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[API Error]', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};

// OPTIONSリクエストハンドラー（CORSプリフライト対応）
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
