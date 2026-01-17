/**
 * RealtimeDataLoaderの単体テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// RealtimeDataLoaderクラスをインポート
import '../js/realtime-data-loader.js';

// gtfs-realtime-bindingsのモック
const createGtfsRealtimeBindingsMock = () => {
  return {
    transit_realtime: {
      FeedMessage: {
        decode: vi.fn((uint8Array) => {
          // モックのFeedMessageを返す
          return {
            entity: [
              {
                id: 'vehicle_1',
                vehicle: {
                  trip: {
                    tripId: 'trip_123',
                    routeId: 'route_456'
                  },
                  position: {
                    latitude: 33.2649,
                    longitude: 130.3008
                  },
                  currentStopSequence: 5,
                  timestamp: {
                    toNumber: () => 1700000000
                  },
                  vehicle: {
                    id: 'bus_001',
                    label: '佐賀1号'
                  }
                }
              }
            ]
          };
        })
      }
    }
  };
};

describe('RealtimeDataLoader', () => {
  let realtimeDataLoader;
  let gtfsRealtimeBindingsMock;

  beforeEach(() => {
    // gtfs-realtime-bindingsのモックを設定
    gtfsRealtimeBindingsMock = createGtfsRealtimeBindingsMock();
    global.GtfsRealtimeBindings = gtfsRealtimeBindingsMock;

    // RealtimeDataLoaderインスタンスを作成
    realtimeDataLoader = new window.RealtimeDataLoader('/api');
  });

  afterEach(() => {
    // ポーリングを停止
    if (realtimeDataLoader) {
      realtimeDataLoader.stopPolling();
    }

    // グローバルモックをクリア
    delete global.GtfsRealtimeBindings;
    
    // fetchモックをクリア
    if (global.fetch && global.fetch.mockRestore) {
      global.fetch.mockRestore();
    }
  });

  describe('constructor', () => {
    it('デフォルトのproxyBaseUrlで初期化できる', () => {
      const loader = new window.RealtimeDataLoader();
      expect(loader.proxyBaseUrl).toBe('/api');
    });

    it('カスタムproxyBaseUrlで初期化できる', () => {
      const loader = new window.RealtimeDataLoader('/custom-api');
      expect(loader.proxyBaseUrl).toBe('/custom-api');
    });

    it('ポーリング間隔が30秒に設定される', () => {
      expect(realtimeDataLoader.pollingInterval).toBe(30000);
    });

    it('エラーカウンターが0に初期化される', () => {
      expect(realtimeDataLoader.consecutiveErrorCount).toBe(0);
    });

    it('データキャッシュが空配列で初期化される', () => {
      expect(realtimeDataLoader.vehiclePositions).toEqual([]);
      expect(realtimeDataLoader.tripUpdates).toEqual([]);
      expect(realtimeDataLoader.alerts).toEqual([]);
    });
  });

  describe('addEventListener', () => {
    it('イベントリスナーを登録できる', () => {
      const callback = vi.fn();
      realtimeDataLoader.addEventListener('vehiclePositionsUpdated', callback);

      expect(realtimeDataLoader.eventListeners.vehiclePositionsUpdated).toContain(callback);
    });

    it('複数のイベントリスナーを登録できる', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      realtimeDataLoader.addEventListener('vehiclePositionsUpdated', callback1);
      realtimeDataLoader.addEventListener('vehiclePositionsUpdated', callback2);

      expect(realtimeDataLoader.eventListeners.vehiclePositionsUpdated).toHaveLength(2);
    });
  });

  describe('fireEvent', () => {
    it('登録されたイベントリスナーを呼び出す', () => {
      const callback = vi.fn();
      realtimeDataLoader.addEventListener('vehiclePositionsUpdated', callback);

      const testData = [{ tripId: 'test' }];
      realtimeDataLoader.fireEvent('vehiclePositionsUpdated', testData);

      expect(callback).toHaveBeenCalledWith(testData);
    });

    it('複数のイベントリスナーを呼び出す', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      realtimeDataLoader.addEventListener('vehiclePositionsUpdated', callback1);
      realtimeDataLoader.addEventListener('vehiclePositionsUpdated', callback2);

      const testData = [{ tripId: 'test' }];
      realtimeDataLoader.fireEvent('vehiclePositionsUpdated', testData);

      expect(callback1).toHaveBeenCalledWith(testData);
      expect(callback2).toHaveBeenCalledWith(testData);
    });

    it('イベントリスナーでエラーが発生しても他のリスナーは実行される', () => {
      const callback1 = vi.fn(() => {
        throw new Error('Test error');
      });
      const callback2 = vi.fn();

      realtimeDataLoader.addEventListener('vehiclePositionsUpdated', callback1);
      realtimeDataLoader.addEventListener('vehiclePositionsUpdated', callback2);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const testData = [{ tripId: 'test' }];
      realtimeDataLoader.fireEvent('vehiclePositionsUpdated', testData);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('decodeProtobuf', () => {
    it('Protocol Buffersデータを正常にデコードできる', async () => {
      const mockArrayBuffer = new ArrayBuffer(10);

      const result = await realtimeDataLoader.decodeProtobuf(mockArrayBuffer, 'FeedMessage');

      expect(result).toBeDefined();
      expect(result.entity).toBeDefined();
      expect(gtfsRealtimeBindingsMock.transit_realtime.FeedMessage.decode).toHaveBeenCalled();
    });

    it('gtfs-realtime-bindingsが未定義の場合はエラーをスローする', async () => {
      delete global.GtfsRealtimeBindings;

      const mockArrayBuffer = new ArrayBuffer(10);

      await expect(
        realtimeDataLoader.decodeProtobuf(mockArrayBuffer, 'FeedMessage')
      ).rejects.toThrow('gtfs-realtime-bindings is not loaded');
    });

    it('デコードに失敗した場合はエラーをスローする', async () => {
      gtfsRealtimeBindingsMock.transit_realtime.FeedMessage.decode.mockImplementation(() => {
        throw new Error('Decode error');
      });

      const mockArrayBuffer = new ArrayBuffer(10);

      await expect(
        realtimeDataLoader.decodeProtobuf(mockArrayBuffer, 'FeedMessage')
      ).rejects.toThrow('Decode error');
    });
  });

  describe('convertVehiclePositions', () => {
    it('車両位置情報を内部データモデルに変換できる', () => {
      const feedMessage = {
        entity: [
          {
            id: 'vehicle_1',
            vehicle: {
              trip: {
                tripId: 'trip_123',
                routeId: 'route_456'
              },
              position: {
                latitude: 33.2649,
                longitude: 130.3008
              },
              currentStopSequence: 5,
              timestamp: {
                toNumber: () => 1700000000
              },
              vehicle: {
                id: 'bus_001',
                label: '佐賀1号'
              }
            }
          }
        ]
      };

      const result = realtimeDataLoader.convertVehiclePositions(feedMessage);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        tripId: 'trip_123',
        routeId: 'route_456',
        latitude: 33.2649,
        longitude: 130.3008,
        currentStopSequence: 5,
        timestamp: 1700000000,
        vehicleId: 'bus_001',
        vehicleLabel: '佐賀1号'
      });
    });

    it('vehicleフィールドがないエンティティをスキップする', () => {
      const feedMessage = {
        entity: [
          {
            id: 'not_vehicle',
            tripUpdate: {}
          }
        ]
      };

      const result = realtimeDataLoader.convertVehiclePositions(feedMessage);

      expect(result).toHaveLength(0);
    });

    it('必須フィールドがない車両をスキップする', () => {
      const feedMessage = {
        entity: [
          {
            id: 'vehicle_1',
            vehicle: {
              // tripフィールドがない
              position: {
                latitude: 33.2649,
                longitude: 130.3008
              }
            }
          }
        ]
      };

      const result = realtimeDataLoader.convertVehiclePositions(feedMessage);

      expect(result).toHaveLength(0);
    });

    it('不正な座標の車両をスキップする', () => {
      const feedMessage = {
        entity: [
          {
            id: 'vehicle_1',
            vehicle: {
              trip: {
                tripId: 'trip_123'
              },
              position: {
                latitude: 999, // 不正な緯度
                longitude: 130.3008
              }
            }
          }
        ]
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = realtimeDataLoader.convertVehiclePositions(feedMessage);

      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('空のfeedMessageの場合は空配列を返す', () => {
      const result = realtimeDataLoader.convertVehiclePositions(null);
      expect(result).toEqual([]);

      const result2 = realtimeDataLoader.convertVehiclePositions({});
      expect(result2).toEqual([]);
    });
  });

  describe('convertTripUpdates', () => {
    it('TripUpdatesを内部データモデルに変換できる', () => {
      const feedMessage = {
        entity: [
          {
            id: 'trip_update_1',
            tripUpdate: {
              trip: {
                tripId: 'trip_123',
                routeId: 'route_456'
              },
              stopTimeUpdate: [
                {
                  stopSequence: 5,
                  arrival: {
                    delay: 180
                  },
                  departure: {
                    delay: 180
                  }
                }
              ]
            }
          }
        ]
      };

      const result = realtimeDataLoader.convertTripUpdates(feedMessage);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        tripId: 'trip_123',
        routeId: 'route_456',
        stopTimeUpdates: [
          {
            stopSequence: 5,
            arrivalDelay: 180,
            departureDelay: 180
          }
        ]
      });
    });

    it('tripUpdateフィールドがないエンティティをスキップする', () => {
      const feedMessage = {
        entity: [
          {
            id: 'not_trip_update',
            vehicle: {}
          }
        ]
      };

      const result = realtimeDataLoader.convertTripUpdates(feedMessage);

      expect(result).toHaveLength(0);
    });

    it('tripフィールドがないtripUpdateをスキップする', () => {
      const feedMessage = {
        entity: [
          {
            id: 'trip_update_1',
            tripUpdate: {
              // tripフィールドがない
              stopTimeUpdate: []
            }
          }
        ]
      };

      const result = realtimeDataLoader.convertTripUpdates(feedMessage);

      expect(result).toHaveLength(0);
    });
  });

  describe('convertAlerts', () => {
    it('Alertsを内部データモデルに変換できる', () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const feedMessage = {
        entity: [
          {
            id: 'alert_1',
            alert: {
              activePeriod: [
                {
                  start: {
                    toNumber: () => currentTime - 1000
                  },
                  end: {
                    toNumber: () => currentTime + 1000
                  }
                }
              ],
              headerText: {
                translation: [
                  {
                    text: '事故による遅延',
                    language: 'ja'
                  }
                ]
              },
              descriptionText: {
                translation: [
                  {
                    text: '国道34号線で事故が発生したため、約10分の遅延が発生しています。',
                    language: 'ja'
                  }
                ]
              },
              informedEntity: [
                {
                  routeId: 'route_789',
                  tripId: 'trip_456'
                }
              ]
            }
          }
        ]
      };

      const result = realtimeDataLoader.convertAlerts(feedMessage);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('delay');
      expect(result[0].headerText).toBe('事故による遅延');
      expect(result[0].descriptionText).toContain('国道34号線');
      expect(result[0].affectedRoutes).toContain('route_789');
      expect(result[0].affectedTrips).toContain('trip_456');
    });

    it('運休情報を正しく分類する', () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const feedMessage = {
        entity: [
          {
            id: 'alert_1',
            alert: {
              activePeriod: [
                {
                  start: {
                    toNumber: () => currentTime - 1000
                  },
                  end: {
                    toNumber: () => currentTime + 1000
                  }
                }
              ],
              headerText: {
                translation: [
                  {
                    text: '運休のお知らせ',
                    language: 'ja'
                  }
                ]
              },
              descriptionText: {
                translation: [
                  {
                    text: '本日は運休します。',
                    language: 'ja'
                  }
                ]
              }
            }
          }
        ]
      };

      const result = realtimeDataLoader.convertAlerts(feedMessage);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('cancellation');
    });

    it('有効期間外のアラートをスキップする', () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const feedMessage = {
        entity: [
          {
            id: 'alert_1',
            alert: {
              activePeriod: [
                {
                  start: {
                    toNumber: () => currentTime - 2000
                  },
                  end: {
                    toNumber: () => currentTime - 1000 // 既に終了
                  }
                }
              ],
              headerText: {
                translation: [
                  {
                    text: '過去のアラート',
                    language: 'ja'
                  }
                ]
              }
            }
          }
        ]
      };

      const result = realtimeDataLoader.convertAlerts(feedMessage);

      expect(result).toHaveLength(0);
    });

    it('activePeriodがない場合は常に有効として扱う', () => {
      const feedMessage = {
        entity: [
          {
            id: 'alert_1',
            alert: {
              // activePeriodがない
              headerText: {
                translation: [
                  {
                    text: 'アラート',
                    language: 'ja'
                  }
                ]
              }
            }
          }
        ]
      };

      const result = realtimeDataLoader.convertAlerts(feedMessage);

      expect(result).toHaveLength(1);
    });
  });

  describe('extractTranslatedText', () => {
    it('日本語の翻訳を優先的に抽出する', () => {
      const translatedString = {
        translation: [
          {
            text: 'English text',
            language: 'en'
          },
          {
            text: '日本語テキスト',
            language: 'ja'
          }
        ]
      };

      const result = realtimeDataLoader.extractTranslatedText(translatedString);

      expect(result).toBe('日本語テキスト');
    });

    it('日本語がない場合は最初の翻訳を返す', () => {
      const translatedString = {
        translation: [
          {
            text: 'English text',
            language: 'en'
          }
        ]
      };

      const result = realtimeDataLoader.extractTranslatedText(translatedString);

      expect(result).toBe('English text');
    });

    it('translatedStringがnullの場合はnullを返す', () => {
      const result = realtimeDataLoader.extractTranslatedText(null);

      expect(result).toBeNull();
    });
  });

  describe('fetchWithRetry', () => {
    it('正常なレスポンスを返す', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10))
      };

      global.fetch = vi.fn(() => Promise.resolve(mockResponse));

      const result = await realtimeDataLoader.fetchWithRetry('/api/vehicle');

      expect(result).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('HTTPエラーの場合はリトライする', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 502
      };

      const mockSuccessResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10))
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await realtimeDataLoader.fetchWithRetry('/api/vehicle', 3);

      expect(result).toBe(mockSuccessResponse);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('最大リトライ回数に達した場合はエラーをスローする', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 502
      };

      global.fetch = vi.fn(() => Promise.resolve(mockErrorResponse));

      await expect(
        realtimeDataLoader.fetchWithRetry('/api/vehicle', 3)
      ).rejects.toThrow();

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('指数バックオフでリトライする', async () => {
      vi.useFakeTimers();

      const mockErrorResponse = {
        ok: false,
        status: 502
      };

      global.fetch = vi.fn(() => Promise.resolve(mockErrorResponse));

      const promise = realtimeDataLoader.fetchWithRetry('/api/vehicle', 3);
      const assertion = expect(promise).rejects.toThrow(); // 先にハンドラを付ける（未処理rejection対策）

      // 最初の呼び出し
      await vi.advanceTimersByTimeAsync(0);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // 1秒後にリトライ
      await vi.advanceTimersByTimeAsync(1000);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // 2秒後にリトライ
      await vi.advanceTimersByTimeAsync(2000);
      expect(global.fetch).toHaveBeenCalledTimes(3);

      await assertion;

      vi.useRealTimers();
    });
  });

  describe('handleFetchError', () => {
    it('エラーカウンターをインクリメントする', () => {
      const error = new Error('Test error');

      realtimeDataLoader.handleFetchError(error, 'vehicle');

      expect(realtimeDataLoader.consecutiveErrorCount).toBe(1);
    });

    it('連続3回失敗時にポーリング間隔を60秒に延長する', () => {
      const error = new Error('Test error');

      realtimeDataLoader.handleFetchError(error, 'vehicle');
      realtimeDataLoader.handleFetchError(error, 'vehicle');
      realtimeDataLoader.handleFetchError(error, 'vehicle');

      expect(realtimeDataLoader.pollingInterval).toBe(60000);
    });

    it('fetchErrorイベントを発火する', () => {
      const callback = vi.fn();
      realtimeDataLoader.addEventListener('fetchError', callback);

      const error = new Error('Test error');
      realtimeDataLoader.handleFetchError(error, 'vehicle');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          dataType: 'vehicle',
          error: error,
          consecutiveErrorCount: 1
        })
      );
    });
  });

  describe('handleFetchSuccess', () => {
    it('エラーカウンターをリセットする', () => {
      realtimeDataLoader.consecutiveErrorCount = 3;

      realtimeDataLoader.handleFetchSuccess();

      expect(realtimeDataLoader.consecutiveErrorCount).toBe(0);
    });

    it('ポーリング間隔を30秒に戻す', () => {
      realtimeDataLoader.pollingInterval = 60000;
      realtimeDataLoader.consecutiveErrorCount = 3;

      realtimeDataLoader.handleFetchSuccess();

      expect(realtimeDataLoader.pollingInterval).toBe(30000);
    });
  });

  describe('startPolling and stopPolling', () => {
    it('ポーリングを開始できる', () => {
      vi.useFakeTimers();

      const fetchAllDataSpy = vi.spyOn(realtimeDataLoader, 'fetchAllData').mockResolvedValue();

      realtimeDataLoader.startPolling();

      expect(realtimeDataLoader.pollingIntervalId).not.toBeNull();

      // 30秒後にfetchAllDataが呼ばれることを確認
      vi.advanceTimersByTime(30000);

      expect(fetchAllDataSpy).toHaveBeenCalled();

      fetchAllDataSpy.mockRestore();
      vi.useRealTimers();
    });

    it('ポーリングを停止できる', () => {
      vi.useFakeTimers();

      const fetchAllDataSpy = vi.spyOn(realtimeDataLoader, 'fetchAllData').mockResolvedValue();

      realtimeDataLoader.startPolling();
      realtimeDataLoader.stopPolling();

      expect(realtimeDataLoader.pollingIntervalId).toBeNull();

      // 30秒後でもfetchAllDataが呼ばれないことを確認
      vi.advanceTimersByTime(30000);

      expect(fetchAllDataSpy).not.toHaveBeenCalled();

      fetchAllDataSpy.mockRestore();
      vi.useRealTimers();
    });
  });
});
