/**
 * バス停翻訳優先順位のプロパティベーステスト
 * **Feature: multilingual-support, Property 5: バス停名翻訳の優先順位**
 * **Validates: Requirements 6.2, 6.3**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

// BusStopTranslatorクラスをインポート
const { createRequire } = await import('module');
const require = createRequire(import.meta.url);
const BusStopTranslator = require('../js/i18n/bus-stop-translator.js');

describe('バス停翻訳優先順位のプロパティテスト', () => {
  let translator;

  beforeEach(() => {
    translator = new BusStopTranslator();
  });

  /**
   * プロパティ5: バス停名翻訳の優先順位
   * 任意のバス停名に対して、手動マッピング（Mapped）が利用可能な場合は
   * 機械翻訳（Auto-translated）より優先して使用される
   */
  it('手動マッピング（Mapped）が機械翻訳（Auto-translated）より優先される', () => {
    fc.assert(
      fc.property(
        // 日本語バス停名のジェネレーター
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        // 英語翻訳のジェネレーター
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (japaneseStopName, mappedEnglish, autoEnglish) => {
          // 同じバス停名に対して、MappedとAuto-translatedの両方のマッピングを作成
          const mappingData = [
            {
              japanese: japaneseStopName,
              english: autoEnglish,
              source: 'Auto-translated'
            },
            {
              japanese: japaneseStopName,
              english: mappedEnglish,
              source: 'Mapped'
            }
          ];

          // マッピングデータを読み込み
          translator.loadMappingFromData(mappingData);

          // 翻訳を実行
          const translatedName = translator.translateStopName(japaneseStopName);
          const source = translator.getMappingSource(japaneseStopName);

          // 手動マッピング（Mapped）が優先されることを確認
          expect(translatedName).toBe(mappedEnglish);
          expect(source).toBe('Mapped');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('手動マッピングのみが存在する場合は手動マッピングが使用される', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (japaneseStopName, mappedEnglish) => {
          const mappingData = [
            {
              japanese: japaneseStopName,
              english: mappedEnglish,
              source: 'Mapped'
            }
          ];

          translator.loadMappingFromData(mappingData);

          const translatedName = translator.translateStopName(japaneseStopName);
          const source = translator.getMappingSource(japaneseStopName);

          expect(translatedName).toBe(mappedEnglish);
          expect(source).toBe('Mapped');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('機械翻訳のみが存在する場合は機械翻訳が使用される', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (japaneseStopName, autoEnglish) => {
          const mappingData = [
            {
              japanese: japaneseStopName,
              english: autoEnglish,
              source: 'Auto-translated'
            }
          ];

          translator.loadMappingFromData(mappingData);

          const translatedName = translator.translateStopName(japaneseStopName);
          const source = translator.getMappingSource(japaneseStopName);

          expect(translatedName).toBe(autoEnglish);
          expect(source).toBe('Auto-translated');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('複数の手動マッピングが存在する場合は最後に読み込まれたものが使用される', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (japaneseStopName, firstMapped, secondMapped) => {
          // 異なる英語名を確保
          fc.pre(firstMapped !== secondMapped);

          const mappingData = [
            {
              japanese: japaneseStopName,
              english: firstMapped,
              source: 'Mapped'
            },
            {
              japanese: japaneseStopName,
              english: secondMapped,
              source: 'Mapped'
            }
          ];

          translator.loadMappingFromData(mappingData);

          const translatedName = translator.translateStopName(japaneseStopName);
          const source = translator.getMappingSource(japaneseStopName);

          // 最後に読み込まれた手動マッピングが使用される
          expect(translatedName).toBe(secondMapped);
          expect(source).toBe('Mapped');
        }
      ),
      { numRuns: 100 }
    );
  });
});