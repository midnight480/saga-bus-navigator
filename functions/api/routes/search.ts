/**
 * 経路検索API
 * GET /api/routes/search
 * 
 * 始点と終点を指定して経路を検索し、時刻表情報を返す
 */

import { DataLoaderAdapter } from '../../lib/data-loader-adapter';
import { SearchControllerAdapter } from '../../lib/search-controller-adapter';
import { TimeUtils } from '../../lib/time-utils';
import { BadRequestError, handleError } from '../../lib/api-errors';

interface Env {
  // Cloudflare環境変数（必要に応じて追加）
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // クエリパラメータを取得
    const url = new URL(context.request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const timeParam = url.searchParams.get('time');
    const typeParam = url.searchParams.get('type') || 'now';
    const weekdayParam = url.searchParams.get('weekday') || 'auto';
    const limitParam = url.searchParams.get('limit');

    // パラメータバリデーション
    if (!from || from.trim() === '') {
      throw new BadRequestError('クエリパラメータ "from" は必須です');
    }

    if (!to || to.trim() === '') {
      throw new BadRequestError('クエリパラメータ "to" は必須です');
    }

    if (from.trim() === to.trim()) {
      throw new BadRequestError('乗車バス停と降車バス停は異なる停留所を指定してください');
    }

    // typeパラメータのバリデーション
    const validTypes = ['departure-time', 'arrival-time', 'now', 'first-bus', 'last-bus'];
    if (!validTypes.includes(typeParam)) {
      throw new BadRequestError(`typeは ${validTypes.join(', ')} のいずれかを指定してください`);
    }

    // limitパラメータのバリデーション
    const limit = limitParam ? parseInt(limitParam, 10) : 5;
    if (isNaN(limit) || limit < 1 || limit > 20) {
      throw new BadRequestError('limitは1〜20の範囲で指定してください');
    }

    // DataLoaderを初期化
    const dataLoader = DataLoaderAdapter.getInstance();
    // ベースURLを設定（リクエストURLから取得）
    dataLoader.setBaseUrl(url.origin);
    await dataLoader.loadData();

    // 現在時刻を取得
    const currentTime = await TimeUtils.getCurrentTimeFromNTP();
    
    // 曜日区分を決定
    let weekdayType: string;
    if (weekdayParam === 'auto') {
      weekdayType = TimeUtils.getWeekdayType(currentTime);
    } else if (weekdayParam === '平日' || weekdayParam === '土日祝') {
      weekdayType = weekdayParam;
    } else {
      throw new BadRequestError('weekdayは "平日", "土日祝", "auto" のいずれかを指定してください');
    }

    // 検索時刻を決定
    let searchHour: number;
    let searchMinute: number;

    if (typeParam === 'departure-time' || typeParam === 'arrival-time') {
      if (!timeParam) {
        throw new BadRequestError(`type が "${typeParam}" の場合、timeパラメータは必須です`);
      }

      try {
        const parsedTime = TimeUtils.parseTime(timeParam);
        searchHour = parsedTime.hour;
        searchMinute = parsedTime.minute;
      } catch (error) {
        throw new BadRequestError(`timeパラメータの形式が不正です: ${timeParam}`);
      }
    } else if (typeParam === 'now') {
      searchHour = currentTime.getHours();
      searchMinute = currentTime.getMinutes();
    } else {
      // first-bus, last-busの場合は時刻指定不要
      searchHour = 0;
      searchMinute = 0;
    }

    // SearchControllerを使用して検索
    const searchController = new SearchControllerAdapter(dataLoader);
    const results = searchController.searchDirectTrips(
      from.trim(),
      to.trim(),
      {
        type: typeParam as any,
        hour: searchHour,
        minute: searchMinute
      },
      weekdayType
    );

    // 結果を最大limit件に制限
    const limitedResults = results.slice(0, limit);

    // レスポンスを返す
    return new Response(
      JSON.stringify({
        routes: limitedResults,
        count: limitedResults.length,
        searchCriteria: {
          from: from.trim(),
          to: to.trim(),
          time: timeParam || TimeUtils.formatTime(searchHour, searchMinute),
          type: typeParam,
          weekday: weekdayType
        }
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
