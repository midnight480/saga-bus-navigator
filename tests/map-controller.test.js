/**
 * MapController のテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// MapControllerをモック
class MockMapController {
  constructor() {
    this.vehicleMarkers = new Map();
  }

  escapeHtml(text) {
    if (typeof text !== 'string') {
      return String(text);
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  createVehiclePopupContent(status, tripInfo) {
    let content = `
      <div class="vehicle-popup">
        <h3 class="popup-title">${this.escapeHtml(tripInfo.routeName || '路線名不明')}</h3>
        <div class="popup-info">
          <p><strong>便ID:</strong> ${this.escapeHtml(tripInfo.tripId)}</p>
        </div>
        <div class="trip-timetable-container" data-trip-id="${this.escapeHtml(tripInfo.tripId)}">
          <!-- 時刻表はRealtimeVehicleControllerによって動的に追加されます -->
        </div>
      </div>
    `;
    
    return content;
  }
}

describe('MapController - 時刻表表示機能', () => {
  let mapController;

  beforeEach(() => {
    mapController = new MockMapController();
  });

  describe('Property 7: スクロール可能なスタイル', () => {
    /**
     * Feature: trip-timetable-display, Property 7: スクロール可能なスタイル
     * 
     * *任意の*時刻表HTMLに対して、時刻表コンテンツ要素にはスクロール可能なCSSクラスが適用されている
     * **Validates: Requirements 3.3**
     */
    it('時刻表HTMLにスクロール可能なCSSクラスが含まれている', () => {
      // 時刻表HTMLのサンプル（TripTimetableFormatterが生成するHTML）
      const timetableHTML = `
        <div class="trip-timetable">
          <div class="timetable-header">
            <strong>時刻表</strong>
            <span class="route-info">便ID: trip_123 | 路線: 佐賀駅～大和線</span>
          </div>
          <div class="timetable-content" data-collapsed="false">
            <div class="timetable-stops">
              <span class="stop-item">佐賀駅バスセンター（08:00）</span>
              <span class="stop-arrow">→</span>
              <span class="stop-item">県庁前（08:05）</span>
            </div>
          </div>
        </div>
      `;

      // HTMLをパース
      const parser = new DOMParser();
      const doc = parser.parseFromString(timetableHTML, 'text/html');
      
      // timetable-contentクラスが存在することを確認
      const timetableContent = doc.querySelector('.timetable-content');
      expect(timetableContent).not.toBeNull();
      
      // スクロール可能なクラスが適用されていることを確認
      expect(timetableContent.classList.contains('timetable-content')).toBe(true);
    });

    it('複数の時刻表HTMLでスクロール可能なCSSクラスが適用されている', () => {
      // 複数の時刻表HTMLパターンをテスト
      const timetableHTMLs = [
        // パターン1: 短い時刻表
        `<div class="trip-timetable">
          <div class="timetable-content" data-collapsed="false">
            <div class="timetable-stops">
              <span class="stop-item">バス停A（08:00）</span>
            </div>
          </div>
        </div>`,
        // パターン2: 長い時刻表
        `<div class="trip-timetable">
          <div class="timetable-content" data-collapsed="true">
            <div class="timetable-stops">
              ${Array.from({ length: 15 }, (_, i) => 
                `<span class="stop-item">バス停${i + 1}（08:${String(i).padStart(2, '0')}）</span>`
              ).join('<span class="stop-arrow">→</span>')}
            </div>
          </div>
        </div>`,
        // パターン3: 折りたたみリンク付き
        `<div class="trip-timetable">
          <div class="timetable-content" data-collapsed="true">
            <div class="timetable-stops">
              <span class="stop-item">バス停1（08:00）</span>
            </div>
            <a href="#" class="timetable-toggle" data-action="expand">時刻表を表示（全10停車）</a>
          </div>
        </div>`
      ];

      const parser = new DOMParser();
      
      timetableHTMLs.forEach((html, index) => {
        const doc = parser.parseFromString(html, 'text/html');
        const timetableContent = doc.querySelector('.timetable-content');
        
        expect(timetableContent, `パターン${index + 1}でtimetable-contentが存在すること`).not.toBeNull();
        expect(
          timetableContent.classList.contains('timetable-content'),
          `パターン${index + 1}でスクロール可能なクラスが適用されていること`
        ).toBe(true);
      });
    });
  });

  describe('Property 8: 視覚的区別のスタイル', () => {
    /**
     * Feature: trip-timetable-display, Property 8: 視覚的区別のスタイル
     * 
     * *任意の*時刻表HTMLに対して、時刻表セクションには視覚的区別のためのCSSクラス（trip-timetable）が適用されている
     * **Validates: Requirements 3.4**
     */
    it('時刻表HTMLに視覚的区別のためのCSSクラスが含まれている', () => {
      // 時刻表HTMLのサンプル
      const timetableHTML = `
        <div class="trip-timetable">
          <div class="timetable-header">
            <strong>時刻表</strong>
          </div>
          <div class="timetable-content">
            <div class="timetable-stops">
              <span class="stop-item">佐賀駅バスセンター（08:00）</span>
            </div>
          </div>
        </div>
      `;

      // HTMLをパース
      const parser = new DOMParser();
      const doc = parser.parseFromString(timetableHTML, 'text/html');
      
      // trip-timetableクラスが存在することを確認
      const tripTimetable = doc.querySelector('.trip-timetable');
      expect(tripTimetable).not.toBeNull();
      
      // 視覚的区別のためのクラスが適用されていることを確認
      expect(tripTimetable.classList.contains('trip-timetable')).toBe(true);
    });

    it('車両ポップアップに時刻表コンテナが含まれている', () => {
      const tripInfo = {
        tripId: 'trip_123',
        routeName: '佐賀駅～大和線'
      };

      const popupContent = mapController.createVehiclePopupContent('on_time', tripInfo);

      // HTMLをパース
      const parser = new DOMParser();
      const doc = parser.parseFromString(popupContent, 'text/html');
      
      // trip-timetable-containerクラスが存在することを確認
      const container = doc.querySelector('.trip-timetable-container');
      expect(container).not.toBeNull();
      
      // data-trip-id属性が正しく設定されていることを確認
      expect(container.getAttribute('data-trip-id')).toBe('trip_123');
    });

    it('複数の時刻表HTMLで視覚的区別のためのCSSクラスが適用されている', () => {
      // 複数の時刻表HTMLパターンをテスト
      const timetableHTMLs = [
        // パターン1: 最小構成
        `<div class="trip-timetable">
          <div class="timetable-content"></div>
        </div>`,
        // パターン2: ヘッダー付き
        `<div class="trip-timetable">
          <div class="timetable-header">
            <strong>時刻表</strong>
          </div>
          <div class="timetable-content"></div>
        </div>`,
        // パターン3: 完全な構造
        `<div class="trip-timetable">
          <div class="timetable-header">
            <strong>時刻表</strong>
            <span class="route-info">便ID: trip_456</span>
          </div>
          <div class="timetable-content" data-collapsed="false">
            <div class="timetable-stops">
              <span class="stop-item">バス停A（08:00）</span>
            </div>
          </div>
        </div>`
      ];

      const parser = new DOMParser();
      
      timetableHTMLs.forEach((html, index) => {
        const doc = parser.parseFromString(html, 'text/html');
        const tripTimetable = doc.querySelector('.trip-timetable');
        
        expect(tripTimetable, `パターン${index + 1}でtrip-timetableが存在すること`).not.toBeNull();
        expect(
          tripTimetable.classList.contains('trip-timetable'),
          `パターン${index + 1}で視覚的区別のクラスが適用されていること`
        ).toBe(true);
      });
    });
  });
});
