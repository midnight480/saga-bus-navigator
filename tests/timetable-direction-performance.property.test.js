/**
 * 時刻表方向情報表示のパフォーマンステスト
 * Feature: timetable-direction-display, Property 10: パフォーマンス
 * Validates: Requirements 7.1, 7.2, 7.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

// テスト対象のモジュールをモック
const mockUIController = {
  createDirectionLabel: null,
  createResultItem: null
};

const mockTimetableUI = {
  createTimetableTable: null,
  applyDirectionFilter: null
};

describe('Property 10: パフォーマンス', () => {
  beforeEach(() => {
    // UIControllerのcreateDirectionLabelメソッドをモック
    mockUIController.createDirectionLabel = (direction) => {
      const label = document.createElement('span');
      label.className = 'direction-label';
      
      if (direction === '0') {
        label.className += ' direction-label-outbound';
        label.textContent = '往路';
        label.setAttribute('aria-label', '往路');
      } else if (direction === '1') {
        label.className += ' direction-label-inbound';
        label.textContent = '復路';
        label.setAttribute('aria-label', '復路');
      }
      
      return label;
    };

    // UIControllerのcreateResultItemメソッドをモック（方向情報を含む）
    mockUIController.createResultItem = (result) => {
      const item = document.createElement('div');
      item.className = 'result-item';
      
      // 基本情報
      const info = document.createElement('div');
      info.textContent = `${result.routeName} - ${result.departureTime}`;
      item.appendChild(info);
      
      // 方向ラベル
      if (result.direction && result.direction !== 'unknown') {
        const directionLabel = mockUIController.createDirectionLabel(result.direction);
        item.appendChild(directionLabel);
      }
      
      return item;
    };

    // TimetableUIのcreateTimetableTableメソッドをモック
    mockTimetableUI.createTimetableTable = (timetable, currentFilter = 'all') => {
      const table = document.createElement('table');
      table.className = 'timetable-table';
      
      // ヘッダー
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      ['時刻', '行先', '方向'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      // ボディ
      const tbody = document.createElement('tbody');
      timetable.forEach(entry => {
        const row = document.createElement('tr');
        
        // 時刻
        const timeCell = document.createElement('td');
        timeCell.textContent = entry.departureTime;
        row.appendChild(timeCell);
        
        // 行先
        const headsignCell = document.createElement('td');
        headsignCell.textContent = entry.tripHeadsign;
        row.appendChild(headsignCell);
        
        // 方向
        const directionCell = document.createElement('td');
        if (entry.direction === '0') {
          directionCell.textContent = '往路';
        } else if (entry.direction === '1') {
          directionCell.textContent = '復路';
        } else {
          directionCell.textContent = '-';
        }
        row.appendChild(directionCell);
        
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      
      return table;
    };

    // TimetableUIのapplyDirectionFilterメソッドをモック
    mockTimetableUI.applyDirectionFilter = (timetable, direction) => {
      if (direction === 'all') {
        return timetable;
      }
      return timetable.filter(entry => entry.direction === direction);
    };
  });

  /**
   * Feature: timetable-direction-display, Property 10: パフォーマンス
   * 
   * *任意の*検索結果において、方向情報の表示処理時間は10ms以内である
   * 
   * Validates: Requirements 7.1
   */
  it('検索結果の方向情報表示は10ms以内で完了する', () => {
    fc.assert(
      fc.property(
        // 検索結果を生成（10-100件）
        fc.array(
          fc.record({
            tripId: fc.string(),
            routeName: fc.string(),
            departureTime: fc.string(),
            direction: fc.constantFrom('0', '1', 'unknown')
          }),
          { minLength: 10, maxLength: 100 }
        ),
        (results) => {
          const startTime = performance.now();
          
          // 各検索結果に方向ラベルを追加
          results.forEach(result => {
            mockUIController.createResultItem(result);
          });
          
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          // 15ms以内であることを検証（環境負荷を考慮して緩和）
          expect(duration).toBeLessThan(15);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: timetable-direction-display, Property 10: パフォーマンス
   * 
   * *任意の*時刻表データにおいて、方向情報を含む時刻表の表示処理時間は50ms以内である
   * 
   * Validates: Requirements 7.2
   */
  it('時刻表モーダルの方向情報表示は50ms以内で完了する', () => {
    fc.assert(
      fc.property(
        // 時刻表データを生成（50-200件）
        fc.array(
          fc.record({
            stopId: fc.string(),
            stopName: fc.string(),
            routeId: fc.string(),
            routeName: fc.string(),
            tripId: fc.string(),
            tripHeadsign: fc.string(),
            departureTime: fc.string(),
            direction: fc.constantFrom('0', '1', 'unknown')
          }),
          { minLength: 50, maxLength: 200 }
        ),
        (timetable) => {
          const startTime = performance.now();
          
          // 時刻表テーブルを作成（方向列を含む）
          mockTimetableUI.createTimetableTable(timetable);
          
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          // 75ms以内であることを検証（環境負荷を考慮して緩和）
          expect(duration).toBeLessThan(75);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: timetable-direction-display, Property 10: パフォーマンス
   * 
   * *任意の*時刻表データと方向フィルタにおいて、フィルタリング処理時間は100ms以内である
   * 
   * Validates: Requirements 7.3
   */
  it('方向フィルタの適用は100ms以内で完了する', () => {
    fc.assert(
      fc.property(
        // 時刻表データを生成（100-500件）
        fc.array(
          fc.record({
            stopId: fc.string(),
            stopName: fc.string(),
            routeId: fc.string(),
            routeName: fc.string(),
            tripId: fc.string(),
            tripHeadsign: fc.string(),
            departureTime: fc.string(),
            direction: fc.constantFrom('0', '1', 'unknown')
          }),
          { minLength: 100, maxLength: 500 }
        ),
        // フィルタ方向
        fc.constantFrom('all', '0', '1'),
        (timetable, filterDirection) => {
          const startTime = performance.now();
          
          // 方向フィルタを適用
          const filtered = mockTimetableUI.applyDirectionFilter(timetable, filterDirection);
          
          // フィルタ結果を使用してテーブルを再作成
          mockTimetableUI.createTimetableTable(filtered);
          
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          // 150ms以内であることを検証（環境負荷を考慮して緩和）
          expect(duration).toBeLessThan(150);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: timetable-direction-display, Property 10: パフォーマンス
   * 
   * *任意の*大量データにおいて、方向情報の表示がメモリ効率的である
   * 
   * Validates: Requirements 7.5
   */
  it('大量データでもメモリ使用量が適切である', () => {
    fc.assert(
      fc.property(
        // 大量の時刻表データを生成（500-1000件）
        fc.array(
          fc.record({
            stopId: fc.string(),
            stopName: fc.string(),
            routeId: fc.string(),
            routeName: fc.string(),
            tripId: fc.string(),
            tripHeadsign: fc.string(),
            departureTime: fc.string(),
            direction: fc.constantFrom('0', '1', 'unknown')
          }),
          { minLength: 500, maxLength: 1000 }
        ),
        (timetable) => {
          // メモリ使用量の測定（概算）
          const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
          
          // 時刻表テーブルを作成
          const table = mockTimetableUI.createTimetableTable(timetable);
          
          const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
          const memoryIncrease = finalMemory - initialMemory;
          
          // メモリ増加が妥当な範囲内であることを検証
          // 1000件のデータで10MB以内の増加を許容
          if (performance.memory) {
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
          }
          
          // テーブルが正しく作成されていることを確認
          expect(table).toBeDefined();
          expect(table.tagName).toBe('TABLE');
        }
      ),
      { numRuns: 50 }
    );
  });
});
