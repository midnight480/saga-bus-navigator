/**
 * DataLoader.enrichTripsWithDirection()のエッジケーステスト
 * 
 * 検証: 要件6.1, 6.2, 6.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

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

describe('DataLoader.enrichTripsWithDirection() エッジケーステスト', () => {
  let DataLoader;
  let DirectionDetector;
  let consoleWarnSpy;
  let consoleErrorSpy;

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
    
    // console.warnとconsole.errorをスパイ
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // スパイをリストア
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  /**
   * エッジケース1: 空のstopTimesデータのテスト
   * 
   * 検証: 要件6.1
   */
  it('エッジケース1: stopTimesが空の場合、警告ログを出力し、全てのtripにデフォルト値を設定', () => {
    const loader = new DataLoader();
    loader.trips = [
      { trip_id: 'trip_1', route_id: 'route_1', direction_id: '', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_2', route_id: 'route_1', direction_id: '1', trip_headsign: '県庁前' },
      { trip_id: 'trip_3', route_id: 'route_2', direction_id: null, trip_headsign: null }
    ];
    loader.stopTimes = [];
    
    // enrichTripsWithDirection()を実行
    loader.enrichTripsWithDirection();
    
    // 警告ログが出力されたことを確認
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'DataLoader.enrichTripsWithDirection: stopTimesデータが空です'
    );
    
    // 全てのtripがdirectionプロパティを持つことを確認
    expect(loader.trips[0].direction).toBe('unknown'); // direction_idが空文字列
    expect(loader.trips[1].direction).toBe('1'); // direction_idが設定されている
    expect(loader.trips[2].direction).toBe('unknown'); // direction_idがnull
  });

  /**
   * エッジケース2: 空のtripsデータのテスト
   * 
   * 検証: 要件6.2
   */
  it('エッジケース2: tripsが空の場合、警告ログを出力し、処理をスキップ', () => {
    const loader = new DataLoader();
    loader.trips = [];
    loader.stopTimes = [
      { trip_id: 'trip_1', stop_id: 'stop_1', stop_sequence: '1', arrival_time: '10:00:00' },
      { trip_id: 'trip_1', stop_id: 'stop_2', stop_sequence: '2', arrival_time: '10:10:00' }
    ];
    
    // enrichTripsWithDirection()を実行
    loader.enrichTripsWithDirection();
    
    // 警告ログが出力されたことを確認
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'DataLoader.enrichTripsWithDirection: tripsデータが空です'
    );
    
    // tripsが空のままであることを確認
    expect(loader.trips.length).toBe(0);
  });

  /**
   * エッジケース3: 方向判定中の例外処理のテスト
   * 
   * 検証: 要件6.3
   */
  it('エッジケース3: 方向判定中に例外が発生した場合、エラーログを出力し、該当路線の全tripをunknownに設定', () => {
    const loader = new DataLoader();
    loader.trips = [
      { trip_id: 'trip_1', route_id: 'route_1', direction_id: '', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_2', route_id: 'route_1', direction_id: '', trip_headsign: '県庁前' },
      { trip_id: 'trip_3', route_id: 'route_2', direction_id: '', trip_headsign: 'バスセンター' }
    ];
    loader.stopTimes = [
      { trip_id: 'trip_1', stop_id: 'stop_1', stop_sequence: '1', arrival_time: '10:00:00' },
      { trip_id: 'trip_1', stop_id: 'stop_2', stop_sequence: '2', arrival_time: '10:10:00' },
      { trip_id: 'trip_2', stop_id: 'stop_2', stop_sequence: '1', arrival_time: '11:00:00' },
      { trip_id: 'trip_2', stop_id: 'stop_1', stop_sequence: '2', arrival_time: '11:10:00' },
      { trip_id: 'trip_3', stop_id: 'stop_3', stop_sequence: '1', arrival_time: '12:00:00' },
      { trip_id: 'trip_3', stop_id: 'stop_4', stop_sequence: '2', arrival_time: '12:10:00' }
    ];
    
    // DirectionDetector.detectDirectionByStopSequence()をモック化して例外を発生させる
    const originalDetect = DirectionDetector.detectDirectionByStopSequence;
    DirectionDetector.detectDirectionByStopSequence = vi.fn((routeId, trips, stopTimes) => {
      if (routeId === 'route_1') {
        throw new Error('テスト用の例外');
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
    
    // route_1のtripが全てunknownに設定されていることを確認
    expect(loader.trips[0].direction).toBe('unknown');
    expect(loader.trips[1].direction).toBe('unknown');
    
    // route_2のtripは正常に処理されていることを確認
    expect(loader.trips[2].direction).toBeDefined();
    expect(['0', '1', 'unknown']).toContain(loader.trips[2].direction);
    
    // モックをリストア
    DirectionDetector.detectDirectionByStopSequence = originalDetect;
  });

  /**
   * エッジケース4: tripsとstopTimesの両方が空の場合
   */
  it('エッジケース4: tripsとstopTimesの両方が空の場合、警告ログを出力し、処理をスキップ', () => {
    const loader = new DataLoader();
    loader.trips = [];
    loader.stopTimes = [];
    
    // enrichTripsWithDirection()を実行
    loader.enrichTripsWithDirection();
    
    // 警告ログが出力されたことを確認（tripsが空の警告のみ）
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'DataLoader.enrichTripsWithDirection: tripsデータが空です'
    );
    
    // tripsが空のままであることを確認
    expect(loader.trips.length).toBe(0);
  });

  /**
   * エッジケース5: stopTimesが存在するが、該当するtripのstopTimesがない場合
   */
  it('エッジケース5: stopTimesが存在するが、該当するtripのstopTimesがない場合、unknownに設定', () => {
    const loader = new DataLoader();
    loader.trips = [
      { trip_id: 'trip_1', route_id: 'route_1', direction_id: '', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_2', route_id: 'route_1', direction_id: '', trip_headsign: '県庁前' }
    ];
    // trip_1とtrip_2のstopTimesが存在しない
    loader.stopTimes = [
      { trip_id: 'trip_3', stop_id: 'stop_1', stop_sequence: '1', arrival_time: '10:00:00' },
      { trip_id: 'trip_3', stop_id: 'stop_2', stop_sequence: '2', arrival_time: '10:10:00' }
    ];
    
    // enrichTripsWithDirection()を実行
    loader.enrichTripsWithDirection();
    
    // 全てのtripがunknownに設定されていることを確認
    expect(loader.trips[0].direction).toBe('unknown');
    expect(loader.trips[1].direction).toBe('unknown');
  });

  /**
   * エッジケース6: 一部のtripにdirection_idが設定されている場合
   */
  it('エッジケース6: 一部のtripにdirection_idが設定されている場合、direction_idを優先', () => {
    const loader = new DataLoader();
    loader.trips = [
      { trip_id: 'trip_1', route_id: 'route_1', direction_id: '0', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_2', route_id: 'route_1', direction_id: '', trip_headsign: '県庁前' },
      { trip_id: 'trip_3', route_id: 'route_1', direction_id: '1', trip_headsign: 'バスセンター' }
    ];
    loader.stopTimes = [
      { trip_id: 'trip_1', stop_id: 'stop_1', stop_sequence: '1', arrival_time: '10:00:00' },
      { trip_id: 'trip_1', stop_id: 'stop_2', stop_sequence: '2', arrival_time: '10:10:00' },
      { trip_id: 'trip_2', stop_id: 'stop_1', stop_sequence: '1', arrival_time: '11:00:00' },
      { trip_id: 'trip_2', stop_id: 'stop_2', stop_sequence: '2', arrival_time: '11:10:00' },
      { trip_id: 'trip_3', stop_id: 'stop_2', stop_sequence: '1', arrival_time: '12:00:00' },
      { trip_id: 'trip_3', stop_id: 'stop_1', stop_sequence: '2', arrival_time: '12:10:00' }
    ];
    
    // enrichTripsWithDirection()を実行
    loader.enrichTripsWithDirection();
    
    // direction_idが設定されているtripはそれを使用
    expect(loader.trips[0].direction).toBe('0');
    expect(loader.trips[2].direction).toBe('1');
    
    // direction_idが設定されていないtripは停留所順序ベースで判定
    expect(loader.trips[1].direction).toBeDefined();
    expect(['0', '1', 'unknown']).toContain(loader.trips[1].direction);
  });

  /**
   * エッジケース7: 複数の路線が混在する場合
   */
  it('エッジケース7: 複数の路線が混在する場合、各路線を独立して処理', () => {
    const loader = new DataLoader();
    loader.trips = [
      { trip_id: 'trip_1', route_id: 'route_1', direction_id: '', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_2', route_id: 'route_1', direction_id: '', trip_headsign: '県庁前' },
      { trip_id: 'trip_3', route_id: 'route_2', direction_id: '', trip_headsign: 'バスセンター' },
      { trip_id: 'trip_4', route_id: 'route_2', direction_id: '', trip_headsign: '市役所' }
    ];
    loader.stopTimes = [
      { trip_id: 'trip_1', stop_id: 'stop_1', stop_sequence: '1', arrival_time: '10:00:00' },
      { trip_id: 'trip_1', stop_id: 'stop_2', stop_sequence: '2', arrival_time: '10:10:00' },
      { trip_id: 'trip_2', stop_id: 'stop_2', stop_sequence: '1', arrival_time: '11:00:00' },
      { trip_id: 'trip_2', stop_id: 'stop_1', stop_sequence: '2', arrival_time: '11:10:00' },
      { trip_id: 'trip_3', stop_id: 'stop_3', stop_sequence: '1', arrival_time: '12:00:00' },
      { trip_id: 'trip_3', stop_id: 'stop_4', stop_sequence: '2', arrival_time: '12:10:00' },
      { trip_id: 'trip_4', stop_id: 'stop_4', stop_sequence: '1', arrival_time: '13:00:00' },
      { trip_id: 'trip_4', stop_id: 'stop_3', stop_sequence: '2', arrival_time: '13:10:00' }
    ];
    
    // enrichTripsWithDirection()を実行
    loader.enrichTripsWithDirection();
    
    // 全てのtripがdirectionプロパティを持つことを確認
    for (const trip of loader.trips) {
      expect(trip).toHaveProperty('direction');
      expect(['0', '1', 'unknown']).toContain(trip.direction);
    }
    
    // route_1のtripが適切に判定されていることを確認
    expect(loader.trips[0].direction).toBeDefined();
    expect(loader.trips[1].direction).toBeDefined();
    
    // route_2のtripが適切に判定されていることを確認
    expect(loader.trips[2].direction).toBeDefined();
    expect(loader.trips[3].direction).toBeDefined();
  });
});
