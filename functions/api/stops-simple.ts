/**
 * バス停検索API（簡易版）
 * GET /api/stops-simple
 */

interface Env {
  GTFS_DATA: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const query = url.searchParams.get('q');

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter "q" is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // KVから現在のバージョンを取得
    const currentVersion = await context.env.GTFS_DATA.get('current_version');
    if (!currentVersion) {
      return new Response(
        JSON.stringify({ error: 'No GTFS data available' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // バス停データを取得
    const stops = await context.env.GTFS_DATA.get(`gtfs:v${currentVersion}:stops`, 'json');
    
    if (!Array.isArray(stops)) {
      return new Response(
        JSON.stringify({ error: 'Invalid stops data' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 簡易検索（部分一致）
    const matchedStops = stops.filter((stop: any) => 
      stop.stop_name && stop.stop_name.includes(query)
    ).slice(0, 10);

    return new Response(
      JSON.stringify({
        query,
        count: matchedStops.length,
        stops: matchedStops
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
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
