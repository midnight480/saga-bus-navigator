/**
 * TimetableControllerクラスの単体テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import '../js/direction-detector.js';
import '../js/timetable-controller.js';

describe('TimetableController - 基本機能', () => {
  let timetableController;
  let stopTimes;
  let trips;
  let routes;
  let calendar;
  let stops;

  beforeEach(() => {
    // テストデータの準備
    stops = [
      {
        stop_id: 'STOP001',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2490',
        stop_lon: '130.2990'
      },
      {
        stop_id: 'STOP002',
        stop_name: 'ゆめタウン佐賀',
        stop_lat: '33.2500',
        stop_lon: '130.3000'
      },
      {
        stop_id: 'STOP003',
        stop_name: '佐賀城跡',
        stop_lat: '33.2510',
        stop_lon: '130.3010'
      }
    ];

    routes = [
      {
        route_id: 'ROUTE001',
        route_long_name: 'ゆめタウン線',
        route_short_name: '1',
        agency_id: 'AGENCY001',
        route_type: '3'
      },
      {
        route_id: 'ROUTE002',
        route_long_name: '市内循環線',
        route_short_name: '2',
        agency_id: 'AGENCY001',
        route_type: '3'
      }
    ];

    calendar = [
      {
        service_id: 'WEEKDAY',
        monday: '1',
        tuesday: '1',
        wednesday: '1',
        thursday: '1',
        friday: '1',
        saturday: '0',
        sunday: '0'
      },
      {
        service_id: 'WEEKEND',
        monday: '0',
        tuesday: '0',
        wednesday: '0',
        thursday: '0',
        friday: '0',
        saturday: '1',
        sunday: '1'
      }
    ];

    trips = [
      {
        trip_id: 'TRIP001',
        route_id: 'ROUTE001',
        service_id: 'WEEKDAY',
        trip_headsign: 'ゆめタウン佐賀行き'
      },
      {
        trip_id: 'TRIP002',
        route_id: 'ROUTE001',
        service_id: 'WEEKEND',
        trip_headsign: 'ゆめタウン佐賀行き'
      },
      {
        trip_id: 'TRIP003',
        route_id: 'ROUTE002',
        service_id: 'WEEKDAY',
        trip_headsign: '市内循環'
      }
    ];

    stopTimes = [
      {
        trip_id: 'TRIP001',
        stop_id: 'STOP001',
        arrival_time: '08:00:00',
        departure_time: '08:00:00',
        stop_sequence: '1'
      },
      {
        trip_id: 'TRIP001',
        stop_id: 'STOP002',
        arrival_time: '08:15:00',
        departure_time: '08:15:00',
        stop_sequence: '2'
      },
      {
        trip_id: 'TRIP002',
        stop_id: 'STOP001',
        arrival_time: '09:00:00',
        departure_time: '09:00:00',
        stop_sequence: '1'
      },
      {
        trip_id: 'TRIP002',
        stop_id: 'STOP002',
        arrival_time: '09:15:00',
        departure_time: '09:15:00',
        stop_sequence: '2'
      },
      {
        trip_id: 'TRIP003',
        stop_id: 'STOP001',
        arrival_time: '10:00:00',
        departure_time: '10:00:00',
        stop_sequence: '1'
      },
      {
        trip_id: 'TRIP003',
        stop_id: 'STOP003',
        arrival_time: '10:20:00',
        departure_time: '10:20:00',
        stop_sequence: '2'
      }
    ];

    timetableController = new window.TimetableController(
      stopTimes,
      trips,
      routes,
      calendar,
      stops
    );
  });

  it('TimetableControllerクラスが存在する', () => {
    expect(window.TimetableController).toBeDefined();
    expect(typeof window.TimetableController).toBe('function');
  });

  it('インスタンスが正しく初期化される', () => {
    expect(timetableController.stopTimes).toEqual(stopTimes);
    expect(timetableController.trips).toEqual(trips);
    expect(timetableController.routes).toEqual(routes);
    expect(timetableController.calendar).toEqual(calendar);
    expect(timetableController.stops).toEqual(stops);
    expect(timetableController.tripsIndex).toBeDefined();
    expect(timetableController.routesIndex).toBeDefined();
    expect(timetableController.calendarIndex).toBeDefined();
    expect(timetableController.stopsIndex).toBeDefined();
    expect(timetableController.stopTimesIndex).toBeDefined();
  });
});

describe('TimetableController - getRoutesAtStop() 正常系', () => {
  let timetableController;

  beforeEach(() => {
    const stops = [
      {
        stop_id: 'STOP001',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2490',
        stop_lon: '130.2990'
      }
    ];

    const routes = [
      {
        route_id: 'ROUTE001',
        route_long_name: 'ゆめタウン線',
        route_short_name: '1',
        agency_id: 'AGENCY001',
        route_type: '3'
      },
      {
        route_id: 'ROUTE002',
        route_long_name: '市内循環線',
        route_short_name: '2',
        agency_id: 'AGENCY001',
        route_type: '3'
      }
    ];

    const calendar = [
      {
        service_id: 'WEEKDAY',
        monday: '1',
        tuesday: '1',
        wednesday: '1',
        thursday: '1',
        friday: '1',
        saturday: '0',
        sunday: '0'
      }
    ];

    const trips = [
      {
        trip_id: 'TRIP001',
        route_id: 'ROUTE001',
        service_id: 'WEEKDAY',
        trip_headsign: 'ゆめタウン佐賀行き'
      },
      {
        trip_id: 'TRIP002',
        route_id: 'ROUTE002',
        service_id: 'WEEKDAY',
        trip_headsign: '市内循環'
      }
    ];

    const stopTimes = [
      {
        trip_id: 'TRIP001',
        stop_id: 'STOP001',
        arrival_time: '08:00:00',
        departure_time: '08:00:00',
        stop_sequence: '1'
      },
      {
        trip_id: 'TRIP002',
        stop_id: 'STOP001',
        arrival_time: '09:00:00',
        departure_time: '09:00:00',
        stop_sequence: '1'
      }
    ];

    timetableController = new window.TimetableController(
      stopTimes,
      trips,
      routes,
      calendar,
      stops
    );
  });

  it('バス停で運行している路線一覧を取得できる', () => {
    const result = timetableController.getRoutesAtStop('STOP001');

    expect(result).toHaveLength(2);
    expect(result[0].routeId).toBe('ROUTE001');
    expect(result[0].routeName).toBe('ゆめタウン線');
    expect(result[1].routeId).toBe('ROUTE002');
    expect(result[1].routeName).toBe('市内循環線');
  });

  it('路線が路線名でソートされている', () => {
    const result = timetableController.getRoutesAtStop('STOP001');

    expect(result).toHaveLength(2);
    // 日本語のロケールでソートされている
    expect(result[0].routeName).toBe('ゆめタウン線');
    expect(result[1].routeName).toBe('市内循環線');
  });

  it('重複する路線が除外されている', () => {
    // 同じ路線の複数の便が停車する場合
    const stopTimes = [
      {
        trip_id: 'TRIP001',
        stop_id: 'STOP001',
        arrival_time: '08:00:00',
        departure_time: '08:00:00',
        stop_sequence: '1'
      },
      {
        trip_id: 'TRIP002',
        stop_id: 'STOP001',
        arrival_time: '09:00:00',
        departure_time: '09:00:00',
        stop_sequence: '1'
      }
    ];

    const trips = [
      {
        trip_id: 'TRIP001',
        route_id: 'ROUTE001',
        service_id: 'WEEKDAY',
        trip_headsign: 'ゆめタウン佐賀行き'
      },
      {
        trip_id: 'TRIP002',
        route_id: 'ROUTE001',
        service_id: 'WEEKDAY',
        trip_headsign: 'ゆめタウン佐賀行き'
      }
    ];

    const controller = new window.TimetableController(
      stopTimes,
      trips,
      timetableController.routes,
      timetableController.calendar,
      timetableController.stops
    );

    const result = controller.getRoutesAtStop('STOP001');

    expect(result).toHaveLength(1);
    expect(result[0].routeId).toBe('ROUTE001');
  });
});

describe('TimetableController - getRoutesAtStop() 異常系', () => {
  let timetableController;

  beforeEach(() => {
    timetableController = new window.TimetableController([], [], [], [], []);
  });

  it('存在しないバス停を指定した場合は空配列を返す', () => {
    const result = timetableController.getRoutesAtStop('存在しないバス停');

    expect(result).toEqual([]);
  });

  it('stopIdが指定されていない場合は空配列を返す', () => {
    const result = timetableController.getRoutesAtStop(null);

    expect(result).toEqual([]);
  });

  it('バス停に停車する便が存在しない場合は空配列を返す', () => {
    const stops = [
      {
        stop_id: 'STOP001',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2490',
        stop_lon: '130.2990'
      }
    ];

    const controller = new window.TimetableController([], [], [], [], stops);
    const result = controller.getRoutesAtStop('STOP001');

    expect(result).toEqual([]);
  });
});

describe('TimetableController - getTimetable() 正常系', () => {
  let timetableController;

  beforeEach(() => {
    const stops = [
      {
        stop_id: 'STOP001',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2490',
        stop_lon: '130.2990'
      }
    ];

    const routes = [
      {
        route_id: 'ROUTE001',
        route_long_name: 'ゆめタウン線',
        route_short_name: '1',
        agency_id: 'AGENCY001',
        route_type: '3'
      }
    ];

    const calendar = [
      {
        service_id: 'WEEKDAY',
        monday: '1',
        tuesday: '1',
        wednesday: '1',
        thursday: '1',
        friday: '1',
        saturday: '0',
        sunday: '0'
      },
      {
        service_id: 'WEEKEND',
        monday: '0',
        tuesday: '0',
        wednesday: '0',
        thursday: '0',
        friday: '0',
        saturday: '1',
        sunday: '1'
      }
    ];

    const trips = [
      {
        trip_id: 'TRIP001',
        route_id: 'ROUTE001',
        service_id: 'WEEKDAY',
        trip_headsign: 'ゆめタウン佐賀行き'
      },
      {
        trip_id: 'TRIP002',
        route_id: 'ROUTE001',
        service_id: 'WEEKDAY',
        trip_headsign: 'ゆめタウン佐賀行き'
      },
      {
        trip_id: 'TRIP003',
        route_id: 'ROUTE001',
        service_id: 'WEEKEND',
        trip_headsign: 'ゆめタウン佐賀行き'
      }
    ];

    const stopTimes = [
      {
        trip_id: 'TRIP001',
        stop_id: 'STOP001',
        arrival_time: '08:00:00',
        departure_time: '08:00:00',
        stop_sequence: '1'
      },
      {
        trip_id: 'TRIP002',
        stop_id: 'STOP001',
        arrival_time: '09:00:00',
        departure_time: '09:00:00',
        stop_sequence: '1'
      },
      {
        trip_id: 'TRIP003',
        stop_id: 'STOP001',
        arrival_time: '10:00:00',
        departure_time: '10:00:00',
        stop_sequence: '1'
      }
    ];

    timetableController = new window.TimetableController(
      stopTimes,
      trips,
      routes,
      calendar,
      stops
    );
  });

  it('平日の時刻表を取得できる', () => {
    const result = timetableController.getTimetable('STOP001', 'ROUTE001', '平日');

    expect(result).toHaveLength(2);
    expect(result[0].departureTime).toBe('08:00');
    expect(result[0].tripHeadsign).toBe('ゆめタウン佐賀行き');
    expect(result[1].departureTime).toBe('09:00');
  });

  it('土日祝の時刻表を取得できる', () => {
    const result = timetableController.getTimetable('STOP001', 'ROUTE001', '土日祝');

    expect(result).toHaveLength(1);
    expect(result[0].departureTime).toBe('10:00');
    expect(result[0].tripHeadsign).toBe('ゆめタウン佐賀行き');
  });

  it('時刻表が発車時刻順にソートされている', () => {
    const stopTimes = [
      {
        trip_id: 'TRIP001',
        stop_id: 'STOP001',
        arrival_time: '09:00:00',
        departure_time: '09:00:00',
        stop_sequence: '1'
      },
      {
        trip_id: 'TRIP002',
        stop_id: 'STOP001',
        arrival_time: '08:00:00',
        departure_time: '08:00:00',
        stop_sequence: '1'
      },
      {
        trip_id: 'TRIP003',
        stop_id: 'STOP001',
        arrival_time: '10:00:00',
        departure_time: '10:00:00',
        stop_sequence: '1'
      }
    ];

    const controller = new window.TimetableController(
      stopTimes,
      timetableController.trips,
      timetableController.routes,
      timetableController.calendar,
      timetableController.stops
    );

    const result = controller.getTimetable('STOP001', 'ROUTE001', '平日');

    expect(result).toHaveLength(2);
    expect(result[0].departureTime).toBe('08:00');
    expect(result[1].departureTime).toBe('09:00');
  });
});

describe('TimetableController - getTimetable() 異常系', () => {
  let timetableController;

  beforeEach(() => {
    timetableController = new window.TimetableController([], [], [], [], []);
  });

  it('存在しないバス停を指定した場合は空配列を返す', () => {
    const result = timetableController.getTimetable('存在しないバス停', 'ROUTE001', '平日');

    expect(result).toEqual([]);
  });

  it('存在しない路線を指定した場合は空配列を返す', () => {
    const stops = [
      {
        stop_id: 'STOP001',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2490',
        stop_lon: '130.2990'
      }
    ];

    const controller = new window.TimetableController([], [], [], [], stops);
    const result = controller.getTimetable('STOP001', '存在しない路線', '平日');

    expect(result).toEqual([]);
  });

  it('必須パラメータが不足している場合は空配列を返す', () => {
    expect(timetableController.getTimetable(null, 'ROUTE001', '平日')).toEqual([]);
    expect(timetableController.getTimetable('STOP001', null, '平日')).toEqual([]);
    expect(timetableController.getTimetable('STOP001', 'ROUTE001', null)).toEqual([]);
  });

  it('該当する時刻表データが存在しない場合は空配列を返す', () => {
    const stops = [
      {
        stop_id: 'STOP001',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2490',
        stop_lon: '130.2990'
      }
    ];

    const routes = [
      {
        route_id: 'ROUTE001',
        route_long_name: 'ゆめタウン線',
        route_short_name: '1',
        agency_id: 'AGENCY001',
        route_type: '3'
      }
    ];

    const controller = new window.TimetableController([], [], routes, [], stops);
    const result = controller.getTimetable('STOP001', 'ROUTE001', '平日');

    expect(result).toEqual([]);
  });
});

describe('TimetableController - getTimetable() 境界値テスト', () => {
  let timetableController;

  beforeEach(() => {
    const stops = [
      {
        stop_id: 'STOP001',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2490',
        stop_lon: '130.2990'
      }
    ];

    const routes = [
      {
        route_id: 'ROUTE001',
        route_long_name: 'ゆめタウン線',
        route_short_name: '1',
        agency_id: 'AGENCY001',
        route_type: '3'
      }
    ];

    const calendar = [
      {
        service_id: 'WEEKDAY',
        monday: '1',
        tuesday: '1',
        wednesday: '1',
        thursday: '1',
        friday: '1',
        saturday: '0',
        sunday: '0'
      }
    ];

    const trips = [
      {
        trip_id: 'TRIP001',
        route_id: 'ROUTE001',
        service_id: 'WEEKDAY',
        trip_headsign: '深夜便'
      }
    ];

    const stopTimes = [
      {
        trip_id: 'TRIP001',
        stop_id: 'STOP001',
        arrival_time: '25:30:00',
        departure_time: '25:30:00',
        stop_sequence: '1'
      }
    ];

    timetableController = new window.TimetableController(
      stopTimes,
      trips,
      routes,
      calendar,
      stops
    );
  });

  it('深夜便（25:00以降）の時刻を正しく表示する', () => {
    const result = timetableController.getTimetable('STOP001', 'ROUTE001', '平日');

    expect(result).toHaveLength(1);
    expect(result[0].departureTime).toBe('翌01:30');
    expect(result[0].departureHour).toBe(25);
    expect(result[0].departureMinute).toBe(30);
  });
});

describe('TimetableController - getRouteStops() 正常系', () => {
  let timetableController;

  beforeEach(() => {
    const stops = [
      {
        stop_id: 'STOP001',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2490',
        stop_lon: '130.2990'
      },
      {
        stop_id: 'STOP002',
        stop_name: 'ゆめタウン佐賀',
        stop_lat: '33.2500',
        stop_lon: '130.3000'
      },
      {
        stop_id: 'STOP003',
        stop_name: '佐賀城跡',
        stop_lat: '33.2510',
        stop_lon: '130.3010'
      }
    ];

    const routes = [
      {
        route_id: 'ROUTE001',
        route_long_name: 'ゆめタウン線',
        route_short_name: '1',
        agency_id: 'AGENCY001',
        route_type: '3'
      }
    ];

    const calendar = [
      {
        service_id: 'WEEKDAY',
        monday: '1',
        tuesday: '1',
        wednesday: '1',
        thursday: '1',
        friday: '1',
        saturday: '0',
        sunday: '0'
      }
    ];

    const trips = [
      {
        trip_id: 'TRIP001',
        route_id: 'ROUTE001',
        service_id: 'WEEKDAY',
        trip_headsign: 'ゆめタウン佐賀行き'
      }
    ];

    const stopTimes = [
      {
        trip_id: 'TRIP001',
        stop_id: 'STOP001',
        arrival_time: '08:00:00',
        departure_time: '08:00:00',
        stop_sequence: '1'
      },
      {
        trip_id: 'TRIP001',
        stop_id: 'STOP002',
        arrival_time: '08:15:00',
        departure_time: '08:15:00',
        stop_sequence: '2'
      },
      {
        trip_id: 'TRIP001',
        stop_id: 'STOP003',
        arrival_time: '08:30:00',
        departure_time: '08:30:00',
        stop_sequence: '3'
      }
    ];

    timetableController = new window.TimetableController(
      stopTimes,
      trips,
      routes,
      calendar,
      stops
    );
  });

  it('路線の経路情報を取得できる', () => {
    const result = timetableController.getRouteStops('ROUTE001');

    expect(result).toHaveLength(3);
    expect(result[0].stopId).toBe('STOP001');
    expect(result[0].stopName).toBe('佐賀駅バスセンター');
    expect(result[0].stopSequence).toBe(1);
    expect(result[0].lat).toBe(33.2490);
    expect(result[0].lng).toBe(130.2990);
  });

  it('経路情報が停車順にソートされている', () => {
    const result = timetableController.getRouteStops('ROUTE001');

    expect(result).toHaveLength(3);
    expect(result[0].stopSequence).toBe(1);
    expect(result[1].stopSequence).toBe(2);
    expect(result[2].stopSequence).toBe(3);
  });

  it('tripIdを指定して経路情報を取得できる', () => {
    const result = timetableController.getRouteStops('ROUTE001', 'TRIP001');

    expect(result).toHaveLength(3);
    expect(result[0].stopId).toBe('STOP001');
    expect(result[1].stopId).toBe('STOP002');
    expect(result[2].stopId).toBe('STOP003');
  });
});

describe('TimetableController - getRouteStops() 異常系', () => {
  let timetableController;

  beforeEach(() => {
    timetableController = new window.TimetableController([], [], [], [], []);
  });

  it('存在しない路線を指定した場合は空配列を返す', () => {
    const result = timetableController.getRouteStops('存在しない路線');

    expect(result).toEqual([]);
  });

  it('routeIdが指定されていない場合は空配列を返す', () => {
    const result = timetableController.getRouteStops(null);

    expect(result).toEqual([]);
  });

  it('路線に属する便が存在しない場合は空配列を返す', () => {
    const routes = [
      {
        route_id: 'ROUTE001',
        route_long_name: 'ゆめタウン線',
        route_short_name: '1',
        agency_id: 'AGENCY001',
        route_type: '3'
      }
    ];

    const controller = new window.TimetableController([], [], routes, [], []);
    const result = controller.getRouteStops('ROUTE001');

    expect(result).toEqual([]);
  });

  it('存在しないtripIdを指定した場合は空配列を返す', () => {
    const result = timetableController.getRouteStops('ROUTE001', '存在しないTRIP');

    expect(result).toEqual([]);
  });
});

describe('TimetableController - updateData()メソッド', () => {
  it('データを更新できる', () => {
    const timetableController = new window.TimetableController([], [], [], [], []);

    const newStops = [
      {
        stop_id: 'STOP001',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2490',
        stop_lon: '130.2990'
      }
    ];

    const newRoutes = [
      {
        route_id: 'ROUTE001',
        route_long_name: 'ゆめタウン線',
        route_short_name: '1',
        agency_id: 'AGENCY001',
        route_type: '3'
      }
    ];

    const newCalendar = [
      {
        service_id: 'WEEKDAY',
        monday: '1',
        tuesday: '1',
        wednesday: '1',
        thursday: '1',
        friday: '1',
        saturday: '0',
        sunday: '0'
      }
    ];

    const newTrips = [
      {
        trip_id: 'TRIP001',
        route_id: 'ROUTE001',
        service_id: 'WEEKDAY',
        trip_headsign: 'ゆめタウン佐賀行き'
      }
    ];

    const newStopTimes = [
      {
        trip_id: 'TRIP001',
        stop_id: 'STOP001',
        arrival_time: '08:00:00',
        departure_time: '08:00:00',
        stop_sequence: '1'
      }
    ];

    timetableController.updateData(newStopTimes, newTrips, newRoutes, newCalendar, newStops);

    expect(timetableController.stopTimes).toEqual(newStopTimes);
    expect(timetableController.trips).toEqual(newTrips);
    expect(timetableController.routes).toEqual(newRoutes);
    expect(timetableController.calendar).toEqual(newCalendar);
    expect(timetableController.stops).toEqual(newStops);

    // インデックスも再作成されていることを確認
    const result = timetableController.getRoutesAtStop('STOP001');

    expect(result).toHaveLength(1);
    expect(result[0].routeId).toBe('ROUTE001');
  });
});
