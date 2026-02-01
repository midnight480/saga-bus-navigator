/**
 * SearchControllerAdapter
 * 既存のSearchControllerをAPI用にラップするアダプター
 */

import { DataLoaderAdapter } from './data-loader-adapter';

// 型定義
interface SearchCriteria {
  type: 'departure-time' | 'arrival-time' | 'now' | 'first-bus' | 'last-bus';
  hour?: number;
  minute?: number;
}

interface ViaStop {
  name: string;
  time: string;
}

interface SearchResult {
  tripId: string;
  routeNumber: string;
  routeName: string;
  operator: string;
  departureStop: string;
  arrivalStop: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  adultFare: number | null;
  childFare: number | null;
  weekdayType: string;
  viaStops: ViaStop[];
  tripHeadsign: string;
  direction: string;
}

export class SearchControllerAdapter {
  private dataLoader: DataLoaderAdapter;

  constructor(dataLoader: DataLoaderAdapter) {
    this.dataLoader = dataLoader;
  }

  /**
   * 直通便を検索
   * @param from 乗車バス停名
   * @param to 降車バス停名
   * @param searchCriteria 検索条件
   * @param weekdayType 曜日区分
   * @returns 検索結果の配列
   */
  searchDirectTrips(
    from: string,
    to: string,
    searchCriteria: SearchCriteria,
    weekdayType: string
  ): SearchResult[] {
    const timetable = this.dataLoader.getTimetable();
    const results: SearchResult[] = [];
    const seenKeys = new Set<string>();
    
    // tripIdでグループ化
    const tripIndex = this.createTripIndex(timetable);
    
    // 各tripを検索
    Object.keys(tripIndex).forEach(tripId => {
      const stops = tripIndex[tripId];
      
      // 曜日区分でフィルタ
      if (stops[0].weekdayType !== weekdayType) {
        return;
      }
      
      // 乗車バス停と降車バス停のインデックスを検索
      const departureIndex = stops.findIndex(s => s.stopName === from);
      const arrivalIndex = stops.findIndex(s => s.stopName === to);
      
      // 直通便チェック
      if (departureIndex === -1 || arrivalIndex === -1 || departureIndex >= arrivalIndex) {
        return;
      }
      
      const departureEntry = stops[departureIndex];
      const arrivalEntry = stops[arrivalIndex];
      
      // 時刻フィルタリング
      if (!this.matchesTimeFilter(departureEntry, arrivalEntry, searchCriteria)) {
        return;
      }
      
      // 重複チェック
      const uniqueKey = `${tripId}_${departureEntry.hour}:${departureEntry.minute}_${arrivalEntry.hour}:${arrivalEntry.minute}`;
      if (seenKeys.has(uniqueKey)) {
        return;
      }
      seenKeys.add(uniqueKey);
      
      // 所要時間を計算
      const duration = this.calculateTravelTime(
        departureEntry.hour,
        departureEntry.minute,
        arrivalEntry.hour,
        arrivalEntry.minute
      );
      
      // 経由バス停を取得
      const viaStops: ViaStop[] = stops
        .slice(departureIndex + 1, arrivalIndex)
        .map(stop => ({
          name: stop.stopName,
          time: this.formatTime(stop.hour, stop.minute)
        }));
      
      // 結果に追加
      results.push({
        tripId: tripId,
        routeNumber: departureEntry.routeNumber,
        routeName: departureEntry.routeName,
        operator: departureEntry.operator,
        departureStop: from,
        arrivalStop: to,
        departureTime: this.formatTime(departureEntry.hour, departureEntry.minute),
        arrivalTime: this.formatTime(arrivalEntry.hour, arrivalEntry.minute),
        duration: duration,
        adultFare: null,
        childFare: null,
        weekdayType: weekdayType,
        viaStops: viaStops,
        tripHeadsign: departureEntry.tripHeadsign || '',
        direction: departureEntry.direction || 'unknown'
      });
    });
    
    // ソート
    this.sortResults(results, searchCriteria.type);
    
    // 最大20件に制限
    return results.slice(0, 20);
  }

