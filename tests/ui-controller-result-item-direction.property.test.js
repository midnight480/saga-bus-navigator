/**
 * UIController - createResultItem()の方向表示プロパティベーステスト
 * 
 * **Feature: timetable-direction-display, Property 1: 検索結果の方向ラベル表示**
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 * 
 * **Feature: timetable-direction-display, Property 2: 方向不明時のラベル非表示**
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

// UIControllerクラスをインポート
import '../js/app.js';

describe('UIController - createResultItem() 方向表示プロパティベーステスト', () => {
  let uiController;

  beforeEach(() => {
    // UIControllerのインスタンスを作成
    uiController = new window.UIController();
  });

  /**
   * プロパティ1: 検索結果の方向ラベル表示
   * 任意の検索結果において、direction='0'または'1'の便は対応する方向ラベルを持つ
   */
  describe('プロパティ1: 検索結果の方向ラベル表示', () => {
    it('direction="0"または"1"の検索結果は対応する方向ラベルを持つ', () => {
      fc.assert(
        fc.property(
          // direction='0'または'1'のランダムな検索結果を生成
          fc.record({
            tripId: fc.string({ minLength: 1, maxLength: 20 }),
            routeNumber: fc.string({ minLength: 1, maxLength: 10 }),
            routeName: fc.string({ minLength: 1, maxLength: 50 }),
            operator: fc.oneof(fc.constant('佐賀市営バス'), fc.constant('祐徳バス'), fc.constant('西鉄バス')),
            departureStop: fc.string({ minLength: 1, maxLength: 30 }),
            arrivalStop: fc.string({ minLength: 1, maxLength: 30 }),
            departureTime: fc.string({ minLength: 5, maxLength: 5 }), // HH:MM形式
            arrivalTime: fc.string({ minLength: 5, maxLength: 5 }), // HH:MM形式
            duration: fc.integer({ min: 1, max: 180 }),
            adultFare: fc.integer({ min: 100, max: 1000 }),
            childFare: fc.integer({ min: 50, max: 500 }),
            weekdayType: fc.oneof(fc.constant('平日'), fc.constant('土日祝')),
            viaStops: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 30 }),
                time: fc.string({ minLength: 5, maxLength: 5 })
              }),
              { maxLength: 5 }
            ),
            tripHeadsign: fc.string({ minLength: 0, maxLength: 50 }),
            direction: fc.oneof(fc.constant('0'), fc.constant('1')) // '0'または'1'のみ
          }),
          (result) => {
            // 検索結果アイテムを生成
            const listItem = uiController.createResultItem(result);
            
            // 方向ラベルが存在することを確認
            const directionLabel = listItem.querySelector('.direction-label');
            expect(directionLabel).not.toBeNull();
            
            // direction='0'の場合は往路ラベル
            if (result.direction === '0') {
              expect(directionLabel.className).toContain('direction-label-outbound');
              expect(directionLabel.getAttribute('aria-label')).toBe('往路');
            }
            
            // direction='1'の場合は復路ラベル
            if (result.direction === '1') {
              expect(directionLabel.className).toContain('direction-label-inbound');
              expect(directionLabel.getAttribute('aria-label')).toBe('復路');
            }
          }
        ),
        { numRuns: 100 } // 100回のテストを実行
      );
    });
  });

  /**
   * プロパティ2: 方向不明時のラベル非表示
   * 任意の検索結果において、direction='unknown'の便は方向ラベルを持たない
   */
  describe('プロパティ2: 方向不明時のラベル非表示', () => {
    it('direction="unknown"の検索結果は方向ラベルを持たない', () => {
      fc.assert(
        fc.property(
          // direction='unknown'のランダムな検索結果を生成
          fc.record({
            tripId: fc.string({ minLength: 1, maxLength: 20 }),
            routeNumber: fc.string({ minLength: 1, maxLength: 10 }),
            routeName: fc.string({ minLength: 1, maxLength: 50 }),
            operator: fc.oneof(fc.constant('佐賀市営バス'), fc.constant('祐徳バス'), fc.constant('西鉄バス')),
            departureStop: fc.string({ minLength: 1, maxLength: 30 }),
            arrivalStop: fc.string({ minLength: 1, maxLength: 30 }),
            departureTime: fc.string({ minLength: 5, maxLength: 5 }), // HH:MM形式
            arrivalTime: fc.string({ minLength: 5, maxLength: 5 }), // HH:MM形式
            duration: fc.integer({ min: 1, max: 180 }),
            adultFare: fc.integer({ min: 100, max: 1000 }),
            childFare: fc.integer({ min: 50, max: 500 }),
            weekdayType: fc.oneof(fc.constant('平日'), fc.constant('土日祝')),
            viaStops: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 30 }),
                time: fc.string({ minLength: 5, maxLength: 5 })
              }),
              { maxLength: 5 }
            ),
            tripHeadsign: fc.string({ minLength: 0, maxLength: 50 }),
            direction: fc.constant('unknown') // 'unknown'のみ
          }),
          (result) => {
            // 検索結果アイテムを生成
            const listItem = uiController.createResultItem(result);
            
            // 方向ラベルが存在しないことを確認
            const directionLabel = listItem.querySelector('.direction-label');
            expect(directionLabel).toBeNull();
          }
        ),
        { numRuns: 100 } // 100回のテストを実行
      );
    });

    it('directionがundefined、null、または空文字列の検索結果は方向ラベルを持たない', () => {
      fc.assert(
        fc.property(
          // directionがundefined、null、または空文字列のランダムな検索結果を生成
          fc.record({
            tripId: fc.string({ minLength: 1, maxLength: 20 }),
            routeNumber: fc.string({ minLength: 1, maxLength: 10 }),
            routeName: fc.string({ minLength: 1, maxLength: 50 }),
            operator: fc.oneof(fc.constant('佐賀市営バス'), fc.constant('祐徳バス'), fc.constant('西鉄バス')),
            departureStop: fc.string({ minLength: 1, maxLength: 30 }),
            arrivalStop: fc.string({ minLength: 1, maxLength: 30 }),
            departureTime: fc.string({ minLength: 5, maxLength: 5 }), // HH:MM形式
            arrivalTime: fc.string({ minLength: 5, maxLength: 5 }), // HH:MM形式
            duration: fc.integer({ min: 1, max: 180 }),
            adultFare: fc.integer({ min: 100, max: 1000 }),
            childFare: fc.integer({ min: 50, max: 500 }),
            weekdayType: fc.oneof(fc.constant('平日'), fc.constant('土日祝')),
            viaStops: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 30 }),
                time: fc.string({ minLength: 5, maxLength: 5 })
              }),
              { maxLength: 5 }
            ),
            tripHeadsign: fc.string({ minLength: 0, maxLength: 50 }),
            direction: fc.oneof(
              fc.constant(undefined),
              fc.constant(null),
              fc.constant('')
            )
          }),
          (result) => {
            // 検索結果アイテムを生成
            const listItem = uiController.createResultItem(result);
            
            // 方向ラベルが存在しないことを確認
            const directionLabel = listItem.querySelector('.direction-label');
            expect(directionLabel).toBeNull();
          }
        ),
        { numRuns: 100 } // 100回のテストを実行
      );
    });
  });

  /**
   * エッジケース: 方向ラベルの位置とスタイル
   */
  describe('エッジケース: 方向ラベルの位置とスタイル', () => {
    it('方向ラベルは路線名の後に配置される', () => {
      const result = {
        tripId: 'test-trip-1',
        routeNumber: '1',
        routeName: 'テスト路線',
        operator: '佐賀市営バス',
        departureStop: 'バス停A',
        arrivalStop: 'バス停B',
        departureTime: '10:00',
        arrivalTime: '10:30',
        duration: 30,
        adultFare: 200,
        childFare: 100,
        weekdayType: '平日',
        viaStops: [],
        tripHeadsign: 'テスト行き',
        direction: '0'
      };

      const listItem = uiController.createResultItem(result);
      const routeDiv = listItem.querySelector('.result-route');
      const directionLabel = routeDiv.querySelector('.direction-label');

      // 方向ラベルが路線名の後に配置されていることを確認
      expect(directionLabel).not.toBeNull();
      expect(directionLabel.parentElement).toBe(routeDiv);
    });

    it('方向ラベルは適切なCSSクラスを持つ', () => {
      const resultOutbound = {
        tripId: 'test-trip-1',
        routeNumber: '1',
        routeName: 'テスト路線',
        operator: '佐賀市営バス',
        departureStop: 'バス停A',
        arrivalStop: 'バス停B',
        departureTime: '10:00',
        arrivalTime: '10:30',
        duration: 30,
        adultFare: 200,
        childFare: 100,
        weekdayType: '平日',
        viaStops: [],
        tripHeadsign: 'テスト行き',
        direction: '0'
      };

      const resultInbound = {
        ...resultOutbound,
        direction: '1'
      };

      const listItemOutbound = uiController.createResultItem(resultOutbound);
      const listItemInbound = uiController.createResultItem(resultInbound);

      const directionLabelOutbound = listItemOutbound.querySelector('.direction-label');
      const directionLabelInbound = listItemInbound.querySelector('.direction-label');

      // 往路ラベルのCSSクラス
      expect(directionLabelOutbound.className).toContain('direction-label');
      expect(directionLabelOutbound.className).toContain('direction-label-outbound');

      // 復路ラベルのCSSクラス
      expect(directionLabelInbound.className).toContain('direction-label');
      expect(directionLabelInbound.className).toContain('direction-label-inbound');
    });
  });
});
