#!/usr/bin/env node
/**
 * GTFS ZIPファイルをJSON形式に変換するスクリプト（Cloudflare KV用）
 * 
 * このスクリプトは、GTFS ZIPファイルを解凍してJSON形式に変換し、
 * Cloudflare KVへのアップロード用に最適化されたファイルを生成します。
 * 
 * 主な機能:
 * - GTFS ZIPファイルの解凍とCSVパース
 * - JSON形式への変換
 * - 25MB超のstop_timesデータの自動分割（20MBチャンク）
 * - エラーハンドリングとログ出力
 * 
 * 使用方法:
 *   node scripts/gtfs_to_json.js [zipPath] [outputDir]
 * 
 * 例:
 *   node scripts/gtfs_to_json.js data/saga-current.zip ./gtfs-json
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const JSZip = require('jszip');
const { Logger, ErrorHandler, GTFSError, ErrorCategory } = require('./error-handler');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// ロガーとエラーハンドラーを初期化
const logger = new Logger('gtfs_to_json');
const errorHandler = new ErrorHandler(logger);

// GTFSファイル名のリスト（GTFS標準）
const GTFS_FILES = [
  'stops.txt',
  'stop_times.txt',
  'routes.txt',
  'trips.txt',
  'calendar.txt',
  'agency.txt',
  'fare_attributes.txt'
];

// 分割サイズの設定（MB）
const MAX_FILE_SIZE_MB = 20; // 25MB制限に対して余裕を持たせる
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * CSVテキストをパースしてオブジェクト配列に変換
 * @param {string} text - CSVテキスト
 * @returns {Array<Object>} パースされたデータ
 */
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length === 0) {
    return [];
  }

  // ヘッダー行を抽出
  const headers = parseCSVLine(lines[0]);
  const data = [];

  // データ行をパース
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // 空行をスキップ

    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      console.warn(`  警告: 行${i + 1}: カラム数が一致しません（期待: ${headers.length}, 実際: ${values.length}）`);
      continue;
    }

    // オブジェクト配列への変換
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    data.push(row);
  }

  return data;
}

/**
 * CSV行をパース（ダブルクォート、エスケープ対応）
 * @param {string} line - CSV行
 * @returns {Array<string>} パースされた値の配列
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // エスケープされたダブルクォート（""）
        current += '"';
        i++; // 次の文字をスキップ
      } else {
        // クォートの開始/終了
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // カンマ区切り（クォート外のみ）
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // 最後の値を追加
  values.push(current.trim());

  return values;
}

/**
 * JSONデータのサイズを計算（バイト）
 * @param {Array|Object} data - データ
 * @returns {number} サイズ（バイト）
 */
function getDataSize(data) {
  const jsonString = JSON.stringify(data);
  return Buffer.byteLength(jsonString, 'utf8');
}

/**
 * 大きな配列を複数のチャンクに分割
 * @param {Array} data - 分割するデータ配列
 * @param {number} maxSizeBytes - 1チャンクあたりの最大サイズ（バイト）
 * @returns {Array<Array>} 分割されたチャンク配列
 */
