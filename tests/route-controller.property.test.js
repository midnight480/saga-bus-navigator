/**
 * RouteControllerクラスのプロパティベーステスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import RouteController from '../js/route-controller.js';

describe('RouteController - プロパティベーステスト', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /**
   * Feature: ors-route-rendering, Property 26: デバウンス動作
   */
  it('プロパティ26: デバウンス期間内の連続要求は最後の1回だけ実行される', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 10 }), async (count) => {
        const orsClient = {
          convertCoordinates: (stops) => stops.map((s) => [s.lon, s.lat]),
          getRoute: vi.fn(async () => ({ type: 'FeatureCollection', features: [{ geometry: { coordinates: [] } }] }))
        };
        const cacheManager = { get: vi.fn(() => null), set: vi.fn() };
        const routeRenderer = { hasRoute: vi.fn(() => false), drawRoute: vi.fn(), removeRoute: vi.fn(), clearAllRoutes: vi.fn() };

        const controller = new RouteController(orsClient, cacheManager, routeRenderer, { debounceDelay: 100 });
        const stops = [
          { lat: 33.0, lon: 130.0 },
          { lat: 33.1, lon: 130.1 }
        ];

        const promises = [];
        for (let i = 0; i < count; i++) {
          promises.push(controller.drawBusRoute('r1', stops));
        }

        await vi.advanceTimersByTimeAsync(100);
        await Promise.allSettled(promises);

        expect(orsClient.getRoute).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 25 }
    );
  });

  /**
   * Feature: ors-route-rendering, Property 25: 冪等性（重複描画の防止）
   */
  it('プロパティ25: hasRouteがtrueかつforceなしなら描画処理をスキップする', async () => {
    await fc.assert(
      fc.asyncProperty(fc.boolean(), async (force) => {
        const orsClient = {
          convertCoordinates: (stops) => stops.map((s) => [s.lon, s.lat]),
          getRoute: vi.fn(async () => ({ type: 'FeatureCollection', features: [{ geometry: { coordinates: [] } }] }))
        };
        const cacheManager = { get: vi.fn(() => null), set: vi.fn() };
        const routeRenderer = { hasRoute: vi.fn(() => true), drawRoute: vi.fn(), removeRoute: vi.fn(), clearAllRoutes: vi.fn() };

        const controller = new RouteController(orsClient, cacheManager, routeRenderer, { debounceDelay: 1 });
        const stops = [
          { lat: 33.0, lon: 130.0 },
          { lat: 33.1, lon: 130.1 }
        ];

        const p = controller.drawBusRoute('r1', stops, force ? { force: true } : {});
        await vi.advanceTimersByTimeAsync(1);
        await Promise.allSettled([p]);

        if (force) {
          expect(routeRenderer.drawRoute).toHaveBeenCalledTimes(1);
        } else {
          expect(routeRenderer.drawRoute).toHaveBeenCalledTimes(0);
        }
      }),
      { numRuns: 25 }
    );
  });
});

