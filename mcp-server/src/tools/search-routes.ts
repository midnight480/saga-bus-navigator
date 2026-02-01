/**
 * 経路検索ツール
 * 
 * 始点と終点を指定して直通バス便を検索します
 */

import { apiClient } from '../api-client.js';

/**
 * 経路検索のリクエストパラメータ
 */
export interface SearchRoutesArgs {
  /** 出発地のバス停名 */
  from: string;
  /** 目的地のバス停名 */
  to: string;
  /** 検索基準時刻（HH:MM形式、省略時は現在時刻） */
  time?: string;
  /** 検索タイプ（departure: 出発時刻、arrival: 到着時刻） */
  type?: 'departure' | 'arrival';
  /** 曜日区分（weekday: 平日、saturday: 土曜、holiday: 日曜祝日） */
  weekday?: 'weekday' | 'saturday' | 'holiday';
  /** 取得する結果の最大数（デフォルト: 10） */
  limit?: number;
}

/**
 * 経路情報
 */
export interface Route {
  /** 路線ID */
  route_id: string;
  /** 路線名 */
  route_name: string;
  /** 出発バス停 */
  departure_stop: string;
  /** 到着バス停 */
  arrival_stop: string;
  /** 出発時刻 */
  departure_time: string;
  /** 到着時刻 */
  arrival_time: string;
  /** 所要時間（分） */
  travel_time: number;
  /** 運賃（円） */
  fare: number;
  /** 事業者名 */
  operator: string;
}

/**
 * 経路検索のレスポンス
 */
export interface SearchRoutesResponse {
  /** 経路のリスト */
  routes: Route[];
  /** 検索結果の件数 */
  count: number;
}

/**
 * MCPツールスキーマ定義
 * 
 * Requirements: 2.1, 5.2
 */
export const searchRoutesSchema = {
  name: "search_routes",
  description: "始点と終点を指定して直通バス便を検索します",
  inputSchema: {
    type: "object",
    properties: {
      from: {
        type: "string",
        description: "出発地のバス停名"
      },
      to: {
        type: "string",
        description: "目的地のバス停名"
      },
      time: {
        type: "string",
        description: "検索基準時刻（HH:MM形式、省略時は現在時刻）"
      },
      type: {
        type: "string",
        enum: ["departure", "arrival"],
        description: "検索タイプ（departure: 出発時刻、arrival: 到着時刻）",
        default: "departure"
      },
      weekday: {
        type: "string",
        enum: ["weekday", "saturday", "holiday"],
        description: "曜日区分（weekday: 平日、saturday: 土曜、holiday: 日曜祝日）"
      },
      limit: {
        type: "number",
        description: "取得する結果の最大数（デフォルト: 10）",
        default: 10
      }
    },
    required: ["from", "to"]
  }
} as const;

/**
 * 経路検索を実行
 * 
 * @param args - 検索パラメータ
 * @returns MCP形式のレスポンス
 * @throws API呼び出しに失敗した場合にエラーをスロー
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
export async function searchRoutes(args: SearchRoutesArgs) {
  try {
    const response = await apiClient.get<SearchRoutesResponse>(
      '/routes/search',
      {
        from: args.from,
        to: args.to,
        time: args.time,
        type: args.type || 'departure',
        weekday: args.weekday,
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
    throw new Error(`経路検索に失敗しました: ${errorMessage}`);
  }
}
