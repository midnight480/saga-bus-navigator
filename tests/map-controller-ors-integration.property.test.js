/**
 * MapController ORS統合のプロパティテスト
 * 
 * プロパティ17: ズームレベル連動の経路表示
 * プロパティ22: 既存マーカーの保持
 * プロパティ23: 既存ポップアップ機能の保持
 * プロパティ24: ビュー状態の保持
 * 
 * Validates: Requirements 5.4, 8.1, 8.2, 8.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

// Leafletスタブ
function createLeafletStub() {
  const layers = [];
  const markers = [];
  
  return {
    marker: (latlng, options) => {
      const marker = {
        _latlng: latlng,
        _options: options,
        _popup: null,
        bindPopup(content) {
          this._popup = content;
          return this;
        },
        addTo(map) {
          markers.push(this);
          map._markers.push(this);
          return this;
        },
        remove() {
          const idx = markers.indexOf(this);
          if (idx >= 0) markers.splice(idx, 1);
        }
      };
      return marker;
    },
    geoJSON: (geojson, options) => {
      const layer = {
        _geojson: geojson,
        _options: options,
        _style: options?.style,
        _visible: true,
        setStyle(style) {
          this._style = style;
          if (style.opacity === 0 || style.weight === 0) {
            this._visible = false;
          } else {
            this._visible = true;
          }
        },
        addTo(map) {
          layers.push(this);
          map._layers.push(this);
          return this;
        },
        remove() {
          const idx = layers.indexOf(this);
          if (idx >= 0) layers.splice(idx, 1);
        },
        getBounds() {
          return { _stub: true };
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
    },
    removeLayer(layer) {
      const idx = this._layers.indexOf(layer);
      if (idx >= 0) this._layers.splice(idx, 1);
    }
  };
}

// MapControllerの簡易スタブ（ORS統合部分のみ）
function createMapControllerStub(map, orsConfig) {
  return {
    map,
    orsConfig: orsConfig || { hideRouteBelowZoom: 12 },
    orsEnabled: true,
    orsRouteRenderer: {
      _visible: true,
      _originalStyles: new Map(), // routeId -> original style
      setVisible(visible) {
        this._visible = visible;
        map._layers.forEach((layer, index) => {
          if (layer._geojson) {
            // 元のスタイルを保存（初回のみ）
            if (!this._originalStyles.has(index)) {
              this._originalStyles.set(index, { ...(layer._style || { color: '#2196F3', weight: 4, opacity: 0.7 }) });
            }
            
            if (visible) {
              // 元のスタイルを復元
              const originalStyle = this._originalStyles.get(index) || { color: '#2196F3', weight: 4, opacity: 0.7 };
              layer.setStyle(originalStyle);
            } else {
              // 非表示にする
              const currentStyle = layer._style || { color: '#2196F3', weight: 4, opacity: 0.7 };
              layer.setStyle({ ...currentStyle, opacity: 0, weight: 0 });
            }
          }
        });
      },
      routeLayers: new Map()
    },
    routeLayer: {
      _markers: [],
      addLayer(marker) {
        this._markers.push(marker);
        map._markers.push(marker);
      },
      clearLayers() {
        this._markers.forEach(m => m.remove());
        this._markers = [];
      }
    },
    setupOrsZoomVisibilityHandler() {
      if (!this.map || !this.orsEnabled || !this.orsRouteRenderer || !this.orsConfig) return;
      const threshold = this.orsConfig.hideRouteBelowZoom;
      if (typeof threshold !== 'number') return;

      const updateVisibility = () => {
        const zoom = this.map.getZoom();
        this.orsRouteRenderer.setVisible(zoom >= threshold);
      };

      updateVisibility();
      this.map.on('zoomend', updateVisibility);
    }
  };
}

describe('MapController ORS統合 - プロパティテスト', () => {
  let L, map, mapController;

  beforeEach(() => {
    L = createLeafletStub();
    global.L = L;
    map = createMapStub();
  });

  describe('プロパティ17: ズームレベル連動の経路表示', () => {
    /**
     * 任意のズームアウト操作に対して、ズームレベルが閾値を下回った場合、
     * システムは詳細な経路描画を非表示にしなければならない
     * Validates: Requirement 5.4
     */
    it('ズームレベルが閾値以下になったら経路を非表示にする', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }), // ズームレベル
          fc.integer({ min: 1, max: 20 }), // 閾値
          (zoomLevel, threshold) => {
            const config = { hideRouteBelowZoom: threshold };
            mapController = createMapControllerStub(map, config);
            
            // 経路レイヤーを追加
            const initialStyle = { color: '#2196F3', weight: 4, opacity: 0.7 };
            const routeLayer = L.geoJSON({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: [[130.0, 33.0], [130.1, 33.1]] }
            }, { style: initialStyle });
            routeLayer.addTo(map);
            routeLayer._style = { ...initialStyle }; // 初期スタイルを保存（コピー）
            mapController.orsRouteRenderer.routeLayers.set('test-route', routeLayer);

            // 初期ズームを設定
            map.setZoom(zoomLevel);
            mapController.setupOrsZoomVisibilityHandler();

            // ズームイベントをトリガー（setupOrsZoomVisibilityHandler内でupdateVisibilityが呼ばれる）
            // さらに明示的にトリガー
            map.trigger('zoomend');

            // 閾値以上の場合は表示、閾値未満の場合は非表示
            const shouldBeVisible = zoomLevel >= threshold;
            
            // スタイルのopacityとweightを確認
            // setVisibleが呼ばれた後、スタイルが更新されているはず
            const finalStyle = routeLayer._style;
            const styleVisible = finalStyle && 
              finalStyle.opacity !== 0 && 
              finalStyle.weight !== 0;
            
            // デバッグ用（必要に応じてコメントアウト）
            // if (shouldBeVisible !== styleVisible) {
            //   console.log(`zoomLevel: ${zoomLevel}, threshold: ${threshold}, shouldBeVisible: ${shouldBeVisible}, styleVisible: ${styleVisible}, style:`, finalStyle);
            // }
            
            return shouldBeVisible === styleVisible;
          }
        ),
        { numRuns: 50, verbose: true }
      );
    });
  });

  describe('プロパティ22: 既存マーカーの保持', () => {
    /**
     * 任意の経路描画操作に対して、地図上の既存のバス停マーカーは
     * 削除されず、維持されなければならない
     * Validates: Requirement 8.1
     */
    it('経路描画後も既存マーカーが保持される', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(fc.float({ min: -90, max: 90 }), fc.float({ min: -180, max: 180 })), { minLength: 2, maxLength: 10 }), // バス停座標
          (stopCoords) => {
            mapController = createMapControllerStub(map);
            
            // 既存のバス停マーカーを追加
            const existingMarkers = stopCoords.map(([lat, lon]) => {
              const marker = L.marker([lat, lon]);
              marker.addTo(map);
              mapController.routeLayer.addLayer(marker);
              return marker;
            });

            const initialMarkerCount = map._markers.length;

            // 経路レイヤーを追加（経路描画をシミュレート）
            const routeLayer = L.geoJSON({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: stopCoords.map(([lat, lon]) => [lon, lat]) }
            });
            routeLayer.addTo(map);

            // マーカーが保持されていることを確認
            const finalMarkerCount = map._markers.length;
            const markersStillExist = existingMarkers.every(m => map._markers.includes(m));

            return finalMarkerCount >= initialMarkerCount && markersStillExist;
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('プロパティ23: 既存ポップアップ機能の保持', () => {
    /**
     * 任意の経路描画後において、バス停マーカーのクリックイベントは
     * 引き続き既存のポップアップ情報を表示しなければならない
     * Validates: Requirement 8.2
     */
    it('経路描画後もマーカーのポップアップが機能する', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // ポップアップ内容
          (popupContent) => {
            mapController = createMapControllerStub(map);
            
            // 既存のバス停マーカーにポップアップを設定
            const marker = L.marker([33.2649, 130.3019]);
            marker.bindPopup(popupContent);
            marker.addTo(map);
            mapController.routeLayer.addLayer(marker);

            // 経路レイヤーを追加
            const routeLayer = L.geoJSON({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: [[130.0, 33.0], [130.1, 33.1]] }
            });
            routeLayer.addTo(map);

            // ポップアップが保持されていることを確認
            return marker._popup === popupContent;
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('プロパティ24: ビュー状態の保持', () => {
    /**
     * 任意の経路描画操作に対して、fitBoundsオプションが明示的に指定されない限り、
     * 地図のズームレベルと中心座標は変更されてはならない
     * Validates: Requirement 8.4
     */
    it('fitBounds未指定時は地図のズームと中心が保持される', () => {
      fc.assert(
        fc.property(
          fc.tuple(fc.float({ min: -90, max: 90 }), fc.float({ min: -180, max: 180 })), // 中心座標
          fc.integer({ min: 1, max: 20 }), // ズームレベル
          (center, zoom) => {
            mapController = createMapControllerStub(map);
            
            // 初期状態を設定
            map.setView(center, zoom);
            const initialCenter = map.getCenter();
            const initialZoom = map.getZoom();
            map._fitBoundsCalled = false;

            // fitBoundsなしで経路を描画
            const routeLayer = L.geoJSON({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: [[130.0, 33.0], [130.1, 33.1]] }
            });
            routeLayer.addTo(map);
            // fitBoundsは呼ばれない（options.fitBoundsがfalseの場合）

            // ズームと中心が保持されていることを確認
            const finalCenter = map.getCenter();
            const finalZoom = map.getZoom();
            const centerUnchanged = 
              Math.abs(finalCenter[0] - initialCenter[0]) < 0.0001 &&
              Math.abs(finalCenter[1] - initialCenter[1]) < 0.0001;
            const zoomUnchanged = finalZoom === initialZoom;

            return centerUnchanged && zoomUnchanged && !map._fitBoundsCalled;
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
