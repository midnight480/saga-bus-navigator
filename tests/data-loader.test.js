/**
 * データローダーの単体テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// DataLoaderクラスをインポート
// ブラウザ環境をシミュレートするため、グローバルオブジェクトに追加
import '../js/data-loader.js';

describe('GTFSParser', () => {
  describe('parseCSVLine', () => {
    it('シンプルなカンマ区切りをパースできる', () => {
      const line = 'value1,value2,value3';
      const result = window.GTFSParser.parseCSVLine(line);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('ダブルクォートで囲まれた値をパースできる', () => {
      const line = '"value1","value2","value3"';
      const result = window.GTFSParser.parseCSVLine(line);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('カンマを含む値をダブルクォートで囲んでパースできる', () => {
      const line = '"value1,with,comma","value2","value3"';
      const result = window.GTFSParser.parseCSVLine(line);
      expect(result).toEqual(['value1,with,comma', 'value2', 'value3']);
    });

    it('エスケープされたダブルクォートをパースできる', () => {
      const line = '"value""with""quotes","value2"';
      const result = window.GTFSParser.parseCSVLine(line);
      expect(result).toEqual(['value"with"quotes', 'value2']);
    });

    it('空の値をパースできる', () => {
      const line = 'value1,,value3';
      const result = window.GTFSParser.parseCSVLine(line);
      expect(result).toEqual(['value1', '', 'value3']);
    });

    it('GTFS stops.txtのヘッダー行をパースできる', () => {
      const line = 'stop_id,stop_code,stop_name,stop_desc,stop_lat,stop_lon,zone_id,stop_url,location_type,parent_station';
      const result = window.GTFSParser.parseCSVLine(line);
      expect(result).toEqual([
        'stop_id', 'stop_code', 'stop_name', 'stop_desc', 'stop_lat', 
        'stop_lon', 'zone_id', 'stop_url', 'location_type', 'parent_station'
      ]);
    });

    it('GTFS stops.txtのデータ行をパースできる', () => {
      const line = '1001002-01,,佐賀駅バスセンター 1番のりば,,33.26451,130.29974,1001002-01,,0,1001002';
      const result = window.GTFSParser.parseCSVLine(line);
      expect(result).toEqual([
        '1001002-01', '', '佐賀駅バスセンター 1番のりば', '', '33.26451',
        '130.29974', '1001002-01', '', '0', '1001002'
      ]);
    });

    it('GTFS trips.txtの複雑なデータ行をパースできる', () => {
      const line = '1ゆめタウン線,1_平日,1_平日_08時30分_系統51111,"5　ゆめタウン佐賀（ほほえみ館・夢咲コスモスタウン 経由）",,,1ゆめタウン線(51111),,0';
      const result = window.GTFSParser.parseCSVLine(line);
      expect(result).toEqual([
        '1ゆめタウン線', '1_平日', '1_平日_08時30分_系統51111',
        '5　ゆめタウン佐賀（ほほえみ館・夢咲コスモスタウン 経由）',
        '', '', '1ゆめタウン線(51111)', '', '0'
      ]);
    });
  });

  describe('parse', () => {
    it('GTFS stops.txtをパースできる', () => {
      const text = `stop_id,stop_code,stop_name,stop_lat,stop_lon,location_type
1001002-01,,佐賀駅バスセンター 1番のりば,33.26451,130.29974,0
1001002-02,,佐賀駅バスセンター 2番のりば,33.26451,130.29974,0`;
      
      const result = window.GTFSParser.parse(text);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        stop_id: '1001002-01',
        stop_code: '',
        stop_name: '佐賀駅バスセンター 1番のりば',
        stop_lat: '33.26451',
        stop_lon: '130.29974',
        location_type: '0'
      });
    });

    it('空のテキストは空配列を返す', () => {
      const text = '';
      const result = window.GTFSParser.parse(text);
      expect(result).toEqual([]);
    });

    it('空行をスキップする', () => {
      const text = `stop_id,stop_name
1001002-01,佐賀駅バスセンター

1001002-02,県庁前`;
      
      const result = window.GTFSParser.parse(text);
      expect(result).toHaveLength(2);
    });
  });
});

describe('DataLoader', () => {
  let dataLoader;

  beforeEach(() => {
    // 各テストの前に新しいインスタンスを作成
    dataLoader = new window.DataLoader();
  });

  describe('parseCSVLine', () => {
    it('シンプルなカンマ区切りをパースできる', () => {
      const line = 'value1,value2,value3';
      const result = dataLoader.parseCSVLine(line);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('ダブルクォートで囲まれた値をパースできる', () => {
      const line = '"value1","value2","value3"';
      const result = dataLoader.parseCSVLine(line);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('カンマを含む値をダブルクォートで囲んでパースできる', () => {
      const line = '"value1,with,comma","value2","value3"';
      const result = dataLoader.parseCSVLine(line);
      expect(result).toEqual(['value1,with,comma', 'value2', 'value3']);
    });

    it('エスケープされたダブルクォートをパースできる', () => {
      const line = '"value""with""quotes","value2"';
      const result = dataLoader.parseCSVLine(line);
      expect(result).toEqual(['value"with"quotes', 'value2']);
    });

    it('空の値をパースできる', () => {
      const line = 'value1,,value3';
      const result = dataLoader.parseCSVLine(line);
      expect(result).toEqual(['value1', '', 'value3']);
    });
  });

  describe('parseCSV', () => {
    it('正常なCSVをパースできる', () => {
      const csvText = `name,age,city
Alice,30,Tokyo
Bob,25,Osaka`;
      
      const result = dataLoader.parseCSV(csvText);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'Alice', age: '30', city: 'Tokyo' });
      expect(result[1]).toEqual({ name: 'Bob', age: '25', city: 'Osaka' });
    });

    it('空行をスキップする', () => {
      const csvText = `name,age,city
Alice,30,Tokyo

Bob,25,Osaka`;
      
      const result = dataLoader.parseCSV(csvText);
      
      expect(result).toHaveLength(2);
    });

    it('ヘッダーのみのCSVは空配列を返す', () => {
      const csvText = 'name,age,city';
      
      const result = dataLoader.parseCSV(csvText);
      
      // ヘッダーのみでデータ行がない場合は空配列
      expect(result).toHaveLength(0);
    });

    it('カラム数が一致しない行を警告してスキップする', () => {
      const csvText = `name,age,city
Alice,30,Tokyo
Bob,25
Charlie,35,Fukuoka`;
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = dataLoader.parseCSV(csvText);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'Alice', age: '30', city: 'Tokyo' });
      expect(result[1]).toEqual({ name: 'Charlie', age: '35', city: 'Fukuoka' });
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('loadBusStops', () => {
    it('バス停データを正しくパースする', async () => {
      const mockCSV = `バス停ID,バス停名,緯度,経度
SAGA-001,佐賀駅バスセンター,33.2649,130.3008
SAGA-002,県庁前,33.2495,130.3005`;

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockCSV)
        })
      );

      const result = await dataLoader.loadBusStops();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'SAGA-001',
        name: '佐賀駅バスセンター',
        lat: 33.2649,
        lng: 130.3008
      });
      expect(result[1]).toEqual({
        id: 'SAGA-002',
        name: '県庁前',
        lat: 33.2495,
        lng: 130.3005
      });
    });

    it('キャッシュされたデータを返す', async () => {
      const mockCSV = `バス停ID,バス停名,緯度,経度
SAGA-001,佐賀駅バスセンター,33.2649,130.3008`;

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockCSV)
        })
      );

      // 1回目の呼び出し
      await dataLoader.loadBusStops();
      
      // 2回目の呼び出し
      await dataLoader.loadBusStops();

      // fetchは1回だけ呼ばれる
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadTimetable', () => {
    it('時刻表データを正しくパースする', async () => {
      const mockCSV = `路線番号,便ID,バス停順序,バス停名,時,分,曜日区分,路線名,運行会社
11,100,1,佐賀駅バスセンター,18,50,平日,佐賀大学・西与賀線,佐賀市営バス
11,100,2,県庁前,18,55,平日,佐賀大学・西与賀線,佐賀市営バス`;

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockCSV)
        })
      );

      const result = await dataLoader.loadTimetable();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        routeNumber: '11',
        tripId: '100',
        stopSequence: 1,
        stopName: '佐賀駅バスセンター',
        hour: 18,
        minute: 50,
        weekdayType: '平日',
        routeName: '佐賀大学・西与賀線',
        operator: '佐賀市営バス'
      });
    });
  });

  describe('loadFares', () => {
    it('運賃データを正しくパースする', async () => {
      const mockCSV = `出発地,目的地,運行会社,大人運賃,小児運賃
佐賀駅BC,県庁前,佐賀市営バス,160,80
佐賀駅BC,佐賀大学,佐賀市営バス,180,90`;

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockCSV)
        })
      );

      const result = await dataLoader.loadFares();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        from: '佐賀駅BC',
        to: '県庁前',
        operator: '佐賀市営バス',
        adultFare: 160,
        childFare: 80
      });
    });
  });

  describe('loadAllData', () => {
    it('全データを並列読み込みできる', async () => {
      const mockBusStopsCSV = `バス停ID,バス停名,緯度,経度
SAGA-001,佐賀駅バスセンター,33.2649,130.3008`;

      const mockTimetableCSV = `路線番号,便ID,バス停順序,バス停名,時,分,曜日区分,路線名,運行会社
11,100,1,佐賀駅バスセンター,18,50,平日,佐賀大学・西与賀線,佐賀市営バス`;

      const mockFaresCSV = `出発地,目的地,運行会社,大人運賃,小児運賃
佐賀駅BC,県庁前,佐賀市営バス,160,80`;

      global.fetch = vi.fn((url) => {
        if (url.includes('bus_stop.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockBusStopsCSV)
          });
        } else if (url.includes('timetable_all_complete.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockTimetableCSV)
          });
        } else if (url.includes('fare_major_routes.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockFaresCSV)
          });
        }
      });

      const result = await dataLoader.loadAllData();

      expect(result.busStops).toHaveLength(1);
      expect(result.timetable).toHaveLength(1);
      expect(result.fares).toHaveLength(1);
    });

    it('読み込み失敗時にエラーをスローする', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404
        })
      );

      await expect(dataLoader.loadAllData()).rejects.toThrow('データの読み込みに失敗しました');
    });
  });

  describe('fetchWithTimeout', () => {
    it('タイムアウト時にエラーをスローする', async () => {
      // タイムアウトを短く設定
      dataLoader.timeout = 100;

      // AbortErrorをシミュレート
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      global.fetch = vi.fn(() => Promise.reject(abortError));

      await expect(dataLoader.fetchWithTimeout('test.csv')).rejects.toThrow('タイムアウト');
    });

    it('HTTP エラー時にエラーをスローする', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500
        })
      );

      await expect(dataLoader.fetchWithTimeout('test.csv')).rejects.toThrow('HTTP error');
    });
  });

  describe('clearCache', () => {
    it('キャッシュをクリアできる', async () => {
      const mockCSV = `バス停ID,バス停名,緯度,経度
SAGA-001,佐賀駅バスセンター,33.2649,130.3008`;

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockCSV)
        })
      );

      // データを読み込み
      await dataLoader.loadBusStops();
      expect(dataLoader.busStops).not.toBeNull();

      // キャッシュをクリア
      dataLoader.clearCache();
      expect(dataLoader.busStops).toBeNull();
    });
  });
});

describe('SearchControllerとの連携テスト', () => {
  let dataLoader;
  let searchController;

  beforeEach(() => {
    dataLoader = new window.DataLoader();
  });

  it('時刻表データの形式がSearchControllerで使用できる', async () => {
    const mockTimetableCSV = `路線番号,便ID,バス停順序,バス停名,時,分,曜日区分,路線名,運行会社
11,100,1,佐賀駅バスセンター,8,0,平日,佐賀大学線,佐賀市営バス
11,100,2,県庁前,8,5,平日,佐賀大学線,佐賀市営バス
11,100,3,佐賀大学,8,15,平日,佐賀大学線,佐賀市営バス`;

    const mockFaresCSV = `出発地,目的地,運行会社,大人運賃,小児運賃
佐賀駅BC,佐賀大学,佐賀市営バス,180,90`;

    global.fetch = vi.fn((url) => {
      if (url.includes('timetable_all_complete.csv')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockTimetableCSV)
        });
      } else if (url.includes('fare_major_routes.csv')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockFaresCSV)
        });
      }
    });

    // データを読み込み
    const timetable = await dataLoader.loadTimetable();
    const fares = await dataLoader.loadFares();

    // SearchControllerを初期化
    searchController = new window.SearchController(timetable, fares);

    // 時刻表データの形式を検証
    expect(timetable).toHaveLength(3);
    expect(timetable[0]).toHaveProperty('routeNumber');
    expect(timetable[0]).toHaveProperty('tripId');
    expect(timetable[0]).toHaveProperty('stopSequence');
    expect(timetable[0]).toHaveProperty('stopName');
    expect(timetable[0]).toHaveProperty('hour');
    expect(timetable[0]).toHaveProperty('minute');
    expect(timetable[0]).toHaveProperty('weekdayType');
    expect(timetable[0]).toHaveProperty('routeName');
    expect(timetable[0]).toHaveProperty('operator');

    // SearchControllerのインデックスが正しく作成されることを確認
    expect(searchController.tripIndex).toBeDefined();
    expect(searchController.tripIndex['100']).toHaveLength(3);
  });

  it('検索機能が正常に動作する', async () => {
    const mockTimetableCSV = `路線番号,便ID,バス停順序,バス停名,時,分,曜日区分,路線名,運行会社
11,100,1,佐賀駅バスセンター,8,0,平日,佐賀大学線,佐賀市営バス
11,100,2,県庁前,8,5,平日,佐賀大学線,佐賀市営バス
11,100,3,佐賀大学,8,15,平日,佐賀大学線,佐賀市営バス`;

    const mockFaresCSV = `出発地,目的地,運行会社,大人運賃,小児運賃
佐賀駅BC,佐賀大学,佐賀市営バス,180,90`;

    global.fetch = vi.fn((url) => {
      if (url.includes('timetable_all_complete.csv')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockTimetableCSV)
        });
      } else if (url.includes('fare_major_routes.csv')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockFaresCSV)
        });
      }
    });

    // データを読み込み
    const timetable = await dataLoader.loadTimetable();
    const fares = await dataLoader.loadFares();

    // SearchControllerを初期化
    searchController = new window.SearchController(timetable, fares);

    // 検索を実行
    const results = searchController.searchDirectTrips(
      '佐賀駅バスセンター',
      '佐賀大学',
      { type: 'departure-time', hour: 0, minute: 0 },
      '平日'
    );

    // 検索結果を検証
    expect(results).toHaveLength(1);
    expect(results[0].departureStop).toBe('佐賀駅バスセンター');
    expect(results[0].arrivalStop).toBe('佐賀大学');
    expect(results[0].departureTime).toBe('08:00');
    expect(results[0].arrivalTime).toBe('08:15');
    expect(results[0].duration).toBe(15);
    expect(results[0].routeName).toBe('佐賀大学線');
    expect(results[0].operator).toBe('佐賀市営バス');
  });

  it('経由バス停情報が正しく含まれる', async () => {
    const mockTimetableCSV = `路線番号,便ID,バス停順序,バス停名,時,分,曜日区分,路線名,運行会社
11,100,1,佐賀駅バスセンター,8,0,平日,佐賀大学線,佐賀市営バス
11,100,2,県庁前,8,5,平日,佐賀大学線,佐賀市営バス
11,100,3,佐賀大学,8,15,平日,佐賀大学線,佐賀市営バス`;

    const mockFaresCSV = `出発地,目的地,運行会社,大人運賃,小児運賃
佐賀駅BC,佐賀大学,佐賀市営バス,180,90`;

    global.fetch = vi.fn((url) => {
      if (url.includes('timetable_all_complete.csv')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockTimetableCSV)
        });
      } else if (url.includes('fare_major_routes.csv')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockFaresCSV)
        });
      }
    });

    // データを読み込み
    const timetable = await dataLoader.loadTimetable();
    const fares = await dataLoader.loadFares();

    // SearchControllerを初期化
    searchController = new window.SearchController(timetable, fares);

    // 検索を実行
    const results = searchController.searchDirectTrips(
      '佐賀駅バスセンター',
      '佐賀大学',
      { type: 'departure-time', hour: 0, minute: 0 },
      '平日'
    );

    // 経由バス停情報を検証
    expect(results[0].viaStops).toBeDefined();
    expect(results[0].viaStops).toHaveLength(1);
    expect(results[0].viaStops[0].name).toBe('県庁前');
    expect(results[0].viaStops[0].time).toBe('08:05');
  });
});

describe('UIControllerとの連携テスト', () => {
  let dataLoader;
  let uiController;

  beforeEach(() => {
    dataLoader = new window.DataLoader();
    
    // DOM要素をモック
    document.body.innerHTML = `
      <input id="departure-stop" />
      <input id="arrival-stop" />
      <ul id="departure-suggestions"></ul>
      <ul id="arrival-suggestions"></ul>
      <button id="search-button"></button>
      <div id="error-message"></div>
      <input type="radio" name="weekday-option" value="auto" checked />
      <input type="radio" name="weekday-option" value="平日" />
      <input type="radio" name="weekday-option" value="土日祝" />
      <input type="radio" name="time-option" value="now" checked />
      <input type="radio" name="time-option" value="departure-time" />
      <input type="radio" name="time-option" value="arrival-time" />
      <input type="radio" name="time-option" value="first-bus" />
      <input type="radio" name="time-option" value="last-bus" />
      <div id="time-picker" style="display: none;">
        <input id="time-hour" type="number" />
        <input id="time-minute" type="number" />
      </div>
      <div id="results-container"></div>
      <button id="load-more"></button>
      <div id="loading"></div>
    `;
  });

  it('バス停データの形式がUIControllerで使用できる', async () => {
    const mockBusStopsCSV = `バス停ID,バス停名,緯度,経度
SAGA-001,佐賀駅バスセンター,33.2649,130.3008
SAGA-002,県庁前,33.2495,130.3005
SAGA-003,佐賀大学,33.2400,130.2900`;

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockBusStopsCSV)
      })
    );

    // データを読み込み
    const busStops = await dataLoader.loadBusStops();

    // UIControllerを初期化
    uiController = new window.UIController();
    uiController.initialize(busStops);

    // バス停データの形式を検証
    expect(busStops).toHaveLength(3);
    expect(busStops[0]).toHaveProperty('id');
    expect(busStops[0]).toHaveProperty('name');
    expect(busStops[0]).toHaveProperty('lat');
    expect(busStops[0]).toHaveProperty('lng');

    // UIControllerのバス停リストが正しく設定されることを確認
    expect(uiController.busStops).toEqual(busStops);
  });

  it('オートコンプリート機能が正常に動作する', async () => {
    const mockBusStopsCSV = `バス停ID,バス停名,緯度,経度
SAGA-001,佐賀駅バスセンター,33.2649,130.3008
SAGA-002,県庁前,33.2495,130.3005
SAGA-003,佐賀大学,33.2400,130.2900`;

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockBusStopsCSV)
      })
    );

    // データを読み込み
    const busStops = await dataLoader.loadBusStops();

    // UIControllerを初期化
    uiController = new window.UIController();
    uiController.initialize(busStops);

    // バス停名でフィルタリング
    const matches = uiController.filterBusStops('佐賀');

    // フィルタリング結果を検証
    expect(matches).toHaveLength(2); // 佐賀駅バスセンター、佐賀大学
    expect(matches[0].name).toContain('佐賀');
    expect(matches[1].name).toContain('佐賀');
  });

  it('バス停名の検証が正常に動作する', async () => {
    const mockBusStopsCSV = `バス停ID,バス停名,緯度,経度
SAGA-001,佐賀駅バスセンター,33.2649,130.3008
SAGA-002,県庁前,33.2495,130.3005`;

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockBusStopsCSV)
      })
    );

    // データを読み込み
    const busStops = await dataLoader.loadBusStops();

    // UIControllerを初期化
    uiController = new window.UIController();
    uiController.initialize(busStops);

    // 有効なバス停名
    expect(uiController.validateBusStopName('佐賀駅バスセンター')).toBe(true);
    expect(uiController.validateBusStopName('県庁前')).toBe(true);

    // 無効なバス停名
    expect(uiController.validateBusStopName('存在しないバス停')).toBe(false);
    expect(uiController.validateBusStopName('')).toBe(false);
  });
});

/**
 * タスク6.1: DataLoader.loadAllDataOnce()のテスト
 * 要件: 1.1, 1.2
 */
