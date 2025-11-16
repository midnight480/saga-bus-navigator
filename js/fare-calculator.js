/**
 * FareCalculatorクラス
 * 運賃計算ロジックを担当
 */
class FareCalculator {
  /**
   * コンストラクタ
   * @param {Array} fareAttributes - fare_attributes.txtから読み込んだ運賃属性データ
   * @param {Array} fareRules - fare_rules.txtから読み込んだ運賃ルールデータ
   * @param {Array} routes - routes.txtから読み込んだ路線データ
   */
  constructor(fareAttributes = [], fareRules = [], routes = []) {
    this.fareAttributes = fareAttributes;
    this.fareRules = fareRules;
    this.routes = routes;
    
    // 検索最適化のためのインデックスを作成
    this.fareAttributesIndex = this.createFareAttributesIndex(fareAttributes);
    this.fareRulesIndex = this.createFareRulesIndex(fareRules);
  }

  /**
   * 運賃を計算
   * @param {string} originStopId - 乗車バス停ID
   * @param {string} destinationStopId - 降車バス停ID
   * @param {string} routeId - 路線ID
   * @returns {Object|null} { adultFare: number, childFare: number } または null
   */
  calculateFare(originStopId, destinationStopId, routeId) {
    // 入力値の検証
    if (!originStopId || !destinationStopId || !routeId) {
      console.warn('FareCalculator: 必須パラメータが不足しています', {
        originStopId,
        destinationStopId,
        routeId
      });
      return null;
    }

    // 同一バス停間の運賃計算（境界値ケース）
    if (originStopId === destinationStopId) {
      console.warn('FareCalculator: 同一バス停間の運賃計算はサポートされていません');
      return null;
    }

    // fare_rules.txtから該当するルールを検索
    const fareRule = this.findFareRule(originStopId, destinationStopId, routeId);
    
    if (!fareRule) {
      console.warn('FareCalculator: 該当する運賃ルールが見つかりません', {
        originStopId,
        destinationStopId,
        routeId
      });
      return null;
    }

    // fare_attributes.txtから運賃情報を取得
    const fareAttribute = this.getFareAttributes(fareRule.fareId);
    
    if (!fareAttribute) {
      console.warn('FareCalculator: 該当する運賃情報が見つかりません', {
        fareId: fareRule.fareId
      });
      return null;
    }

    // 運賃を返す
    const adultFare = parseFloat(fareAttribute.price);
    const childFare = Math.floor(adultFare / 2); // 小児運賃は大人の半額（端数切り捨て）

    return {
      adultFare,
      childFare
    };
  }

  /**
   * fare_rules.txtから該当するルールを検索
   * @param {string} originStopId - 乗車バス停ID
   * @param {string} destinationStopId - 降車バス停ID
   * @param {string} routeId - 路線ID
   * @returns {Object|null} fare_rule または null
   */
  findFareRule(originStopId, destinationStopId, routeId) {
    // インデックスを使用して高速検索
    const key = `${routeId}_${originStopId}_${destinationStopId}`;
    
    if (this.fareRulesIndex[key]) {
      return this.fareRulesIndex[key];
    }

    // インデックスに見つからない場合は、より柔軟な検索を実施
    // 1. route_id + origin_id + destination_id が完全一致
    let matchedRule = this.fareRules.find(rule => 
      rule.routeId === routeId &&
      rule.originId === originStopId &&
      rule.destinationId === destinationStopId
    );

    if (matchedRule) {
      return matchedRule;
    }

    // 2. route_id のみ一致（origin_id, destination_id が null）
    matchedRule = this.fareRules.find(rule => 
      rule.routeId === routeId &&
      !rule.originId &&
      !rule.destinationId
    );

    if (matchedRule) {
      return matchedRule;
    }

    // 3. origin_id + destination_id のみ一致（route_id が null）
    matchedRule = this.fareRules.find(rule => 
      !rule.routeId &&
      rule.originId === originStopId &&
      rule.destinationId === destinationStopId
    );

    if (matchedRule) {
      return matchedRule;
    }

    // 4. contains_id を使用したゾーン運賃（将来的に対応）
    // 現時点では未実装

    return null;
  }

  /**
   * fare_attributes.txtから運賃情報を取得
   * @param {string} fareId - 運賃ID
   * @returns {Object|null} { price: number, currency_type: string } または null
   */
  getFareAttributes(fareId) {
    if (!fareId) {
      return null;
    }

    // インデックスを使用して高速検索
    return this.fareAttributesIndex[fareId] || null;
  }

  /**
   * fare_attributes用のインデックスを作成
   * @param {Array} fareAttributes - fare_attributes.txtのデータ
   * @returns {Object} fareId をキーとするインデックス
   */
  createFareAttributesIndex(fareAttributes) {
    const index = {};
    fareAttributes.forEach(fare => {
      if (fare.fareId) {
        index[fare.fareId] = fare;
      }
    });
    return index;
  }

  /**
   * fare_rules用のインデックスを作成
   * @param {Array} fareRules - fare_rules.txtのデータ
   * @returns {Object} route_id + origin_id + destination_id をキーとするインデックス
   */
  createFareRulesIndex(fareRules) {
    const index = {};
    fareRules.forEach(rule => {
      if (rule.routeId && rule.originId && rule.destinationId) {
        const key = `${rule.routeId}_${rule.originId}_${rule.destinationId}`;
        index[key] = rule;
      }
    });
    return index;
  }

  /**
   * データを更新
   * @param {Array} fareAttributes - 新しい運賃属性データ
   * @param {Array} fareRules - 新しい運賃ルールデータ
   * @param {Array} routes - 新しい路線データ
   */
  updateData(fareAttributes, fareRules, routes) {
    this.fareAttributes = fareAttributes;
    this.fareRules = fareRules;
    this.routes = routes;
    
    // インデックスを再作成
    this.fareAttributesIndex = this.createFareAttributesIndex(fareAttributes);
    this.fareRulesIndex = this.createFareRulesIndex(fareRules);
  }
}

// グローバルに公開
window.FareCalculator = FareCalculator;
