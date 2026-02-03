/**
 * Cloudflare Pages Deploy Hook
 * 
 * このPages Functionは、Cloudflare Pagesのデプロイ完了後に自動的に実行され、
 * GTFSデータの前処理とKVへのアップロードを行います。
 * 
 * 主な機能:
 * - POSTリクエストの受付と検証
 * - GTFS前処理スクリプトの実行（gtfs_to_json.js）
 * - KVアップロードスクリプトの実行（upload_to_kv.js）
 * - 環境変数からの認証情報の安全な取得
 * - 成功/失敗のレスポンス返却
 * - エラーハンドリングとログ出力
 * 
 * エンドポイント: /deploy-hook
 * メソッド: POST
 * 
 * 環境変数:
 *   CLOUDFLARE_ACCOUNT_ID - CloudflareアカウントID
 *   CLOUDFLARE_API_TOKEN - Cloudflare API Token
 *   KV_NAMESPACE_ID - KV Namespace ID
 * 
 * レスポンス形式:
 *   成功: { success: true, message: string, version: string, stats: object }
 *   失敗: { success: false, error: string, details: object }
 */

// GTFS前処理とKVアップロードのモジュールをインポート
const { processGTFSZip, findGTFSZipFile } = require('../scripts/gtfs_to_json.js');
const { uploadToKV, validateEnvironment } = require('../scripts/upload_to_kv.js');

/**
 * Deploy Hookエンドポイントのハンドラー
 * @param {Object} context - Cloudflare Pages Functionのコンテキスト
 * @param {Request} context.request - HTTPリクエスト
 * @param {Object} context.env - 環境変数
 * @returns {Promise<Response>} HTTPレスポンス
 */
export async function onRequest(context) {
  const { request, env } = context;
  
  // ログ出力用のタイムスタンプ
  const startTime = new Date();
  console.log(`\n=== Deploy Hook実行開始 ===`);
  console.log(`開始時刻: ${startTime.toISOString()}`);
  
  // POSTリクエストのみを受け付ける
  if (request.method !== 'POST') {
    console.error(`エラー: 不正なHTTPメソッド: ${request.method}`);
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed',
      message: 'このエンドポイントはPOSTリクエストのみを受け付けます'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'POST'
      }
    });
  }
  
  try {
    // 環境変数の検証
    console.log('\n環境変数を検証しています...');
    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = env.CLOUDFLARE_API_TOKEN;
    const namespaceId = env.KV_NAMESPACE_ID;
    
    const missingVars = [];
    if (!accountId) missingVars.push('CLOUDFLARE_ACCOUNT_ID');
    if (!apiToken) missingVars.push('CLOUDFLARE_API_TOKEN');
    if (!namespaceId) missingVars.push('KV_NAMESPACE_ID');
    
    if (missingVars.length > 0) {
      const errorMessage = `必要な環境変数が設定されていません: ${missingVars.join(', ')}`;
      console.error(`エラー: ${errorMessage}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing environment variables',
        message: errorMessage,
        details: { missingVars }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✓ 環境変数の検証完了');
    console.log(`  アカウントID: ${accountId.substring(0, 8)}...`);
    console.log(`  Namespace ID: ${namespaceId.substring(0, 8)}...`);
    
    // GTFS ZIPファイルを検索
    console.log('\nGTFS ZIPファイルを検索しています...');
    const zipPath = findGTFSZipFile('data');
    
    if (!zipPath) {
      const errorMessage = 'GTFS ZIPファイルが見つかりません（data/saga-current.zip または data/saga-YYYY-MM-DD.zip）';
      console.error(`エラー: ${errorMessage}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'GTFS file not found',
        message: errorMessage
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`✓ GTFS ZIPファイルを検出: ${zipPath}`);
    
    // GTFS前処理を実行
    console.log('\n--- GTFS前処理を実行 ---');
    const outputDir = './gtfs-json';
    const preprocessStats = await processGTFSZip(zipPath, outputDir);
    
    // 前処理でエラーが発生した場合
    if (preprocessStats.errors.length > 0) {
      const errorMessage = `GTFS前処理中にエラーが発生しました（${preprocessStats.errors.length}件）`;
      console.error(`エラー: ${errorMessage}`);
      preprocessStats.errors.forEach(err => {
        console.error(`  - ${err.file}: ${err.error}`);
      });
      
      return new Response(JSON.stringify({
        success: false,
        error: 'GTFS preprocessing failed',
        message: errorMessage,
        details: {
          processedFiles: preprocessStats.processedFiles,
          errors: preprocessStats.errors
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✓ GTFS前処理が正常に完了しました');
    console.log(`  処理済みファイル: ${preprocessStats.processedFiles.length}件`);
    if (Object.keys(preprocessStats.splitFiles).length > 0) {
      console.log(`  分割されたファイル: ${Object.keys(preprocessStats.splitFiles).length}件`);
    }
    
    // KVアップロードを実行
    console.log('\n--- KVアップロードを実行 ---');
    const uploadStats = await uploadToKV(outputDir, accountId, apiToken, namespaceId);
    
    // アップロードでエラーが発生した場合
    if (uploadStats.errors.length > 0) {
      const errorMessage = `KVアップロード中にエラーが発生しました（${uploadStats.errors.length}件）`;
      console.error(`エラー: ${errorMessage}`);
      uploadStats.errors.forEach(err => {
        console.error(`  - ${err.file}: ${err.error}`);
      });
      
      return new Response(JSON.stringify({
        success: false,
        error: 'KV upload failed',
        message: errorMessage,
        details: {
          version: uploadStats.version,
          uploadedKeys: uploadStats.uploadedKeys,
          errors: uploadStats.errors
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✓ KVアップロードが正常に完了しました');
    console.log(`  バージョン: ${uploadStats.version}`);
    console.log(`  アップロードされたキー: ${uploadStats.uploadedKeys.length}件`);
    
    // 処理時間を計算
    const endTime = new Date();
    const durationMs = endTime - startTime;
    const durationSec = (durationMs / 1000).toFixed(2);
    
    console.log(`\n=== Deploy Hook実行完了 ===`);
    console.log(`終了時刻: ${endTime.toISOString()}`);
    console.log(`処理時間: ${durationSec}秒`);
    
    // 成功レスポンスを返す
    return new Response(JSON.stringify({
      success: true,
      message: 'GTFSデータがKVに正常にアップロードされました',
      version: uploadStats.version,
      stats: {
        preprocessed: {
          processedFiles: preprocessStats.processedFiles.length,
          skippedFiles: preprocessStats.skippedFiles.length,
          splitFiles: Object.keys(preprocessStats.splitFiles).length
        },
        uploaded: {
          keys: uploadStats.uploadedKeys.length,
          version: uploadStats.version
        },
        duration: {
          milliseconds: durationMs,
          seconds: parseFloat(durationSec)
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    // 予期しないエラーが発生した場合
    const endTime = new Date();
    const durationMs = endTime - startTime;
    
    console.error(`\n✗ Deploy Hook実行中に致命的なエラーが発生しました:`);
    console.error(`エラー: ${error.message}`);
    console.error(`スタックトレース: ${error.stack}`);
    console.error(`処理時間: ${(durationMs / 1000).toFixed(2)}秒`);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message,
      details: {
        stack: error.stack,
        duration: {
          milliseconds: durationMs,
          seconds: parseFloat((durationMs / 1000).toFixed(2))
        }
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
