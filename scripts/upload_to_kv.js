#!/usr/bin/env node
/**
 * JSONファイルをCloudflare KVに保存するスクリプト
 * 
 * このスクリプトは、GTFS前処理スクリプトで生成されたJSONファイルを
 * Cloudflare KVに保存し、バージョン管理を行います。
 * 
 * 主な機能:
 * - タイムスタンプベースのバージョン番号生成（YYYYMMDDHHmmss形式）
 * - Cloudflare KV APIを使用したデータ保存
 * - gtfs:v{version}:{table_name}形式のキー管理
 * - gtfs:current_versionキーの更新
 * - バージョンライフサイクル管理（最新2世代のみ保持）
 * - エラーハンドリングとリトライ処理（指数バックオフ）
 * 
 * 使用方法:
 *   node scripts/upload_to_kv.js [jsonDir]
 * 
 * 環境変数:
 *   CLOUDFLARE_ACCOUNT_ID - CloudflareアカウントID
 *   CLOUDFLARE_API_TOKEN - Cloudflare API Token
 *   KV_NAMESPACE_ID - KV Namespace ID
 * 
 * 例:
 *   export CLOUDFLARE_ACCOUNT_ID=your_account_id
 *   export CLOUDFLARE_API_TOKEN=your_api_token
 *   export KV_NAMESPACE_ID=your_namespace_id
 *   node scripts/upload_to_kv.js ./gtfs-json
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { Logger, ErrorHandler, RetryHandler, GTFSError, ErrorCategory } = require('./error-handler');

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);

// ロガー、エラーハンドラー、リトライハンドラーを初期化
const logger = new Logger('upload_to_kv');
const errorHandler = new ErrorHandler(logger);
const retryHandler = new RetryHandler(logger);

/**
 * 現在時刻からバージョン番号を生成（YYYYMMDDHHmmss形式）
 * @returns {string} バージョン番号
 */
function generateVersion() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * ファイル名からKVキーを生成
 * @param {string} version - バージョン番号
 * @param {string} filename - ファイル名（例: stops.json, stop_times_0.json）
 * @returns {string} KVキー
 */
function generateKey(version, filename) {
  // .jsonを除去してテーブル名を取得
  const tableName = filename.replace('.json', '');
  return `gtfs:v${version}:${tableName}`;
}

/**
 * 指数バックオフを使用したリトライ処理（統一エラーハンドラーを使用）
 * @param {Function} fn - 実行する非同期関数
 * @param {number} maxAttempts - 最大試行回数
 * @param {number} initialDelay - 初期遅延時間（ミリ秒）
 * @returns {Promise<*>} 関数の実行結果
 */
async function retryWithBackoff(fn, maxAttempts = 5, initialDelay = 1000) {
  return retryHandler.retryWithBackoff(fn, {
    maxAttempts,
    initialDelay,
    shouldRetry: (error) => {
      // KV操作のリトライ判定
      return error.message && (
        error.message.includes('429') ||
        error.message.includes('Too Many Requests') ||
        error.message.includes('rate limit') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT')
      );
    }
  });
}

/**
 * Cloudflare KV APIを使用してデータを保存
 * @param {string} accountId - CloudflareアカウントID
 * @param {string} apiToken - Cloudflare API Token
 * @param {string} namespaceId - KV Namespace ID
 * @param {string} key - KVキー
 * @param {*} value - 保存する値
 */
