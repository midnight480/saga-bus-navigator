/**
 * TimeUtils
 * NTPから現在時刻を取得するユーティリティ
 */

export class TimeUtils {
  /**
   * NTPから現在時刻を取得
   * Cloudflare Pages Functions環境では、NTPプロトコルを直接使用できないため、
   * システム時刻を使用します
   */
  static async getCurrentTimeFromNTP(): Promise<Date> {
    // Cloudflare Workers/Pages Functions環境では、
    // Date.now()がCloudflareのエッジサーバーの正確な時刻を返します
    return new Date();
  }

  /**
   * 曜日区分を判定
   * @param date 判定する日付
   * @returns '平日' または '土日祝'
   */
  static getWeekdayType(date: Date): '平日' | '土日祝' {
    const dayOfWeek = date.getDay(); // 0 (日曜) ~ 6 (土曜)
    
    // 土曜日(6)または日曜日(0)の場合は'土日祝'
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return '土日祝';
    }
    
    // TODO: 祝日判定を追加（オプション）
    // 日本の祝日カレンダーAPIを使用するか、祝日リストを保持する
    
    return '平日';
  }

  /**
   * 時刻文字列をパース
   * @param timeStr 時刻文字列（HH:MM形式）
   * @returns { hour, minute }
   */
  static parseTime(timeStr: string): { hour: number; minute: number } {
    const parts = timeStr.split(':');
    
    if (parts.length !== 2) {
      throw new Error(`無効な時刻形式です: ${timeStr}`);
    }
    
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    
    if (isNaN(hour) || isNaN(minute)) {
      throw new Error(`無効な時刻形式です: ${timeStr}`);
    }
    
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error(`時刻が範囲外です: ${timeStr}`);
    }
    
    return { hour, minute };
  }

  /**
   * 時刻をフォーマット（HH:MM形式）
   * @param hour 時
   * @param minute 分
   * @returns HH:MM形式の文字列
   */
  static formatTime(hour: number, minute: number): string {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
}
