/**
 * API Client for Saga Bus Navigator REST API
 * 
 * REST APIへのHTTPリクエストを行うクライアント
 */

/**
 * API Clientの設定インターフェース
 */
export interface ApiClientConfig {
  /** APIのベースURL */
  baseUrl: string;
  /** リクエストタイムアウト（ミリ秒）デフォルト: 10000ms */
  timeout?: number;
}

/**
 * REST APIへのHTTPリクエストを行うクライアント
 */
export class ApiClient {
  private baseUrl: string;
  private timeout: number;

  /**
   * ApiClientのコンストラクタ
   * @param config - API Clientの設定
   */
  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 10000;
  }

  /**
   * GETリクエストを実行
   * @param endpoint - APIエンドポイント（例: '/stops/search'）
   * @param params - クエリパラメータ
   * @returns APIレスポンス
   * @throws タイムアウト、ネットワークエラー、HTTPエラーの場合にエラーをスロー
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    
    // クエリパラメータの追加
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // タイムアウト処理の設定
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // HTTPエラーの処理
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      // レスポンスのパース
      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // タイムアウトエラーの処理
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      
      // その他のエラーをそのまま再スロー
      throw error;
    }
  }
}

/**
 * シングルトンインスタンス
 * 環境変数API_BASE_URLが設定されている場合はその値を使用、
 * 未設定の場合はデフォルトURL（https://saga-bus.midnight480.com/api）を使用
 */
export const apiClient = new ApiClient({
  baseUrl: process.env['API_BASE_URL'] || 'https://saga-bus.midnight480.com/api'
});
