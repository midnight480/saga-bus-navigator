/**
 * DataTransformer.transformTimetable()のユニットテスト
 * 
 * 検証: 要件3.1, 3.3
 */

import { describe, it, expect, beforeEach } from 'vitest';

// DataTransformerとDirectionDetectorをグローバルスコープから取得
const getDataTransformer = () => {
  if (typeof window !== 'undefined' && window.DataTransformer) {
    return window.DataTransformer;
  }
  if (typeof global !== 'undefined' && global.DataTransformer) {
    return global.DataTransformer;
  }
  throw new Error('DataTransformerが見つかりません');
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

describe('DataTransformer.transformTimetable() ユニットテスト', () => {
  let DataTransformer;
  let DirectionDetector;

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
    
    DataTransformer = getDataTransformer();
    DirectionDetector = getDirectionDetector();
    
    // キャッシュをクリア
    DirectionDetector.directionCache.clear();
  });

  /**
   * 要件3.1: trip.directionが設定されている場合のテスト
   * 
   * trip.directionプロパティが設定されている場合、
   * DataTransformer.transformTimetable()はそれを優先的に使用する
   */
  it('trip.directionが設定されている場合、その値を使用する', () => {
    // テストデータ
    const stopTimes = [
      {
        trip_id: 'trip_1',
        stop_id: 'stop_1',
        stop_sequence: '1',
        arrival_time: '10:00:00',
        departure_time: '10:00:00'
      },
      {
        trip_id: 'trip_1',
        stop_id: 'stop_2',
        stop_sequence: '2',
        arrival_time: '10:10:00',
        departure_time: '10:10:00'
      }
    ];

    const trips = [
      {
        trip_id: 'trip_1',
        route_id: 'route_1',
        service_id: 'service_1',
        trip_headsign: '佐賀駅',
        direction_id: '',
        direction: '0' // directionプロパティが設定されている
      }
    ];

    const routes = [
      {
        route_id: 'route_1',
        route_long_name: '佐賀市営バス1号線',
        agency_id: 'agency_1'
      }
    ];

    const calendar = [
      {
        service_id: 'service_1',
        monday: '1',
        tuesday: '1',
        wednesday: '1',
        thursday: '1',
        friday: '1',
        saturday: '0',
        sunday: '0'
      }
    ];

    const agency = [
      {
        agency_id: 'agency_1',
        agency_name: '佐賀市営バス'
      }
    ];

    const stops = [
      {
        stop_id: 'stop_1',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2633',
        stop_lon: '130.3000'
      },
      {
        stop_id: 'stop_2',
        stop_name: '県庁前',
        stop_lat: '33.2500',
        stop_lon: '130.3100'
      }
    ];

    // DataTransformer.transformTimetable()を実行
    const timetable = DataTransformer.transformTimetable(
      stopTimes,
      trips,
      routes,
      calendar,
      agency,
      stops
    );

    // 検証: 全ての時刻表エントリのdirectionが'0'であることを確認
    expect(timetable).toHaveLength(2);
    expect(timetable[0].direction).toBe('0');
    expect(timetable[1].direction).toBe('0');
  });

  /**
   * 要件3.3: trip.directionが設定されていない場合のフォールバックテスト
   * 
   * trip.directionプロパティが設定されていない場合、
   * DataTransformer.transformTimetable()はDirectionDetector.detectDirection()を呼び出す
   */
  it('trip.directionが設定されていない場合、DirectionDetector.detectDirection()を呼び出す', () => {
    // テストデータ
    const stopTimes = [
      {
        trip_id: 'trip_1',
        stop_id: 'stop_1',
        stop_sequence: '1',
        arrival_time: '10:00:00',
        departure_time: '10:00:00'
      },
      {
        trip_id: 'trip_1',
        stop_id: 'stop_2',
        stop_sequence: '2',
        arrival_time: '10:10:00',
        departure_time: '10:10:00'
      },
      {
        trip_id: 'trip_2',
        stop_id: 'stop_2',
        stop_sequence: '1',
        arrival_time: '11:00:00',
        departure_time: '11:00:00'
      },
      {
        trip_id: 'trip_2',
        stop_id: 'stop_1',
        stop_sequence: '2',
        arrival_time: '11:10:00',
        departure_time: '11:10:00'
      }
    ];

    const trips = [
      {
        trip_id: 'trip_1',
        route_id: 'route_1',
        service_id: 'service_1',
        trip_headsign: '佐賀駅',
        direction_id: '0'
        // directionプロパティが設定されていない
      },
      {
        trip_id: 'trip_2',
        route_id: 'route_1',
        service_id: 'service_1',
        trip_headsign: '県庁前',
        direction_id: '1'
        // directionプロパティが設定されていない
      }
    ];

    const routes = [
      {
        route_id: 'route_1',
        route_long_name: '佐賀市営バス1号線',
        agency_id: 'agency_1'
      }
    ];

    const calendar = [
      {
        service_id: 'service_1',
        monday: '1',
        tuesday: '1',
        wednesday: '1',
        thursday: '1',
        friday: '1',
        saturday: '0',
        sunday: '0'
      }
    ];

    const agency = [
      {
        agency_id: 'agency_1',
        agency_name: '佐賀市営バス'
      }
    ];

    const stops = [
      {
        stop_id: 'stop_1',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2633',
        stop_lon: '130.3000'
      },
      {
        stop_id: 'stop_2',
        stop_name: '県庁前',
        stop_lat: '33.2500',
        stop_lon: '130.3100'
      }
    ];

    // DataTransformer.transformTimetable()を実行
    const timetable = DataTransformer.transformTimetable(
      stopTimes,
      trips,
      routes,
      calendar,
      agency,
      stops
    );

    // 検証: 全ての時刻表エントリがdirectionフィールドを持つことを確認
    expect(timetable).toHaveLength(4);
    
    // trip_1のエントリ（direction_id='0'）
    expect(timetable[0].direction).toBe('0');
    expect(timetable[1].direction).toBe('0');
    
    // trip_2のエントリ（direction_id='1'）
    expect(timetable[2].direction).toBe('1');
    expect(timetable[3].direction).toBe('1');
  });

  /**
   * 要件3.3: trip.directionがnullまたはundefinedの場合のフォールバックテスト
   */
  it('trip.directionがnullまたはundefinedの場合、DirectionDetector.detectDirection()を呼び出す', () => {
    // テストデータ
    const stopTimes = [
      {
        trip_id: 'trip_1',
        stop_id: 'stop_1',
        stop_sequence: '1',
        arrival_time: '10:00:00',
        departure_time: '10:00:00'
      }
    ];

    const tripsWithNull = [
      {
        trip_id: 'trip_1',
        route_id: 'route_1',
        service_id: 'service_1',
        trip_headsign: '佐賀駅',
        direction_id: '0',
        direction: null // nullの場合
      }
    ];

    const tripsWithUndefined = [
      {
        trip_id: 'trip_1',
        route_id: 'route_1',
        service_id: 'service_1',
        trip_headsign: '佐賀駅',
        direction_id: '0',
        direction: undefined // undefinedの場合
      }
    ];

    const routes = [
      {
        route_id: 'route_1',
        route_long_name: '佐賀市営バス1号線',
        agency_id: 'agency_1'
      }
    ];

    const calendar = [
      {
        service_id: 'service_1',
        monday: '1',
        tuesday: '1',
        wednesday: '1',
        thursday: '1',
        friday: '1',
        saturday: '0',
        sunday: '0'
      }
    ];

    const agency = [
      {
        agency_id: 'agency_1',
        agency_name: '佐賀市営バス'
      }
    ];

    const stops = [
      {
        stop_id: 'stop_1',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2633',
        stop_lon: '130.3000'
      }
    ];

    // nullの場合
    const timetableWithNull = DataTransformer.transformTimetable(
      stopTimes,
      tripsWithNull,
      routes,
      calendar,
      agency,
      stops
    );

    expect(timetableWithNull).toHaveLength(1);
    expect(timetableWithNull[0].direction).toBe('0'); // direction_idから判定

    // undefinedの場合
    const timetableWithUndefined = DataTransformer.transformTimetable(
      stopTimes,
      tripsWithUndefined,
      routes,
      calendar,
      agency,
      stops
    );

    expect(timetableWithUndefined).toHaveLength(1);
    expect(timetableWithUndefined[0].direction).toBe('0'); // direction_idから判定
  });

  /**
   * 要件3.1: trip.directionが優先される（direction_idより優先）
   */
  it('trip.directionが設定されている場合、direction_idより優先される', () => {
    // テストデータ
    const stopTimes = [
      {
        trip_id: 'trip_1',
        stop_id: 'stop_1',
        stop_sequence: '1',
        arrival_time: '10:00:00',
        departure_time: '10:00:00'
      }
    ];

    const trips = [
      {
        trip_id: 'trip_1',
        route_id: 'route_1',
        service_id: 'service_1',
        trip_headsign: '佐賀駅',
        direction_id: '0', // direction_idは'0'
        direction: '1' // directionは'1'（異なる値）
      }
    ];

    const routes = [
      {
        route_id: 'route_1',
        route_long_name: '佐賀市営バス1号線',
        agency_id: 'agency_1'
      }
    ];

    const calendar = [
      {
        service_id: 'service_1',
        monday: '1',
        tuesday: '1',
        wednesday: '1',
        thursday: '1',
        friday: '1',
        saturday: '0',
        sunday: '0'
      }
    ];

    const agency = [
      {
        agency_id: 'agency_1',
        agency_name: '佐賀市営バス'
      }
    ];

    const stops = [
      {
        stop_id: 'stop_1',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2633',
        stop_lon: '130.3000'
      }
    ];

    // DataTransformer.transformTimetable()を実行
    const timetable = DataTransformer.transformTimetable(
      stopTimes,
      trips,
      routes,
      calendar,
      agency,
      stops
    );

    // 検証: directionが'1'であることを確認（direction_idの'0'ではない）
    expect(timetable).toHaveLength(1);
    expect(timetable[0].direction).toBe('1');
  });
});