describe('DataLoader.loadAllDataOnce()', () => {
  let dataLoader;
  let fetchSpy;

  beforeEach(() => {
    dataLoader = new window.DataLoader();
    
    // JSZipのモック
    global.JSZip = {
      loadAsync: vi.fn().mockResolvedValue({
        file: vi.fn((filename) => ({
          async: vi.fn().mockResolvedValue(getMockGTFSContent(filename))
        })),
        files: {
          'stops.txt': {},
          'stop_times.txt': {},
          'routes.txt': {},
          'trips.txt': {},
          'calendar.txt': {},
          'agency.txt': {},
          'fare_attributes.txt': {},
          'fare_rules.txt': {}
        }
      })
    };
  });

  afterEach(() => {
    if (fetchSpy) {
      fetchSpy.mockRestore();
    }
  });

  /**
   * モックGTFSコンテンツを生成
   */
  function getMockGTFSContent(filename) {
    const mockData = {
      'stops.txt': `stop_id,stop_code,stop_name,stop_desc,stop_lat,stop_lon,zone_id,stop_url,location_type,parent_station
1001002-01,,佐賀駅バスセンター 1番のりば,,33.26451,130.29974,1001002-01,,0,1001002
1001002-02,,佐賀駅バスセンター 2番のりば,,33.26451,130.29974,1001002-02,,0,1001002`,
      'stop_times.txt': `trip_id,arrival_time,departure_time,stop_id,stop_sequence,stop_headsign,pickup_type,drop_off_type
trip_123,08:00:00,08:00:00,1001002-01,1,,,
trip_123,08:10:00,08:10:00,1001002-02,2,,,`,
      'routes.txt': `route_id,agency_id,route_short_name,route_long_name,route_desc,route_type
route_456,agency_1,1,佐賀駅～大和線,,3`,
      'trips.txt': `route_id,service_id,trip_id,trip_headsign,trip_short_name,direction_id,block_id,shape_id
route_456,weekday,trip_123,大和方面,,,0,`,
      'calendar.txt': `service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
weekday,1,1,1,1,1,0,0,20250101,20251231`,
      'agency.txt': `agency_id,agency_name,agency_url,agency_timezone,agency_lang
agency_1,佐賀市営バス,https://example.com,Asia/Tokyo,ja`,
      'fare_attributes.txt': `fare_id,price,currency_type,payment_method,transfers,agency_id
fare_1,160,JPY,0,0,agency_1`,
      'fare_rules.txt': `fare_id,route_id,origin_id,destination_id,contains_id
fare_1,route_456,,,`
    };
    return mockData[filename] || '';
  }

  it('GTFSファイルが1回のみ読み込まれることを検証', async () => {
    // fetchをモック
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url === 'data/saga-current.zip') {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    // 1回目の呼び出し
    await dataLoader.loadAllDataOnce();
    const firstCallCount = fetchSpy.mock.calls.length;

    // 2回目の呼び出し（キャッシュから取得されるべき）
    await dataLoader.loadAllDataOnce();
    const secondCallCount = fetchSpy.mock.calls.length;

    // fetchが追加で呼ばれていないことを確認
    expect(secondCallCount).toBe(firstCallCount);
  });

  it('全てのデータが正しく取得されることを検証', async () => {
    // fetchをモック
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url === 'data/saga-current.zip') {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    await dataLoader.loadAllDataOnce();

    // 変換済みデータが取得されていることを確認
    expect(dataLoader.busStops).not.toBeNull();
    expect(dataLoader.timetable).not.toBeNull();
    expect(dataLoader.fares).not.toBeNull();
    expect(dataLoader.fareRules).not.toBeNull();

    // 生データが取得されていることを確認
    expect(dataLoader.stopTimes).not.toBeNull();
    expect(dataLoader.trips).not.toBeNull();
    expect(dataLoader.routes).not.toBeNull();
    expect(dataLoader.calendar).not.toBeNull();
    expect(dataLoader.gtfsStops).not.toBeNull();

    // データの内容を確認
    expect(dataLoader.busStops.length).toBeGreaterThan(0);
    expect(dataLoader.timetable.length).toBeGreaterThan(0);
    expect(dataLoader.stopTimes.length).toBeGreaterThan(0);
    expect(dataLoader.trips.length).toBeGreaterThan(0);
  });

  it('キャッシュが正しく機能することを検証', async () => {
    // fetchをモック
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url === 'data/saga-current.zip') {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    // 1回目の呼び出し
    await dataLoader.loadAllDataOnce();
    const firstBusStops = dataLoader.busStops;
    const firstTimetable = dataLoader.timetable;

    // 2回目の呼び出し
    await dataLoader.loadAllDataOnce();
    const secondBusStops = dataLoader.busStops;
    const secondTimetable = dataLoader.timetable;

    // 同じオブジェクトが返されることを確認（キャッシュが機能している）
    expect(secondBusStops).toBe(firstBusStops);
    expect(secondTimetable).toBe(firstTimetable);
  });
});

