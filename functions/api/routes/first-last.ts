/**
 * 路線の始発・終バス検索API
 * GET /api/routes/first-last
 * 
 * 指定路線の始発・終バス情報を取得
 */

interface Env {
  GTFS_DATA: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const routeId = url.searchParams.get('route_id');

    if (!routeId) {
      return new Response(
        JSON.stringify({ error: 'route_idパラメータは必須です' }),
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
    const routes = await context.env.GTFS_DATA.get(`gtfs:v${currentVersion}:routes`, 'json');
    const trips = await context.env.GTFS_DATA.get(`gtfs:v${currentVersion}:trips`, 'json');

    if (!Array.isArray(routes) || !Array.isArray(trips)) {
      return new Response(
        JSON.stringify({ error: 'データ形式が不正です' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 路線を検索
    const route = routes.find((r: any) => r.route_id === routeId);

    if (!route) {
      return new Response(
        JSON.stringify({ 
          error: '指定された路線が見つかりません',
          route_id: routeId 
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 該当路線のトリップを取得
    const routeTrips = trips.filter((t: any) => t.route_id === routeId);

    if (routeTrips.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: '指定された路線にトリップが見つかりません',
          route_id: routeId 
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // stop_timesを全チャンク読み込み
    const stopTimesChunks: any[] = [];
    let chunkIndex = 0;
    while (chunkIndex < 10) {
      const chunk = await context.env.GTFS_DATA.get(`gtfs:v${currentVersion}:stop_times_${chunkIndex}`, 'json');
      if (!chunk || !Array.isArray(chunk)) break;
      stopTimesChunks.push(...chunk);
      chunkIndex++;
    }

    // 各トリップの始発・終バス時刻を取得
    const tripTimes = routeTrips.map((trip: any) => {
      const tripStopTimes = stopTimesChunks
        .filter((st: any) => st.trip_id === trip.trip_id)
        .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));

      if (tripStopTimes.length === 0) {
        return null;
      }

      const firstStop = tripStopTimes[0];
      const lastStop = tripStopTimes[tripStopTimes.length - 1];

      return {
        trip_id: trip.trip_id,
        trip_headsign: trip.trip_headsign || '',
        departure_time: firstStop.departure_time,
        arrival_time: lastStop.arrival_time,
        departure_stop_id: firstStop.stop_id,
        arrival_stop_id: lastStop.stop_id,
      };
    }).filter((t: any) => t !== null);

    if (tripTimes.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: '指定された路線に時刻データが見つかりません',
          route_id: routeId 
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 始発と終バスを特定（出発時刻でソート）
    tripTimes.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
    const firstBus = tripTimes[0];
    const lastBus = tripTimes[tripTimes.length - 1];

    return new Response(
      JSON.stringify({
        route_id: routeId,
        route_name: route.route_long_name || route.route_short_name || '',
        first_bus: {
          trip_id: firstBus.trip_id,
          trip_headsign: firstBus.trip_headsign,
          departure_time: firstBus.departure_time,
          arrival_time: firstBus.arrival_time,
          departure_stop_id: firstBus.departure_stop_id,
          arrival_stop_id: firstBus.arrival_stop_id,
        },
        last_bus: {
          trip_id: lastBus.trip_id,
          trip_headsign: lastBus.trip_headsign,
          departure_time: lastBus.departure_time,
          arrival_time: lastBus.arrival_time,
          departure_stop_id: lastBus.departure_stop_id,
          arrival_stop_id: lastBus.arrival_stop_id,
        },
        total_trips: tripTimes.length,
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
      JSON.stringify({ 
        error: '始発・終バス検索中にエラーが発生しました',
        details: (error as Error).message 
      }),
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
