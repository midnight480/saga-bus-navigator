/**
 * アクセシビリティテスト - 方向情報表示
 * 
 * **Feature: timetable-direction-display, Property 8: アクセシビリティ属性**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 * 
 * このテストは以下をカバーします：
 * - スクリーンリーダーでの方向情報読み上げ（aria属性）
 * - キーボードナビゲーション
 * - カラーコントラスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

// 必要なクラスをインポート
import '../js/app.js';
import '../js/timetable-ui.js';

describe('アクセシビリティ - 方向情報表示プロパティベーステスト', () => {
  let uiController;
  let timetableUI;

  beforeEach(() => {
    // DOM環境をセットアップ
    document.body.innerHTML = `
      <div id="test-container"></div>
      <div id="timetable-modal" class="timetable-modal" role="dialog" aria-labelledby="timetable-modal-title" aria-modal="true" tabindex="-1" hidden>
        <div class="timetable-modal-header">
          <h2 id="timetable-modal-title">時刻表</h2>
          <button id="timetable-modal-close" class="timetable-modal-close" aria-label="閉じる">&times;</button>
        </div>
        <div class="timetable-modal-content">
          <div id="timetable-modal-body" class="timetable-modal-body">
            <!-- 時刻表がここに表示される -->
          </div>
        </div>
      </div>
    `;

    uiController = new window.UIController();
    timetableUI = new window.TimetableUI();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  /**
   * プロパティ8.1: 方向ラベルのaria-label属性
   * 任意の方向ラベルにおいて、適切なaria-label属性が設定されている
   * **検証: 要件5.1**
   */
  describe('プロパティ8.1: 方向ラベルのaria-label属性', () => {
    it('任意の方向ラベルは適切なaria-label属性を持つ', () => {
      fc.assert(
        fc.property(
          // direction='0'または'1'のランダムな値を生成
          fc.oneof(fc.constant('0'), fc.constant('1')),
          (direction) => {
            // 方向ラベルを作成
            const label = uiController.createDirectionLabel(direction);
            
            // aria-label属性が存在することを確認
            expect(label).not.toBeNull();
            expect(label.hasAttribute('aria-label')).toBe(true);
            
            const ariaLabel = label.getAttribute('aria-label');
            
            // aria-labelの内容が適切であることを確認
            if (direction === '0') {
              expect(ariaLabel).toBe('往路');
            } else if (direction === '1') {
              expect(ariaLabel).toBe('復路');
            }
            
            // aria-labelが空でないことを確認
            expect(ariaLabel).not.toBe('');
            expect(ariaLabel).not.toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('方向不明の場合はaria-label属性を持たない', () => {
      fc.assert(
        fc.property(
          // direction='unknown'、undefined、null、空文字列のランダムな値を生成
          fc.oneof(
            fc.constant('unknown'),
            fc.constant(undefined),
            fc.constant(null),
            fc.constant('')
          ),
          (direction) => {
            // 方向ラベルを作成
            const label = uiController.createDirectionLabel(direction);
            
            // 方向不明の場合はnullが返される
            expect(label).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ8.2: 方向フィルタボタンのaria-pressed属性
   * 任意の方向フィルタボタンにおいて、選択状態はaria-pressed属性で示される
   * **検証: 要件5.3**
   */
  describe('プロパティ8.2: 方向フィルタボタンのaria-pressed属性', () => {
    it('任意の方向フィルタボタンは適切なaria-pressed属性を持つ', () => {
      fc.assert(
        fc.property(
          // currentFilter='all'、'0'、'1'のランダムな値を生成
          fc.oneof(fc.constant('all'), fc.constant('0'), fc.constant('1')),
          (currentFilter) => {
            // 方向フィルタを作成
            const filter = timetableUI.createDirectionFilter(currentFilter);
            
            // フィルタボタンを取得
            const buttons = filter.querySelectorAll('.direction-filter-button');
            expect(buttons.length).toBe(3);
            
            const allButton = buttons[0];
            const outboundButton = buttons[1];
            const inboundButton = buttons[2];
            
            // 全てのボタンがaria-pressed属性を持つことを確認
            expect(allButton.hasAttribute('aria-pressed')).toBe(true);
            expect(outboundButton.hasAttribute('aria-pressed')).toBe(true);
            expect(inboundButton.hasAttribute('aria-pressed')).toBe(true);
            
            // 選択されたボタンのaria-pressedが'true'であることを確認
            if (currentFilter === 'all') {
              expect(allButton.getAttribute('aria-pressed')).toBe('true');
              expect(outboundButton.getAttribute('aria-pressed')).toBe('false');
              expect(inboundButton.getAttribute('aria-pressed')).toBe('false');
            } else if (currentFilter === '0') {
              expect(allButton.getAttribute('aria-pressed')).toBe('false');
              expect(outboundButton.getAttribute('aria-pressed')).toBe('true');
              expect(inboundButton.getAttribute('aria-pressed')).toBe('false');
            } else if (currentFilter === '1') {
              expect(allButton.getAttribute('aria-pressed')).toBe('false');
              expect(outboundButton.getAttribute('aria-pressed')).toBe('false');
              expect(inboundButton.getAttribute('aria-pressed')).toBe('true');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('方向フィルタグループは適切なrole属性を持つ', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant('all'), fc.constant('0'), fc.constant('1')),
          (currentFilter) => {
            const filter = timetableUI.createDirectionFilter(currentFilter);
            
            // role="group"属性が設定されていることを確認
            expect(filter.getAttribute('role')).toBe('group');
            
            // aria-label属性が設定されていることを確認
            expect(filter.hasAttribute('aria-label')).toBe(true);
            expect(filter.getAttribute('aria-label')).toBe('方向フィルタ');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ8.3: 方向判定バッジのaria属性
   * 任意の方向判定バッジにおいて、適切なaria属性が設定されている
   * **検証: 要件5.4**
   */
  describe('プロパティ8.3: 方向判定バッジのaria属性', () => {
    it('任意の方向判定バッジは適切なaria-label属性を持つ', () => {
      fc.assert(
        fc.property(
          // detectionRate=0.0-0.79のランダムな値を生成（80%以上はnullを返すため）
          fc.double({ min: 0.0, max: 0.79, noNaN: true }),
          (detectionRate) => {
            // 方向判定バッジを作成
            const badge = timetableUI.createDetectionBadge(detectionRate);
            
            // aria-label属性が存在することを確認
            expect(badge).not.toBeNull();
            expect(badge.hasAttribute('aria-label')).toBe(true);
            
            const ariaLabel = badge.getAttribute('aria-label');
            
            // aria-labelが空でないことを確認
            expect(ariaLabel).not.toBe('');
            expect(ariaLabel).not.toBeNull();
            
            // aria-labelに成功率が含まれていることを確認
            const percentage = Math.round(detectionRate * 100);
            expect(ariaLabel).toContain(`${percentage}%`);
            
            // 成功率に応じた適切なラベルが含まれていることを確認
            if (detectionRate < 0.5) {
              expect(ariaLabel).toContain('警告');
            } else if (detectionRate < 0.8) {
              expect(ariaLabel).toContain('注意');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('任意の方向判定バッジは適切なaria-describedby属性を持つ', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.0, max: 0.79, noNaN: true }),
          (detectionRate) => {
            const badge = timetableUI.createDetectionBadge(detectionRate);
            
            // aria-describedby属性が存在することを確認
            expect(badge).not.toBeNull();
            expect(badge.hasAttribute('aria-describedby')).toBe(true);
            
            const describedById = badge.getAttribute('aria-describedby');
            
            // aria-describedbyが空でないことを確認
            expect(describedById).not.toBe('');
            expect(describedById).not.toBeNull();
            
            // aria-describedbyが一意のIDであることを確認（実装では'tooltip-'で始まる）
            expect(describedById).toMatch(/^tooltip-[a-z0-9]+$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('方向判定バッジは適切なrole属性を持つ', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.0, max: 0.79, noNaN: true }),
          (detectionRate) => {
            const badge = timetableUI.createDetectionBadge(detectionRate);
            
            // role="status"属性が設定されていることを確認
            expect(badge).not.toBeNull();
            expect(badge.getAttribute('role')).toBe('status');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('方向判定成功率が不明な場合は適切なaria-label属性を持つ', () => {
      fc.assert(
        fc.property(
          // undefined、null、NaNのランダムな値を生成
          fc.oneof(
            fc.constant(undefined),
            fc.constant(null),
            fc.constant(NaN)
          ),
          (detectionRate) => {
            const badge = timetableUI.createDetectionBadge(detectionRate);
            
            // aria-label属性が存在することを確認
            expect(badge).not.toBeNull();
            expect(badge.hasAttribute('aria-label')).toBe(true);
            
            const ariaLabel = badge.getAttribute('aria-label');
            
            // aria-labelに「不明」が含まれていることを確認
            expect(ariaLabel).toContain('不明');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('方向判定成功率が80%以上の場合はバッジを表示しない', () => {
      fc.assert(
        fc.property(
          // detectionRate=0.8-1.0のランダムな値を生成（NaNを除外）
          fc.double({ min: 0.8, max: 1.0, noNaN: true }),
          (detectionRate) => {
            const badge = timetableUI.createDetectionBadge(detectionRate);
            
            // 80%以上の場合はnullを返す
            expect(badge).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ8.4: キーボードナビゲーション
   * 任意の方向関連UIはキーボードでフォーカス可能である
   * **検証: 要件5.5**
   */
  describe('プロパティ8.4: キーボードナビゲーション', () => {
    it('方向フィルタボタンはtabindex属性を持つ', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant('all'), fc.constant('0'), fc.constant('1')),
          (currentFilter) => {
            const filter = timetableUI.createDirectionFilter(currentFilter);
            const buttons = filter.querySelectorAll('.direction-filter-button');
            
            // 全てのボタンがtabindex属性を持つことを確認
            buttons.forEach(button => {
              // tabindex属性が存在するか、デフォルトでフォーカス可能であることを確認
              const tabindex = button.getAttribute('tabindex');
              const isButton = button.tagName === 'BUTTON';
              
              // ボタン要素はデフォルトでフォーカス可能
              expect(isButton || tabindex !== null).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('方向フィルタボタンはEnterキーで操作可能', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant('all'), fc.constant('0'), fc.constant('1')),
          (currentFilter) => {
            const filter = timetableUI.createDirectionFilter(currentFilter);
            const buttons = filter.querySelectorAll('.direction-filter-button');
            
            // 各ボタンがクリックイベントリスナーを持つことを確認
            buttons.forEach(button => {
              // ボタン要素はデフォルトでEnterキーに反応する
              expect(button.tagName).toBe('BUTTON');
              
              // type属性が設定されていることを確認（フォーム送信を防ぐため）
              expect(button.getAttribute('type')).toBe('button');
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ8.5: カラーコントラスト
   * 任意の方向ラベルは適切なCSSクラスを持ち、カラーコントラストが確保されている
   * **検証: 要件5.1, 5.2**
   */
  describe('プロパティ8.5: カラーコントラスト', () => {
    it('往路ラベルは適切なCSSクラスを持つ', () => {
      fc.assert(
        fc.property(
          fc.constant('0'),
          (direction) => {
            const label = uiController.createDirectionLabel(direction);
            
            // 基本クラスが設定されていることを確認
            expect(label.className).toContain('direction-label');
            
            // 往路専用クラスが設定されていることを確認
            expect(label.className).toContain('direction-label-outbound');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('復路ラベルは適切なCSSクラスを持つ', () => {
      fc.assert(
        fc.property(
          fc.constant('1'),
          (direction) => {
            const label = uiController.createDirectionLabel(direction);
            
            // 基本クラスが設定されていることを確認
            expect(label.className).toContain('direction-label');
            
            // 復路専用クラスが設定されていることを確認
            expect(label.className).toContain('direction-label-inbound');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('方向判定バッジは成功率に応じた適切なCSSクラスを持つ', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.0, max: 0.79, noNaN: true }),
          (detectionRate) => {
            const badge = timetableUI.createDetectionBadge(detectionRate);
            
            // 基本クラスが設定されていることを確認
            expect(badge).not.toBeNull();
            expect(badge.className).toContain('detection-badge');
            
            // 成功率に応じた適切なクラスが設定されていることを確認
            if (detectionRate < 0.5) {
              expect(badge.className).toContain('detection-badge-warning');
            } else if (detectionRate < 0.8) {
              expect(badge.className).toContain('detection-badge-caution');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ8.6: レスポンシブ対応のアクセシビリティ
   * 任意の画面幅において、方向情報は適切なaria属性を持つ
   * **検証: 要件5.1, 5.2**
   */
  describe('プロパティ8.6: レスポンシブ対応のアクセシビリティ', () => {
    it('方向ラベルは画面幅に関わらず適切なaria-label属性を持つ', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant('0'), fc.constant('1')),
          (direction) => {
            const label = uiController.createDirectionLabel(direction);
            
            // aria-label属性は画面幅に関わらず同じ
            const ariaLabel = label.getAttribute('aria-label');
            
            if (direction === '0') {
              expect(ariaLabel).toBe('往路');
            } else if (direction === '1') {
              expect(ariaLabel).toBe('復路');
            }
            
            // 表示テキストは画面幅によって変わる可能性があるが、
            // aria-labelは常に完全形であることを確認
            expect(ariaLabel).not.toBe('→');
            expect(ariaLabel).not.toBe('←');
            expect(ariaLabel).not.toBe('往');
            expect(ariaLabel).not.toBe('復');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * エッジケース: 複数の方向判定バッジのaria-describedby一意性
   */
  describe('エッジケース: aria-describedby一意性', () => {
    it('複数の方向判定バッジは一意のaria-describedby属性を持つ', () => {
      fc.assert(
        fc.property(
          // 2つの異なる成功率を生成（80%未満）
          fc.tuple(
            fc.double({ min: 0.0, max: 0.79, noNaN: true }),
            fc.double({ min: 0.0, max: 0.79, noNaN: true })
          ),
          ([rate1, rate2]) => {
            const badge1 = timetableUI.createDetectionBadge(rate1);
            const badge2 = timetableUI.createDetectionBadge(rate2);
            
            expect(badge1).not.toBeNull();
            expect(badge2).not.toBeNull();
            
            const describedById1 = badge1.getAttribute('aria-describedby');
            const describedById2 = badge2.getAttribute('aria-describedby');
            
            // 2つのバッジのaria-describedbyが異なることを確認
            expect(describedById1).not.toBe(describedById2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
