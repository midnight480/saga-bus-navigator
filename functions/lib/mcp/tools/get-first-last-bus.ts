/**
 * 始発・終バス検索ツール
 * 
 * 指定した路線の始発と終バスの時刻を取得するMCPツール
 * 既存のREST API (/api/routes/first-last) を内部で呼び出す
 */

/**
 * ツール定義
 */
export const getFirstLastBusTool = {
  name: 'get_first_last_bus',
  description: '指定した路線の始発と終バスの時刻を取得します。路線IDを指定すると、その路線の最初と最後の便の情報を返します。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      route_id: {
        type: 'string',
        description: '路線ID（例：「1」「2」「3」）',
      },
    },
    required: ['route_id'],
  },
};

/**
 * バス情報
 */
interface BusInfo {
  trip_id: string;
  trip_headsign: string;
  departure_time: string;
  arrival_time: string;
  departure_stop_id: string;
  arrival_stop_id: string;
}

/**
 * REST APIレスポンス
 */
interface GetFirstLastBusAPIResponse {
  route_id: string;
  route_name: string;
  first_bus: BusInfo;
  last_bus: BusInfo;
  total_trips: number;
}

/**
 * エラーレスポンス
 */
interface ErrorResponse {
  error: string;
  route_id?: string;
  details?: string;
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
 * パラメータバリデーション
 */
function validateParams(args: any): { valid: boolean; error?: string } {
  // argsの検証
  if (!args || typeof args !== 'object') {
    return { valid: false, error: 'パラメータはオブジェクトである必要があります' };
  }

  // route_idの検証
  if (args.route_id === undefined || args.route_id === null) {
    return { valid: false, error: 'route_idパラメータは必須です' };
  }

  if (typeof args.route_id !== 'string') {
    return { valid: false, error: 'route_idパラメータは文字列である必要があります' };
  }

  if (args.route_id.trim() === '') {
    return { valid: false, error: 'route_idパラメータは空文字列にできません' };
  }

  return { valid: true };
}

/**
 * 始発・終バス検索ツールの実行
 * 
 * @param args ツールパラメータ
 * @param baseUrl ベースURL（テスト用）
 * @returns ツール実行結果
 */
export async function executeGetFirstLastBus(
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
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    // パラメータの取得
    const routeId = args.route_id.trim();

    // REST APIを呼び出し
    const apiUrl = `${baseUrl}/api/routes/first-last?route_id=${encodeURIComponent(routeId)}`;
    
    const response = await fetch(apiUrl);

    // エラーレスポンスの処理
    if (!response.ok) {
      const errorData: ErrorResponse = await response.json().catch(() => ({ 
        error: 'Unknown error' 
      }));

      // 404エラー（路線が見つからない）の場合
      if (response.status === 404) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: errorData.error || '指定された路線が見つかりません',
                route_id: routeId,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      // その他のエラー
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `REST API呼び出しエラー: ${response.status} ${response.statusText}`,
              details: errorData,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    // レスポンスをパース
    const data: GetFirstLastBusAPIResponse = await response.json();

    // 結果を整形（要件4.2に従って必須フィールドを含める）
    const result = {
      route_id: data.route_id,
      route_name: data.route_name,
      first_bus: {
        trip_id: data.first_bus.trip_id,
        trip_headsign: data.first_bus.trip_headsign,
        departure_time: data.first_bus.departure_time,
        arrival_time: data.first_bus.arrival_time,
        departure_stop_id: data.first_bus.departure_stop_id,
        arrival_stop_id: data.first_bus.arrival_stop_id,
      },
      last_bus: {
        trip_id: data.last_bus.trip_id,
        trip_headsign: data.last_bus.trip_headsign,
        departure_time: data.last_bus.departure_time,
        arrival_time: data.last_bus.arrival_time,
        departure_stop_id: data.last_bus.departure_stop_id,
        arrival_stop_id: data.last_bus.arrival_stop_id,
      },
      total_trips: data.total_trips,
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
            error: '始発・終バス検索中にエラーが発生しました',
            details: error instanceof Error ? error.message : 'Unknown error',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}
