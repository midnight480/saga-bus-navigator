/**
 * 路線検索ツール
 * 
 * 出発地と目的地を指定してバス路線を検索するMCPツール
 * 既存のREST API (/api/routes/search) を内部で呼び出す
 */

/**
 * ツール定義
 */
export const searchRoutesTool = {
  name: 'search_routes',
  description: '出発地と目的地を指定してバス路線を検索します。乗車バス停と降車バス停を指定すると、該当する路線情報を返します。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      from_stop_id: {
        type: 'string',
        description: '乗車バス停の名前（例：「佐賀駅」「県庁前」）',
      },
      to_stop_id: {
        type: 'string',
        description: '降車バス停の名前（例：「市役所前」「佐賀大学」）',
      },
      time: {
        type: 'string',
        description: '検索時刻（HH:MM形式、省略時は現在時刻）',
      },
      limit: {
        type: 'number',
        description: '最大結果数（1〜10、デフォルト：5）',
        default: 5,
        minimum: 1,
        maximum: 10,
      },
    },
    required: ['from_stop_id', 'to_stop_id'],
  },
};

/**
 * 路線情報
 */
interface Route {
  tripId: string;
  routeName: string;
  headsign: string;
  departureTime: string;
  arrivalTime: string;
  fromStop: string;
  toStop: string;
}

/**
 * REST APIレスポンス
 */
interface SearchRoutesAPIResponse {
  routes: Route[];
  count: number;
  message?: string;
}

/**
 * ツール実行結果
 */
interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * 時刻形式のバリデーション（HH:MM）
 */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * パラメータバリデーション
 */
function validateParams(args: any): { valid: boolean; error?: string } {
  // argsの検証
  if (!args || typeof args !== 'object') {
    return { valid: false, error: 'パラメータはオブジェクトである必要があります' };
  }

  // from_stop_idの検証
  if (args.from_stop_id === undefined || args.from_stop_id === null) {
    return { valid: false, error: 'from_stop_idパラメータは必須です' };
  }

  if (typeof args.from_stop_id !== 'string') {
    return { valid: false, error: 'from_stop_idパラメータは文字列である必要があります' };
  }

  if (args.from_stop_id.trim() === '') {
    return { valid: false, error: 'from_stop_idパラメータは空文字列にできません' };
  }

  // to_stop_idの検証
  if (args.to_stop_id === undefined || args.to_stop_id === null) {
    return { valid: false, error: 'to_stop_idパラメータは必須です' };
  }

  if (typeof args.to_stop_id !== 'string') {
    return { valid: false, error: 'to_stop_idパラメータは文字列である必要があります' };
  }

  if (args.to_stop_id.trim() === '') {
    return { valid: false, error: 'to_stop_idパラメータは空文字列にできません' };
  }

  // timeの検証（オプション）
  if (args.time !== undefined) {
    if (typeof args.time !== 'string') {
      return { valid: false, error: 'timeパラメータは文字列である必要があります' };
    }

    if (!isValidTimeFormat(args.time)) {
      return { valid: false, error: 'timeパラメータはHH:MM形式で指定してください（例：09:30）' };
    }
  }

  // limitの検証（オプション）
  if (args.limit !== undefined) {
    if (typeof args.limit !== 'number') {
      return { valid: false, error: 'limitパラメータは数値である必要があります' };
    }

    if (!Number.isInteger(args.limit)) {
      return { valid: false, error: 'limitパラメータは整数である必要があります' };
    }

    if (args.limit < 1 || args.limit > 10) {
      return { valid: false, error: 'limitパラメータは1〜10の範囲で指定してください' };
    }
  }

  return { valid: true };
}

/**
 * 所要時間を計算（分単位）
 */
function calculateDuration(departureTime: string, arrivalTime: string): number {
  const [depHour, depMin] = departureTime.split(':').map(Number);
  const [arrHour, arrMin] = arrivalTime.split(':').map(Number);
  
  const depMinutes = depHour * 60 + depMin;
  const arrMinutes = arrHour * 60 + arrMin;
  
  return arrMinutes - depMinutes;
}

/**
 * 路線検索ツールの実行
 * 
 * @param args ツールパラメータ
 * @param baseUrl ベースURL（テスト用）
 * @returns ツール実行結果
 */
export async function executeSearchRoutes(
  args: any,
  baseUrl: string = ''
): Promise<ToolResult> {
  try {
    // パラメータバリデーション
    const validation = validateParams(args);
    if (!validation.valid) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: validation.error,
              routes: [],
              count: 0,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    // パラメータの取得
    const fromStopId = args.from_stop_id.trim();
    const toStopId = args.to_stop_id.trim();
    const time = args.time;
    const limit = args.limit ?? 5;

    // REST APIを呼び出し
    const params = new URLSearchParams({
      from: fromStopId,
      to: toStopId,
      limit: limit.toString(),
    });

    if (time) {
      params.append('time', time);
    }

    const apiUrl = `${baseUrl}/api/routes/search?${params.toString()}`;
    
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `REST API呼び出しエラー: ${response.status} ${response.statusText}`,
              details: errorData,
              routes: [],
              count: 0,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    // レスポンスをパース
    const data: SearchRoutesAPIResponse = await response.json();

    // 結果を整形（要件3.2に従って必須フィールドを含める）
    const result = {
      from_stop: fromStopId,
      to_stop: toStopId,
      search_time: time,
      routes: data.routes.map(route => ({
        route_id: route.tripId, // trip_idを route_id として使用
        route_name: route.routeName,
        headsign: route.headsign,
        departure_time: route.departureTime,
        arrival_time: route.arrivalTime,
        duration_minutes: calculateDuration(route.departureTime, route.arrivalTime),
        from_stop_name: route.fromStop,
        to_stop_name: route.toStop,
        // 運賃情報は現在のAPIでは提供されていないため、プレースホルダーを設定
        fare: {
          adult: 0,
          child: 0,
        },
      })),
      count: data.count,
      message: data.message,
    };

    // 成功レスポンス
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // 予期しないエラー
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: '路線検索中にエラーが発生しました',
            details: error instanceof Error ? error.message : 'Unknown error',
            routes: [],
            count: 0,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}
