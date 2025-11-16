/**
 * CalendarExporter
 * バスの時刻表をカレンダー形式（iCal、Google Calendar）でエクスポートするクラス
 */
class CalendarExporter {
  /**
   * iCal形式でエクスポート
   * @param {Object} schedule - スケジュール情報
   */
  exportToICal(schedule) {
    console.log('[CalendarExporter] iCal形式でエクスポート:', schedule);
    
    const icalContent = this.generateICalContent(schedule);
    const filename = this.generateFilename(schedule);
    
    this.downloadFile(icalContent, filename, 'text/calendar');
  }
  
  /**
   * Google Calendarで開く
   * @param {Object} schedule - スケジュール情報
   */
  exportToGoogleCalendar(schedule) {
    console.log('[CalendarExporter] Google Calendarで開く:', schedule);
    
    const url = this.generateGoogleCalendarURL(schedule);
    window.open(url, '_blank');
  }
  
  /**
   * iCal形式のコンテンツを生成
   * @param {Object} schedule - スケジュール情報
   * @returns {string} iCal形式の文字列
   */
  generateICalContent(schedule) {
    const eventDate = this.getEventDate(schedule);
    const startDateTime = this.formatICalDateTime(eventDate.start);
    const endDateTime = this.formatICalDateTime(eventDate.end);
    const uid = this.generateUID();
    const timestamp = this.formatICalDateTime(new Date());
    const title = `バス: ${schedule.departureStop} → ${schedule.arrivalStop}`;
    const description = this.generateDescription(schedule);
    
    // iCal形式の文字列を生成（改行はCRLF）
    const icalLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//佐賀バスナビ//NONSGML v1.0//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${timestamp}`,
      `DTSTART:${startDateTime}`,
      `DTEND:${endDateTime}`,
      `SUMMARY:${this.escapeICalText(title)}`,
      `LOCATION:${this.escapeICalText(schedule.departureStop)}`,
      `DESCRIPTION:${this.escapeICalText(description)}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    
    return icalLines.join('\r\n');
  }
  
  /**
   * Google Calendar URLを生成
   * @param {Object} schedule - スケジュール情報
   * @returns {string} Google Calendar URL
   */
  generateGoogleCalendarURL(schedule) {
    const eventDate = this.getEventDate(schedule);
    const startDateTime = this.formatGoogleCalendarDateTime(eventDate.start);
    const endDateTime = this.formatGoogleCalendarDateTime(eventDate.end);
    const title = `バス: ${schedule.departureStop} → ${schedule.arrivalStop}`;
    const description = this.generateDescription(schedule);
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${startDateTime}/${endDateTime}`,
      location: schedule.departureStop,
      details: description
    });
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
  
  /**
   * イベントの日時を取得（日付をまたぐ処理を含む）
   * @param {Object} schedule - スケジュール情報
   * @returns {Object} { start: Date, end: Date }
   */
  getEventDate(schedule) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();
    
    // 出発時刻のDateオブジェクトを作成
    const startDate = new Date(year, month, date, schedule.departureHour, schedule.departureMinute, 0);
    
    // 到着時刻のDateオブジェクトを作成
    let endDate = new Date(year, month, date, schedule.arrivalHour, schedule.arrivalMinute, 0);
    
    // 到着時刻が出発時刻より早い場合は翌日とみなす
    if (endDate < startDate) {
      endDate = new Date(year, month, date + 1, schedule.arrivalHour, schedule.arrivalMinute, 0);
    }
    
    return {
      start: startDate,
      end: endDate
    };
  }
  
  /**
   * イベントの説明文を生成
   * @param {Object} schedule - スケジュール情報
   * @returns {string} 説明文
   */
  generateDescription(schedule) {
    const lines = [
      `路線: ${schedule.routeName}`,
      `事業者: ${schedule.operator}`,
      `出発時刻: ${schedule.departureTime}`,
      `到着時刻: ${schedule.arrivalTime}`
    ];
    
    // 運賃情報を追加
    if (schedule.adultFare !== null || schedule.childFare !== null) {
      const fareText = [];
      if (schedule.adultFare !== null) {
        fareText.push(`大人 ${schedule.adultFare}円`);
      }
      if (schedule.childFare !== null) {
        fareText.push(`小人 ${schedule.childFare}円`);
      }
      lines.push(`運賃: ${fareText.join(' / ')}`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * iCal形式の日時文字列にフォーマット
   * @param {Date} date - 日時
   * @returns {string} YYYYMMDDTHHmmss形式
   */
  formatICalDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
  }
  
  /**
   * Google Calendar形式の日時文字列にフォーマット
   * @param {Date} date - 日時
   * @returns {string} YYYYMMDDTHHmmssZ形式（UTC）
   */
  formatGoogleCalendarDateTime(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }
  
  /**
   * ユニークIDを生成
   * @returns {string} UID
   */
  generateUID() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}@saga-bus-navi`;
  }
  
  /**
   * ファイル名を生成
   * @param {Object} schedule - スケジュール情報
   * @returns {string} ファイル名
   */
  generateFilename(schedule) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(schedule.departureHour).padStart(2, '0');
    const minutes = String(schedule.departureMinute).padStart(2, '0');
    
    return `bus-schedule-${year}${month}${day}-${hours}${minutes}.ics`;
  }
  
  /**
   * ファイルをダウンロード
   * @param {string} content - ファイルの内容
   * @param {string} filename - ファイル名
   * @param {string} mimeType - MIMEタイプ
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // クリーンアップ
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }
  
  /**
   * iCalテキストをエスケープ
   * @param {string} text - エスケープするテキスト
   * @returns {string} エスケープされたテキスト
   */
  escapeICalText(text) {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }
}
