/**
 * 始発・終電検索API
 * GET /api/stops/first-last
 * 
 * 指定バス停の始発・終電情報を取得
 */

interface Env {
  GTFS_DATA: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const stop = url.searchParams.get('stop');

    if (!stop) {
      return new Response(
        JSON.stringify({ error: 'stopパラメータは必須です' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // KVから現在のバージョンを取得
    const currentVersion = await context.env.GTFS_DATA.get('current_version');
    if (!currentVersion) {
      return new Response(
        JSON.stringify({ error: 'GTFSデータが利用できません' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // データを取得
    const stops = await context.env.GTFS_DATA.get(`gtfs:v${currentVersion}:stops`, 'json');

    // stop_timesを全チャンク読み込み
    const stopTimesChunks: any[] = [];
    let chunkIndex = 0;
    while (chunkIndex < 10) {
      const chunk = await context.env.GTFS_DATA.get(`gtfs:v${currentVersion}:stop_times_${chunkIndex}`, 'json');
      if (!chunk || !Array.isArray(chunk)) break;
      stopTimesChunks.push(...chunk);
      chunkIndex++;
    }

    if (!Array.isArray(stops)) {
      return new Response(
        JSON.stringify({ error: 'データ形式が不正です' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // バス停を検索
    const matchedStops = stops.filter((s: any) => s.stop_name && s.stop_name.includes(stop));

    if (matchedStops.length === 0) {
      return new Response(
        JSON.stringify({ error: 'バス停が見つかりません' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 各バス停の始発・終電を検索
    const results = matchedStops.map((matchedStop: any) => {
      const stopTimes = stopTimesChunks
        .filter((st: any) => st.stop_id === matchedStop.stop_id)
        .map((st: any) => ({
          time: st.departure_time,
          tripId: st.trip_id
        }))
        .sort((a, b) => a.time.localeCompare(b.time));

      return {
        stopId: matchedStop.stop_id,
        stopName: matchedStop.stop_name,
        firstBus: stopTimes.length > 0 ? stopTimes[0].time : null,
        lastBus: stopTimes.length > 0 ? stopTimes[stopTimes.length - 1].time : null,
        totalDepartures: stopTimes.length
      };
    });

    return new Response(
      JSON.stringify({
        stops: results,
        count: results.length
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
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// CORS対応
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
