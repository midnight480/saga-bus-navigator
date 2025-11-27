/**
 * DataLoader.enrichTripsWithDirection()のエラー処理統合テスト
 * 
 * タスク7: エラー処理の統合テストを作成
 * 検証: 要件6.4, 6.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// DataLoaderとDirectionDetectorをグローバルスコープから取得
const getDataLoader = () => {
  if (typeof window !== 'undefined' && window.DataLoader) {
    return window.DataLoader;
  }
  if (typeof global !== 'undefined' && global.DataLoader) {
    return global.DataLoader;
  }
  throw new Error('DataLoaderが見つかりません');
};

const getDirectionDetector = () => {
  if (typeof window !== 'undefined' && window.DirectionDetector) {
    return window.DirectionDetector;
  }
  if (typeof global !== 'undefined' && global.DirectionDetector) {
    return global.DirectionDetector;
  }
  throw new Error('DirectionDetectorが見つかりません');
};

describe('DataLoader.enrichTripsWithDirection() エラー処理統合テスト', () => {
  let DataLoader;
  let DirectionDetector;
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(async () => {
    // data-loader.jsとdirection-detector.jsを読み込み
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const dataLoaderCode = fs.readFileSync(
      path.join(__dirname, '../js/data-loader.js'),
      'utf-8'
    );
    const directionDetectorCode = fs.readFileSync(
      path.join(__dirname, '../js/direction-detector.js'),
      'utf-8'
    );
    
    // グローバルスコープで実行
    global.window = global;
    eval(directionDetectorCode);
    eval(dataLoaderCode);
    
    DataLoader = getDataLoader();
    DirectionDetector = getDirectionDetector();
    
    // キャッシュをクリア
    DirectionDetector.directionCache.clear();
    
    // console.errorとconsole.logをスパイ
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // スパイをリストア
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  /**
   * 統合テスト1: 一部の路線でエラーが発生しても他の路線が処理される
   * 
   * 検証: 要件6.4
   */
  it('統合テスト1: 一部の路線でエラーが発生しても他の路線が処理されることを検証', () => {
    const loader = new DataLoader();
    
    // 3つの路線を作成
    loader.trips = [
      // route_1: エラーを発生させる路線
      { trip_id: 'trip_1_1', route_id: 'route_1', direction_id: '', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_1_2', route_id: 'route_1', direction_id: '', trip_headsign: '県庁前' },
      
      // route_2: 正常に処理される路線
      { trip_id: 'trip_2_1', route_id: 'route_2', direction_id: '', trip_headsign: 'バスセンター' },
      { trip_id: 'trip_2_2', route_id: 'route_2', direction_id: '', trip_headsign: '市役所' },
      
      // route_3: 正常に処理される路線
      { trip_id: 'trip_3_1', route_id: 'route_3', direction_id: '', trip_headsign: '駅前' },
      { trip_id: 'trip_3_2', route_id: 'route_3', direction_id: '', trip_headsign: '空港' }
    ];
    
    loader.stopTimes = [
      // route_1のstopTimes
      { trip_id: 'trip_1_1', stop_id: 'stop_1', stop_sequence: '1', arrival_time: '10:00:00' },
      { trip_id: 'trip_1_1', stop_id: 'stop_2', stop_sequence: '2', arrival_time: '10:10:00' },
      { trip_id: 'trip_1_2', stop_id: 'stop_2', stop_sequence: '1', arrival_time: '11:00:00' },
      { trip_id: 'trip_1_2', stop_id: 'stop_1', stop_sequence: '2', arrival_time: '11:10:00' },
      
      // route_2のstopTimes
      { trip_id: 'trip_2_1', stop_id: 'stop_3', stop_sequence: '1', arrival_time: '12:00:00' },
      { trip_id: 'trip_2_1', stop_id: 'stop_4', stop_sequence: '2', arrival_time: '12:10:00' },
      { trip_id: 'trip_2_2', stop_id: 'stop_4', stop_sequence: '1', arrival_time: '13:00:00' },
      { trip_id: 'trip_2_2', stop_id: 'stop_3', stop_sequence: '2', arrival_time: '13:10:00' },
      
      // route_3のstopTimes
      { trip_id: 'trip_3_1', stop_id: 'stop_5', stop_sequence: '1', arrival_time: '14:00:00' },
      { trip_id: 'trip_3_1', stop_id: 'stop_6', stop_sequence: '2', arrival_time: '14:10:00' },
      { trip_id: 'trip_3_2', stop_id: 'stop_6', stop_sequence: '1', arrival_time: '15:00:00' },
      { trip_id: 'trip_3_2', stop_id: 'stop_5', stop_sequence: '2', arrival_time: '15:10:00' }
    ];
    
    // DirectionDetector.detectDirectionByStopSequence()をモック化してroute_1でエラーを発生させる
    const originalDetect = DirectionDetector.detectDirectionByStopSequence;
    DirectionDetector.detectDirectionByStopSequence = vi.fn((routeId, trips, stopTimes) => {
      if (routeId === 'route_1') {
        throw new Error('テスト用エラー: route_1の方向判定に失敗');
      }
      return originalDetect.call(DirectionDetector, routeId, trips, stopTimes);
    });
    
    // enrichTripsWithDirection()を実行
    loader.enrichTripsWithDirection();
    
    // エラーログが出力されたことを確認
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'DataLoader.enrichTripsWithDirection: 路線route_1の方向判定中にエラーが発生しました',
      expect.any(Error)
    );
    
    // route_1のtripは全てunknownに設定されている
    expect(loader.trips[0].direction).toBe('unknown');
    expect(loader.trips[1].direction).toBe('unknown');
    
    // route_2とroute_3のtripは正常に処理されている
    expect(loader.trips[2].direction).toBeDefined();
    expect(['0', '1', 'unknown']).toContain(loader.trips[2].direction);
    expect(loader.trips[3].direction).toBeDefined();
    expect(['0', '1', 'unknown']).toContain(loader.trips[3].direction);
    expect(loader.trips[4].direction).toBeDefined();
    expect(['0', '1', 'unknown']).toContain(loader.trips[4].direction);
    expect(loader.trips[5].direction).toBeDefined();
    expect(['0', '1', 'unknown']).toContain(loader.trips[5].direction);
    
    // モックをリストア
    DirectionDetector.detectDirectionByStopSequence = originalDetect;
  });

  /**
   * 統合テスト2: 成功数と失敗数のログ出力を検証
   * 
   * 検証: 要件6.5
   */
  it('統合テスト2: 成功数と失敗数のログ出力を検証', () => {
    const loader = new DataLoader();
    loader.debugMode = true; // デバッグモードを有効化
    
    // 5つの路線を作成（2つはエラー、3つは成功）
    loader.trips = [
      // route_1: エラーを発生させる路線
      { trip_id: 'trip_1_1', route_id: 'route_1', direction_id: '', trip_headsign: '佐賀駅' },
      
      // route_2: 正常に処理される路線
      { trip_id: 'trip_2_1', route_id: 'route_2', direction_id: '', trip_headsign: 'バスセンター' },
      
      // route_3: エラーを発生させる路線
      { trip_id: 'trip_3_1', route_id: 'route_3', direction_id: '', trip_headsign: '駅前' },
      
      // route_4: 正常に処理される路線
      { trip_id: 'trip_4_1', route_id: 'route_4', direction_id: '', trip_headsign: '市役所' },
      
      // route_5: 正常に処理される路線
      { trip_id: 'trip_5_1', route_id: 'route_5', direction_id: '', trip_headsign: '空港' }
    ];
    
    loader.stopTimes = [
      { trip_id: 'trip_1_1', stop_id: 'stop_1', stop_sequence: '1', arrival_time: '10:00:00' },
      { trip_id: 'trip_2_1', stop_id: 'stop_2', stop_sequence: '1', arrival_time: '11:00:00' },
      { trip_id: 'trip_3_1', stop_id: 'stop_3', stop_sequence: '1', arrival_time: '12:00:00' },
      { trip_id: 'trip_4_1', stop_id: 'stop_4', stop_sequence: '1', arrival_time: '13:00:00' },
      { trip_id: 'trip_5_1', stop_id: 'stop_5', stop_sequence: '1', arrival_time: '14:00:00' }
    ];
    
    // DirectionDetector.detectDirectionByStopSequence()をモック化
    const originalDetect = DirectionDetector.detectDirectionByStopSequence;
    DirectionDetector.detectDirectionByStopSequence = vi.fn((routeId, trips, stopTimes) => {
      if (routeId === 'route_1' || routeId === 'route_3') {
        throw new Error(`テスト用エラー: ${routeId}の方向判定に失敗`);
      }
      return originalDetect.call(DirectionDetector, routeId, trips, stopTimes);
    });
    
    // enrichTripsWithDirection()を実行
    loader.enrichTripsWithDirection();
    
    // ログ出力を検証
    // logDebugメソッドはconsole.logを使用しているため、console.logのスパイを確認
    const logCalls = consoleLogSpy.mock.calls;
    
    // '方向判定完了'のログを探す
    const completionLog = logCalls.find(call => 
      call[0] && call[0].includes && call[0].includes('方向判定完了')
    );
    
    expect(completionLog).toBeDefined();
    
    // ログの詳細を確認
    if (completionLog && completionLog[1]) {
      const logDetails = completionLog[1];
      
      // 全路線数が5であることを確認
      expect(logDetails.totalRoutes).toBe(5);
      
      // 成功数が3であることを確認
      expect(logDetails.successCount).toBe(3);
      
      // 失敗数が2であることを確認
      expect(logDetails.failureCount).toBe(2);
      
      // スキップ数が0であることを確認
      expect(logDetails.skippedCount).toBe(0);
    }
    
    // エラーログが2回出力されたことを確認
    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'DataLoader.enrichTripsWithDirection: 路線route_1の方向判定中にエラーが発生しました',
      expect.any(Error)
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'DataLoader.enrichTripsWithDirection: 路線route_3の方向判定中にエラーが発生しました',
      expect.any(Error)
    );
    
    // モックをリストア
    DirectionDetector.detectDirectionByStopSequence = originalDetect;
  });

  /**
   * 統合テスト3: 全ての路線が成功した場合のログ出力を検証
   * 
   * 検証: 要件6.5
   */
  it('統合テスト3: 全ての路線が成功した場合のログ出力を検証', () => {
    const loader = new DataLoader();
    loader.debugMode = true; // デバッグモードを有効化
    
    // 3つの路線を作成（全て成功）
    loader.trips = [
      { trip_id: 'trip_1_1', route_id: 'route_1', direction_id: '', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_1_2', route_id: 'route_1', direction_id: '', trip_headsign: '県庁前' },
      { trip_id: 'trip_2_1', route_id: 'route_2', direction_id: '', trip_headsign: 'バスセンター' },
      { trip_id: 'trip_2_2', route_id: 'route_2', direction_id: '', trip_headsign: '市役所' },
      { trip_id: 'trip_3_1', route_id: 'route_3', direction_id: '', trip_headsign: '駅前' },
      { trip_id: 'trip_3_2', route_id: 'route_3', direction_id: '', trip_headsign: '空港' }
    ];
    
    loader.stopTimes = [
      { trip_id: 'trip_1_1', stop_id: 'stop_1', stop_sequence: '1', arrival_time: '10:00:00' },
      { trip_id: 'trip_1_1', stop_id: 'stop_2', stop_sequence: '2', arrival_time: '10:10:00' },
      { trip_id: 'trip_1_2', stop_id: 'stop_2', stop_sequence: '1', arrival_time: '11:00:00' },
      { trip_id: 'trip_1_2', stop_id: 'stop_1', stop_sequence: '2', arrival_time: '11:10:00' },
      { trip_id: 'trip_2_1', stop_id: 'stop_3', stop_sequence: '1', arrival_time: '12:00:00' },
      { trip_id: 'trip_2_1', stop_id: 'stop_4', stop_sequence: '2', arrival_time: '12:10:00' },
      { trip_id: 'trip_2_2', stop_id: 'stop_4', stop_sequence: '1', arrival_time: '13:00:00' },
      { trip_id: 'trip_2_2', stop_id: 'stop_3', stop_sequence: '2', arrival_time: '13:10:00' },
      { trip_id: 'trip_3_1', stop_id: 'stop_5', stop_sequence: '1', arrival_time: '14:00:00' },
      { trip_id: 'trip_3_1', stop_id: 'stop_6', stop_sequence: '2', arrival_time: '14:10:00' },
      { trip_id: 'trip_3_2', stop_id: 'stop_6', stop_sequence: '1', arrival_time: '15:00:00' },
      { trip_id: 'trip_3_2', stop_id: 'stop_5', stop_sequence: '2', arrival_time: '15:10:00' }
    ];
    
    // enrichTripsWithDirection()を実行
    loader.enrichTripsWithDirection();
    
    // ログ出力を検証
    const logCalls = consoleLogSpy.mock.calls;
    
    // '方向判定完了'のログを探す
    const completionLog = logCalls.find(call => 
      call[0] && call[0].includes && call[0].includes('方向判定完了')
    );
    
    expect(completionLog).toBeDefined();
    
    // ログの詳細を確認
    if (completionLog && completionLog[1]) {
      const logDetails = completionLog[1];
      
      // 全路線数が3であることを確認
      expect(logDetails.totalRoutes).toBe(3);
      
      // 成功数が3であることを確認
      expect(logDetails.successCount).toBe(3);
      
      // 失敗数が0であることを確認
      expect(logDetails.failureCount).toBe(0);
      
      // スキップ数が0であることを確認
      expect(logDetails.skippedCount).toBe(0);
    }
    
    // エラーログが出力されていないことを確認
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  /**
   * 統合テスト4: direction_idが設定されている路線がスキップされることを検証
   * 
   * 検証: 要件6.5
   */
  it('統合テスト4: direction_idが設定されている路線がスキップされることを検証', () => {
    const loader = new DataLoader();
    loader.debugMode = true; // デバッグモードを有効化
    
    // 2つの路線を作成（1つはdirection_id設定済み、1つは未設定）
    loader.trips = [
      // route_1: direction_idが設定されている（スキップされる）
      { trip_id: 'trip_1_1', route_id: 'route_1', direction_id: '0', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_1_2', route_id: 'route_1', direction_id: '1', trip_headsign: '県庁前' },
      
      // route_2: direction_idが未設定（処理される）
      { trip_id: 'trip_2_1', route_id: 'route_2', direction_id: '', trip_headsign: 'バスセンター' },
      { trip_id: 'trip_2_2', route_id: 'route_2', direction_id: '', trip_headsign: '市役所' }
    ];
    
    loader.stopTimes = [
      { trip_id: 'trip_1_1', stop_id: 'stop_1', stop_sequence: '1', arrival_time: '10:00:00' },
      { trip_id: 'trip_1_2', stop_id: 'stop_2', stop_sequence: '1', arrival_time: '11:00:00' },
      { trip_id: 'trip_2_1', stop_id: 'stop_3', stop_sequence: '1', arrival_time: '12:00:00' },
      { trip_id: 'trip_2_1', stop_id: 'stop_4', stop_sequence: '2', arrival_time: '12:10:00' },
      { trip_id: 'trip_2_2', stop_id: 'stop_4', stop_sequence: '1', arrival_time: '13:00:00' },
      { trip_id: 'trip_2_2', stop_id: 'stop_3', stop_sequence: '2', arrival_time: '13:10:00' }
    ];
    
    // enrichTripsWithDirection()を実行
    loader.enrichTripsWithDirection();
    
    // ログ出力を検証
    const logCalls = consoleLogSpy.mock.calls;
    
    // '方向判定完了'のログを探す
    const completionLog = logCalls.find(call => 
      call[0] && call[0].includes && call[0].includes('方向判定完了')
    );
    
    expect(completionLog).toBeDefined();
    
    // ログの詳細を確認
    if (completionLog && completionLog[1]) {
      const logDetails = completionLog[1];
      
      // 全路線数が2であることを確認
      expect(logDetails.totalRoutes).toBe(2);
      
      // 成功数が1であることを確認（route_2のみ）
      expect(logDetails.successCount).toBe(1);
      
      // 失敗数が0であることを確認
      expect(logDetails.failureCount).toBe(0);
      
      // スキップ数が1であることを確認（route_1）
      expect(logDetails.skippedCount).toBe(1);
    }
    
    // route_1のtripはdirection_idがそのままdirectionにコピーされている
    expect(loader.trips[0].direction).toBe('0');
    expect(loader.trips[1].direction).toBe('1');
    
    // route_2のtripは正常に処理されている
    expect(loader.trips[2].direction).toBeDefined();
    expect(['0', '1', 'unknown']).toContain(loader.trips[2].direction);
    expect(loader.trips[3].direction).toBeDefined();
    expect(['0', '1', 'unknown']).toContain(loader.trips[3].direction);
  });
});
