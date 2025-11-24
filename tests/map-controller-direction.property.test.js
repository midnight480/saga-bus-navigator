/**
 * MapController - 双方向対応のプロパティベーステスト
 * Feature: bidirectional-route-support
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

// テスト用のモッククラス
class MockMapController {
  constructor() {
    this.busStops = [];
    this.markers = new Map();
    this.routeLayer = {
      layers: [],
      addLayer: function(layer) {
        this.layers.push(layer);
      },
      clearLayers: function() {
        this.layers = [];
      }
    };
    this.map = {
      fitBounds: vi.fn()
    };
  }

  isValidCoordinate(lat, lng) {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  logError(message, details) {
    console.error('[MockMapController]', message, details);
  }

  escapeHtml(text) {
    if (typeof text !== 'string') {
      return String(text);
    }
    const div = { textContent: text };
    return text.replace(/[&<>"']/g, (m) => {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return map[m];
    });
  }

  createBusStopIcon(color) {
    return { color };
  }

  showClearRouteButton() {}

  /**
   * 路線の全方向のバス停を取得
   * @param {string} routeId - 路線ID
   * @param {string} direction - 方向フィルタ（オプション: '0', '1', null=全方向）
   * @returns {Array<Object>} バス停座標の配列
   */
  getRouteStops(routeId, direction = null) {
    try {
      // DataLoaderからstop_timesとtripsを取得
      if (!this.stopTimes || !this.trips) {
        return [];
      }

      const stopTimes = this.stopTimes;
      const trips = this.trips;

      // 指定された路線のtripsを取得
      const routeTrips = trips.filter(t => t.route_id === routeId);

      if (routeTrips.length === 0) {
        return [];
      }

      // 方向フィルタが指定されている場合は、該当する方向のtripsのみを対象とする
      let filteredTrips = routeTrips;
      if (direction !== null) {
        // DirectionDetectorを使用して方向を判定
        if (this.DirectionDetector) {
          filteredTrips = routeTrips.filter(trip => {
            const detectedDirection = this.DirectionDetector.detectDirection(trip, routeId, trips);
            return detectedDirection === direction;
          });
        }
      }

      // 各tripのstop_timesからバス停IDを収集
      const stopIds = new Set();
      filteredTrips.forEach(trip => {
        const tripStopTimes = stopTimes.filter(st => st.trip_id === trip.trip_id);
        tripStopTimes.forEach(st => {
          stopIds.add(st.stop_id);
        });
      });

      // バス停IDから座標情報を取得
      const routeStops = [];
      stopIds.forEach(stopId => {
        const stop = this.busStops.find(s => s.id === stopId);
        if (stop && this.isValidCoordinate(stop.lat, stop.lng)) {
          routeStops.push({
            id: stop.id,
            name: stop.name,
            lat: stop.lat,
            lng: stop.lng
          });
        }
      });

      return routeStops;

    } catch (error) {
      this.logError('路線のバス停取得に失敗しました', {
        message: error.message,
        routeId: routeId,
        direction: direction
      });
      return [];
    }
  }

  /**
   * 路線を地図上に表示（方向別に色分け）
   * @param {string} routeId - 路線ID
   * @param {string} direction - 表示する方向（オプション: '0', '1', null=全方向）
   */
  displayRouteStops(routeId, direction = null) {
    try {
      // 既存の経路をクリア
      this.routeLayer.clearLayers();

      // 路線のバス停を取得
      const stops = this.getRouteStops(routeId, direction);

      if (stops.length === 0) {
        return;
      }

      // 方向に応じてマーカーの色を決定
      let markerColor = 'blue'; // デフォルト
      if (direction === '0') {
        markerColor = 'blue'; // 往路: 青色
      } else if (direction === '1') {
        markerColor = 'green'; // 復路: 緑色
      }

      // 各バス停にマーカーを配置
      stops.forEach(stop => {
        const marker = {
          lat: stop.lat,
          lng: stop.lng,
          icon: this.createBusStopIcon(markerColor),
          popup: `
            <div class="route-stop-popup">
              <h4>${this.escapeHtml(stop.name)}</h4>
              <p>路線ID: ${this.escapeHtml(routeId)}</p>
              ${direction !== null ? `<p>方向: ${direction === '0' ? '往路' : '復路'}</p>` : ''}
            </div>
          `
        };

        this.routeLayer.addLayer(marker);
      });

      // 全てのバス停が見える範囲に自動ズーム
      const bounds = stops.map(s => [s.lat, s.lng]);
      this.map.fitBounds(bounds);

      // 「経路をクリア」ボタンを表示
      this.showClearRouteButton();

    } catch (error) {
      this.logError('路線の表示に失敗しました', {
        message: error.message,
        routeId: routeId,
        direction: direction
      });
    }
  }

  /**
   * 特定の方向のバス停をハイライト表示する
   * @param {string} routeId - 路線ID
   * @param {string} direction - ハイライトする方向（'0', '1', null=全て通常表示）
   */
  highlightRouteDirection(routeId, direction) {
    try {
      if (direction === null) {
        // 全てのマーカーを通常表示に戻す
        this.markers.forEach(marker => {
          marker.opacity = 1;
          marker.filter = 'none';
        });
        return;
      }

      // 指定された方向のバス停を取得
      const highlightStops = this.getRouteStops(routeId, direction);
      const highlightStopIds = new Set(highlightStops.map(s => s.id));

      // 全てのマーカーを処理
      this.markers.forEach((marker, stopId) => {
        if (highlightStopIds.has(stopId)) {
          // ハイライト対象: 通常表示
          marker.opacity = 1;
          marker.filter = 'none';
        } else {
          // ハイライト対象外: 半透明にする
          marker.opacity = 0.3;
          marker.filter = 'grayscale(100%)';
        }
      });

    } catch (error) {
      this.logError('方向のハイライト表示に失敗しました', {
        message: error.message,
        routeId: routeId,
        direction: direction
      });
    }
  }
}

