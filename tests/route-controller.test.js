/**
 * RouteControllerクラスのユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RouteController from '../js/route-controller.js';

describe('RouteController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('デバウンス: 短時間の連続呼び出しは最後の1回だけ実行される', async () => {
    const orsClient = {
      convertCoordinates: (stops) => stops.map((s) => [s.lon, s.lat]),
      getRoute: vi.fn(async () => ({ type: 'FeatureCollection', features: [{ geometry: { coordinates: [] } }] }))
    };
    const cacheManager = {
      get: vi.fn(() => null),
      set: vi.fn()
    };
    const routeRenderer = {
      hasRoute: vi.fn(() => false),
      drawRoute: vi.fn(),
      removeRoute: vi.fn(),
      clearAllRoutes: vi.fn()
    };

    const controller = new RouteController(orsClient, cacheManager, routeRenderer, { debounceDelay: 300 });

    const stops = [
      { lat: 33.0, lon: 130.0 },
      { lat: 33.1, lon: 130.1 }
    ];

    const p1 = controller.drawBusRoute('r1', stops);
    const p2 = controller.drawBusRoute('r1', stops);
    const p3 = controller.drawBusRoute('r1', stops);

    await vi.advanceTimersByTimeAsync(300);
    await expect(Promise.all([p1, p2, p3])).resolves.toBeTruthy();

    expect(orsClient.getRoute).toHaveBeenCalledTimes(1);
    expect(routeRenderer.drawRoute).toHaveBeenCalledTimes(1);
  });

  it('冪等性: 既に描画済みでforceなしならAPI呼び出しをスキップ', async () => {
    const orsClient = {
      convertCoordinates: (stops) => stops.map((s) => [s.lon, s.lat]),
      getRoute: vi.fn()
    };
    const cacheManager = {
      get: vi.fn(() => null),
      set: vi.fn()
    };
    const routeRenderer = {
      hasRoute: vi.fn(() => true),
      drawRoute: vi.fn(),
      removeRoute: vi.fn(),
      clearAllRoutes: vi.fn()
    };

    const controller = new RouteController(orsClient, cacheManager, routeRenderer, { debounceDelay: 10 });
    const stops = [
      { lat: 33.0, lon: 130.0 },
      { lat: 33.1, lon: 130.1 }
    ];

    const p = controller.drawBusRoute('r1', stops, {});
    await vi.advanceTimersByTimeAsync(10);
    await p;

    expect(orsClient.getRoute).not.toHaveBeenCalled();
    expect(routeRenderer.drawRoute).not.toHaveBeenCalled();
  });

  it('フォールバック: API失敗時は直線（破線）で描画する', async () => {
    const orsClient = {
      convertCoordinates: (stops) => stops.map((s) => [s.lon, s.lat]),
      getRoute: vi.fn(async () => {
        throw new Error('API Error');
      })
    };
    const cacheManager = {
      get: vi.fn(() => null),
      set: vi.fn()
    };
    const routeRenderer = {
      hasRoute: vi.fn(() => false),
      drawRoute: vi.fn(),
      removeRoute: vi.fn(),
      clearAllRoutes: vi.fn()
    };

    const controller = new RouteController(orsClient, cacheManager, routeRenderer, { debounceDelay: 10 });
    const stops = [
      { lat: 33.0, lon: 130.0 },
      { lat: 33.1, lon: 130.1 }
    ];

    const p = controller.drawBusRoute('r1', stops, { style: { color: '#123' } });
    const assertion = expect(p).rejects.toBeTruthy(); // 先にハンドラを付ける（未処理rejection対策）
    await vi.advanceTimersByTimeAsync(10);
    await assertion;

    expect(routeRenderer.drawRoute).toHaveBeenCalledTimes(1);
    const [, geojson, options] = routeRenderer.drawRoute.mock.calls[0];
    expect(geojson.features[0].properties.fallback).toBe(true);
    expect(options.style.dashArray).toBe('5, 10');
  });
});

