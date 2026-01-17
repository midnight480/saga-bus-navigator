/**
 * RouteRendererクラスのプロパティベーステスト（Leafletはスタブ）
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import RouteRenderer from '../js/route-renderer.js';

function createLeafletStub() {
  return {
    geoJSON: (geojson, options) => {
      const layer = {
        _geojson: geojson,
        _options: options,
        addTo(map) {
          map._layers.push(layer);
          return layer;
        },
        setStyle() {},
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
    removeLayer(layer) {
      this._layers = this._layers.filter((l) => l !== layer);
    },
    fitBounds() {}
  };
}

describe('RouteRenderer - プロパティベーステスト', () => {
  beforeEach(() => {
    global.L = createLeafletStub();
  });

  afterEach(() => {
    delete global.L;
  });

  /**
   * Feature: ors-route-rendering, Property 6/8: 経路レイヤー作成と参照保存
   */
  it('プロパティ6/8: drawRoute後、hasRouteがtrueでレイヤー参照が保存される', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (routeId) => {
        const map = createMapStub();
        const rr = new RouteRenderer(map, {});
        rr.drawRoute(routeId, { type: 'FeatureCollection', features: [] });
        expect(rr.hasRoute(routeId)).toBe(true);
        expect(rr.routeLayers.get(routeId)).toBeTruthy();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: ors-route-rendering, Property 9: 経路クリアの完全性
   */
  it('プロパティ9: clearAllRoutes後、内部マップが空で地図レイヤーも空', () => {
    fc.assert(
      fc.property(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }), (ids) => {
        const map = createMapStub();
        const rr = new RouteRenderer(map, {});
        ids.forEach((id) => rr.drawRoute(id, { type: 'FeatureCollection', features: [] }));

        rr.clearAllRoutes();
        expect(rr.routeLayers.size).toBe(0);
        expect(map._layers.length).toBe(0);
      }),
      { numRuns: 50 }
    );
  });
});