  /**
   * 始発を検索
   * @param stop バス停名
   * @param to 行先バス停名（オプション）
   * @param weekdayType 曜日区分（オプション）
   * @returns 始発情報、見つからない場合はnull
   */
  searchFirstBus(
    stop: string,
    to?: string,
    weekdayType?: string
  ): SearchResult | null {
    const timetable = this.dataLoader.getTimetable();
    
    // 行先が指定されている場合は直通便検索
    if (to) {
      const results = this.searchDirectTrips(
        stop,
        to,
        { type: 'first-bus' },
        weekdayType || '平日'
      );
      return results.length > 0 ? results[0] : null;
    }
    
    // 行先が指定されていない場合は、このバス停からの最も早い発車便を検索
    const departures = timetable
      .filter(entry => 
        entry.stopName === stop &&
        (!weekdayType || entry.weekdayType === weekdayType)
      )
      .sort((a, b) => {
        if (a.hour !== b.hour) return a.hour - b.hour;
        return a.minute - b.minute;
      });
    
    if (departures.length === 0) {
      return null;
    }
    
    const firstDeparture = departures[0];
    
    return {
      tripId: firstDeparture.tripId,
      routeNumber: firstDeparture.routeNumber,
      routeName: firstDeparture.routeName,
      operator: firstDeparture.operator,
      departureStop: stop,
      arrivalStop: firstDeparture.tripHeadsign || '',
      departureTime: this.formatTime(firstDeparture.hour, firstDeparture.minute),
      arrivalTime: '',
      duration: 0,
      adultFare: null,
      childFare: null,
      weekdayType: firstDeparture.weekdayType,
      viaStops: [],
      tripHeadsign: firstDeparture.tripHeadsign || '',
      direction: firstDeparture.direction || 'unknown'
    };
  }

  /**
   * 終電を検索
   * @param stop バス停名
   * @param to 行先バス停名（オプション）
   * @param weekdayType 曜日区分（オプション）
   * @returns 終電情報、見つからない場合はnull
   */
  searchLastBus(
    stop: string,
    to?: string,
    weekdayType?: string
  ): SearchResult | null {
    const timetable = this.dataLoader.getTimetable();
    
    // 行先が指定されている場合は直通便検索
    if (to) {
      const results = this.searchDirectTrips(
        stop,
        to,
        { type: 'last-bus' },
        weekdayType || '平日'
      );
      return results.length > 0 ? results[0] : null;
    }
    
    // 行先が指定されていない場合は、このバス停からの最も遅い発車便を検索
    const departures = timetable
      .filter(entry => 
        entry.stopName === stop &&
        (!weekdayType || entry.weekdayType === weekdayType)
      )
      .sort((a, b) => {
        if (a.hour !== b.hour) return b.hour - a.hour;
        return b.minute - a.minute;
      });
    
    if (departures.length === 0) {
      return null;
    }
    
    const lastDeparture = departures[0];
    
    return {
      tripId: lastDeparture.tripId,
      routeNumber: lastDeparture.routeNumber,
      routeName: lastDeparture.routeName,
      operator: lastDeparture.operator,
      departureStop: stop,
      arrivalStop: lastDeparture.tripHeadsign || '',
      departureTime: this.formatTime(lastDeparture.hour, lastDeparture.minute),
      arrivalTime: '',
      duration: 0,
      adultFare: null,
      childFare: null,
      weekdayType: lastDeparture.weekdayType,
      viaStops: [],
      tripHeadsign: lastDeparture.tripHeadsign || '',
      direction: lastDeparture.direction || 'unknown'
    };
  }

