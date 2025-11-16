/**
 * fare_rules.txt読み込み機能の統合テスト
 * 実際のGTFSデータを使用してfare_rules.txtが正しく読み込まれるかテストする
 */

import { describe, it, expect, beforeEach } from 'vitest';
import '../js/data-loader.js';

describe('DataLoader - fare_rules.txt統合テスト', () => {
  let dataLoader;

  beforeEach(() => {
    dataLoader = new window.DataLoader();
    dataLoader.setDebugMode(true);
  });

  it('実際のGTFSデータからfare_rules.txtを読み込める', async () => {
    // loadFares()を呼び出してfare_rules.txtも読み込む
    const fares = await dataLoader.loadFares();

    // faresが読み込まれていることを確認
    expect(fares).toBeDefined();
    expect(Array.isArray(fares)).toBe(true);

    // fareRulesが読み込まれていることを確認
    expect(dataLoader.fareRules).toBeDefined();
    expect(Array.isArray(dataLoader.fareRules)).toBe(true);

    // fare_rules.txtにデータが含まれていることを確認
    if (dataLoader.fareRules.length > 0) {
      console.log(`fare_rules.txtから${dataLoader.fareRules.length}件のルールを読み込みました`);
      
      // 最初のルールの構造を確認
      const firstRule = dataLoader.fareRules[0];
      expect(firstRule).toHaveProperty('fareId');
      expect(firstRule).toHaveProperty('routeId');
      expect(firstRule).toHaveProperty('originId');
      expect(firstRule).toHaveProperty('destinationId');
      expect(firstRule).toHaveProperty('containsId');

      console.log('最初のfare_rule:', firstRule);
    } else {
      console.log('fare_rules.txtが存在しないか、空です');
    }
  }, 10000); // タイムアウトを10秒に設定

  it('loadFareRules()メソッドでfare_rulesを取得できる', async () => {
    const fareRules = await dataLoader.loadFareRules();

    expect(fareRules).toBeDefined();
    expect(Array.isArray(fareRules)).toBe(true);

    if (fareRules.length > 0) {
      console.log(`loadFareRules()から${fareRules.length}件のルールを取得しました`);
    }
  }, 10000);

  it('fare_rules.txtが存在しない場合でもエラーにならない', async () => {
    // fare_rules.txtが存在しない場合でも、loadFares()はエラーをスローしない
    await expect(dataLoader.loadFares()).resolves.toBeDefined();
  }, 10000);

  it('キャッシュが正しく動作する', async () => {
    // 1回目の読み込み
    await dataLoader.loadFares();
    const fareRules1 = dataLoader.fareRules;

    // 2回目の読み込み（キャッシュから）
    await dataLoader.loadFares();
    const fareRules2 = dataLoader.fareRules;

    // 同じオブジェクトが返されることを確認（キャッシュが使用された）
    expect(fareRules1).toBe(fareRules2);
  }, 10000);

  it('clearCache()でfareRulesキャッシュがクリアされる', async () => {
    // データを読み込み
    await dataLoader.loadFares();
    expect(dataLoader.fareRules).not.toBeNull();

    // キャッシュをクリア
    dataLoader.clearCache();
    expect(dataLoader.fareRules).toBeNull();
  }, 10000);
});
