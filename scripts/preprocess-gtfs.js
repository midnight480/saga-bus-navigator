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
const DirectionDetector = require('../js/direction-detector');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// ===== プリビルドデータ生成関数 =====
// ブラウザ側の変換処理をビルド時に前処理することでページ読み込みを高速化

/**
 * カレンダー情報から曜日区分を判定（DataTransformer.determineWeekdayTypeと同等）
 */
function determineWeekdayType(calendar) {
  if (!calendar) return '平日';
  const serviceId = (calendar.service_id || '').toLowerCase();
  if (serviceId.includes('土日祝') || serviceId.includes('土曜') || serviceId.includes('日曜')) {
    return '土日祝';
  }
  if (calendar.monday === '1' && calendar.friday === '1' &&
      calendar.saturday === '0' && calendar.sunday === '0') {
    return '平日';
  }
  if (calendar.saturday === '1' || calendar.sunday === '1') {
    return '土日祝';
  }
  return '平日';
}

/**
 * バス停データを変換済み形式に変換（DataTransformer.transformStopsと同等）
 */
function buildPrebuiltBusStops(stopsData) {
  return stopsData
    .filter(row => row.location_type === '0')
    .map(row => ({
      id: row.stop_id,
      name: row.stop_name,
      lat: parseFloat(row.stop_lat),
      lng: parseFloat(row.stop_lon),
      parentStation: row.parent_station || null
    }));
}

/**
 * 方向情報を付与したtripsデータを生成（DataLoader.enrichTripsWithDirectionと同等）
 * ブラウザ側で重いstop_times走査を行う代わりに、ビルド時に計算する
 */
function buildEnrichedTrips(tripsData, stopTimesData) {
  const tripsByRoute = new Map();
  tripsData.forEach(trip => {
    if (!tripsByRoute.has(trip.route_id)) tripsByRoute.set(trip.route_id, []);
    tripsByRoute.get(trip.route_id).push(trip);
  });

  const enriched = tripsData.map(t => Object.assign({}, t));
  const enrichedById = new Map();
  enriched.forEach(t => enrichedById.set(t.trip_id, t));

  tripsByRoute.forEach((trips, routeId) => {
    const allHaveDirectionId = trips.every(t =>
      t.direction_id !== '' && t.direction_id !== null && t.direction_id !== undefined
    );

    if (allHaveDirectionId) {
      trips.forEach(t => { enrichedById.get(t.trip_id).direction = t.direction_id; });
      return;
    }

    const enrichedTripsForRoute = trips.map(t => enrichedById.get(t.trip_id));
    const directionMap = DirectionDetector.detectDirectionByStopSequence(
      routeId, enrichedTripsForRoute, stopTimesData
    );

    trips.forEach(t => {
      const et = enrichedById.get(t.trip_id);
      if (t.direction_id !== '' && t.direction_id !== null && t.direction_id !== undefined) {
        et.direction = t.direction_id;
      } else if (directionMap.has(t.trip_id)) {
        et.direction = directionMap.get(t.trip_id);
      } else {
        et.direction = 'unknown';
      }
    });
  });

  return enriched;
}

/**
 * 運賃データを変換済み形式に変換（DataTransformer.transformFaresと同等）
 */
function buildPrebuiltFares(fareAttributesData) {
  return fareAttributesData.map(fare => ({
    fareId: fare.fare_id,
    price: parseFloat(fare.price),
    currencyType: fare.currency_type,
    paymentMethod: parseInt(fare.payment_method),
    transfers: parseInt(fare.transfers),
    agencyId: fare.agency_id
  }));
}

/**
 * 運賃ルールを変換済み形式に変換（DataTransformer.transformFareRulesと同等）
 */
