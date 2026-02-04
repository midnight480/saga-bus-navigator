/**
 * バス停検索ツール
 * 
 * 佐賀市内のバス停を名前で検索するMCPツール
 * 既存のREST API (/api/stops/search) を内部で呼び出す
 */

/**
 * ツール定義
 */
export const searchBusStopsTool = {
  name: 'search_bus_stops',
  description: '佐賀市内のバス停を名前で検索します。バス停名の一部を指定すると、部分一致するバス停のリストを返します。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'バス停名の一部（例：「佐賀駅」「県庁」「市役所」）',
      },
      limit: {
        type: 'number',
        description: '最大結果数（1〜10、デフォルト：10）',
        default: 10,
        minimum: 1,
        maximum: 10,
      },
    },
    required: ['query'],
  },
};

/**
 * バス停情報
 */
interface BusStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

/**
 * REST APIレスポンス
 */
interface SearchBusStopsAPIResponse {
  stops: BusStop[];
  count: number;
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
  // queryの検証
  if (!args || typeof args !== 'object') {
    return { valid: false, error: 'パラメータはオブジェクトである必要があります' };
  }

  if (args.query === undefined || args.query === null) {
    return { valid: false, error: 'queryパラメータは必須です' };
  }

  if (typeof args.query !== 'string') {
    return { valid: false, error: 'queryパラメータは必須で、文字列である必要があります' };
  }

  if (args.query.trim() === '') {
    return { valid: false, error: 'queryパラメータは空文字列にできません' };
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
 * バス停検索ツールの実行
 * 
 * @param args ツールパラメータ
 * @param baseUrl ベースURL（テスト用）
 * @returns ツール実行結果
 */
export async function executeSearchBusStops(
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
              stops: [],
              count: 0,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    // パラメータの取得
    const query = args.query.trim();
    const limit = args.limit ?? 10;

    // REST APIを呼び出し
    const apiUrl = `${baseUrl}/api/stops/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    
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
              stops: [],
              count: 0,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    // レスポンスをパース
    const data: SearchBusStopsAPIResponse = await response.json();

    // 結果を整形
    const result = {
      query,
      stops: data.stops.map(stop => ({
        id: stop.id,
        name: stop.name,
        lat: stop.lat,
        lng: stop.lon, // MCPツールではlngを使用（REST APIはlon）
      })),
      count: data.count,
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
            error: 'バス停検索中にエラーが発生しました',
            details: error instanceof Error ? error.message : 'Unknown error',
            stops: [],
            count: 0,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}
