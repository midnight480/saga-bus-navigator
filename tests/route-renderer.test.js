/**
 * RouteRendererクラスのユニットテスト（Leafletはスタブで検証）
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import RouteRenderer from '../js/route-renderer.js';

function createLeafletStub() {
  return {
    geoJSON: (geojson, options) => {
      const layer = {
        _geojson: geojson,
        _options: options,
        _style: options?.style,
        addTo(map) {
          map._layers.push(layer);
          return layer;
        },
        setStyle(style) {
          layer._style = style;
        },
        getBounds() {
          return { _stub: true };
        }
      };
      return layer;
    }
  };
}

function createMapStub() {
  return {
    _layers: [],
    removed: [],
    removeLayer(layer) {
      this.removed.push(layer);
      this._layers = this._layers.filter((l) => l !== layer);
    },
    fitBounds(bounds) {
      this._fitBounds = bounds;
    }
  };
}

describe('RouteRenderer', () => {
  beforeEach(() => {
    global.L = createLeafletStub();
  });

  afterEach(() => {
    delete global.L;
  });

  it('drawRoute: レイヤー参照を保存し、hasRouteがtrueになる', () => {
    const map = createMapStub();
    const rr = new RouteRenderer(map, {});

    rr.drawRoute('r1', { type: 'FeatureCollection', features: [] });

    expect(rr.hasRoute('r1')).toBe(true);
    expect(map._layers.length).toBe(1);
  });

  it('removeRoute: 地図から削除し、参照も削除する', () => {
    const map = createMapStub();
    const rr = new RouteRenderer(map, {});

    rr.drawRoute('r1', { type: 'FeatureCollection', features: [] });
    rr.removeRoute('r1');

    expect(rr.hasRoute('r1')).toBe(false);
    expect(map._layers.length).toBe(0);
    expect(map.removed.length).toBe(1);
  });

  it('clearAllRoutes: 全レイヤーを削除する', () => {
    const map = createMapStub();
    const rr = new RouteRenderer(map, {});

    rr.drawRoute('a', { type: 'FeatureCollection', features: [] });
    rr.drawRoute('b', { type: 'FeatureCollection', features: [] });
    rr.clearAllRoutes();

    expect(map._layers.length).toBe(0);
    expect(rr.hasRoute('a')).toBe(false);
    expect(rr.hasRoute('b')).toBe(false);
  });

  it('setVisible: falseでスタイルが透明化される', () => {
    const map = createMapStub();
    const rr = new RouteRenderer(map, { style: { color: '#000', weight: 4, opacity: 0.7 } });

    rr.drawRoute('r1', { type: 'FeatureCollection', features: [] }, { style: { color: '#f00' } });
    rr.setVisible(false);

    const layer = rr.routeLayers.get('r1');
    expect(layer._style.opacity).toBe(0);
    expect(layer._style.weight).toBe(0);
  });
});

