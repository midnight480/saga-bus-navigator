#!/usr/bin/env node
/**
 * GTFS ZIPファイルを展開してJSONファイルに変換するビルド前処理スクリプト
 * 
 * このスクリプトは、ZIPファイルを展開して以下のJSONファイルを生成します：
 * - data/processed/stops.json
 * - data/processed/routes.json
 * - data/processed/trips.json
 * - data/processed/stop_times.json
 * - data/processed/calendar.json
 * - data/processed/agency.json
 * - data/processed/fare_attributes.json
 * - data/processed/fare_rules.json
 * - data/processed/feed_info.json
 * 
 * これにより、ブラウザ側でのZIP展開のオーバーヘッドを削減し、
 * 高速なデータ読み込みを実現します。
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const JSZip = require('jszip');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// GTFSファイル名のリスト
const GTFS_FILES = [
  'stops.txt',
  'routes.txt',
  'trips.txt',
  'stop_times.txt',
  'calendar.txt',
  'agency.txt',
  'fare_attributes.txt',
  'fare_rules.txt',
  'feed_info.txt'
];

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
      console.warn(`行${i + 1}: カラム数が一致しません（期待: ${headers.length}, 実際: ${values.length}）`);
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
 * GTFS ZIPファイルを処理
 * @param {string} zipPath - ZIPファイルのパス
 * @param {string} outputDir - 出力ディレクトリ
 */
async function processGTFSZip(zipPath, outputDir) {
  console.log(`\n=== GTFS ZIPファイルの前処理開始 ===`);
  console.log(`入力ファイル: ${zipPath}`);
  console.log(`出力ディレクトリ: ${outputDir}`);

  // 出力ディレクトリを作成
  await mkdir(outputDir, { recursive: true });

  // ZIPファイルを読み込み
  console.log('\nZIPファイルを読み込んでいます...');
  const zipBuffer = await readFile(zipPath);
  const zip = await JSZip.loadAsync(zipBuffer);
  console.log(`✓ ZIPファイル読み込み完了 (${Object.keys(zip.files).length}ファイル)`);

  // 各GTFSファイルを処理
  const processedFiles = [];
  const skippedFiles = [];

  for (const filename of GTFS_FILES) {
    try {
      const file = zip.file(filename);
      
      if (!file) {
        skippedFiles.push(filename);
        continue;
      }

      console.log(`\n処理中: ${filename}...`);
      const text = await file.async('text');
      const data = parseCSV(text);
      
      // JSONファイルに出力
      const jsonFilename = filename.replace('.txt', '.json');
      const outputPath = path.join(outputDir, jsonFilename);
      await writeFile(outputPath, JSON.stringify(data, null, 0), 'utf8');
      
      processedFiles.push(filename);
      console.log(`  ✓ ${jsonFilename} に出力 (${data.length}件)`);
    } catch (error) {
      console.error(`  ✗ ${filename} の処理中にエラー:`, error.message);
      skippedFiles.push(filename);
    }
  }

  // メタデータファイルを生成
  const metadata = {
    source: path.basename(zipPath),
    processedAt: new Date().toISOString(),
    processedFiles: processedFiles,
    skippedFiles: skippedFiles,
    version: '1.0.0'
  };
  
  const metadataPath = path.join(outputDir, 'metadata.json');
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  console.log(`\n✓ メタデータファイルを生成: metadata.json`);

  // 統計情報を表示
  console.log(`\n=== 処理完了 ===`);
  console.log(`処理済みファイル: ${processedFiles.length}件`);
  if (skippedFiles.length > 0) {
    console.log(`スキップされたファイル: ${skippedFiles.length}件`);
    skippedFiles.forEach(file => console.log(`  - ${file}`));
  }
  console.log(`出力ディレクトリ: ${outputDir}`);
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
  const today = new Date();
  const datePatterns = [];
  
  // 過去7日から未来7日までの日付パターンを生成
  for (let i = -7; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    datePatterns.push(`${year}-${month}-${day}`);
  }

  // 降順でソート（最新の日付から試行）
  datePatterns.sort().reverse();

  // 各日付パターンを試行
  for (const datePattern of datePatterns) {
    const zipPath = path.join(dataDir, `saga-${datePattern}.zip`);
    if (fs.existsSync(zipPath)) {
      return zipPath;
    }
  }

  return null;
}

/**
 * メイン処理
 * @param {boolean} silent - エラー時にプロセスを終了しない（開発サーバー用）
 */
async function main(silent = false) {
  // コマンドライン引数から--silentを除外
  const args = process.argv.slice(2).filter(arg => arg !== '--silent');
  const dataDir = args[0] || 'data';
  const outputDir = args[1] || 'data/processed';

  // ZIPファイルを検索
  const zipPath = findGTFSZipFile(dataDir);
  
  if (!zipPath) {
    const message = `警告: GTFS ZIPファイルが見つかりません (${dataDir}/saga-*.zip)`;
    if (silent) {
      console.warn(message);
      console.warn('JSONファイルが既に存在する場合は、それを使用します。');
      return;
    } else {
      console.error(message);
      console.error('使用方法: node scripts/preprocess-gtfs.js [dataDir] [outputDir]');
      process.exit(1);
    }
  }

  try {
    await processGTFSZip(zipPath, outputDir);
    console.log('\n✓ 前処理が正常に完了しました');
  } catch (error) {
    const message = `\n✗ 前処理中にエラーが発生しました: ${error.message}`;
    if (silent) {
      console.warn(message);
      console.warn('JSONファイルが既に存在する場合は、それを使用します。');
    } else {
      console.error(message);
      process.exit(1);
    }
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  // コマンドライン引数に --silent がある場合は警告のみ
  const silent = process.argv.includes('--silent');
  main(silent);
}

module.exports = { processGTFSZip, parseCSV, findGTFSZipFile, main };

