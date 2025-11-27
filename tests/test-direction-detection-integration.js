// 方向判定統合テスト用スクリプト

const resultDiv = document.getElementById('result');
const consoleLogsDiv = document.getElementById('console-logs');
const loadBtn = document.getElementById('loadBtn');

// コンソールログをキャプチャ
const capturedLogs = [];
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = function(...args) {
  capturedLogs.push({ type: 'log', message: args.join(' ') });
  originalLog.apply(console, args);
};

console.warn = function(...args) {
  capturedLogs.push({ type: 'warn', message: args.join(' ') });
  originalWarn.apply(console, args);
};

console.error = function(...args) {
  capturedLogs.push({ type: 'error', message: args.join(' ') });
  originalError.apply(console, args);
};

// ページ読み込み時にJavaScriptファイルが正しく読み込まれたか確認
window.addEventListener('DOMContentLoaded', () => {
  console.log('ページ読み込み完了');
  console.log('JSZip:', typeof JSZip !== 'undefined' ? '✓' : '✗');
  console.log('DirectionDetector:', typeof DirectionDetector !== 'undefined' ? '✓' : '✗');
  console.log('DataLoader:', typeof DataLoader !== 'undefined' ? '✓' : '✗');
});

loadBtn.addEventListener('click', async () => {
  resultDiv.textContent = '読み込み中...';
  consoleLogsDiv.innerHTML = '';
  capturedLogs.length = 0;
  
  try {
    // DataLoaderが定義されているか確認
    if (typeof DataLoader === 'undefined') {
      throw new Error('DataLoaderが定義されていません。data-loader.jsが正しく読み込まれているか確認してください。');
    }
    
    const loader = new DataLoader();
    const startTime = performance.now();
    
    // loadAllDataOnce()を実行
    await loader.loadAllDataOnce();
    
    const endTime = performance.now();
    const loadTime = (endTime - startTime).toFixed(2);

    // データを取得
    const trips = loader.trips || [];
    const timetable = loader.timetable || [];
    const routeMetadata = loader.routeMetadata || new Map();

    // 検証結果を作成
    let html = `<h2>読み込み成功！（${loadTime}ms）</h2>`;
    
    // 要件1.2: 全てのtripにdirectionプロパティが設定されていることを確認
    const tripsWithDirection = trips.filter(t => t.direction !== undefined && t.direction !== null);
    const directionCoverage = trips.length > 0 ? (tripsWithDirection.length / trips.length * 100).toFixed(1) : 0;
    html += `<h3>Trip方向情報: ${tripsWithDirection.length}/${trips.length}件 (${directionCoverage}%)</h3>`;
    html += `<div id="trip-direction-status">${tripsWithDirection.length === trips.length ? '✓ 全てのtripに方向情報が設定されています' : '✗ 一部のtripに方向情報が設定されていません'}</div>`;
    
    // サンプルtripを表示
    if (trips.length > 0) {
      html += `<h4>サンプルTrip（最初の3件）:</h4>`;
      html += `<pre>${JSON.stringify(trips.slice(0, 3).map(t => ({
        trip_id: t.trip_id,
        route_id: t.route_id,
        direction_id: t.direction_id,
        direction: t.direction
      })), null, 2)}</pre>`;
    }
    
    // 要件3.4: 時刻表データにdirectionフィールドが含まれることを確認
    const timetableWithDirection = timetable.filter(t => t.direction !== undefined && t.direction !== null);
    const timetableDirectionCoverage = timetable.length > 0 ? (timetableWithDirection.length / timetable.length * 100).toFixed(1) : 0;
    html += `<h3>時刻表方向情報: ${timetableWithDirection.length}/${timetable.length}件 (${timetableDirectionCoverage}%)</h3>`;
    html += `<div id="timetable-direction-status">${timetableWithDirection.length === timetable.length ? '✓ 全ての時刻表エントリに方向情報が設定されています' : '✗ 一部の時刻表エントリに方向情報が設定されていません'}</div>`;
    
    // サンプル時刻表を表示
    if (timetable.length > 0) {
      html += `<h4>サンプル時刻表（最初の3件）:</h4>`;
      html += `<pre>${JSON.stringify(timetable.slice(0, 3).map(t => ({
        stopId: t.stopId,
        routeId: t.routeId,
        tripId: t.tripId,
        direction: t.direction,
        arrivalTime: t.arrivalTime
      })), null, 2)}</pre>`;
    }
    
    // 要件5.4: 統計情報の表示
    html += `<h3>路線メタデータ統計:</h3>`;
    html += `<div id="route-metadata-count">路線数: ${routeMetadata.size}件</div>`;
    
    if (routeMetadata.size > 0) {
      const metadataArray = Array.from(routeMetadata.values());
      const avgDetectionRate = metadataArray.reduce((sum, m) => sum + (m.directionDetectionRate || 0), 0) / metadataArray.size;
      html += `<div id="avg-detection-rate">平均方向判定成功率: ${(avgDetectionRate * 100).toFixed(1)}%</div>`;
      
      // サンプルメタデータを表示
      html += `<h4>サンプル路線メタデータ（最初の3件）:</h4>`;
      html += `<pre>${JSON.stringify(metadataArray.slice(0, 3).map(m => ({
        routeId: m.routeId,
        routeName: m.routeName,
        tripCount: m.tripCount,
        directionDetectionRate: m.directionDetectionRate,
        detectionMethod: m.detectionMethod,
        unknownDirectionCount: m.unknownDirectionCount
      })), null, 2)}</pre>`;
    }
    
    // コンソールログを表示
    html += `<h3>コンソールログ:</h3>`;
    html += `<div id="console-log-count">ログ件数: ${capturedLogs.length}件</div>`;
    
    // 方向判定関連のログを抽出
    const directionLogs = capturedLogs.filter(log => 
      log.message.includes('方向判定') || 
      log.message.includes('direction') ||
      log.message.includes('enrichTripsWithDirection')
    );
    html += `<div id="direction-log-count">方向判定関連ログ: ${directionLogs.length}件</div>`;
    
    if (directionLogs.length > 0) {
      html += `<h4>方向判定関連ログ:</h4>`;
      html += `<pre id="direction-logs">${directionLogs.map(log => `[${log.type}] ${log.message}`).join('\n')}</pre>`;
    }

    resultDiv.innerHTML = html;
    
    // 全てのコンソールログを表示
    consoleLogsDiv.innerHTML = `<h3>全てのコンソールログ:</h3><pre>${capturedLogs.map(log => `[${log.type}] ${log.message}`).join('\n')}</pre>`;
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
    resultDiv.innerHTML = `<h2 style="color: red;">エラー</h2><pre>メッセージ: ${error.message}\n\nスタックトレース:\n${error.stack || 'スタックトレースなし'}</pre>`;
    consoleLogsDiv.innerHTML = `<h3>コンソールログ:</h3><pre>${capturedLogs.map(log => `[${log.type}] ${log.message}`).join('\n')}</pre>`;
  }
});
