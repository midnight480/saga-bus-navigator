import { apiClient } from '../api-client.js';

/**
 * 始発・終電検索のリクエストパラメータ
 */
export interface GetFirstLastBusArgs {
  stop: string;
  to?: string;
  weekday?: 'weekday' | 'saturday' | 'holiday';
}

/**
 * 始発・終電情報
 */
export interface FirstLastBus {
  stop_name: string;
  destination?: string;
  first_bus: {
    time: string;
    route_name: string;
    destination: string;
  };
  last_bus: {
    time: string;
    route_name: string;
    destination: string;
  };
  weekday_type: string;
}

/**
 * 始発・終電検索のレスポンス
 */
export interface GetFirstLastBusResponse {
  data: FirstLastBus;
}

/**
 * 始発・終電検索ツールのMCPスキーマ
 */
export const getFirstLastBusSchema = {
  name: "get_first_last_bus",
  description: "指定したバス停の始発・終電情報を取得します",
  inputSchema: {
    type: "object",
    properties: {
      stop: {
        type: "string",
        description: "バス停名"
      },
      to: {
        type: "string",
        description: "行先（省略時は全路線）"
      },
      weekday: {
        type: "string",
        enum: ["weekday", "saturday", "holiday"],
        description: "曜日区分（weekday: 平日、saturday: 土曜、holiday: 日曜祝日）"
      }
    },
    required: ["stop"]
  }
};

/**
 * 始発・終電情報を取得する
 * @param args 検索パラメータ
 * @returns MCP形式のレスポンス
 */
export async function getFirstLastBus(args: GetFirstLastBusArgs) {
  try {
    const response = await apiClient.get<GetFirstLastBusResponse>(
      '/stops/first-last',
      {
        stop: args.stop,
        to: args.to,
        weekday: args.weekday
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
    throw new Error(`始発・終電情報の取得に失敗しました: ${errorMessage}`);
  }
}