// DirectionDetectorのモック
class MockDirectionDetector {
  static detectDirection(trip, routeId, allTrips) {
    if (trip.direction_id !== '' && trip.direction_id !== null && trip.direction_id !== undefined) {
      return trip.direction_id;
    }

    const tripsForRoute = allTrips.filter(t => t.route_id === routeId);
    const headsignGroups = new Map();
    tripsForRoute.forEach(t => {
      const headsign = t.trip_headsign || 'unknown';
      if (!headsignGroups.has(headsign)) {
        headsignGroups.set(headsign, []);
      }
      headsignGroups.get(headsign).push(t);
    });

    const headsigns = Array.from(headsignGroups.keys());
    if (headsigns.length >= 2) {
      const headsign = trip.trip_headsign || 'unknown';
      return headsigns.indexOf(headsign) === 0 ? '0' : '1';
    }

    return 'unknown';
  }
}

describe('MapController - 双方向対応のプロパティベーステスト', () => {
  let mapController;

  beforeEach(() => {
    mapController = new MockMapController();
    mapController.DirectionDetector = MockDirectionDetector;
  });

  describe('Property 8: 路線図の完全性', () => {
    /**
     * Feature: bidirectional-route-support, Property 8: 路線図の完全性
     * 
     * *任意の*路線において、往路と復路の全てのバス停が地図表示に含まれる
     * **Validates: Requirements 4.1, 4.2**
     */
    it('往路と復路の全てのバス停が取得される', () => {
      fc.assert(
        fc.property(
          // ランダムな路線データを生成
          fc.record({
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            stops: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 10 }),
                name: fc.string({ minLength: 1, maxLength: 20 }),
                lat: fc.double({ min: 33.0, max: 34.0 }),
                lng: fc.double({ min: 130.0, max: 131.0 })
              }),
              { minLength: 2, maxLength: 10 }
            ),
            trips: fc.array(
              fc.record({
                trip_id: fc.string({ minLength: 1, maxLength: 10 }),
                route_id: fc.string({ minLength: 1, maxLength: 10 }),
                trip_headsign: fc.oneof(fc.constant('往路'), fc.constant('復路')),
                direction_id: fc.oneof(fc.constant('0'), fc.constant('1'))
              }),
              { minLength: 2, maxLength: 5 }
            )
          }),
          (data) => {
            // テストデータをセットアップ
            mapController.busStops = data.stops;
            
            // tripsのroute_idを統一
            const trips = data.trips.map(t => ({ ...t, route_id: data.routeId }));
            mapController.trips = trips;
            
            // stop_timesを生成（各tripが全てのバス停に停車すると仮定）
            const stopTimes = [];
            trips.forEach(trip => {
              data.stops.forEach((stop, index) => {
                stopTimes.push({
                  trip_id: trip.trip_id,
                  stop_id: stop.id,
                  stop_sequence: index + 1
                });
              });
            });
            mapController.stopTimes = stopTimes;
            
            // 全方向のバス停を取得
            const allStops = mapController.getRouteStops(data.routeId, null);
            
            // 往路のバス停を取得
            const direction0Stops = mapController.getRouteStops(data.routeId, '0');
            
            // 復路のバス停を取得
            const direction1Stops = mapController.getRouteStops(data.routeId, '1');
            
            // 全方向のバス停数は、往路と復路のバス停の和集合と等しい
            const allStopIds = new Set(allStops.map(s => s.id));
            const direction0StopIds = new Set(direction0Stops.map(s => s.id));
            const direction1StopIds = new Set(direction1Stops.map(s => s.id));
            
            // 往路と復路のバス停は全て、全方向のバス停に含まれる
            direction0StopIds.forEach(id => {
              expect(allStopIds.has(id)).toBe(true);
            });
            direction1StopIds.forEach(id => {
              expect(allStopIds.has(id)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: 方向別ハイライト', () => {
    /**
     * Feature: bidirectional-route-support, Property 9: 方向別ハイライト
     * 
     * *任意の*方向選択において、選択された方向のバス停のみがハイライト表示され、他の方向のバス停はハイライトされない
     * **Validates: Requirements 4.3**
     */
    it('選択された方向のバス停のみがハイライト表示される', () => {
      fc.assert(
        fc.property(
          // ランダムな路線データを生成
          fc.record({
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            stops: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 10 }),
                name: fc.string({ minLength: 1, maxLength: 20 }),
                lat: fc.double({ min: 33.0, max: 34.0 }),
                lng: fc.double({ min: 130.0, max: 131.0 })
              }),
              { minLength: 4, maxLength: 10 }
            ),
            trips: fc.array(
              fc.record({
                trip_id: fc.string({ minLength: 1, maxLength: 10 }),
                route_id: fc.string({ minLength: 1, maxLength: 10 }),
                trip_headsign: fc.oneof(fc.constant('往路'), fc.constant('復路')),
                direction_id: fc.oneof(fc.constant('0'), fc.constant('1'))
              }),
              { minLength: 2, maxLength: 5 }
            ),
            selectedDirection: fc.oneof(fc.constant('0'), fc.constant('1'))
          }),
          (data) => {
            // テストデータをセットアップ
            mapController.busStops = data.stops;
            
            // tripsのroute_idを統一
            const trips = data.trips.map(t => ({ ...t, route_id: data.routeId }));
            mapController.trips = trips;
            
            // stop_timesを生成
            // 往路のtripsは前半のバス停に停車、復路のtripsは後半のバス停に停車
            const stopTimes = [];
            trips.forEach(trip => {
              const isDirection0 = trip.direction_id === '0';
              const stopsToUse = isDirection0 
                ? data.stops.slice(0, Math.ceil(data.stops.length / 2))
                : data.stops.slice(Math.floor(data.stops.length / 2));
              
              stopsToUse.forEach((stop, index) => {
                stopTimes.push({
                  trip_id: trip.trip_id,
                  stop_id: stop.id,
                  stop_sequence: index + 1
                });
              });
            });
            mapController.stopTimes = stopTimes;
            
            // マーカーを作成
            data.stops.forEach(stop => {
              mapController.markers.set(stop.id, {
                opacity: 1,
                filter: 'none'
              });
            });
            
            // 方向をハイライト
            mapController.highlightRouteDirection(data.routeId, data.selectedDirection);
            
            // 選択された方向のバス停を取得
            const highlightStops = mapController.getRouteStops(data.routeId, data.selectedDirection);
            const highlightStopIds = new Set(highlightStops.map(s => s.id));
            
            // 全てのマーカーを確認
            mapController.markers.forEach((marker, stopId) => {
              if (highlightStopIds.has(stopId)) {
                // ハイライト対象: 通常表示
                expect(marker.opacity).toBe(1);
                expect(marker.filter).toBe('none');
              } else {
                // ハイライト対象外: 半透明
                expect(marker.opacity).toBe(0.3);
                expect(marker.filter).toBe('grayscale(100%)');
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: 方向の視覚的区別', () => {
    /**
     * Feature: bidirectional-route-support, Property 10: 方向の視覚的区別
     * 
     * *任意の*路線図表示において、往路と復路は視覚的に区別可能である（色、矢印などの属性が異なる）
     * **Validates: Requirements 4.4**
     */
    it('往路と復路で異なる色のマーカーが使用される', () => {
      fc.assert(
        fc.property(
          // ランダムな路線データを生成
          fc.record({
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            stops: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 10 }),
                name: fc.string({ minLength: 1, maxLength: 20 }),
                lat: fc.double({ min: 33.0, max: 34.0 }),
                lng: fc.double({ min: 130.0, max: 131.0 })
              }),
              { minLength: 2, maxLength: 10 }
            ),
            trips: fc.array(
              fc.record({
                trip_id: fc.string({ minLength: 1, maxLength: 10 }),
                route_id: fc.string({ minLength: 1, maxLength: 10 }),
                trip_headsign: fc.oneof(fc.constant('往路'), fc.constant('復路')),
                direction_id: fc.oneof(fc.constant('0'), fc.constant('1'))
              }),
              { minLength: 2, maxLength: 5 }
            )
          }),
          (data) => {
            // テストデータをセットアップ
            mapController.busStops = data.stops;
            
            // tripsのroute_idを統一
            const trips = data.trips.map(t => ({ ...t, route_id: data.routeId }));
            mapController.trips = trips;
            
            // stop_timesを生成
            const stopTimes = [];
            trips.forEach(trip => {
              data.stops.forEach((stop, index) => {
                stopTimes.push({
                  trip_id: trip.trip_id,
                  stop_id: stop.id,
                  stop_sequence: index + 1
                });
              });
            });
            mapController.stopTimes = stopTimes;
            
            // 往路を表示
            mapController.displayRouteStops(data.routeId, '0');
            const direction0Markers = [...mapController.routeLayer.layers];
            
            // 復路を表示
            mapController.displayRouteStops(data.routeId, '1');
            const direction1Markers = [...mapController.routeLayer.layers];
            
            // 往路のマーカーは青色
            if (direction0Markers.length > 0) {
              direction0Markers.forEach(marker => {
                expect(marker.icon.color).toBe('blue');
              });
            }
            
            // 復路のマーカーは緑色
            if (direction1Markers.length > 0) {
              direction1Markers.forEach(marker => {
                expect(marker.icon.color).toBe('green');
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