function splitIntoChunks(data, maxSizeBytes) {
  if (!data || data.length === 0) {
    return [];
  }

  const chunks = [];
  let currentChunk = [];
  let currentSize = 2; // JSON配列の開始 "[]"

  for (const item of data) {
    const itemJson = JSON.stringify(item);
    const itemSize = Buffer.byteLength(itemJson, 'utf8');
    const commaSize = currentChunk.length > 0 ? 1 : 0; // カンマのサイズ

    // 現在のチャンクに追加すると制限を超える場合
    if (currentSize + itemSize + commaSize > maxSizeBytes && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 2; // 新しいチャンクの開始
    }

    currentChunk.push(item);
    currentSize += itemSize + commaSize;
  }

  // 最後のチャンクを追加
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * JSONファイルを保存
 * @param {string} outputPath - 出力ファイルパス
 * @param {*} data - 保存するデータ
 */
async function saveJson(outputPath, data) {
  const jsonString = JSON.stringify(data, null, 0);
  await writeFile(outputPath, jsonString, 'utf8');
  const sizeMB = Buffer.byteLength(jsonString, 'utf8') / 1024 / 1024;
  console.log(`  ✓ ${path.basename(outputPath)} に保存 (${data.length}件, ${sizeMB.toFixed(2)}MB)`);
}

/**
 * 大きなデータを分割して保存
 * @param {string} tableName - テーブル名
 * @param {Array} data - データ配列
 * @param {string} outputDir - 出力ディレクトリ
 * @returns {Array<string>} 保存されたファイル名のリスト
 */
async function splitAndSave(tableName, data, outputDir) {
  const chunks = splitIntoChunks(data, MAX_FILE_SIZE_BYTES);
  const savedFiles = [];

  console.log(`  データを${chunks.length}個のチャンクに分割します`);

  for (let i = 0; i < chunks.length; i++) {
    const filename = `${tableName}_${i}.json`;
    const outputPath = path.join(outputDir, filename);
    await saveJson(outputPath, chunks[i]);
    savedFiles.push(filename);
  }

  return savedFiles;
}

/**
 * GTFS ZIPファイルを処理してJSON形式に変換
 * @param {string} zipPath - ZIPファイルのパス
 * @param {string} outputDir - 出力ディレクトリ
 * @returns {Object} 処理結果の統計情報
 */
async function processGTFSZip(zipPath, outputDir) {
  logger.start('GTFS前処理', {
    入力ファイル: zipPath,
    出力ディレクトリ: outputDir,
    最大ファイルサイズ: `${MAX_FILE_SIZE_MB}MB`
  });

  try {
    // 出力ディレクトリを作成
    await mkdir(outputDir, { recursive: true });
    logger.debug('出力ディレクトリを作成しました', { path: outputDir });

    // ZIPファイルを読み込み
    logger.info('ZIPファイルを読み込んでいます...', { path: zipPath });
    const zipBuffer = await readFile(zipPath);
    const zip = await JSZip.loadAsync(zipBuffer);
    logger.info('ZIPファイル読み込み完了', { 
      ファイル数: Object.keys(zip.files).length 
    });

    // 処理結果の統計情報
    const stats = {
      processedFiles: [],
      skippedFiles: [],
      splitFiles: {},
      errors: []
    };

    // 各GTFSファイルを処理
    for (const filename of GTFS_FILES) {
      try {
        const file = zip.file(filename);
        
        if (!file) {
          logger.warn(`ファイルが存在しません: ${filename}`);
          stats.skippedFiles.push(filename);
          continue;
        }

        logger.info(`処理中: ${filename}...`);
        
        // CSVテキストを読み込み
        const text = await file.async('text');
        
        // CSVをパースしてJSON配列に変換
        const data = parseCSV(text);
        logger.debug(`パース完了: ${filename}`, { レコード数: data.length });
        
        // テーブル名を決定（拡張子を除去）
        const tableName = filename.replace('.txt', '');
        
        // データサイズをチェック
        const dataSize = getDataSize(data);
        const dataSizeMB = dataSize / 1024 / 1024;
        logger.debug(`データサイズ: ${filename}`, { サイズ: `${dataSizeMB.toFixed(2)}MB` });
        
        // 25MBを超える場合は分割
        if (dataSize > MAX_FILE_SIZE_BYTES) {
          logger.warn(`データサイズが${MAX_FILE_SIZE_MB}MBを超えています。分割します: ${filename}`);
          const savedFiles = await splitAndSave(tableName, data, outputDir);
          stats.splitFiles[tableName] = savedFiles;
          stats.processedFiles.push(filename);
        } else {
          // 通常のファイルとして保存
          const outputPath = path.join(outputDir, `${tableName}.json`);
          await saveJson(outputPath, data);
          stats.processedFiles.push(filename);
        }
        
      } catch (error) {
        logger.error(`${filename}の処理中にエラーが発生しました`, error);
        stats.errors.push({
          file: filename,
          error: error.message
        });
        // エラーが発生しても他のファイルの処理を続行
      }
    }

    // メタデータファイルを生成
    const metadata = {
      source: path.basename(zipPath),
      processedAt: new Date().toISOString(),
      processedFiles: stats.processedFiles,
      skippedFiles: stats.skippedFiles,
      splitFiles: stats.splitFiles,
      errors: stats.errors,
      version: '1.0.0'
    };
    
    const metadataPath = path.join(outputDir, 'metadata.json');
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    logger.info('メタデータファイルを生成しました', { path: 'metadata.json' });

    // 統計情報を表示
    logger.complete('GTFS前処理', {
      処理済みファイル: stats.processedFiles.length,
      スキップされたファイル: stats.skippedFiles.length,
      分割されたファイル: Object.keys(stats.splitFiles).length,
      エラー: stats.errors.length,
      出力ディレクトリ: outputDir
    });

    return stats;
  } catch (error) {
    errorHandler.handleConversionError(error, zipPath);
  }
}

/**
 * ZIPファイルを検索（saga-current.zip または saga-YYYY-MM-DD.zip）
 * @param {string} dataDir - データディレクトリのパス
 * @returns {string|null} 見つかったZIPファイルのパス、見つからない場合はnull
 */
function findGTFSZipFile(dataDir = 'data') {
  // saga-current.zipを優先的に試行
  const currentZipPath = path.join(dataDir, 'saga-current.zip');
  if (fs.existsSync(currentZipPath)) {
    return currentZipPath;
  }

  // saga-YYYY-MM-DD.zipファイルを検索
  const files = fs.readdirSync(dataDir);
  const zipFiles = files
    .filter(file => file.startsWith('saga-') && file.endsWith('.zip'))
    .sort()
    .reverse(); // 最新の日付から試行

  if (zipFiles.length > 0) {
    return path.join(dataDir, zipFiles[0]);
  }

  return null;
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  
  // コマンドライン引数の解析
  let zipPath = args[0];
  const outputDir = args[1] || './gtfs-json';

  // ZIPファイルパスが指定されていない場合は自動検索
  if (!zipPath) {
    zipPath = findGTFSZipFile('data');
    if (!zipPath) {
      console.error('エラー: GTFS ZIPファイルが見つかりません');
      console.error('使用方法: node scripts/gtfs_to_json.js [zipPath] [outputDir]');
      console.error('例: node scripts/gtfs_to_json.js data/saga-current.zip ./gtfs-json');
      process.exit(1);
    }
  }

  // ZIPファイルの存在確認
  if (!fs.existsSync(zipPath)) {
    console.error(`エラー: ZIPファイルが見つかりません: ${zipPath}`);
    process.exit(1);
  }

  try {
    const stats = await processGTFSZip(zipPath, outputDir);
    
    // エラーがあった場合は終了コード1で終了
    if (stats.errors.length > 0) {
      console.error('\n✗ 一部のファイルの処理中にエラーが発生しました');
      process.exit(1);
    }
    
    console.log('✓ 前処理が正常に完了しました');
  } catch (error) {
    console.error(`\n✗ 前処理中に致命的なエラーが発生しました:`);
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
  processGTFSZip,
  parseCSV,
  parseCSVLine,
  getDataSize,
  splitIntoChunks,
  findGTFSZipFile
};