  /**
   * tripIdでグループ化したインデックスを作成
   */
  private createTripIndex(timetable: any[]): { [tripId: string]: any[] } {
    const index: { [tripId: string]: any[] } = {};
    
    timetable.forEach(entry => {
      if (!index[entry.tripId]) {
        index[entry.tripId] = [];
      }
      index[entry.tripId].push(entry);
    });
    
    // 各tripの停車順にソート
    Object.keys(index).forEach(tripId => {
      index[tripId].sort((a, b) => a.stopSequence - b.stopSequence);
    });
    
    return index;
  }

  /**
   * 時刻フィルタリング
   */
  private matchesTimeFilter(departureEntry: any, arrivalEntry: any, searchCriteria: SearchCriteria): boolean {
    const { type, hour, minute } = searchCriteria;
    
    switch (type) {
      case 'departure-time':
      case 'now':
        // 出発時刻が指定時刻以降
        return this.isTimeAfterOrEqual(
          departureEntry.hour,
          departureEntry.minute,
          hour || 0,
          minute || 0
        );
      
      case 'arrival-time':
        // 到着時刻が指定時刻以前
        return this.isTimeBeforeOrEqual(
          arrivalEntry.hour,
          arrivalEntry.minute,
          hour || 0,
          minute || 0
        );
      
      case 'first-bus':
      case 'last-bus':
        // 始発・終電は全ての便を対象にして、後でソート
        return true;
      
      default:
        return true;
    }
  }

  /**
   * 時刻比較: time1 >= time2
   */
  private isTimeAfterOrEqual(hour1: number, minute1: number, hour2: number, minute2: number): boolean {
    if (hour1 > hour2) return true;
    if (hour1 < hour2) return false;
    return minute1 >= minute2;
  }

  /**
   * 時刻比較: time1 <= time2
   */
  private isTimeBeforeOrEqual(hour1: number, minute1: number, hour2: number, minute2: number): boolean {
    if (hour1 < hour2) return true;
    if (hour1 > hour2) return false;
    return minute1 <= minute2;
  }

  /**
   * 所要時間を計算（分単位）
   */
  private calculateTravelTime(startHour: number, startMinute: number, endHour: number, endMinute: number): number {
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    let duration = endMinutes - startMinutes;
    
    // 日をまたぐ場合（深夜便）
    if (duration < 0) {
      duration += 24 * 60;
    }
    
    return duration;
  }

  /**
   * 検索結果のソート
   */
  private sortResults(results: SearchResult[], searchType: string): void {
    if (searchType === 'arrival-time' || searchType === 'last-bus') {
      // 到着時刻降順（遅い順）
      results.sort((a, b) => {
        const [aHour, aMinute] = a.arrivalTime.split(':').map(v => parseInt(v, 10));
        const [bHour, bMinute] = b.arrivalTime.split(':').map(v => parseInt(v, 10));
        
        if (aHour !== bHour) {
          return bHour - aHour;
        }
        return bMinute - aMinute;
      });
      
      // 終電の場合は最初の1件のみ（最も遅い便）
      if (searchType === 'last-bus' && results.length > 0) {
        const lastBus = results[0];
        results.length = 0;
        results.push(lastBus);
      }
    } else {
      // 出発時刻昇順（早い順）
      results.sort((a, b) => {
        const [aHour, aMinute] = a.departureTime.split(':').map(v => parseInt(v, 10));
        const [bHour, bMinute] = b.departureTime.split(':').map(v => parseInt(v, 10));
        
        if (aHour !== bHour) {
          return aHour - bHour;
        }
        return aMinute - bMinute;
      });
      
      // 始発の場合は最初の1件のみ（最も早い便）
      if (searchType === 'first-bus' && results.length > 0) {
        const firstBus = results[0];
        results.length = 0;
        results.push(firstBus);
      }
    }
  }

  /**
   * 時刻フォーマット（HH:MM形式）
   */
  private formatTime(hour: number, minute: number): string {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
}
