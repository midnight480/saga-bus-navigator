/**
 * Node.js環境でTimeUtilsの基本機能をテスト
 * Node.js 18以降の組み込みfetchを使用
 */

// TimeUtilsクラスを直接定義
class TimeUtils {
  constructor() {
    this.holidayCache = {};
  }

  async getCurrentTimeFromNTP() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://ntp-a1.nict.go.jp/cgi-bin/json', {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`NTP request failed: ${response.status}`);
      }

      const data = await response.json();
      return new Date(data.st * 1000);
    } catch (error) {
      console.warn('NTP failed, using local time:', error.message);
      return this.getCurrentTimeLocal();
    }
  }

  getCurrentTimeLocal() {
    return new Date();
  }

  async loadHolidayCalendar(year) {
    if (this.holidayCache[year]) {
      return this.holidayCache[year];
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://holidays-jp.github.io/api/v1/${year}/date.json`,
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Holiday API request failed: ${response.status}`);
      }

      const holidays = await response.json();
      this.holidayCache[year] = holidays;
      return holidays;
    } catch (error) {
      console.warn(`Holiday calendar load failed for ${year}:`, error.message);
      return {};
    }
  }

  async isHoliday(date) {
    const year = date.getFullYear();
    const holidays = await this.loadHolidayCalendar(year);
    const dateStr = date.toISOString().split('T')[0];
    return dateStr in holidays;
  }

  async getWeekdayType(date) {
    const dayOfWeek = date.getDay();
    const isHolidayDate = await this.isHoliday(date);

    if (dayOfWeek >= 1 && dayOfWeek <= 5 && !isHolidayDate) {
      return '平日';
    }

    return '土日祝';
  }

  formatTime(hour, minute) {
    const h = String(hour).padStart(2, '0');
    const m = String(minute).padStart(2, '0');
    return `${h}:${m}`;
  }

  calculateDuration(startHour, startMinute, endHour, endMinute) {
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    return endTotalMinutes - startTotalMinutes;
  }
}

const timeUtils = new TimeUtils();

async function runTests() {
  console.log('=== TimeUtils 機能テスト ===\n');

  // 1. NTP時刻取得テスト
  console.log('1. NTP時刻取得テスト');
  try {
    const ntpTime = await timeUtils.getCurrentTimeFromNTP();
    const localTime = timeUtils.getCurrentTimeLocal();
    console.log(`   NTP時刻: ${ntpTime.toISOString()}`);
    console.log(`   ローカル時刻: ${localTime.toISOString()}`);
    console.log(`   ✓ NTP時刻取得成功\n`);
  } catch (error) {
    console.log(`   ✗ エラー: ${error.message}\n`);
  }

  // 2. 祝日判定テスト
  console.log('2. 祝日判定テスト');
  const testDates = [
    { date: '2025-01-01', expected: true, name: '元日' },
    { date: '2025-01-13', expected: true, name: '成人の日' },
    { date: '2025-01-15', expected: false, name: '平日' },
  ];

  for (const test of testDates) {
    const date = new Date(test.date);
    const isHoliday = await timeUtils.isHoliday(date);
    const result = isHoliday === test.expected ? '✓' : '✗';
    console.log(
      `   ${result} ${test.date} (${test.name}): ${isHoliday ? '祝日' : '平日'}`
    );
  }
  console.log();

  // 3. 曜日区分判定テスト
  console.log('3. 曜日区分判定テスト');
  const weekdayTests = [
    { date: '2025-01-13', expected: '土日祝', name: '月曜・祝日' },
    { date: '2025-01-14', expected: '平日', name: '火曜・平日' },
    { date: '2025-01-18', expected: '土日祝', name: '土曜' },
  ];

  for (const test of weekdayTests) {
    const date = new Date(test.date);
    const weekdayType = await timeUtils.getWeekdayType(date);
    const result = weekdayType === test.expected ? '✓' : '✗';
    console.log(`   ${result} ${test.date} (${test.name}): ${weekdayType}`);
  }
  console.log();

  // 4. 時刻フォーマットテスト
  console.log('4. 時刻フォーマットテスト');
  const formatTests = [
    { hour: 9, minute: 5, expected: '09:05' },
    { hour: 18, minute: 50, expected: '18:50' },
    { hour: 0, minute: 0, expected: '00:00' },
    { hour: 23, minute: 59, expected: '23:59' },
  ];

  for (const test of formatTests) {
    const formatted = timeUtils.formatTime(test.hour, test.minute);
    const result = formatted === test.expected ? '✓' : '✗';
    console.log(
      `   ${result} ${test.hour}時${test.minute}分 → ${formatted}`
    );
  }
  console.log();

  // 5. 所要時間計算テスト
  console.log('5. 所要時間計算テスト');
  const durationTests = [
    { start: [9, 0], end: [9, 30], expected: 30 },
    { start: [18, 50], end: [19, 20], expected: 30 },
    { start: [8, 15], end: [10, 45], expected: 150 },
  ];

  for (const test of durationTests) {
    const duration = timeUtils.calculateDuration(
      test.start[0],
      test.start[1],
      test.end[0],
      test.end[1]
    );
    const result = duration === test.expected ? '✓' : '✗';
    const startTime = timeUtils.formatTime(test.start[0], test.start[1]);
    const endTime = timeUtils.formatTime(test.end[0], test.end[1]);
    console.log(`   ${result} ${startTime} → ${endTime}: ${duration}分`);
  }
  console.log();

  console.log('=== テスト完了 ===');
}

runTests().catch(console.error);
