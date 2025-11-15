/**
 * SearchControllerの簡易テスト
 */

// Node.js環境でCSVを読み込むためのモジュール
const fs = require('fs');
const path = require('path');

// CSVパーサー（簡易版）
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index];
    });
    return obj;
  });
}

// データ読み込み
const timetableCSV = fs.readFileSync('data/timetable/timetable_all_complete.csv', 'utf-8');
const fareCSV = fs.readFileSync('data/fare/fare_major_routes.csv', 'utf-8');

const timetableRaw = parseCSV(timetableCSV);
const fareRaw = parseCSV(fareCSV);

// データ変換
const timetable = timetableRaw.map(row => ({
  routeNumber: row['路線番号'],
  tripId: row['便ID'],
  stopSequence: parseInt(row['バス停順序'], 10),
  stopName: row['バス停名'],
  hour: parseInt(row['時'], 10),
  minute: parseInt(row['分'], 10),
  weekdayType: row['曜日区分'],
  routeName: row['路線名'],
  operator: row['運行会社']
}));

const fares = fareRaw.map(row => ({
  from: row['出発地'],
  to: row['目的地'],
  operator: row['運行会社'],
  adultFare: parseInt(row['大人運賃'], 10),
  childFare: parseInt(row['小児運賃'], 10)
}));

// SearchControllerクラスの定義（app.jsから抽出）
class SearchController {
  constructor(timetable, fares) {
    this.timetable = timetable;
    this.fares = fares;
    this.tripIndex = this.createTripIndex();
  }

  createTripIndex() {
    const index = {};
    this.timetable.forEach(entry => {
      if (!index[entry.tripId]) {
        index[entry.tripId] = [];
      }
      index[entry.tripId].push(entry);
    });
    Object.keys(index).forEach(tripId => {
      index[tripId].sort((a, b) => a.stopSequence - b.stopSequence);
    });
    return index;
  }

  searchDirectTrips(departureStop, arrivalStop, searchCriteria, weekdayType) {
    const results = [];
    Object.keys(this.tripIndex).forEach(tripId => {
      const stops = this.tripIndex[tripId];
      if (stops[0].weekdayType !== weekdayType) return;
      
      const departureIndex = stops.findIndex(s => s.stopName === departureStop);
      const arrivalIndex = stops.findIndex(s => s.stopName === arrivalStop);
      
      if (departureIndex === -1 || arrivalIndex === -1 || departureIndex >= arrivalIndex) {
        return;
      }
      
      const departureEntry = stops[departureIndex];
      const arrivalEntry = stops[arrivalIndex];
      
      if (!this.matchesTimeFilter(departureEntry, arrivalEntry, searchCriteria)) {
        return;
      }
      
      const duration = this.calculateTravelTime(
        departureEntry.hour, departureEntry.minute,
        arrivalEntry.hour, arrivalEntry.minute
      );
      
      const fare = this.getFare(departureStop, arrivalStop, departureEntry.operator);
      
      results.push({
        tripId: tripId,
        routeNumber: departureEntry.routeNumber,
        routeName: departureEntry.routeName,
        operator: departureEntry.operator,
        departureStop: departureStop,
        arrivalStop: arrivalStop,
        departureTime: this.formatTime(departureEntry.hour, departureEntry.minute),
        arrivalTime: this.formatTime(arrivalEntry.hour, arrivalEntry.minute),
        departureHour: departureEntry.hour,
        departureMinute: departureEntry.minute,
        arrivalHour: arrivalEntry.hour,
        arrivalMinute: arrivalEntry.minute,
        duration: duration,
        adultFare: fare.adultFare,
        childFare: fare.childFare,
        weekdayType: weekdayType
      });
    });
    
    this.sortResults(results, searchCriteria.type);
    return results.slice(0, 20);
  }

  matchesTimeFilter(departureEntry, arrivalEntry, searchCriteria) {
    const { type, hour, minute } = searchCriteria;
    switch (type) {
      case 'departure-time':
      case 'now':
        return this.isTimeAfterOrEqual(
          departureEntry.hour, departureEntry.minute, hour, minute
        );
      case 'arrival-time':
        return this.isTimeBeforeOrEqual(
          arrivalEntry.hour, arrivalEntry.minute, hour, minute
        );
      case 'first-bus':
      case 'last-bus':
        return true;
      default:
        return true;
    }
  }

  isTimeAfterOrEqual(hour1, minute1, hour2, minute2) {
    if (hour1 > hour2) return true;
    if (hour1 < hour2) return false;
    return minute1 >= minute2;
  }

  isTimeBeforeOrEqual(hour1, minute1, hour2, minute2) {
    if (hour1 < hour2) return true;
    if (hour1 > hour2) return false;
    return minute1 <= minute2;
  }

  calculateTravelTime(startHour, startMinute, endHour, endMinute) {
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    let duration = endMinutes - startMinutes;
    if (duration < 0) duration += 24 * 60;
    return duration;
  }

  getFare(departureStop, arrivalStop, operator) {
    let fare = this.fares.find(f => 
      f.from === departureStop && f.to === arrivalStop && f.operator === operator
    );
    if (!fare) {
      fare = this.fares.find(f => 
        f.from === arrivalStop && f.to === departureStop && f.operator === operator
      );
    }
    if (!fare) {
      fare = this.findFareWithAbbreviation(departureStop, arrivalStop, operator);
    }
    if (fare) {
      return { adultFare: fare.adultFare, childFare: fare.childFare };
    }
    return { adultFare: null, childFare: null };
  }

