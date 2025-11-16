/**
 * FareCalculatorクラスの単体テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import '../js/fare-calculator.js';

describe('FareCalculator - 基本機能', () => {
  let fareCalculator;
  let fareAttributes;
  let fareRules;
  let routes;

  beforeEach(() => {
    // テストデータの準備
    fareAttributes = [
      {
        fareId: '1_160',
        price: 160,
        currencyType: 'JPY',
        paymentMethod: 0,
        transfers: 0,
        agencyId: '3000020412015'
      },
      {
        fareId: '1_170',
        price: 170,
        currencyType: 'JPY',
        paymentMethod: 0,
        transfers: 0,
        agencyId: '3000020412015'
      },
      {
        fareId: '1_200',
        price: 200,
        currencyType: 'JPY',
        paymentMethod: 0,
        transfers: 0,
        agencyId: '3000020412015'
      }
    ];

    fareRules = [
      {
        fareId: '1_160',
        routeId: '1ゆめタウン線',
        originId: '1001002-01',
        destinationId: '1005023-20',
        containsId: null
      },
      {
        fareId: '1_170',
        routeId: '1ゆめタウン線',
        originId: '1001002-01',
        destinationId: '1005024-20',
        containsId: null
      },
      {
        fareId: '1_200',
        routeId: '2循環線',
        originId: null,
        destinationId: null,
        containsId: null
      }
    ];

    routes = [
      {
        route_id: '1ゆめタウン線',
        route_long_name: 'ゆめタウン線',
        agency_id: '3000020412015'
      },
      {
        route_id: '2循環線',
        route_long_name: '市内循環線',
        agency_id: '3000020412015'
      }
    ];

    fareCalculator = new window.FareCalculator(fareAttributes, fareRules, routes);
  });

  it('FareCalculatorクラスが存在する', () => {
    expect(window.FareCalculator).toBeDefined();
    expect(typeof window.FareCalculator).toBe('function');
  });

  it('インスタンスが正しく初期化される', () => {
    expect(fareCalculator.fareAttributes).toEqual(fareAttributes);
    expect(fareCalculator.fareRules).toEqual(fareRules);
    expect(fareCalculator.routes).toEqual(routes);
    expect(fareCalculator.fareAttributesIndex).toBeDefined();
    expect(fareCalculator.fareRulesIndex).toBeDefined();
  });
});

describe('FareCalculator - 正常系テスト', () => {
  let fareCalculator;

  beforeEach(() => {
    const fareAttributes = [
      {
        fareId: '1_160',
        price: 160,
        currencyType: 'JPY',
        paymentMethod: 0,
        transfers: 0,
        agencyId: '3000020412015'
      },
      {
        fareId: '1_170',
        price: 170,
        currencyType: 'JPY',
        paymentMethod: 0,
        transfers: 0,
        agencyId: '3000020412015'
      }
    ];

    const fareRules = [
      {
        fareId: '1_160',
        routeId: '1ゆめタウン線',
        originId: '1001002-01',
        destinationId: '1005023-20',
        containsId: null
      },
      {
        fareId: '1_170',
        routeId: '1ゆめタウン線',
        originId: '1001002-01',
        destinationId: '1005024-20',
        containsId: null
      }
    ];

    fareCalculator = new window.FareCalculator(fareAttributes, fareRules, []);
  });

  it('有効な区間の運賃を正しく計算する', () => {
    const result = fareCalculator.calculateFare(
      '1001002-01',
      '1005023-20',
      '1ゆめタウン線'
    );

    expect(result).not.toBeNull();
    expect(result.adultFare).toBe(160);
    expect(result.childFare).toBe(80); // 大人の半額（端数切り捨て）
  });

  it('別の区間の運賃を正しく計算する', () => {
    const result = fareCalculator.calculateFare(
      '1001002-01',
      '1005024-20',
      '1ゆめタウン線'
    );

    expect(result).not.toBeNull();
    expect(result.adultFare).toBe(170);
    expect(result.childFare).toBe(85);
  });

  it('小児運賃が正しく計算される（端数切り捨て）', () => {
    const fareAttributes = [
      {
        fareId: '1_165',
        price: 165,
        currencyType: 'JPY',
        paymentMethod: 0,
        transfers: 0,
        agencyId: '3000020412015'
      }
    ];

    const fareRules = [
      {
        fareId: '1_165',
        routeId: 'テスト線',
        originId: 'A',
        destinationId: 'B',
        containsId: null
      }
    ];

    const calculator = new window.FareCalculator(fareAttributes, fareRules, []);
    const result = calculator.calculateFare('A', 'B', 'テスト線');

    expect(result).not.toBeNull();
    expect(result.adultFare).toBe(165);
    expect(result.childFare).toBe(82); // 165 / 2 = 82.5 → 82（端数切り捨て）
  });
});

describe('FareCalculator - 異常系テスト', () => {
  let fareCalculator;

  beforeEach(() => {
    const fareAttributes = [
      {
        fareId: '1_160',
        price: 160,
        currencyType: 'JPY',
        paymentMethod: 0,
        transfers: 0,
        agencyId: '3000020412015'
      }
    ];

    const fareRules = [
      {
        fareId: '1_160',
        routeId: '1ゆめタウン線',
        originId: '1001002-01',
        destinationId: '1005023-20',
        containsId: null
      }
    ];

    fareCalculator = new window.FareCalculator(fareAttributes, fareRules, []);
  });

  it('運賃情報が見つからない場合はnullを返す', () => {
    const result = fareCalculator.calculateFare(
      '存在しないバス停A',
      '存在しないバス停B',
      '存在しない路線'
    );

    expect(result).toBeNull();
  });

  it('運賃ルールが見つからない場合はnullを返す', () => {
    const result = fareCalculator.calculateFare(
      '1001002-01',
      '存在しないバス停',
      '1ゆめタウン線'
    );

    expect(result).toBeNull();
  });

  it('運賃属性が見つからない場合はnullを返す', () => {
    // 運賃ルールは存在するが、運賃属性が存在しないケース
    const fareRules = [
      {
        fareId: '存在しない運賃ID',
        routeId: 'テスト線',
        originId: 'A',
        destinationId: 'B',
        containsId: null
      }
    ];

    const calculator = new window.FareCalculator([], fareRules, []);
    const result = calculator.calculateFare('A', 'B', 'テスト線');

    expect(result).toBeNull();
  });

  it('必須パラメータが不足している場合はnullを返す', () => {
    expect(fareCalculator.calculateFare(null, '1005023-20', '1ゆめタウン線')).toBeNull();
    expect(fareCalculator.calculateFare('1001002-01', null, '1ゆめタウン線')).toBeNull();
    expect(fareCalculator.calculateFare('1001002-01', '1005023-20', null)).toBeNull();
    expect(fareCalculator.calculateFare('', '1005023-20', '1ゆめタウン線')).toBeNull();
  });
});

describe('FareCalculator - 境界値テスト', () => {
  let fareCalculator;

  beforeEach(() => {
    const fareAttributes = [
      {
        fareId: '1_160',
        price: 160,
        currencyType: 'JPY',
        paymentMethod: 0,
        transfers: 0,
        agencyId: '3000020412015'
      }
    ];

    const fareRules = [
      {
        fareId: '1_160',
        routeId: '1ゆめタウン線',
        originId: '1001002-01',
        destinationId: '1005023-20',
        containsId: null
      }
    ];

    fareCalculator = new window.FareCalculator(fareAttributes, fareRules, []);
  });

  it('同一バス停間の運賃計算はnullを返す', () => {
    const result = fareCalculator.calculateFare(
      '1001002-01',
      '1001002-01',
      '1ゆめタウン線'
    );

    expect(result).toBeNull();
  });
});

describe('FareCalculator - findFareRule()メソッド', () => {
  let fareCalculator;

  beforeEach(() => {
    const fareRules = [
      {
        fareId: '1_160',
        routeId: '1ゆめタウン線',
        originId: '1001002-01',
        destinationId: '1005023-20',
        containsId: null
      },
      {
        fareId: '1_200',
        routeId: '2循環線',
        originId: null,
        destinationId: null,
        containsId: null
      },
      {
        fareId: '1_180',
        routeId: null,
        originId: '1001002-01',
        destinationId: '1005025-20',
        containsId: null
      }
    ];

    fareCalculator = new window.FareCalculator([], fareRules, []);
  });

  it('完全一致する運賃ルールを検索できる', () => {
    const result = fareCalculator.findFareRule(
      '1001002-01',
      '1005023-20',
      '1ゆめタウン線'
    );

    expect(result).not.toBeNull();
    expect(result.fareId).toBe('1_160');
  });

  it('route_idのみ一致する運賃ルールを検索できる', () => {
    const result = fareCalculator.findFareRule(
      '任意のバス停A',
      '任意のバス停B',
      '2循環線'
    );

    expect(result).not.toBeNull();
    expect(result.fareId).toBe('1_200');
  });

  it('origin_id + destination_idのみ一致する運賃ルールを検索できる', () => {
    const result = fareCalculator.findFareRule(
      '1001002-01',
      '1005025-20',
      '任意の路線'
    );

    expect(result).not.toBeNull();
    expect(result.fareId).toBe('1_180');
  });

  it('該当する運賃ルールが見つからない場合はnullを返す', () => {
    const result = fareCalculator.findFareRule(
      '存在しないバス停A',
      '存在しないバス停B',
      '存在しない路線'
    );

    expect(result).toBeNull();
  });
});

describe('FareCalculator - getFareAttributes()メソッド', () => {
  let fareCalculator;

  beforeEach(() => {
    const fareAttributes = [
      {
        fareId: '1_160',
        price: 160,
        currencyType: 'JPY',
        paymentMethod: 0,
        transfers: 0,
        agencyId: '3000020412015'
      }
    ];

    fareCalculator = new window.FareCalculator(fareAttributes, [], []);
  });

  it('運賃属性を正しく取得できる', () => {
    const result = fareCalculator.getFareAttributes('1_160');

    expect(result).not.toBeNull();
    expect(result.fareId).toBe('1_160');
    expect(result.price).toBe(160);
  });

  it('存在しない運賃IDの場合はnullを返す', () => {
    const result = fareCalculator.getFareAttributes('存在しない運賃ID');

    expect(result).toBeNull();
  });

  it('fareIdがnullの場合はnullを返す', () => {
    const result = fareCalculator.getFareAttributes(null);

    expect(result).toBeNull();
  });
});

describe('FareCalculator - updateData()メソッド', () => {
  it('データを更新できる', () => {
    const fareCalculator = new window.FareCalculator([], [], []);

    const newFareAttributes = [
      {
        fareId: '1_160',
        price: 160,
        currencyType: 'JPY',
        paymentMethod: 0,
        transfers: 0,
        agencyId: '3000020412015'
      }
    ];

    const newFareRules = [
      {
        fareId: '1_160',
        routeId: '1ゆめタウン線',
        originId: '1001002-01',
        destinationId: '1005023-20',
        containsId: null
      }
    ];

    const newRoutes = [
      {
        route_id: '1ゆめタウン線',
        route_long_name: 'ゆめタウン線',
        agency_id: '3000020412015'
      }
    ];

    fareCalculator.updateData(newFareAttributes, newFareRules, newRoutes);

    expect(fareCalculator.fareAttributes).toEqual(newFareAttributes);
    expect(fareCalculator.fareRules).toEqual(newFareRules);
    expect(fareCalculator.routes).toEqual(newRoutes);

    // インデックスも再作成されていることを確認
    const result = fareCalculator.calculateFare(
      '1001002-01',
      '1005023-20',
      '1ゆめタウン線'
    );

    expect(result).not.toBeNull();
    expect(result.adultFare).toBe(160);
  });
});