async function putKV(accountId, apiToken, namespaceId, key, value) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(value)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`KV PUT失敗 (${response.status} ${response.statusText}): ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    errorHandler.handleKVError(error, 'PUT', key);
  }
}

/**
 * Cloudflare KV APIを使用してキーを削除
 * @param {string} accountId - CloudflareアカウントID
 * @param {string} apiToken - Cloudflare API Token
 * @param {string} namespaceId - KV Namespace ID
 * @param {string} key - KVキー
 */
async function deleteKV(accountId, apiToken, namespaceId, key) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  });
  
  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`KV DELETE失敗 (${response.status} ${response.statusText}): ${errorText}`);
  }
}

/**
 * KVから全てのキーをリストアップ
 * @param {string} accountId - CloudflareアカウントID
 * @param {string} apiToken - Cloudflare API Token
 * @param {string} namespaceId - KV Namespace ID
 * @param {string} prefix - キーのプレフィックス
 * @returns {Promise<Array<string>>} キーのリスト
 */
async function listKeys(accountId, apiToken, namespaceId, prefix = '') {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/keys?prefix=${encodeURIComponent(prefix)}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`KV LIST失敗 (${response.status} ${response.statusText}): ${errorText}`);
  }
  
  const data = await response.json();
  return data.result.map(item => item.name);
}

/**
 * KVから全てのバージョンをリストアップ
 * @param {string} accountId - CloudflareアカウントID
 * @param {string} apiToken - Cloudflare API Token
 * @param {string} namespaceId - KV Namespace ID
 * @returns {Promise<Array<string>>} バージョン番号のリスト（降順ソート済み）
 */
async function listVersions(accountId, apiToken, namespaceId) {
  const keys = await listKeys(accountId, apiToken, namespaceId, 'gtfs:v');
  
  // バージョン番号を抽出
  const versions = new Set();
  for (const key of keys) {
    const match = key.match(/^gtfs:v(\d{14}):/);
    if (match) {
      versions.add(match[1]);
    }
  }
  
  // タイムスタンプで降順ソート
  return Array.from(versions).sort((a, b) => b.localeCompare(a));
}

/**
 * 指定されたバージョンの全てのキーを削除
 * @param {string} accountId - CloudflareアカウントID
 * @param {string} apiToken - Cloudflare API Token
 * @param {string} namespaceId - KV Namespace ID
 * @param {string} version - 削除するバージョン番号
 */
async function deleteVersion(accountId, apiToken, namespaceId, version) {
  const keys = await listKeys(accountId, apiToken, namespaceId, `gtfs:v${version}:`);
  
  console.log(`  バージョン ${version} の${keys.length}個のキーを削除しています...`);
  
  for (const key of keys) {
    await retryWithBackoff(() => deleteKV(accountId, apiToken, namespaceId, key));
  }
  
  console.log(`  ✓ バージョン ${version} を削除しました`);
}

/**
 * 古いバージョンをクリーンアップ（最新2世代のみ保持）
 * @param {string} accountId - CloudflareアカウントID
 * @param {string} apiToken - Cloudflare API Token
 * @param {string} namespaceId - KV Namespace ID
 * @param {string} currentVersion - 現在のバージョン番号
 */
async function cleanupOldVersions(accountId, apiToken, namespaceId, currentVersion) {
  console.log('\n古いバージョンをクリーンアップしています...');
  
  const versions = await listVersions(accountId, apiToken, namespaceId);
  console.log(`  現在のバージョン数: ${versions.length}件`);
  
  // 最新2世代以外を削除
  const versionsToDelete = versions.slice(2);
  
  if (versionsToDelete.length === 0) {
    console.log('  削除するバージョンはありません');
    return;
  }
  
  console.log(`  削除対象: ${versionsToDelete.length}件のバージョン`);
  
  for (const version of versionsToDelete) {
    await deleteVersion(accountId, apiToken, namespaceId, version);
  }
  
  console.log(`✓ クリーンアップ完了: ${versionsToDelete.length}件のバージョンを削除しました`);
}

/**
 * 部分的に保存されたデータをクリーンアップ
 * @param {string} accountId - CloudflareアカウントID
 * @param {string} apiToken - Cloudflare API Token
 * @param {string} namespaceId - KV Namespace ID
 * @param {string} version - クリーンアップするバージョン番号
 */
async function cleanupPartialData(accountId, apiToken, namespaceId, version) {
  console.log(`\n部分的に保存されたデータをクリーンアップしています（バージョン: ${version}）...`);
  
  try {
    await deleteVersion(accountId, apiToken, namespaceId, version);
  } catch (error) {
    console.error(`  ⚠ クリーンアップ中にエラーが発生しました: ${error.message}`);
  }
}

/**
 * JSONファイルをKVにアップロード
 * @param {string} jsonDir - JSONファイルのディレクトリ
 * @param {string} accountId - CloudflareアカウントID
 * @param {string} apiToken - Cloudflare API Token
 * @param {string} namespaceId - KV Namespace ID
 * @returns {Object} アップロード結果の統計情報
 */
async function uploadToKV(jsonDir, accountId, apiToken, namespaceId) {
  logger.start('KVアップロード', {
    入力ディレクトリ: jsonDir,
    アカウントID: accountId.substring(0, 8) + '...',
    NamespaceID: namespaceId.substring(0, 8) + '...'
  });
  
  // バージョン番号を生成
  const version = generateVersion();
  logger.info('バージョン番号を生成しました', { バージョン: version });
  
  // JSONファイルをリストアップ
  const files = await readdir(jsonDir);
  const jsonFiles = files.filter(file => file.endsWith('.json') && file !== 'metadata.json');
  
  console.log(`アップロード対象: ${jsonFiles.length}ファイル\n`);
  
  // 統計情報
  const stats = {
    version,
    uploadedKeys: [],
    errors: []
  };
  
  try {
    // 各JSONファイルをKVに保存
    for (const filename of jsonFiles) {
      try {
        console.log(`アップロード中: ${filename}...`);
        
        const filePath = path.join(jsonDir, filename);
        const fileContent = await readFile(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        const key = generateKey(version, filename);
        console.log(`  キー: ${key}`);
        console.log(`  データ件数: ${data.length}件`);
        
        // KVに保存（リトライ付き）
        await retryWithBackoff(() => putKV(accountId, apiToken, namespaceId, key, data));
        
        stats.uploadedKeys.push(key);
        console.log(`  ✓ アップロード完了\n`);
      } catch (error) {
        console.error(`  ✗ ${filename} のアップロード中にエラーが発生しました:`);
        console.error(`    エラー: ${error.message}\n`);
        stats.errors.push({
          file: filename,
          error: error.message
        });
        throw error; // エラーが発生したら処理を中断
      }
    }
    
    // current_versionを更新
    console.log('current_versionを更新しています...');
    await retryWithBackoff(() => putKV(accountId, apiToken, namespaceId, 'gtfs:current_version', version));
    console.log(`✓ current_versionを更新しました: ${version}\n`);
    
    // 古いバージョンをクリーンアップ
    await cleanupOldVersions(accountId, apiToken, namespaceId, version);
    
    // 統計情報を表示
    console.log(`\n=== アップロード完了 ===`);
    console.log(`バージョン: ${version}`);
    console.log(`アップロードされたキー: ${stats.uploadedKeys.length}件`);
    stats.uploadedKeys.forEach(key => console.log(`  - ${key}`));
    
    if (stats.errors.length > 0) {
      console.log(`エラー: ${stats.errors.length}件`);
      stats.errors.forEach(err => console.log(`  - ${err.file}: ${err.error}`));
    }
    
    console.log('');
    
    return stats;
  } catch (error) {
    // エラーが発生した場合は部分的に保存されたデータをクリーンアップ
    await cleanupPartialData(accountId, apiToken, namespaceId, version);
    throw error;
  }
}

/**
 * 環境変数を検証
 * @returns {Object} 検証済みの環境変数
 */
function validateEnvironment() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const namespaceId = process.env.KV_NAMESPACE_ID;
  
  const errors = [];
  
  if (!accountId) {
    errors.push('CLOUDFLARE_ACCOUNT_ID環境変数が設定されていません');
  }
  
  if (!apiToken) {
    errors.push('CLOUDFLARE_API_TOKEN環境変数が設定されていません');
  }
  
  if (!namespaceId) {
    errors.push('KV_NAMESPACE_ID環境変数が設定されていません');
  }
  
  if (errors.length > 0) {
    console.error('エラー: 必要な環境変数が設定されていません\n');
    errors.forEach(error => console.error(`  - ${error}`));
    console.error('\n使用方法:');
    console.error('  export CLOUDFLARE_ACCOUNT_ID=your_account_id');
    console.error('  export CLOUDFLARE_API_TOKEN=your_api_token');
    console.error('  export KV_NAMESPACE_ID=your_namespace_id');
    console.error('  node scripts/upload_to_kv.js ./gtfs-json');
    process.exit(1);
  }
  
  return { accountId, apiToken, namespaceId };
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  
  // コマンドライン引数の解析
  const jsonDir = args[0] || './gtfs-json';
  
  // ディレクトリの存在確認
  if (!fs.existsSync(jsonDir)) {
    console.error(`エラー: ディレクトリが見つかりません: ${jsonDir}`);
    console.error('使用方法: node scripts/upload_to_kv.js [jsonDir]');
    console.error('例: node scripts/upload_to_kv.js ./gtfs-json');
    process.exit(1);
  }
  
  // 環境変数を検証
  const { accountId, apiToken, namespaceId } = validateEnvironment();
  
  try {
    const stats = await uploadToKV(jsonDir, accountId, apiToken, namespaceId);
    
    // エラーがあった場合は終了コード1で終了
    if (stats.errors.length > 0) {
      console.error('\n✗ 一部のファイルのアップロード中にエラーが発生しました');
      process.exit(1);
    }
    
    console.log('✓ アップロードが正常に完了しました');
  } catch (error) {
    console.error(`\n✗ アップロード中に致命的なエラーが発生しました:`);
    console.error(`エラー: ${error.message}`);
    console.error(`スタックトレース: ${error.stack}`);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  main();
}

// テスト用にエクスポート
module.exports = {
  uploadToKV,
  generateVersion,
  generateKey,
  retryWithBackoff,
  putKV,
  deleteKV,
  listKeys,
  listVersions,
  deleteVersion,
  cleanupOldVersions,
  cleanupPartialData,
  validateEnvironment
};
