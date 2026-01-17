/**
 * Pages Functions: ランタイム環境変数をフロントへ渡す（開発/運用共通）
 *
 * - `.dev.vars` / Pages環境変数を読み取り、同一オリジンのJSとして返す
 * - フロント側は `window.__RUNTIME_ENV__` を参照して設定を上書きできる
 *
 * 注意: ORSキーをフロントで使う場合、最終的にブラウザから参照可能になります。
 * （Authorizationヘッダーで呼ぶため、完全秘匿はできません）
 */

interface Env {
  ORS_API_KEY?: string;
}

export const onRequestGet = async (ctx: { env: Env }) => {
  const orsApiKey = ctx.env?.ORS_API_KEY || '';

  // JSとして返す（キーが無い場合は空文字）
  const body = `window.__RUNTIME_ENV__ = Object.assign(window.__RUNTIME_ENV__ || {}, { ORS_API_KEY: ${JSON.stringify(
    orsApiKey
  )} });\n`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
};

