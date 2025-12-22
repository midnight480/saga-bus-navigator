/**
 * バス停マッピングフォールバックのプロパティベーステスト
 * **Feature: multilingual-support, Property 6: バス停マッピングのフォールバック**
 * **Validates: Requirements 6.4**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

// BusStopTranslatorクラスをインポート
const { createRequire } = await import('module');
const require = createRequire(import.meta.url);
const BusStopTranslator = require('../js/i18n/bus-stop-translator.js');

describe('バス停マッピングフォールバックのプロパティテスト', () => {
  let translator;

  beforeEach(() => {
    translator = new BusStopTranslator();
  });

  /**
   * プロパティ6: バス停マッピングのフォールバック
   * 任意のバス停名に対して、マッピングファイルに該当する翻訳が存在しない場合は
   * 元の日本語名が表示される
   */
  it('マッピングが存在しない場合は元の日本語名が返される', () => {
    fc.assert(
      fc.property(
        // 日本語バス停名のジェネレーター
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        // 他のバス停名のジェネレーター（マッピングに含まれるが、テスト対象とは異なる）
        fc.array(
          fc.record({
            japanese: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            english: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            source: fc.constantFrom('Mapped', 'Auto-translated')
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (targetStopName, otherMappings) => {
          // テスト対象のバス停名が他のマッピングに含まれていないことを確認
          const filteredMappings = otherMappings.filter(
            mapping => mapping.japanese !== targetStopName
          );

          // マッピングデータを読み込み（テスト対象のバス停名は含まれない）
          translator.loadMappingFromData(filteredMappings);

          // 翻訳を実行
          const translatedName = translator.translateStopName(targetStopName);
          const source = translator.getMappingSource(targetStopName);

          // 元の日本語名が返されることを確認
          expect(translatedName).toBe(targetStopName);
          expect(source).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('空のマッピングデータの場合は元の日本語名が返される', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (japaneseStopName) => {
          // 空のマッピングデータを読み込み
          translator.loadMappingFromData([]);

          const translatedName = translator.translateStopName(japaneseStopName);
          const source = translator.getMappingSource(japaneseStopName);

          expect(translatedName).toBe(japaneseStopName);
          expect(source).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('無効な入力に対して適切にフォールバックする', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(''),
          fc.constant('   '), // 空白のみ
          fc.integer(), // 数値
          fc.object() // オブジェクト
        ),
        (invalidInput) => {
          // 何らかのマッピングデータを読み込み
          translator.loadMappingFromData([
            {
              japanese: '有効なバス停',
              english: 'Valid Bus Stop',
              source: 'Mapped'
            }
          ]);

          const translatedName = translator.translateStopName(invalidInput);

          // 無効な入力に対しては元の値または空文字列が返される
          if (invalidInput === null || invalidInput === undefined) {
            expect(translatedName).toBe('');
          } else if (typeof invalidInput === 'string') {
            expect(translatedName).toBe(invalidInput);
          } else {
            // 文字列以外の場合は元の値が返される
            expect(translatedName).toBe(invalidInput);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('マッピングデータが読み込まれていない場合は元の日本語名が返される', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (japaneseStopName) => {
          // マッピングデータを読み込まない（初期状態）
          const freshTranslator = new BusStopTranslator();

          const translatedName = freshTranslator.translateStopName(japaneseStopName);
          const source = freshTranslator.getMappingSource(japaneseStopName);

          expect(translatedName).toBe(japaneseStopName);
          expect(source).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('部分一致しない場合は元の日本語名が返される', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (baseStopName, targetStopName) => {
          // 異なるバス停名であることを確認
          fc.pre(baseStopName !== targetStopName);
          fc.pre(!baseStopName.includes(targetStopName));
          fc.pre(!targetStopName.includes(baseStopName));

          const mappingData = [
            {
              japanese: baseStopName,
              english: 'Base Stop',
              source: 'Mapped'
            }
          ];

          translator.loadMappingFromData(mappingData);

          const translatedName = translator.translateStopName(targetStopName);
          const source = translator.getMappingSource(targetStopName);

          // 部分一致ではなく完全一致のみサポートするため、元の日本語名が返される
          expect(translatedName).toBe(targetStopName);
          expect(source).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});