  findFareWithAbbreviation(departureStop, arrivalStop, operator) {
    const abbreviations = {
      '佐賀駅バスセンター': '佐賀駅BC',
      '佐賀駅BC': '佐賀駅バスセンター'
    };
    const depAbbrev = abbreviations[departureStop] || departureStop;
    const arrAbbrev = abbreviations[arrivalStop] || arrivalStop;
    
    let fare = this.fares.find(f => 
      (f.from === depAbbrev || f.from === departureStop) && 
      (f.to === arrAbbrev || f.to === arrivalStop) && 
      f.operator === operator
    );
    if (!fare) {
      fare = this.fares.find(f => 
        (f.from === arrAbbrev || f.from === arrivalStop) && 
        (f.to === depAbbrev || f.to === departureStop) && 
        f.operator === operator
      );
    }
    return fare;
  }

  sortResults(results, searchType) {
    if (searchType === 'arrival-time' || searchType === 'last-bus') {
      results.sort((a, b) => {
        if (a.arrivalHour !== b.arrivalHour) return b.arrivalHour - a.arrivalHour;
        return b.arrivalMinute - a.arrivalMinute;
      });
      if (searchType === 'last-bus' && results.length > 0) {
        const lastBus = results[0];
        results.length = 0;
        results.push(lastBus);
      }
    } else {
      results.sort((a, b) => {
        if (a.departureHour !== b.departureHour) return a.departureHour - b.departureHour;
        return a.departureMinute - b.departureMinute;
      });
      if (searchType === 'first-bus' && results.length > 0) {
        const firstBus = results[0];
        results.length = 0;
        results.push(firstBus);
      }
    }
  }

  formatTime(hour, minute) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
}

// テスト実行
console.log('=== SearchController テスト ===\n');

const controller = new SearchController(timetable, fares);

console.log(`読み込んだデータ:`);
console.log(`- 時刻表: ${timetable.length}件`);
console.log(`- 運賃: ${fares.length}件`);
console.log(`- Trip数: ${Object.keys(controller.tripIndex).length}件\n`);

// テスト1: 出発時刻指定
console.log('テスト1: 佐賀駅バスセンター → 佐賀大学（平日、18:00以降）');
const results1 = controller.searchDirectTrips(
  '佐賀駅バスセンター',
  '佐賀大学',
  { type: 'departure-time', hour: 18, minute: 0 },
  '平日'
);
console.log(`結果: ${results1.length}件`);
if (results1.length > 0) {
  console.log('最初の3件:');
  results1.slice(0, 3).forEach(r => {
    console.log(`  ${r.departureTime} → ${r.arrivalTime} (${r.duration}分) ${r.routeName} 運賃:${r.adultFare}円`);
  });
}
console.log('');

// テスト2: 始発
console.log('テスト2: 佐賀駅バスセンター → 県庁前（平日、始発）');
const results2 = controller.searchDirectTrips(
  '佐賀駅バスセンター',
  '県庁前',
  { type: 'first-bus' },
  '平日'
);
console.log(`結果: ${results2.length}件`);
if (results2.length > 0) {
  const r = results2[0];
  console.log(`  ${r.departureTime} → ${r.arrivalTime} (${r.duration}分) ${r.routeName} 運賃:${r.adultFare}円`);
}
console.log('');

// テスト3: 終電
console.log('テスト3: 佐賀駅バスセンター → 佐賀大学（平日、終電）');
const results3 = controller.searchDirectTrips(
  '佐賀駅バスセンター',
  '佐賀大学',
  { type: 'last-bus' },
  '平日'
);
console.log(`結果: ${results3.length}件`);
if (results3.length > 0) {
  const r = results3[0];
  console.log(`  ${r.departureTime} → ${r.arrivalTime} (${r.duration}分) ${r.routeName} 運賃:${r.adultFare}円`);
}
console.log('');

// テスト4: 到着時刻指定
console.log('テスト4: 佐賀駅バスセンター → 佐賀大学（平日、19:00までに到着）');
const results4 = controller.searchDirectTrips(
  '佐賀駅バスセンター',
  '佐賀大学',
  { type: 'arrival-time', hour: 19, minute: 0 },
  '平日'
);
console.log(`結果: ${results4.length}件`);
if (results4.length > 0) {
  console.log('最初の3件:');
  results4.slice(0, 3).forEach(r => {
    console.log(`  ${r.departureTime} → ${r.arrivalTime} (${r.duration}分) ${r.routeName} 運賃:${r.adultFare}円`);
  });
}
console.log('');

// パフォーマンステスト
console.log('パフォーマンステスト: 100回検索');
const startTime = Date.now();
for (let i = 0; i < 100; i++) {
  controller.searchDirectTrips(
    '佐賀駅バスセンター',
    '佐賀大学',
    { type: 'departure-time', hour: 18, minute: 0 },
    '平日'
  );
}
const endTime = Date.now();
const avgTime = (endTime - startTime) / 100;
console.log(`平均検索時間: ${avgTime.toFixed(2)}ms`);
console.log(`要件（2秒以内）: ${avgTime < 2000 ? '✓ 合格' : '✗ 不合格'}`);
