/**
 * 始発・終電検索API
 * GET /api/stops/first-last
 * 
 * 指定バス停の始発・終電情報を取得
 */

import { DataLoaderAdapter } from '../../lib/data-loader-adapter';
import { SearchControllerAdapter } from '../../lib/search-controller-adapter';
import { TimeUtils } from '../../lib/time-utils';
import { BadRequestError, NotFoundError, handleError } from '../../lib/api-errors';

interface Env {
  // Cloudflare環境変数（必要に応じて追加）
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // クエリパラメータを取得
    const url = new URL(context.request.url);
    const stop = url.searchParams.get('stop');
    const to = url.searchParams.get('to');
    const weekdayParam = url.searchParams.get('weekday') || 'auto';

    // パラメータバリデーション
    if (!stop || stop.trim() === '') {
      throw new BadRequestError('クエリパラメータ "stop" は必須です');
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

    // SearchControllerを使用して始発・終電を検索
    const searchController = new SearchControllerAdapter(dataLoader);
    
    const firstBus = searchController.searchFirstBus(
      stop.trim(),
      to?.trim(),
      weekdayType
    );

    const lastBus = searchController.searchLastBus(
      stop.trim(),
      to?.trim(),
      weekdayType
    );

    // 始発・終電が見つからない場合
    if (!firstBus && !lastBus) {
      throw new NotFoundError(`バス停 "${stop}" の始発・終電情報が見つかりません`);
    }

    // レスポンスを返す
    return new Response(
      JSON.stringify({
        stop: stop.trim(),
        to: to?.trim() || null,
        weekdayType: weekdayType,
        firstBus: firstBus ? {
          tripId: firstBus.tripId,
          routeNumber: firstBus.routeNumber,
          routeName: firstBus.routeName,
          operator: firstBus.operator,
          departureTime: firstBus.departureTime,
          destination: firstBus.tripHeadsign,
          arrivalTime: firstBus.arrivalTime,
          duration: firstBus.duration,
          adultFare: firstBus.adultFare,
          childFare: firstBus.childFare
        } : null,
        lastBus: lastBus ? {
          tripId: lastBus.tripId,
          routeNumber: lastBus.routeNumber,
          routeName: lastBus.routeName,
          operator: lastBus.operator,
          departureTime: lastBus.departureTime,
          destination: lastBus.tripHeadsign,
          arrivalTime: lastBus.arrivalTime,
          duration: lastBus.duration,
          adultFare: lastBus.adultFare,
          childFare: lastBus.childFare
        } : null
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
