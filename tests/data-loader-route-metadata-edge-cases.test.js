/**
 * DataLoader.generateRouteMetadata()のエッジケーステスト
 * 
 * Feature: direction-detection-integration
 * 
 * 検証: 要件5.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// DataLoaderをグローバルスコープから取得
const getDataLoader = () => {
  if (typeof window !== 'undefined' && window.DataLoader) {
    return window.DataLoader;
  }
  if (typeof global !== 'undefined' && global.DataLoader) {
    return global.DataLoader;
  }
  throw new Error('DataLoaderが見つかりません');
};

describe('DataLoader.generateRouteMetadata() エッジケーステスト', () => {
  let DataLoader;
  let consoleWarnSpy;

  beforeEach(async () => {
    // data-loader.jsを読み込み
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const dataLoaderCode = fs.readFileSync(
      path.join(__dirname, '../js/data-loader.js'),
      'utf-8'
    );
    
    // グローバルスコープで実行
    global.window = global;
    eval(dataLoaderCode);
    
    DataLoader = getDataLoader();
    
    // console.warnをスパイ
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // スパイをリストア
    consoleWarnSpy.mockRestore();
  });

  /**
   * エッジケース: 成功率が低い路線（50%未満）の警告ログ
   * 
   * 検証: 要件5.5
   */
  it('エッジケース: 成功率が50%未満の路線について警告ログを出力する', () => {
    // 成功率が低い路線を作成（50%未満）
    const trips = [
      { trip_id: 'trip_1', route_id: 'route_1', direction: 'unknown', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_2', route_id: 'route_1', direction: 'unknown', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_3', route_id: 'route_1', direction: 'unknown', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_4', route_id: 'route_1', direction: '0', trip_headsign: '佐賀駅' }
    ];
    
    const loader = new DataLoader();
    loader.trips = trips;
    loader.routes = [
      { route_id: 'route_1', route_long_name: 'テスト路線1' }
    ];
    
    // 路線メタデータを生成
    const metadata = loader.generateRouteMetadata();
    
    // 警告ログが出力されたことを確認
    expect(consoleWarnSpy).toHaveBeenCalled();
    
    // 警告ログの内容を確認
    const warnCalls = consoleWarnSpy.mock.calls;
    const relevantWarning = warnCalls.find(call => 
      call[0].includes('方向判定成功率が低いです')
    );
    
    expect(relevantWarning).toBeDefined();
    expect(relevantWarning[0]).toContain('route_1');
    expect(relevantWarning[0]).toContain('テスト路線1');
    
    // 警告ログの詳細情報を確認
    expect(relevantWarning[1]).toBeDefined();
    expect(relevantWarning[1].detectionRate).toBe('25.0%');
    expect(relevantWarning[1].unknownCount).toBe(3);
    expect(relevantWarning[1].totalTrips).toBe(4);
  });

  /**
   * エッジケース: 成功率が50%以上の路線は警告ログを出力しない
   * 
   * 検証: 要件5.5
   */
  it('エッジケース: 成功率が50%以上の路線について警告ログを出力しない', () => {
    // 成功率が高い路線を作成（50%以上）
    const trips = [
      { trip_id: 'trip_1', route_id: 'route_1', direction: '0', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_2', route_id: 'route_1', direction: '0', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_3', route_id: 'route_1', direction: '1', trip_headsign: '県庁前' },
      { trip_id: 'trip_4', route_id: 'route_1', direction: 'unknown', trip_headsign: '佐賀駅' }
    ];
    
    const loader = new DataLoader();
    loader.trips = trips;
    loader.routes = [
      { route_id: 'route_1', route_long_name: 'テスト路線1' }
    ];
    
    // 路線メタデータを生成
    const metadata = loader.generateRouteMetadata();
    
    // 警告ログが出力されていないことを確認
    const warnCalls = consoleWarnSpy.mock.calls;
    const relevantWarning = warnCalls.find(call => 
      call[0].includes('方向判定成功率が低いです') && call[0].includes('route_1')
    );
    
    expect(relevantWarning).toBeUndefined();
  });

  /**
   * エッジケース: 成功率が0%の路線の警告ログ
   * 
   * 検証: 要件5.5
   */
  it('エッジケース: 成功率が0%の路線について警告ログを出力する', () => {
    // 成功率が0%の路線を作成
    const trips = [
      { trip_id: 'trip_1', route_id: 'route_1', direction: 'unknown', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_2', route_id: 'route_1', direction: 'unknown', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_3', route_id: 'route_1', direction: 'unknown', trip_headsign: '佐賀駅' }
    ];
    
    const loader = new DataLoader();
    loader.trips = trips;
    loader.routes = [
      { route_id: 'route_1', route_long_name: 'テスト路線1' }
    ];
    
    // 路線メタデータを生成
    const metadata = loader.generateRouteMetadata();
    
    // 警告ログが出力されたことを確認
    expect(consoleWarnSpy).toHaveBeenCalled();
    
    // 警告ログの内容を確認
    const warnCalls = consoleWarnSpy.mock.calls;
    const relevantWarning = warnCalls.find(call => 
      call[0].includes('方向判定成功率が低いです')
    );
    
    expect(relevantWarning).toBeDefined();
    expect(relevantWarning[1].detectionRate).toBe('0.0%');
    expect(relevantWarning[1].unknownCount).toBe(3);
    expect(relevantWarning[1].totalTrips).toBe(3);
  });

  /**
   * エッジケース: 成功率がちょうど50%の路線は警告ログを出力しない
   * 
   * 検証: 要件5.5
   */
  it('エッジケース: 成功率がちょうど50%の路線について警告ログを出力しない', () => {
    // 成功率がちょうど50%の路線を作成
    const trips = [
      { trip_id: 'trip_1', route_id: 'route_1', direction: '0', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_2', route_id: 'route_1', direction: 'unknown', trip_headsign: '佐賀駅' }
    ];
    
    const loader = new DataLoader();
    loader.trips = trips;
    loader.routes = [
      { route_id: 'route_1', route_long_name: 'テスト路線1' }
    ];
    
    // 路線メタデータを生成
    const metadata = loader.generateRouteMetadata();
    
    // 警告ログが出力されていないことを確認
    const warnCalls = consoleWarnSpy.mock.calls;
    const relevantWarning = warnCalls.find(call => 
      call[0].includes('方向判定成功率が低いです') && call[0].includes('route_1')
    );
    
    expect(relevantWarning).toBeUndefined();
  });

  /**
   * エッジケース: 複数の路線で成功率が低い場合、全ての路線について警告ログを出力
   * 
   * 検証: 要件5.5
   */
  it('エッジケース: 複数の路線で成功率が低い場合、全ての路線について警告ログを出力する', () => {
    // 複数の成功率が低い路線を作成
    const trips = [
      { trip_id: 'trip_1', route_id: 'route_1', direction: 'unknown', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_2', route_id: 'route_1', direction: 'unknown', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_3', route_id: 'route_1', direction: '0', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_4', route_id: 'route_2', direction: 'unknown', trip_headsign: '県庁前' },
      { trip_id: 'trip_5', route_id: 'route_2', direction: 'unknown', trip_headsign: '県庁前' },
      { trip_id: 'trip_6', route_id: 'route_2', direction: 'unknown', trip_headsign: '県庁前' },
      { trip_id: 'trip_7', route_id: 'route_2', direction: '1', trip_headsign: '県庁前' }
    ];
    
    const loader = new DataLoader();
    loader.trips = trips;
    loader.routes = [
      { route_id: 'route_1', route_long_name: 'テスト路線1' },
      { route_id: 'route_2', route_long_name: 'テスト路線2' }
    ];
    
    // 路線メタデータを生成
    const metadata = loader.generateRouteMetadata();
    
    // 警告ログが2回出力されたことを確認
    const warnCalls = consoleWarnSpy.mock.calls;
    const relevantWarnings = warnCalls.filter(call => 
      call[0].includes('方向判定成功率が低いです')
    );
    
    expect(relevantWarnings.length).toBe(2);
    
    // route_1の警告を確認
    const route1Warning = relevantWarnings.find(call => call[0].includes('route_1'));
    expect(route1Warning).toBeDefined();
    expect(route1Warning[1].detectionRate).toBe('33.3%');
    
    // route_2の警告を確認
    const route2Warning = relevantWarnings.find(call => call[0].includes('route_2'));
    expect(route2Warning).toBeDefined();
    expect(route2Warning[1].detectionRate).toBe('25.0%');
  });

  /**
   * エッジケース: routesが設定されていない場合でも警告ログを出力
   * 
   * 検証: 要件5.5
   */
  it('エッジケース: routesが設定されていない場合でも警告ログを出力する', () => {
    // 成功率が低い路線を作成
    const trips = [
      { trip_id: 'trip_1', route_id: 'route_1', direction: 'unknown', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_2', route_id: 'route_1', direction: 'unknown', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_3', route_id: 'route_1', direction: 'unknown', trip_headsign: '佐賀駅' },
      { trip_id: 'trip_4', route_id: 'route_1', direction: '0', trip_headsign: '佐賀駅' }
    ];
    
    const loader = new DataLoader();
    loader.trips = trips;
    // routesを設定しない
    
    // 路線メタデータを生成
    const metadata = loader.generateRouteMetadata();
    
    // 警告ログが出力されたことを確認
    expect(consoleWarnSpy).toHaveBeenCalled();
    
    // 警告ログの内容を確認（route_idがそのまま使用される）
    const warnCalls = consoleWarnSpy.mock.calls;
    const relevantWarning = warnCalls.find(call => 
      call[0].includes('方向判定成功率が低いです')
    );
    
    expect(relevantWarning).toBeDefined();
    expect(relevantWarning[0]).toContain('route_1');
  });
});
