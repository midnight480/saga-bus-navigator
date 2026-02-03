#!/usr/bin/env node
/**
 * Cloudflare KVに保存されているGTFSデータのバージョン一覧を表示するスクリプト
 * 
 * このスクリプトは、KVに保存されている全てのバージョンとそのタイムスタンプを表示します。
 * 
 * 使用方法:
 *   node scripts/list_versions.js
 * 
 * 環境変数:
 *   CLOUDFLARE_ACCOUNT_ID - CloudflareアカウントID
 *   CLOUDFLARE_API_TOKEN - Cloudflare API Token
 *   KV_NAMESPACE_ID - KV Namespace ID
 */

const { listVersions, validateEnvironment } = require('./upload_to_kv');
const { getCurrentVersion } = require('./rollback');

/**
 * バージョン番号をタイムスタンプに変換
 * @param {string} version - バージョン番号（YYYYMMDDHHmmss形式）
 * @returns {string} フォーマットされたタイムスタンプ
 */
function formatVersion(version) {
  if (version.length !== 14) {
    return version;
  }
  
  const year = version.substring(0, 4);
  const month = version.substring(4, 6);
  const day = version.substring(6, 8);
  const hours = version.substring(8, 10);
  const minutes = version.substring(10, 12);
  const seconds = version.substring(12, 14);
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * バージョン一覧を表示
 * @param {string} accountId - CloudflareアカウントID
 * @param {string} apiToken - Cloudflare API Token
 * @param {string} namespaceId - KV Namespace ID
 */
async function listVersionsCommand(accountId, apiToken, namespaceId) {
  console.log('\n=== GTFSデータバージョン一覧 ===\n');
  
  // 現在のバージョンを取得
  console.log('現在のバージョンを確認しています...');
  const currentVersion = await getCurrentVersion(accountId, apiToken, namespaceId);
  
  if (!currentVersion) {
    console.log('現在のバージョン: (未設定)\n');
  } else {
    console.log(`現在のバージョン: ${currentVersion} (${formatVersion(currentVersion)})\n`);
  }
  
  // 全てのバージョンをリストアップ
  console.log('利用可能なバージョンを取得しています...');
  const versions = await listVersions(accountId, apiToken, namespaceId);
  
  if (versions.length === 0) {
    console.log('バージョンが見つかりません');
    console.log('データがアップロードされていない可能性があります\n');
    return;
  }
  
  console.log(`\n利用可能なバージョン: ${versions.length}件\n`);
  
  versions.forEach((version, index) => {
    const isCurrent = version === currentVersion;
    const timestamp = formatVersion(version);
    const marker = isCurrent ? ' ← 現在' : '';
    console.log(`  ${index + 1}. ${version} (${timestamp})${marker}`);
  });
  
  console.log('\n注意:');
  console.log('  - バージョンは最新2世代のみ保持されます');
  console.log('  - ロールバックは1世代前のバージョンにのみ可能です');
  console.log('');
}

/**
 * メイン処理
 */
async function main() {
  // 環境変数を検証
  const { accountId, apiToken, namespaceId } = validateEnvironment();
  
  try {
    await listVersionsCommand(accountId, apiToken, namespaceId);
  } catch (error) {
    console.error(`\n✗ バージョン一覧の取得中にエラーが発生しました:`);
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
  listVersionsCommand,
  formatVersion
};
