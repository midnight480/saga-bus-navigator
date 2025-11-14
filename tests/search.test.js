/**
 * 検索アルゴリズムの単体テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';

// SearchControllerクラスをインポート
import '../js/app.js';

describe('SearchController', () => {
  let searchController;
  let mockTimetable;
  let mockFares;

  beforeEach(() => {
    // モックデータの準備
    mockTimetable = [
      // 便100: 佐賀駅BC → 県庁前 → 佐賀大学（平日）
      {
        routeNumber: '11',
        tripId: '100',
        stopSequence: 1,
        stopName: '佐賀駅バスセンター',
        hour: 8,
        minute: 0,
        weekdayType: '平日',
        routeName: '佐賀大学線',
        operator: '佐賀市営バス'
      },
      {
        routeNumber: '11',
        tripId: '100',
        stopSequence: 2,
        stopName: '県庁前',
        hour: 8,
        minute: 5,
        weekdayType: '平日',
        routeName: '佐賀大学線',
        operator: '佐賀市営バス'
      },
      {
        routeNumber: '11',
        tripId: '100',
        stopSequence: 3,
        stopName: '佐賀大学',
        hour: 8,
        minute: 15,
        weekdayType: '平日',
        routeName: '佐賀大学線',
        operator: '佐賀市営バス'
      },
      // 便101: 佐賀駅BC → 県庁前 → 佐賀大学（平日、午後）
      {
        routeNumber: '11',
        tripId: '101',
        stopSequence: 1,
        stopName: '佐賀駅バスセンター',
        hour: 18,
        minute: 50,
        weekdayType: '平日',
        routeName: '佐賀大学線',
        operator: '佐賀市営バス'
      },
      {
        routeNumber: '11',
        tripId: '101',
        stopSequence: 2,
        stopName: '県庁前',
        hour: 18,
        minute: 55,
        weekdayType: '平日',
        routeName: '佐賀大学線',
        operator: '佐賀市営バス'
      },
      {
        routeNumber: '11',
        tripId: '101',
        stopSequence: 3,
        stopName: '佐賀大学',
        hour: 19,
        minute: 5,
        weekdayType: '平日',
        routeName: '佐賀大学線',
        operator: '佐賀市営バス'
      },
      // 便200: 佐賀駅BC → 西与賀（土日祝）
      {
        routeNumber: '12',
        tripId: '200',
        stopSequence: 1,
        stopName: '佐賀駅バスセンター',
        hour: 9,
        minute: 0,
        weekdayType: '土日祝',
        routeName: '西与賀線',
        operator: '佐賀市営バス'
      },
      {
        routeNumber: '12',
        tripId: '200',
        stopSequence: 2,
        stopName: '西与賀',
        hour: 9,
        minute: 20,
        weekdayType: '土日祝',
        routeName: '西与賀線',
        operator: '佐賀市営バス'
      }
    ];

    mockFares = [
      {
        from: '佐賀駅BC',
        to: '県庁前',
        operator: '佐賀市営バス',
        adultFare: 160,
        childFare: 80
      },
      {
        from: '佐賀駅BC',
        to: '佐賀大学',
        operator: '佐賀市営バス',
        adultFare: 180,
        childFare: 90
      },
      {
        from: '佐賀駅BC',
        to: '西与賀',
        operator: '佐賀市営バス',
        adultFare: 200,
        childFare: 100
      }
    ];

    // SearchControllerのインスタンスを作成
    searchController = new window.SearchController(mockTimetable, mockFares);
  });

  describe('createTripIndex', () => {
    it('tripIdでグループ化されたインデックスを作成する', () => {
      const index = searchController.tripIndex;
      
      expect(index['100']).toBeDefined();
      expect(index['100']).toHaveLength(3);
      expect(index['101']).toHaveLength(3);
      expect(index['200']).toHaveLength(2);
    });

    it('各tripの停車順にソートされている', () => {
      const trip100 = searchController.tripIndex['100'];
      
      expect(trip100[0].stopSequence).toBe(1);
      expect(trip100[1].stopSequence).toBe(2);
      expect(trip100[2].stopSequence).toBe(3);
    });
  });

  describe('直通便フィルタリング', () => {
    it('直通便を正しく検索できる', () => {
      const results = searchController.searchDirectTrips(
        '佐賀駅バスセンター',
        '佐賀大学',
        { type: 'departure-time', hour: 0, minute: 0 },
        '平日'
      );
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].departureStop).toBe('佐賀駅バスセンター');
      expect(results[0].arrivalStop).toBe('佐賀大学');
    });

    it('乗車バス停が降車バス停より後の場合は除外される', () => {
      const results = searchController.searchDirectTrips(
        '佐賀大学',
        '佐賀駅バスセンター',
        { type: 'departure-time', hour: 0, minute: 0 },
        '平日'
      );
      
      expect(results).toHaveLength(0);
    });

    it('同一バス停の場合は除外される', () => {
      const results = searchController.searchDirectTrips(
        '佐賀駅バスセンター',
        '佐賀駅バスセンター',
        { type: 'departure-time', hour: 0, minute: 0 },
        '平日'
      );
      
      expect(results).toHaveLength(0);
    });

    it('存在しないバス停の場合は空配列を返す', () => {
      const results = searchController.searchDirectTrips(
        '存在しないバス停',
        '佐賀大学',
        { type: 'departure-time', hour: 0, minute: 0 },
        '平日'
      );
      
      expect(results).toHaveLength(0);
    });

    it('曜日区分でフィルタリングされる', () => {
      const results = searchController.searchDirectTrips(
        '佐賀駅バスセンター',
        '西与賀',
        { type: 'departure-time', hour: 0, minute: 0 },
        '平日'
      );
      
      // 西与賀行きは土日祝のみなので、平日では見つからない
      expect(results).toHaveLength(0);
    });

    it('土日祝の便を正しく検索できる', () => {
      const results = searchController.searchDirectTrips(
        '佐賀駅バスセンター',
        '西与賀',
        { type: 'departure-time', hour: 0, minute: 0 },
        '土日祝'
      );
      
      expect(results).toHaveLength(1);
      expect(results[0].weekdayType).toBe('土日祝');
    });
  });

  describe('時刻フィルタリング', () => {
    it('出発時刻指定: 指定時刻以降の便を検索できる', () => {
      const results = searchController.searchDirectTrips(
        '佐賀駅バスセンター',
        '佐賀大学',
        { type: 'departure-time', hour: 18, minute: 0 },
        '平日'
      );
      
      expect(results).toHaveLength(1);
      expect(results[0].departureTime).toBe('18:50');
    });

    it('出発時刻指定: 指定時刻より前の便は除外される', () => {
      const results = searchController.searchDirectTrips(
        '佐賀駅バスセンター',
        '佐賀大学',
        { type: 'departure-time', hour: 19, minute: 0 },
        '平日'
      );
      
      expect(results).toHaveLength(0);
    });

    it('到着時刻指定: 指定時刻以前の便を検索できる', () => {
      const results = searchController.searchDirectTrips(
        '佐賀駅バスセンター',
        '佐賀大学',
        { type: 'arrival-time', hour: 8, minute: 30 },
        '平日'
      );
      
      expect(results).toHaveLength(1);
      expect(results[0].arrivalTime).toBe('08:15');
    });

    it('到着時刻指定: 指定時刻より後の便は除外される', () => {
      const results = searchController.searchDirectTrips(
        '佐賀駅バスセンター',
        '佐賀大学',
        { type: 'arrival-time', hour: 8, minute: 0 },
        '平日'
      );
      
      expect(results).toHaveLength(0);
    });

    it('今すぐ: 現在時刻以降の便を検索できる', () => {
      const results = searchController.searchDirectTrips(
        '佐賀駅バスセンター',
        '佐賀大学',
        { type: 'now', hour: 8, minute: 30 },
        '平日'
      );
      
      expect(results).toHaveLength(1);
      expect(results[0].departureTime).toBe('18:50');
    });

    it('始発: 最も早い便を1件返す', () => {
      const results = searchController.searchDirectTrips(
        '佐賀駅バスセンター',
        '佐賀大学',
        { type: 'first-bus' },
        '平日'
      );
      
      expect(results).toHaveLength(1);
      expect(results[0].departureTime).toBe('08:00');
    });

    it('終電: 最も遅い便を1件返す', () => {
      const results = searchController.searchDirectTrips(
        '佐賀駅バスセンター',
        '佐賀大学',
        { type: 'last-bus' },
        '平日'
      );
      
      expect(results).toHaveLength(1);
      expect(results[0].departureTime).toBe('18:50');
    });
  });

  describe('所要時間計算', () => {
    it('同じ時間帯の所要時間を正しく計算する', () => {
      const duration = searchController.calculateTravelTime(8, 0, 8, 15);
      expect(duration).toBe(15);
    });

    it('時間をまたぐ所要時間を正しく計算する', () => {
      const duration = searchController.calculateTravelTime(18, 50, 19, 5);
      expect(duration).toBe(15);
    });

    it('1時間の所要時間を正しく計算する', () => {
      const duration = searchController.calculateTravelTime(8, 0, 9, 0);
      expect(duration).toBe(60);
    });

    it('複数時間をまたぐ所要時間を正しく計算する', () => {
      const duration = searchController.calculateTravelTime(6, 30, 9, 45);
      expect(duration).toBe(195); // 3時間15分
    });

    it('0分の所要時間を正しく計算する', () => {
      const duration = searchController.calculateTravelTime(10, 30, 10, 30);
      expect(duration).toBe(0);
    });

    it('検索結果に所要時間が含まれる', () => {
      const results = searchController.searchDirectTrips(
        '佐賀駅バスセンター',
        '佐賀大学',
        { type: 'departure-time', hour: 0, minute: 0 },
        '平日'
      );
      
      expect(results[0].duration).toBe(15);
      expect(results[1].duration).toBe(15);
    });
  });

  describe('運賃取得', () => {
    it('完全一致で運賃を取得できる', () => {
      const fare = searchController.getFare(
        '佐賀駅BC',
        '県庁前',
        '佐賀市営バス'
      );
      
      expect(fare.adultFare).toBe(160);
      expect(fare.childFare).toBe(80);
    });

    it('逆方向でも運賃を取得できる', () => {
      const fare = searchController.getFare(
        '県庁前',
        '佐賀駅BC',
        '佐賀市営バス'
      );
      
      expect(fare.adultFare).toBe(160);
      expect(fare.childFare).toBe(80);
    });

    it('略称対応: 佐賀駅バスセンター → 佐賀駅BC', () => {
      const fare = searchController.getFare(
        '佐賀駅バスセンター',
        '県庁前',
        '佐賀市営バス'
      );
      
      expect(fare.adultFare).toBe(160);
      expect(fare.childFare).toBe(80);
    });

    it('運賃情報がない場合はnullを返す', () => {
      const fare = searchController.getFare(
        '存在しないバス停A',
        '存在しないバス停B',
        '佐賀市営バス'
      );
      
      expect(fare.adultFare).toBeNull();
      expect(fare.childFare).toBeNull();
    });

    it('検索結果に運賃が含まれる', () => {
      const results = searchController.searchDirectTrips(
        '佐賀駅バスセンター',
        '佐賀大学',
        { type: 'departure-time', hour: 0, minute: 0 },
        '平日'
      );
      
      expect(results[0].adultFare).toBe(180);
      expect(results[0].childFare).toBe(90);
    });
  });

  describe('検索結果のソート', () => {
    it('出発時刻指定: 出発時刻昇順でソートされる', () => {
      const results = searchController.searchDirectTrips(
        '佐賀駅バスセンター',
        '佐賀大学',
        { type: 'departure-time', hour: 0, minute: 0 },
        '平日'
      );
      
      expect(results).toHaveLength(2);
      expect(results[0].departureTime).toBe('08:00');
      expect(results[1].departureTime).toBe('18:50');
    });

    it('到着時刻指定: 到着時刻降順でソートされる', () => {
      const results = searchController.searchDirectTrips(
        '佐賀駅バスセンター',
        '佐賀大学',
        { type: 'arrival-time', hour: 20, minute: 0 },
        '平日'
      );
      
      expect(results).toHaveLength(2);
      expect(results[0].arrivalTime).toBe('19:05');
      expect(results[1].arrivalTime).toBe('08:15');
    });
  });

  describe('検索結果の制限', () => {
    it('最大20件に制限される', () => {
      // 21件以上のモックデータを作成
      const largeTimetable = [];
      for (let i = 0; i < 25; i++) {
        largeTimetable.push(
          {
            routeNumber: '11',
            tripId: `trip-${i}`,
            stopSequence: 1,
            stopName: '佐賀駅バスセンター',
            hour: 6 + Math.floor(i / 2),
            minute: (i % 2) * 30,
            weekdayType: '平日',
            routeName: '佐賀大学線',
            operator: '佐賀市営バス'
          },
          {
            routeNumber: '11',
            tripId: `trip-${i}`,
            stopSequence: 2,
            stopName: '佐賀大学',
            hour: 6 + Math.floor(i / 2),
            minute: (i % 2) * 30 + 15,
            weekdayType: '平日',
            routeName: '佐賀大学線',
            operator: '佐賀市営バス'
          }
        );
      }

      const largeController = new window.SearchController(largeTimetable, mockFares);
      const results = largeController.searchDirectTrips(
        '佐賀駅バスセンター',
        '佐賀大学',
        { type: 'departure-time', hour: 0, minute: 0 },
        '平日'
      );
      
      expect(results).toHaveLength(20);
    });
  });

  describe('時刻比較ユーティリティ', () => {
    it('isTimeAfterOrEqual: 時刻が後の場合trueを返す', () => {
      const result = searchController.isTimeAfterOrEqual(10, 30, 10, 0);
      expect(result).toBe(true);
    });

    it('isTimeAfterOrEqual: 時刻が同じ場合trueを返す', () => {
      const result = searchController.isTimeAfterOrEqual(10, 30, 10, 30);
      expect(result).toBe(true);
    });

    it('isTimeAfterOrEqual: 時刻が前の場合falseを返す', () => {
      const result = searchController.isTimeAfterOrEqual(10, 0, 10, 30);
      expect(result).toBe(false);
    });

    it('isTimeBeforeOrEqual: 時刻が前の場合trueを返す', () => {
      const result = searchController.isTimeBeforeOrEqual(10, 0, 10, 30);
      expect(result).toBe(true);
    });

    it('isTimeBeforeOrEqual: 時刻が同じ場合trueを返す', () => {
      const result = searchController.isTimeBeforeOrEqual(10, 30, 10, 30);
      expect(result).toBe(true);
    });

    it('isTimeBeforeOrEqual: 時刻が後の場合falseを返す', () => {
      const result = searchController.isTimeBeforeOrEqual(10, 30, 10, 0);
      expect(result).toBe(false);
    });
  });

  describe('時刻フォーマット', () => {
    it('1桁の時と分を2桁にゼロパディングする', () => {
      const result = searchController.formatTime(9, 5);
      expect(result).toBe('09:05');
    });

    it('2桁の時と分をそのまま表示する', () => {
      const result = searchController.formatTime(18, 50);
      expect(result).toBe('18:50');
    });

    it('0時0分を正しくフォーマットする', () => {
      const result = searchController.formatTime(0, 0);
      expect(result).toBe('00:00');
    });
  });
});
