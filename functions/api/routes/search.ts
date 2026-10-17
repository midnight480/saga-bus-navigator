/**
 * 経路検索API（簡易版）
 * GET /api/routes/search
 * 
 * 始点と終点を指定して経路を検索し、時刻表情報を返す
 */

interface Env {
  GTFS_DATA: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const type = url.searchParams.get('type') || 'now';
    const limitParam = url.searchParams.get('limit');

    // パラメータバリデーション
    if (!from || !to) {
      return new Response(
        JSON.stringify({ error: 'fromとtoパラメータは必須です' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 5;

    // KVから現在のバージョンを取得
    const currentVersion = await context.env.GTFS_DATA.get('current_version');
    if (!currentVersion) {
      return new Response(
        JSON.stringify({ error: 'GTFSデータが利用できません' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // データを取得
    const [stops, routes, trips] = await Promise.all([
      context.env.GTFS_DATA.get(`gtfs:v${currentVersion}:stops`, 'json'),
      context.env.GTFS_DATA.get(`gtfs:v${currentVersion}:routes`, 'json'),
      context.env.GTFS_DATA.get(`gtfs:v${currentVersion}:trips`, 'json'),
    ]);

    // stop_times_by_tripを全チャンク読み込み（インデックス化されたデータ）
    const stopTimesByTrip: Record<string, any[]> = {};
    let chunkIndex = 0;
    while (chunkIndex < 10) {
      const chunk = await context.env.GTFS_DATA.get(`gtfs:v${currentVersion}:stop_times_by_trip_${chunkIndex}`, 'json');
      if (!chunk) break;
      Object.assign(stopTimesByTrip, chunk);
      chunkIndex++;
    }

    if (!Array.isArray(stops) || !Array.isArray(routes) || !Array.isArray(trips) || Object.keys(stopTimesByTrip).length === 0) {
      return new Response(
        JSON.stringify({ error: 'データ形式が不正です' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // バス停を検索
    const fromStops = stops.filter((s: any) => s.stop_name && s.stop_name.includes(from));
    const toStops = stops.filter((s: any) => s.stop_name && s.stop_name.includes(to));

    if (fromStops.length === 0 || toStops.length === 0) {
      return new Response(
        JSON.stringify({ 
          routes: [],
          count: 0,
          message: 'バス停が見つかりません'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 経路を検索
    const foundRoutes: any[] = [];
    const fromStopIds = fromStops.map((s: any) => s.stop_id);
    const toStopIds = toStops.map((s: any) => s.stop_id);

    // 各tripで始点と終点を通るものを探す
    for (const trip of trips) {
      // stopTimesByTripインデックスから該当tripのstop_timesを直接取得
      const tripStopTimes = stopTimesByTrip[trip.trip_id];
      
      if (!tripStopTimes || !Array.isArray(tripStopTimes)) {
        continue;
      }

      // 始点と終点のインデックスを探す
      const fromIndex = tripStopTimes.findIndex((st: any) => fromStopIds.includes(st.stop_id));
      const toIndex = tripStopTimes.findIndex((st: any) => toStopIds.includes(st.stop_id));

      // 始点→終点の順で存在するか確認
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
        const fromStopTime = tripStopTimes[fromIndex];
        const toStopTime = tripStopTimes[toIndex];
        
        const route = routes.find((r: any) => r.route_id === trip.route_id);
        
        foundRoutes.push({
          tripId: trip.trip_id,
          routeName: route?.route_long_name || route?.route_short_name || '不明',
          headsign: trip.trip_headsign || '',
          departureTime: fromStopTime.departure_time,
          arrivalTime: toStopTime.arrival_time,
          fromStop: fromStops.find((s: any) => s.stop_id === fromStopTime.stop_id)?.stop_name,
          toStop: toStops.find((s: any) => s.stop_id === toStopTime.stop_id)?.stop_name,
        });

        if (foundRoutes.length >= limit) break;
      }
    }

    return new Response(
      JSON.stringify({
        routes: foundRoutes,
        count: foundRoutes.length
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
      JSON.stringify({ error: 'Internal server error' }),
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
