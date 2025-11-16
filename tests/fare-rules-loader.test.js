/**
 * fare_rules.txt読み込み機能のテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import '../js/data-loader.js';

describe('DataLoader - fare_rules.txt読み込み機能', () => {
  let dataLoader;

  beforeEach(() => {
    dataLoader = new window.DataLoader();
    dataLoader.setDebugMode(true);
  });

  it('loadFareRules()メソッドが存在する', () => {
    expect(dataLoader.loadFareRules).toBeDefined();
    expect(typeof dataLoader.loadFareRules).toBe('function');
  });

  it('fareRulesキャッシュが初期化されている', () => {
    expect(dataLoader.fareRules).toBeNull();
  });

  it('clearCache()でfareRulesキャッシュがクリアされる', () => {
    dataLoader.fareRules = [{ fareId: 'test' }];
    dataLoader.clearCache();
    expect(dataLoader.fareRules).toBeNull();
  });
});

describe('DataTransformer - transformFareRules()', () => {
  it('transformFareRules()メソッドが存在する', () => {
    expect(window.DataTransformer.transformFareRules).toBeDefined();
    expect(typeof window.DataTransformer.transformFareRules).toBe('function');
  });

  it('fare_rules.txtデータを正しく変換する', () => {
    const fareRulesData = [
      {
        fare_id: '1_160',
        route_id: '1ゆめタウン線',
        origin_id: '1001002-01',
        destination_id: '1005023-20'
      },
      {
        fare_id: '1_170',
        route_id: '1ゆめタウン線',
        origin_id: '1001002-01',
        destination_id: '1005024-20'
      }
    ];

    const result = window.DataTransformer.transformFareRules(fareRulesData);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      fareId: '1_160',
      routeId: '1ゆめタウン線',
      originId: '1001002-01',
      destinationId: '1005023-20',
      containsId: null
    });
    expect(result[1]).toEqual({
      fareId: '1_170',
      routeId: '1ゆめタウン線',
      originId: '1001002-01',
      destinationId: '1005024-20',
      containsId: null
    });
  });

  it('空のfare_rules.txtデータを処理できる', () => {
    const fareRulesData = [];
    const result = window.DataTransformer.transformFareRules(fareRulesData);
    expect(result).toEqual([]);
  });

  it('オプショナルフィールドがnullになる', () => {
    const fareRulesData = [
      {
        fare_id: '1_160',
        route_id: '',
        origin_id: '',
        destination_id: '',
        contains_id: ''
      }
    ];

    const result = window.DataTransformer.transformFareRules(fareRulesData);

    expect(result[0].routeId).toBeNull();
    expect(result[0].originId).toBeNull();
    expect(result[0].destinationId).toBeNull();
    expect(result[0].containsId).toBeNull();
  });

  it('進捗コールバックが呼ばれる', () => {
    const fareRulesData = [
      {
        fare_id: '1_160',
        route_id: '1ゆめタウン線',
        origin_id: '1001002-01',
        destination_id: '1005023-20'
      }
    ];

    let callbackCalled = false;
    const progressCallback = (message, data) => {
      callbackCalled = true;
      expect(message).toBeDefined();
    };

    window.DataTransformer.transformFareRules(fareRulesData, progressCallback);
    expect(callbackCalled).toBe(true);
  });
});
