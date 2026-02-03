/**
 * バス停検索ツール
 * 
 * 佐賀市内のバス停を名前で検索し、次の発車時刻と路線情報を取得します
 */

import { apiClient } from '../api-client.js';

/**
 * バス停検索のリクエストパラメータ
 */
export interface SearchBusStopsArgs {
  /** 検索するバス停名（部分一致） */
  q: string;
  /** 取得する結果の最大数（デフォルト: 10） */
  limit?: number;
}

/**
 * バス停情報
 */
export interface BusStop {
  /** バス停ID */
  stop_id: string;
  /** バス停名 */
  stop_name: string;
  /** 緯度 */
  stop_lat: number;
  /** 経度 */
  stop_lon: number;
  /** 次の発車情報（存在する場合） */
  next_departure?: {
    /** 路線名 */
    route_name: string;
    /** 発車時刻 */
    departure_time: string;
    /** 行先 */
    destination: string;
  };
}

/**
 * バス停検索のレスポンス
 */
export interface SearchBusStopsResponse {
  /** バス停のリスト */
  stops: BusStop[];
  /** 検索結果の件数 */
  count: number;
}

/**
 * MCPツールスキーマ定義
 * 
 * Requirements: 1.1, 5.2
 */
export const searchBusStopsSchema = {
  name: "search_bus_stops",
  description: "佐賀市内のバス停を名前で検索し、次の発車時刻と路線情報を取得します",
  inputSchema: {
    type: "object",
    properties: {
      q: {
        type: "string",
        description: "検索するバス停名（部分一致）"
      },
      limit: {
        type: "number",
        description: "取得する結果の最大数（デフォルト: 10）",
        default: 10
      }
    },
    required: ["q"]
  }
} as const;

/**
 * バス停検索を実行
 * 
 * @param args - 検索パラメータ
 * @returns MCP形式のレスポンス
 * @throws API呼び出しに失敗した場合にエラーをスロー
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export async function searchBusStops(args: SearchBusStopsArgs) {
  try {
    const response = await apiClient.get<SearchBusStopsResponse>(
      '/stops/search',
      {
        q: args.q,
        limit: args.limit || 10
      }
    );

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(response, null, 2)
      }]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`バス停検索に失敗しました: ${errorMessage}`);
  }
}
