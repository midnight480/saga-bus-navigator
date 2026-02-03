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

    // バス停を曖昧検索
    const matchedStops = dataLoader.searchBusStops(query.trim());

    if (matchedStops.length === 0) {
      // 検索結果が0件の場合は空の配列を返す
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

    // 現在時刻を取得
    const currentTime = await TimeUtils.getCurrentTimeFromNTP();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const weekdayType = TimeUtils.getWeekdayType(currentTime);

    // 時刻表データを取得
    const timetable = dataLoader.getTimetable();

    // バス停をグループ化
    const groups = dataLoader.groupBusStops(matchedStops);
    const results: any[] = [];

    // グループ化されたバス停を処理
    groups.forEach((platformStops, parentName) => {
      // 親バス停名が検索クエリに完全一致または部分一致する場合のみグループとして返す
      if (parentName.toLowerCase().includes(query.trim().toLowerCase())) {
        // 全てののりばの次の発車時刻を統合
        const allDepartures: any[] = [];
        
        platformStops.forEach(stop => {
          const departures = timetable
            .filter(entry => 
              entry.stopName === stop.name &&
              entry.weekdayType === weekdayType &&
              (entry.hour > currentHour || 
               (entry.hour === currentHour && entry.minute >= currentMinute))
            )
            .map(entry => ({
              routeNumber: entry.routeNumber,
              routeName: entry.routeName,
              destination: entry.tripHeadsign,
              departureTime: TimeUtils.formatTime(entry.hour, entry.minute),
              operator: entry.operator,
              hour: entry.hour,
              minute: entry.minute,
              platform: stop.name
            }));
          
          allDepartures.push(...departures);
        });

        // 時刻順にソート
        allDepartures.sort((a, b) => {
          if (a.hour !== b.hour) return a.hour - b.hour;
          return a.minute - b.minute;
        });

        // hour, minuteプロパティを削除（内部使用のみ）
        const cleanedDepartures = allDepartures.slice(0, 10).map(({ hour, minute, ...rest }) => rest);

        // グループ化されたバス停を追加
        results.push({
          id: `group:${parentName}`,
          name: `${parentName}（全のりば）`,
          type: 'group',
          platforms: platformStops.map(stop => ({
            id: stop.id,
            name: stop.name,
            lat: stop.lat,
            lon: stop.lon
          })),
          nextDepartures: cleanedDepartures
        });
      }
    });

    // グループ化されなかったバス停を個別に追加
    const ungroupedStops = matchedStops.filter(stop => {
      const parentName = dataLoader['extractParentStopName'](stop.name);
      return !parentName || !parentName.toLowerCase().includes(query.trim().toLowerCase());
    });

    ungroupedStops.forEach(stop => {
      const departures = timetable
        .filter(entry => 
          entry.stopName === stop.name &&
          entry.weekdayType === weekdayType &&
          (entry.hour > currentHour || 
           (entry.hour === currentHour && entry.minute >= currentMinute))
        )
        .sort((a, b) => {
          if (a.hour !== b.hour) return a.hour - b.hour;
          return a.minute - b.minute;
        })
        .slice(0, 3)
        .map(entry => ({
          routeNumber: entry.routeNumber,
          routeName: entry.routeName,
          destination: entry.tripHeadsign,
          departureTime: TimeUtils.formatTime(entry.hour, entry.minute),
          operator: entry.operator
        }));

      results.push({
        id: stop.id,
        name: stop.name,
        lat: stop.lat,
        lon: stop.lon,
        nextDepartures: departures
      });
    });

    // 結果を制限
    const limitedResults = results.slice(0, limit);

    // レスポンスを返す
    return new Response(
      JSON.stringify({
        stops: limitedResults,
        count: limitedResults.length
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
    return handleError(error as Error);
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
