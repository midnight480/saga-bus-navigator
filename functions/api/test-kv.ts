/**
 * KVテストAPI
 * GET /api/test-kv
 */

interface Env {
  GTFS_DATA: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.GTFS_DATA) {
      return new Response(
        JSON.stringify({ error: 'KV namespace not found' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // current_versionを取得
    const currentVersion = await context.env.GTFS_DATA.get('current_version');
    
    // stopsの最初の5件を取得
    const stops = await context.env.GTFS_DATA.get(`gtfs:v${currentVersion}:stops`, 'json');
    
    return new Response(
      JSON.stringify({
        kvAvailable: true,
        currentVersion,
        stopsCount: Array.isArray(stops) ? stops.length : 0,
        firstStops: Array.isArray(stops) ? stops.slice(0, 5) : []
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
