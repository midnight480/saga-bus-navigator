/**
 * 時刻ユーティリティクラス
 * NTP時刻取得、祝日判定、時刻フォーマット、所要時間計算を提供
 */
class TimeUtils {
  constructor() {
    // 祝日データのキャッシュ { 2025: {...}, 2026: {...} }
    this.holidayCache = {};
  }

  /**
   * NTPサーバーから現在時刻を取得
   * @returns {Promise<Date>} 現在時刻
   */
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
      // st: Unix timestamp (秒)
      return new Date(data.st * 1000);
    } catch (error) {
      console.warn('NTP failed, using local time:', error);
      return this.getCurrentTimeLocal();
    }
  }

  /**
   * ローカル時刻を取得（NTPフォールバック）
   * @returns {Date} ローカル時刻
   */
  getCurrentTimeLocal() {
    return new Date();
  }

  /**
   * 祝日カレンダーを読み込み
   * @param {number} year - 年
   * @returns {Promise<Object>} 祝日データ { "2025-01-01": "元日", ... }
   */
  async loadHolidayCalendar(year) {
    // キャッシュに存在する場合は返す
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
      console.warn(`Holiday calendar load failed for ${year}:`, error);
      return {}; // 空オブジェクトをフォールバック
    }
  }

  /**
   * 指定日が祝日かどうかを判定
   * @param {Date} date - 判定する日付
   * @returns {Promise<boolean>} 祝日の場合true
   */
  async isHoliday(date) {
    const year = date.getFullYear();
    const holidays = await this.loadHolidayCalendar(year);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return dateStr in holidays;
  }

  /**
   * 曜日区分を取得（平日 or 土日祝）
   * @param {Date} date - 判定する日付
   * @returns {Promise<string>} "平日" または "土日祝"
   */
  async getWeekdayType(date) {
    const dayOfWeek = date.getDay(); // 0=日曜, 6=土曜
    const isHolidayDate = await this.isHoliday(date);

    // 月〜金 かつ 祝日でない → 平日
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && !isHolidayDate) {
      return '平日';
    }

    // 土日 または 祝日 → 土日祝
    return '土日祝';
  }

  /**
   * 時刻をHH:MM形式にフォーマット
   * @param {number} hour - 時（0-23）
   * @param {number} minute - 分（0-59）
   * @returns {string} フォーマットされた時刻（例: "09:05"）
   */
  formatTime(hour, minute) {
    const h = String(hour).padStart(2, '0');
    const m = String(minute).padStart(2, '0');
    return `${h}:${m}`;
  }

  /**
   * 所要時間を計算（分単位）
   * @param {number} startHour - 開始時
   * @param {number} startMinute - 開始分
   * @param {number} endHour - 終了時
   * @param {number} endMinute - 終了分
   * @returns {number} 所要時間（分）
   */
  calculateDuration(startHour, startMinute, endHour, endMinute) {
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    return endTotalMinutes - startTotalMinutes;
  }
}

// グローバルインスタンスをエクスポート
const timeUtils = new TimeUtils();

// テスト環境用にクラスをグローバルに公開
if (typeof window !== 'undefined') {
  window.TimeUtils = TimeUtils;
  window.timeUtils = timeUtils;
}
