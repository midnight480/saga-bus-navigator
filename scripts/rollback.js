#!/usr/bin/env node
/**
 * Cloudflare KVのGTFSデータを1世代前のバージョンにロールバックするスクリプト
 * 
 * このスクリプトは、gtfs:current_versionキーを1世代前のバージョン番号に更新します。
 * データ自体は削除されず、current_versionポインタのみが変更されます。
 * 
 * 使用方法:
 *   node scripts/rollback.js
 * 
 * 環境変数:
 *   CLOUDFLARE_ACCOUNT_ID - CloudflareアカウントID
 *   CLOUDFLARE_API_TOKEN - Cloudflare API Token
 *   KV_NAMESPACE_ID - KV Namespace ID
 */

const { listVersions, putKV, validateEnvironment } = require('./upload_to_kv');
const { Logger, ErrorHandler } = require('./error-handler');

// ロガーとエラーハンドラーを初期化
const logger = new Logger('rollback');
const errorHandler = new ErrorHandler(logger);

/**
 * KVから現在のバージョンを取得
 * @param {string} accountId - CloudflareアカウントID
 * @param {string} apiToken - Cloudflare API Token
 * @param {string} namespaceId - KV Namespace ID
 * @returns {Promise<string|null>} 現在のバージョン番号、存在しない場合はnull
 */
async function getCurrentVersion(accountId, apiToken, namespaceId) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/gtfs:current_version`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  });
  
  if (response.status === 404) {
    return null;
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`KV GET失敗 (${response.status} ${response.statusText}): ${errorText}`);
  }
  
  return await response.text();
}

/**
 * ロールバック処理
 * @param {string} accountId - CloudflareアカウントID
 * @param {string} apiToken - Cloudflare API Token
 * @param {string} namespaceId - KV Namespace ID
 */
async function rollback(accountId, apiToken, namespaceId) {
  logger.start('ロールバック処理');
  
  try {
    // 現在のバージョンを取得
    logger.info('現在のバージョンを確認しています...');
    const currentVersion = await getCurrentVersion(accountId, apiToken, namespaceId);
    
    if (!currentVersion) {
      errorHandler.handleVersionError(
        new Error('現在のバージョンが見つかりません'),
        'ロールバック'
      );
    }
    
    logger.info('現在のバージョンを取得しました', { バージョン: currentVersion });
    
    // 全てのバージョンをリストアップ
    logger.info('利用可能なバージョンを確認しています...');
    const versions = await listVersions(accountId, apiToken, namespaceId);
    
    if (versions.length === 0) {
      errorHandler.handleVersionError(
        new Error('バージョンが見つかりません'),
        'ロールバック'
      );
    }
    
    logger.info(`利用可能なバージョン: ${versions.length}件`);
    versions.forEach((version, index) => {
      const isCurrent = version === currentVersion;
      logger.info(`  ${index + 1}. ${version}${isCurrent ? ' (現在)' : ''}`);
    });
    
    // 1世代前のバージョンを特定
    const currentIndex = versions.indexOf(currentVersion);
    
    if (currentIndex === -1) {
      errorHandler.handleVersionError(
        new Error('現在のバージョンがバージョンリストに見つかりません。データの整合性に問題がある可能性があります'),
        'ロールバック'
      );
    }
    
    if (currentIndex === versions.length - 1) {
      errorHandler.handleVersionError(
        new Error('ロールバック可能なバージョンがありません。現在のバージョンが最古のバージョンです'),
        'ロールバック'
      );
    }
    
    const previousVersion = versions[currentIndex + 1];
    logger.info(`ロールバック先: ${previousVersion}`);
    
    // current_versionを更新
    logger.info('current_versionを更新しています...');
    await putKV(accountId, apiToken, namespaceId, 'gtfs:current_version', previousVersion);
    logger.info(`✓ current_versionを更新しました: ${previousVersion}`);
    
    logger.info('=== ロールバック完了 ===');
    logger.info(`${currentVersion} → ${previousVersion}`);
    logger.info('次回のDataLoader初期化時から、ロールバックされたバージョンのデータが使用されます');
  } catch (error) {
    // エラーは既にhandleVersionErrorで処理されているため、ここでは再スロー
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  // 環境変数を検証
  const { accountId, apiToken, namespaceId } = validateEnvironment();
  
  await rollback(accountId, apiToken, namespaceId);
}

// スクリプトが直接実行された場合
if (require.main === module) {
  main();
}

// テスト用にエクスポート
module.exports = {
  rollback,
  getCurrentVersion
};
