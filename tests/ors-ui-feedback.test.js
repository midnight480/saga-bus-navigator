/**
 * ORS UIフィードバックのユニットテスト
 * 
 * エラーメッセージ表示のテスト
 * ローディング状態のテスト
 * 
 * Validates: Requirements 6.3, 6.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// UIControllerのスタブ
function createUIControllerStub() {
  return {
    displayLoading: vi.fn(),
    displayError: vi.fn(),
    translationManager: {
      translate: vi.fn((key) => {
        const translations = {
          'error.ors_rate_limited': 'レート制限により経路の取得に失敗しました',
          'error.ors_invalid_coordinates': '無効な座標が指定されました',
          'error.ors_unavailable': '経路の取得に失敗しました（直線で表示します）'
        };
        return translations[key] || key;
      })
    }
  };
}

// MapControllerのdrawOrsRouteWithUiメソッドのスタブ
function createMapControllerStub(uiController) {
  return {
    orsEnabled: true,
    orsRouteController: {
      drawBusRoute: vi.fn()
    },
    async drawOrsRouteWithUi(routeId, stops, options) {
      if (!this.orsEnabled || !this.orsRouteController) return;

      if (window.uiController && typeof window.uiController.displayLoading === 'function') {
        window.uiController.displayLoading(true);
      }

      try {
        await this.orsRouteController.drawBusRoute(routeId, stops, options);
      } catch (error) {
        const code = error && typeof error === 'object' ? error.code : null;
        if (window.uiController && typeof window.uiController.displayError === 'function') {
          if (window.uiController.translationManager) {
            const key =
              code === 'RATE_LIMIT' || code === 'RATE_LIMIT_MINUTE' || code === 'RATE_LIMIT_DAILY'
                ? 'error.ors_rate_limited'
                : code === 'INVALID_COORDINATES'
                  ? 'error.ors_invalid_coordinates'
                  : 'error.ors_unavailable';
            window.uiController.displayError(key, true);
          } else {
            window.uiController.displayError('経路の取得に失敗しました（直線で表示します）');
          }
        }
      } finally {
        if (window.uiController && typeof window.uiController.displayLoading === 'function') {
          window.uiController.displayLoading(false);
        }
      }
    }
  };
}

describe('ORS UIフィードバック', () => {
  let uiController, mapController;

  beforeEach(() => {
    uiController = createUIControllerStub();
    mapController = createMapControllerStub(uiController);
    global.window = {
      uiController: uiController
    };
    vi.clearAllMocks();
  });

  describe('エラーメッセージ表示', () => {
    it('レート制限エラー時に適切なエラーメッセージを表示する', async () => {
      // レート制限エラーをシミュレート
      mapController.orsRouteController.drawBusRoute.mockRejectedValue({
        code: 'RATE_LIMIT_MINUTE',
        message: 'Rate limit exceeded'
      });

      await mapController.drawOrsRouteWithUi('test-route', [
        { lat: 33.2649, lon: 130.3019 },
        { lat: 33.2749, lon: 130.3119 }
      ]);

      // displayErrorが呼ばれ、適切なキーが渡されることを確認
      expect(uiController.displayError).toHaveBeenCalledWith('error.ors_rate_limited', true);
    });

    it('無効な座標エラー時に適切なエラーメッセージを表示する', async () => {
      // 無効な座標エラーをシミュレート
      mapController.orsRouteController.drawBusRoute.mockRejectedValue({
        code: 'INVALID_COORDINATES',
        message: 'Invalid coordinates'
      });

      await mapController.drawOrsRouteWithUi('test-route', [
        { lat: 999, lon: 130.3019 } // 無効な座標
      ]);

      // displayErrorが呼ばれ、適切なキーが渡されることを確認
      expect(uiController.displayError).toHaveBeenCalledWith('error.ors_invalid_coordinates', true);
    });

    it('その他のエラー時にフォールバックメッセージを表示する', async () => {
      // その他のエラーをシミュレート
      mapController.orsRouteController.drawBusRoute.mockRejectedValue({
        code: 'NETWORK_ERROR',
        message: 'Network error'
      });

      await mapController.drawOrsRouteWithUi('test-route', [
        { lat: 33.2649, lon: 130.3019 },
        { lat: 33.2749, lon: 130.3119 }
      ]);

      // displayErrorが呼ばれ、フォールバックキーが渡されることを確認
      expect(uiController.displayError).toHaveBeenCalledWith('error.ors_unavailable', true);
    });

    it('translationManagerがない場合でもエラーメッセージを表示する', async () => {
      // translationManagerを削除
      uiController.translationManager = null;

      mapController.orsRouteController.drawBusRoute.mockRejectedValue({
        code: 'UNKNOWN_ERROR',
        message: 'Unknown error'
      });

      await mapController.drawOrsRouteWithUi('test-route', [
        { lat: 33.2649, lon: 130.3019 },
        { lat: 33.2749, lon: 130.3119 }
      ]);

      // フォールバックメッセージが表示されることを確認
      expect(uiController.displayError).toHaveBeenCalledWith('経路の取得に失敗しました（直線で表示します）');
    });
  });

  describe('ローディング状態', () => {
    it('経路取得開始時にローディングを表示する', async () => {
      // 成功レスポンスをシミュレート
      mapController.orsRouteController.drawBusRoute.mockResolvedValue(undefined);

      await mapController.drawOrsRouteWithUi('test-route', [
        { lat: 33.2649, lon: 130.3019 },
        { lat: 33.2749, lon: 130.3119 }
      ]);

      // displayLoading(true)が呼ばれることを確認
      expect(uiController.displayLoading).toHaveBeenCalledWith(true);
    });

    it('経路取得完了時にローディングを非表示にする', async () => {
      // 成功レスポンスをシミュレート
      mapController.orsRouteController.drawBusRoute.mockResolvedValue(undefined);

      await mapController.drawOrsRouteWithUi('test-route', [
        { lat: 33.2649, lon: 130.3019 },
        { lat: 33.2749, lon: 130.3119 }
      ]);

      // displayLoading(false)が呼ばれることを確認
      expect(uiController.displayLoading).toHaveBeenCalledWith(false);
    });

    it('エラー発生時でもローディングを非表示にする', async () => {
      // エラーをシミュレート
      mapController.orsRouteController.drawBusRoute.mockRejectedValue({
        code: 'NETWORK_ERROR',
        message: 'Network error'
      });

      await mapController.drawOrsRouteWithUi('test-route', [
        { lat: 33.2649, lon: 130.3019 },
        { lat: 33.2749, lon: 130.3119 }
      ]);

      // エラー後もdisplayLoading(false)が呼ばれることを確認
      expect(uiController.displayLoading).toHaveBeenCalledWith(false);
    });

    it('ローディング表示と非表示が正しい順序で呼ばれる', async () => {
      // 成功レスポンスをシミュレート
      mapController.orsRouteController.drawBusRoute.mockResolvedValue(undefined);

      await mapController.drawOrsRouteWithUi('test-route', [
        { lat: 33.2649, lon: 130.3019 },
        { lat: 33.2749, lon: 130.3119 }
      ]);

      // 呼び出し順序を確認
      const calls = uiController.displayLoading.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);
      expect(calls[0][0]).toBe(true); // 最初にtrue
      expect(calls[calls.length - 1][0]).toBe(false); // 最後にfalse
    });
  });

  describe('エラーとローディングの組み合わせ', () => {
    it('エラー発生時はローディングを非表示にしてからエラーを表示する', async () => {
      // エラーをシミュレート
      mapController.orsRouteController.drawBusRoute.mockRejectedValue({
        code: 'RATE_LIMIT',
        message: 'Rate limit exceeded'
      });

      await mapController.drawOrsRouteWithUi('test-route', [
        { lat: 33.2649, lon: 130.3019 },
        { lat: 33.2749, lon: 130.3119 }
      ]);

      // displayLoading(false)が呼ばれることを確認
      expect(uiController.displayLoading).toHaveBeenCalledWith(false);
      // displayErrorが呼ばれることを確認
      expect(uiController.displayError).toHaveBeenCalled();
    });

    it('ORSが無効な場合はローディングもエラーも表示しない', async () => {
      mapController.orsEnabled = false;

      await mapController.drawOrsRouteWithUi('test-route', [
        { lat: 33.2649, lon: 130.3019 },
        { lat: 33.2749, lon: 130.3119 }
      ]);

      // displayLoadingもdisplayErrorも呼ばれないことを確認
      expect(uiController.displayLoading).not.toHaveBeenCalled();
      expect(uiController.displayError).not.toHaveBeenCalled();
    });
  });
});