/**
 * タスク6.2: DataLoader.isDataLoaded()のテスト
 * 要件: 1.5
 */
describe('DataLoader.isDataLoaded()', () => {
  let dataLoader;

  beforeEach(() => {
    dataLoader = new window.DataLoader();
  });

  it('データ読み込み前はfalseを返すことを検証', () => {
    expect(dataLoader.isDataLoaded()).toBe(false);
  });

  it('データ読み込み後はtrueを返すことを検証', () => {
    // データを手動で設定
    dataLoader.busStops = [];
    dataLoader.timetable = [];
    dataLoader.fares = [];
    dataLoader.fareRules = [];
    dataLoader.stopTimes = [];
    dataLoader.trips = [];
    dataLoader.routes = [];
    dataLoader.calendar = [];
    dataLoader.gtfsStops = [];

    expect(dataLoader.isDataLoaded()).toBe(true);
  });

  it('一部のデータのみ読み込まれている場合はfalseを返すことを検証', () => {
    // 一部のデータのみ設定
    dataLoader.busStops = [];
    dataLoader.timetable = [];
    // 他のデータはnullのまま

    expect(dataLoader.isDataLoaded()).toBe(false);
  });
});

describe('app.jsのinitializeApp()関数との連携テスト', () => {
  beforeEach(() => {
    // DOM要素をモック
    document.body.innerHTML = `
      <input id="departure-stop" />
      <input id="arrival-stop" />
      <ul id="departure-suggestions"></ul>
      <ul id="arrival-suggestions"></ul>
      <button id="search-button"></button>
      <div id="error-message"></div>
      <input type="radio" name="weekday-option" value="auto" checked />
      <input type="radio" name="weekday-option" value="平日" />
      <input type="radio" name="weekday-option" value="土日祝" />
      <input type="radio" name="time-option" value="now" checked />
      <input type="radio" name="time-option" value="departure-time" />
      <input type="radio" name="time-option" value="arrival-time" />
      <input type="radio" name="time-option" value="first-bus" />
      <input type="radio" name="time-option" value="last-bus" />
      <div id="time-picker" style="display: none;">
        <input id="time-hour" type="number" />
        <input id="time-minute" type="number" />
      </div>
      <div id="results-container"></div>
      <button id="load-more"></button>
      <div id="loading"></div>
      <div class="results-placeholder"></div>
    `;

    // グローバル変数をリセット
    window.uiController = null;
    window.searchController = null;
  });

  it('データ読み込みが正常に完了する', async () => {
    const mockBusStopsCSV = `バス停ID,バス停名,緯度,経度
SAGA-001,佐賀駅バスセンター,33.2649,130.3008`;

    const mockTimetableCSV = `路線番号,便ID,バス停順序,バス停名,時,分,曜日区分,路線名,運行会社
11,100,1,佐賀駅バスセンター,8,0,平日,佐賀大学線,佐賀市営バス`;

    const mockFaresCSV = `出発地,目的地,運行会社,大人運賃,小児運賃
佐賀駅BC,県庁前,佐賀市営バス,160,80`;

    global.fetch = vi.fn((url) => {
      if (url.includes('bus_stop.csv')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockBusStopsCSV)
        });
      } else if (url.includes('timetable_all_complete.csv')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockTimetableCSV)
        });
      } else if (url.includes('fare_major_routes.csv')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockFaresCSV)
        });
      }
    });

    // DataLoaderを初期化
    const dataLoader = new window.DataLoader();
    const data = await dataLoader.loadAllData();

    // データが正しく読み込まれることを確認
    expect(data.busStops).toHaveLength(1);
    expect(data.timetable).toHaveLength(1);
    expect(data.fares).toHaveLength(1);

    // SearchControllerを初期化
    const searchController = new window.SearchController(data.timetable, data.fares);
    expect(searchController).toBeDefined();
    expect(searchController.tripIndex).toBeDefined();

    // UIControllerを初期化
    const uiController = new window.UIController();
    uiController.initialize(data.busStops);
    expect(uiController.busStops).toEqual(data.busStops);
  });

  it('エラーハンドリングが正常に動作する - ネットワークエラー', async () => {
    // ネットワークエラーをシミュレート
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    const dataLoader = new window.DataLoader();

    // エラーがスローされることを確認
    await expect(dataLoader.loadAllData()).rejects.toThrow();
  });

  it('エラーハンドリングが正常に動作する - HTTPエラー', async () => {
    // HTTPエラーをシミュレート
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404
      })
    );

    const dataLoader = new window.DataLoader();

    // エラーがスローされることを確認
    await expect(dataLoader.loadAllData()).rejects.toThrow('データの読み込みに失敗しました');
  });

  it('エラーハンドリングが正常に動作する - タイムアウト', async () => {
    // タイムアウトを短く設定
    const dataLoader = new window.DataLoader();
    dataLoader.timeout = 100;

    // AbortErrorをシミュレート
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    global.fetch = vi.fn(() => Promise.reject(abortError));

    // タイムアウトエラーがスローされることを確認
    await expect(dataLoader.loadAllData()).rejects.toThrow();
  });

  it('キャッシュが正常に動作する', async () => {
    const mockBusStopsCSV = `バス停ID,バス停名,緯度,経度
SAGA-001,佐賀駅バスセンター,33.2649,130.3008`;

    const mockTimetableCSV = `路線番号,便ID,バス停順序,バス停名,時,分,曜日区分,路線名,運行会社
11,100,1,佐賀駅バスセンター,8,0,平日,佐賀大学線,佐賀市営バス`;

    const mockFaresCSV = `出発地,目的地,運行会社,大人運賃,小児運賃
佐賀駅BC,県庁前,佐賀市営バス,160,80`;

    global.fetch = vi.fn((url) => {
      if (url.includes('bus_stop.csv')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockBusStopsCSV)
        });
      } else if (url.includes('timetable_all_complete.csv')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockTimetableCSV)
        });
      } else if (url.includes('fare_major_routes.csv')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockFaresCSV)
        });
      }
    });

    const dataLoader = new window.DataLoader();

    // 1回目の読み込み
    await dataLoader.loadAllData();
    const fetchCallCount1 = global.fetch.mock.calls.length;

    // 2回目の読み込み（キャッシュから）
    await dataLoader.loadAllData();
    const fetchCallCount2 = global.fetch.mock.calls.length;

    // fetchが追加で呼ばれていないことを確認（キャッシュが使用された）
    expect(fetchCallCount2).toBe(fetchCallCount1);
  });
});