function buildPrebuiltFareRules(fareRulesData) {
  return fareRulesData.map(rule => ({
    fareId: rule.fare_id,
    routeId: rule.route_id || null,
    originId: rule.origin_id || null,
    destinationId: rule.destination_id || null,
    containsId: rule.contains_id || null
  }));
}

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
 * 大きな配列を複数のファイルに分割（Cloudflare Pagesの25MB制限対応）
 * @param {Array} data - 分割するデータ配列
 * @param {string} baseFilename - ベースファイル名（拡張子なし）
 * @param {string} outputDir - 出力ディレクトリ
 * @param {number} maxSizeMB - 1ファイルあたりの最大サイズ（MB、デフォルト: 20MB）
 * @returns {Array<string>} 生成されたファイル名のリスト
 */
async function splitLargeFile(data, baseFilename, outputDir, maxSizeMB = 20) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const files = [];
  let currentChunk = [];
  let currentSize = 0;
  let chunkIndex = 0;

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const itemJson = JSON.stringify(item);
    const itemSize = Buffer.byteLength(itemJson, 'utf8');

    // 現在のチャンクに追加すると制限を超える場合
    if (currentSize + itemSize > maxSizeBytes && currentChunk.length > 0) {
      // 現在のチャンクをファイルに出力
      const chunkFilename = `${baseFilename}.part${chunkIndex}.json`;
      const chunkPath = path.join(outputDir, chunkFilename);
      await writeFile(chunkPath, JSON.stringify(currentChunk, null, 0), 'utf8');
      files.push(chunkFilename);
      console.log(`  ✓ ${chunkFilename} に出力 (${currentChunk.length}件, ${(currentSize / 1024 / 1024).toFixed(2)}MB)`);
      
      // 新しいチャンクを開始
      currentChunk = [];
      currentSize = 0;
      chunkIndex++;
    }

    currentChunk.push(item);
    currentSize += itemSize;
  }

  // 最後のチャンクを出力
  if (currentChunk.length > 0) {
    const chunkFilename = chunkIndex === 0 
      ? `${baseFilename}.json`  // 1ファイルに収まる場合は通常のファイル名
      : `${baseFilename}.part${chunkIndex}.json`;
    const chunkPath = path.join(outputDir, chunkFilename);
    await writeFile(chunkPath, JSON.stringify(currentChunk, null, 0), 'utf8');
    files.push(chunkFilename);
    console.log(`  ✓ ${chunkFilename} に出力 (${currentChunk.length}件, ${(currentSize / 1024 / 1024).toFixed(2)}MB)`);
  }

  return files;
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
  const splitFiles = {}; // 分割されたファイルの情報
  const parsedData = {}; // プリビルド生成のために全ファイルのパース結果を保持

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

      // JSONファイル名を決定
      const jsonFilename = filename.replace('.txt', '.json');
      const baseFilename = filename.replace('.txt', '');
      const outputPath = path.join(outputDir, jsonFilename);

      // プリビルド生成用にパース結果を保持
      parsedData[baseFilename] = data;

      // ファイルサイズをチェック（25MB制限を考慮して20MBで分割）
      const jsonString = JSON.stringify(data, null, 0);
      const fileSize = Buffer.byteLength(jsonString, 'utf8');
      const fileSizeMB = fileSize / 1024 / 1024;

      if (fileSizeMB > 20) {
        // 大きなファイルは分割
        console.log(`  ファイルサイズが大きいため分割します (${fileSizeMB.toFixed(2)}MB)`);
        const splitFileList = await splitLargeFile(data, baseFilename, outputDir, 20);
        splitFiles[baseFilename] = splitFileList;
        processedFiles.push(filename);
        console.log(`  ✓ ${splitFileList.length}個のファイルに分割`);
      } else {
        // 通常のファイルとして出力
        await writeFile(outputPath, jsonString, 'utf8');
        processedFiles.push(filename);
        console.log(`  ✓ ${jsonFilename} に出力 (${data.length}件, ${fileSizeMB.toFixed(2)}MB)`);
      }
    } catch (error) {
      console.error(`  ✗ ${filename} の処理中にエラー:`, error.message);
      skippedFiles.push(filename);
    }
  }

  // ===== プリビルドデータの生成 =====
  // ブラウザ側の変換処理（DataTransformer / DirectionDetector）をビルド時に前処理して
  // ページ読み込み時のCPU処理を削減する
  const prebuilt = {};
  const hasRequiredData = parsedData.stops && parsedData.stop_times &&
                          parsedData.trips && parsedData.routes &&
                          parsedData.calendar && parsedData.agency;

  if (hasRequiredData) {
    console.log('\nプリビルドデータを生成しています...');
    try {
      // 1. 変換済みバス停データ（transformStopsに相当）
      const busStops = buildPrebuiltBusStops(parsedData.stops);
      await writeFile(path.join(outputDir, 'bus_stops_prebuilt.json'), JSON.stringify(busStops), 'utf8');
      prebuilt.busStops = 'bus_stops_prebuilt.json';
      console.log(`  ✓ bus_stops_prebuilt.json (${busStops.length}件)`);

      // 2. 方向情報付与済みtripsデータ（enrichTripsWithDirectionに相当）
      // DirectionDetector.detectDirectionByStopSequenceのstop_times走査をビルド時に実行
      console.log('  方向情報を検出しています...');
      const enrichedTrips = buildEnrichedTrips(parsedData.trips, parsedData.stop_times);
      await writeFile(path.join(outputDir, 'trips_with_direction.json'), JSON.stringify(enrichedTrips), 'utf8');
      prebuilt.tripsWithDirection = 'trips_with_direction.json';
      console.log(`  ✓ trips_with_direction.json (${enrichedTrips.length}件)`);

      // 3. 変換済み運賃データ（transformFaresに相当）
      if (parsedData.fare_attributes && parsedData.fare_attributes.length > 0) {
        const fares = buildPrebuiltFares(parsedData.fare_attributes);
        await writeFile(path.join(outputDir, 'fares_prebuilt.json'), JSON.stringify(fares), 'utf8');
        prebuilt.fares = 'fares_prebuilt.json';
        console.log(`  ✓ fares_prebuilt.json (${fares.length}件)`);
      }

      // 4. 変換済み運賃ルールデータ（transformFareRulesに相当）
      if (parsedData.fare_rules && parsedData.fare_rules.length > 0) {
        const fareRulesTransformed = buildPrebuiltFareRules(parsedData.fare_rules);
        await writeFile(path.join(outputDir, 'fare_rules_prebuilt.json'), JSON.stringify(fareRulesTransformed), 'utf8');
        prebuilt.fareRules = 'fare_rules_prebuilt.json';
        console.log(`  ✓ fare_rules_prebuilt.json (${fareRulesTransformed.length}件)`);
      }

      console.log(`  ✓ プリビルドデータ生成完了`);
    } catch (error) {
      console.warn(`  ⚠️ プリビルドデータ生成に失敗しました（フォールバックとして通常処理を使用）: ${error.message}`);
    }
  }

  // メタデータファイルを生成
  const metadata = {
    source: path.basename(zipPath),
    processedAt: new Date().toISOString(),
    processedFiles: processedFiles,
    skippedFiles: skippedFiles,
    splitFiles: splitFiles, // 分割されたファイルの情報
    ...(Object.keys(prebuilt).length > 0 ? { prebuilt } : {}),
    version: '1.0.0'
  };

  const metadataPath = path.join(outputDir, 'metadata.json');
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  console.log(`\n✓ メタデータファイルを生成: metadata.json`);
  if (Object.keys(splitFiles).length > 0) {
    console.log(`  分割されたファイル: ${Object.keys(splitFiles).join(', ')}`);
  }
  if (Object.keys(prebuilt).length > 0) {
    console.log(`  プリビルドファイル: ${Object.keys(prebuilt).join(', ')}`);
  }

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

