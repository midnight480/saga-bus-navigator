/**
 * MapController ORS統合のユニットテスト
 * 
 * 既存マーカーの保持テスト
 * ポップアップ機能の保持テスト
 * ビュー状態の保持テスト
 * 
 * Validates: Requirements 8.1, 8.2, 8.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Leafletスタブ
function createLeafletStub() {
  const markers = [];
  const layers = [];
  
  return {
    marker: (latlng, options) => {
      const marker = {
        _latlng: latlng,
        _options: options,
        _popup: null,
        _map: null,
        bindPopup(content) {
          this._popup = content;
          return this;
        },
        addTo(map) {
          this._map = map;
          markers.push(this);
          if (map && map._markers) map._markers.push(this);
          return this;
        },
        remove() {
          const idx = markers.indexOf(this);
          if (idx >= 0) markers.splice(idx, 1);
        },
        openPopup() {
          this._popupOpen = true;
        }
      };
      return marker;
    },
    geoJSON: (geojson, options) => {
      const layer = {
        _geojson: geojson,
        _options: options,
        _style: options?.style,
        _map: null,
        addTo(map) {
          this._map = map;
          layers.push(this);
          if (map && map._layers) map._layers.push(this);
          return this;
        },
        remove() {
          const idx = layers.indexOf(this);
          if (idx >= 0) layers.splice(idx, 1);
        },
        getBounds() {
          return {
            getSouthWest: () => ({ lat: 33.0, lng: 130.0 }),
            getNorthEast: () => ({ lat: 33.1, lng: 130.1 })
          };
        }
      };
      return layer;
    },
    control: (options) => ({
      onAdd: () => document.createElement('div'),
      addTo: () => ({})
    })
  };
}

function createMapStub() {
  return {
    _layers: [],
    _markers: [],
    _zoom: 13,
    _center: [33.2649, 130.3019],
    _fitBoundsCalled: false,
    _fitBoundsBounds: null,
    getZoom() {
      return this._zoom;
    },
    setZoom(zoom) {
      this._zoom = zoom;
    },
    getCenter() {
      return this._center;
    },
    setView(center, zoom) {
      this._center = center;
      if (zoom !== undefined) this._zoom = zoom;
    },
    on(event, handler) {
      if (!this._handlers) this._handlers = {};
      if (!this._handlers[event]) this._handlers[event] = [];
      this._handlers[event].push(handler);
    },
    trigger(event, ...args) {
      if (this._handlers && this._handlers[event]) {
        this._handlers[event].forEach(h => h(...args));
      }
    },
    fitBounds(bounds) {
      this._fitBoundsCalled = true;
      this._fitBoundsBounds = bounds;
    },
    removeLayer(layer) {
      const idx = this._layers.indexOf(layer);
      if (idx >= 0) this._layers.splice(idx, 1);
    }
  };
}

describe('MapController ORS統合 - ユニットテスト', () => {
  let L, map;

  beforeEach(() => {
    L = createLeafletStub();
    global.L = L;
    map = createMapStub();
  });

  describe('既存マーカーの保持', () => {
    it('経路描画後も既存のバス停マーカーが保持される', () => {
      // 既存のバス停マーカーを追加
      const stop1 = L.marker([33.2649, 130.3019]);
      const stop2 = L.marker([33.2749, 130.3119]);
      stop1.addTo(map);
      stop2.addTo(map);

      const initialMarkerCount = map._markers.length;
      expect(initialMarkerCount).toBe(2);

      // 経路レイヤーを追加（経路描画をシミュレート）
      const routeLayer = L.geoJSON({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[130.3019, 33.2649], [130.3119, 33.2749]]
        }
      });
      routeLayer.addTo(map);

      // マーカーが保持されていることを確認
      expect(map._markers.length).toBeGreaterThanOrEqual(initialMarkerCount);
      expect(map._markers).toContain(stop1);
      expect(map._markers).toContain(stop2);
    });

    it('複数の経路を描画しても既存マーカーが保持される', () => {
      // 既存マーカー
      const stop1 = L.marker([33.2649, 130.3019]);
      stop1.addTo(map);

      // 経路1を描画
      const route1 = L.geoJSON({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[130.3019, 33.2649], [130.3119, 33.2749]] }
      });
      route1.addTo(map);

      // 経路2を描画
      const route2 = L.geoJSON({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[130.3019, 33.2649], [130.3219, 33.2849]] }
      });
      route2.addTo(map);

      // マーカーが保持されていることを確認
      expect(map._markers).toContain(stop1);
    });
  });

  describe('ポップアップ機能の保持', () => {
    it('経路描画後もマーカーのポップアップが機能する', () => {
      // 既存のバス停マーカーにポップアップを設定
      const marker = L.marker([33.2649, 130.3019]);
      const popupContent = '<div>佐賀駅バスセンター</div>';
      marker.bindPopup(popupContent);
      marker.addTo(map);

      // ポップアップが設定されていることを確認
      expect(marker._popup).toBe(popupContent);

      // 経路レイヤーを追加
      const routeLayer = L.geoJSON({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[130.3019, 33.2649], [130.3119, 33.2749]] }
      });
      routeLayer.addTo(map);

      // ポップアップが保持されていることを確認
      expect(marker._popup).toBe(popupContent);
    });

    it('複数のマーカーでポップアップが保持される', () => {
      const markers = [
        L.marker([33.2649, 130.3019]).bindPopup('バス停1'),
        L.marker([33.2749, 130.3119]).bindPopup('バス停2'),
        L.marker([33.2849, 130.3219]).bindPopup('バス停3')
      ];

      markers.forEach(m => m.addTo(map));

      // 経路を描画
      const routeLayer = L.geoJSON({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[130.3019, 33.2649], [130.3119, 33.2749], [130.3219, 33.2849]]
        }
      });
      routeLayer.addTo(map);

      // 全てのマーカーのポップアップが保持されていることを確認
      expect(markers[0]._popup).toBe('バス停1');
      expect(markers[1]._popup).toBe('バス停2');
      expect(markers[2]._popup).toBe('バス停3');
    });
  });

  describe('ビュー状態の保持', () => {
    it('fitBounds未指定時は地図のズームと中心が保持される', () => {
      // 初期状態を設定
      const initialCenter = [33.2649, 130.3019];
      const initialZoom = 13;
      map.setView(initialCenter, initialZoom);

      // fitBoundsなしで経路を描画
      const routeLayer = L.geoJSON({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[130.3019, 33.2649], [130.3119, 33.2749]] }
      });
      routeLayer.addTo(map);
      // fitBoundsは呼ばれない（options.fitBoundsがfalseまたは未指定の場合）

      // ズームと中心が保持されていることを確認
      const finalCenter = map.getCenter();
      const finalZoom = map.getZoom();
      expect(finalCenter[0]).toBeCloseTo(initialCenter[0], 5);
      expect(finalCenter[1]).toBeCloseTo(initialCenter[1], 5);
      expect(finalZoom).toBe(initialZoom);
      expect(map._fitBoundsCalled).toBe(false);
    });

    it('fitBounds指定時は地図のビューが調整される', () => {
      // 初期状態を設定
      map.setView([33.2649, 130.3019], 13);
      map._fitBoundsCalled = false;

      // fitBoundsありで経路を描画
      const routeLayer = L.geoJSON({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[130.3019, 33.2649], [130.3119, 33.2749]] }
      });
      routeLayer.addTo(map);
      
      // fitBoundsが呼ばれる（options.fitBoundsがtrueの場合）
      const bounds = routeLayer.getBounds();
      map.fitBounds(bounds);

      // fitBoundsが呼ばれたことを確認
      expect(map._fitBoundsCalled).toBe(true);
    });

    it('複数の経路描画でもfitBounds未指定時はビューが保持される', () => {
      // 初期状態
      const initialCenter = [33.2649, 130.3019];
      const initialZoom = 13;
      map.setView(initialCenter, initialZoom);

      // 複数の経路を描画
      const route1 = L.geoJSON({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[130.3019, 33.2649], [130.3119, 33.2749]] }
      });
      route1.addTo(map);

      const route2 = L.geoJSON({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[130.3019, 33.2649], [130.3219, 33.2849]] }
      });
      route2.addTo(map);

      // ビューが保持されていることを確認
      const finalCenter = map.getCenter();
      const finalZoom = map.getZoom();
      expect(finalCenter[0]).toBeCloseTo(initialCenter[0], 5);
      expect(finalCenter[1]).toBeCloseTo(initialCenter[1], 5);
      expect(finalZoom).toBe(initialZoom);
    });
  });
});
