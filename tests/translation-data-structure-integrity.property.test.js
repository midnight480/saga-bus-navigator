/**
 * **Feature: multilingual-support, Property 7: 翻訳データの構造整合性**
 * **Validates: Requirements 5.1, 5.3**
 * 
 * 任意の翻訳ファイルに対して、JSON形式で構造化され、必要なキーが含まれている
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';

// TranslationValidatorをインポート
const TranslationValidator = await import('../js/i18n/translation-validator.js').then(m => m.default);

describe('Translation Data Structure Integrity Property Tests', () => {
  
  test('Property 7: 翻訳データの構造整合性 - 実際の翻訳ファイルの検証', () => {
    // 実際の翻訳ファイルを読み込み
    const jaTranslations = JSON.parse(fs.readFileSync('js/translations/ja.json', 'utf8'));
    const enTranslations = JSON.parse(fs.readFileSync('js/translations/en.json', 'utf8'));
    
    // 日本語翻訳ファイルの構造検証
    const jaValidation = TranslationValidator.validateStructure(jaTranslations, 'ja');
    expect(jaValidation.isValid).toBe(true);
    if (!jaValidation.isValid) {
      console.error('Japanese translation validation errors:', jaValidation.errors);
    }
    
    // 英語翻訳ファイルの構造検証
    const enValidation = TranslationValidator.validateStructure(enTranslations, 'en');
    expect(enValidation.isValid).toBe(true);
    if (!enValidation.isValid) {
      console.error('English translation validation errors:', enValidation.errors);
    }
    
    // 両言語間の整合性検証
    const consistencyValidation = TranslationValidator.validateConsistency({
      ja: jaTranslations,
      en: enTranslations
    });
    expect(consistencyValidation.isValid).toBe(true);
    if (!consistencyValidation.isValid) {
      console.error('Translation consistency validation errors:', consistencyValidation.errors);
    }
    
    // 空白値の検証
    const jaNonEmptyValidation = TranslationValidator.validateNonEmptyValues(jaTranslations, 'ja');
    expect(jaNonEmptyValidation.isValid).toBe(true);
    
    const enNonEmptyValidation = TranslationValidator.validateNonEmptyValues(enTranslations, 'en');
    expect(enNonEmptyValidation.isValid).toBe(true);
  });
  
  test('Property 7: 翻訳データの構造整合性 - 生成された翻訳データの検証', () => {
    fc.assert(
      fc.property(
        // 翻訳データ構造のジェネレーター（空白のみの文字列を除外）
        fc.record({
          app: fc.record({
            title: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            subtitle: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          }),
          search: fc.record({
            departure_stop: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            arrival_stop: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            search_button: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            clear_results: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          }),
          time: fc.record({
            weekday: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            weekend: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            departure_time: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            arrival_time: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            now: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            first_bus: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            last_bus: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          }),
          results: fc.record({
            loading: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            no_results: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            route: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            departure: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            arrival: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            fare: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            duration: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          }),
          map: fc.record({
            select_from_map: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            clear_route: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            direction_both: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            direction_outbound: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            direction_inbound: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          }),
          footer: fc.record({
            usage: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            contact: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            data_source: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          }),
          modal: fc.record({
            close: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            calendar_register: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            ical_download: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            google_calendar: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          }),
          error: fc.record({
            data_load_failed: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            retry: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            invalid_time: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            select_stops: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          })
        }),
        fc.constantFrom('ja', 'en', 'ko', 'zh'),
        (translations, locale) => {
          // 生成された翻訳データが正しい構造を持つことを検証
          const validation = TranslationValidator.validateStructure(translations, locale);
          expect(validation.isValid).toBe(true);
          
          // 空白値がないことを検証
          const nonEmptyValidation = TranslationValidator.validateNonEmptyValues(translations, locale);
          expect(nonEmptyValidation.isValid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('Property 7: 翻訳データの構造整合性 - 複数ロケール間の整合性', () => {
    fc.assert(
      fc.property(
        // 2つの同じ構造を持つ翻訳データを生成（空白のみの文字列を除外）
        fc.record({
          app: fc.record({
            title: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            subtitle: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          }),
          search: fc.record({
            departure_stop: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            arrival_stop: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            search_button: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            clear_results: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          })
        }),
        fc.record({
          app: fc.record({
            title: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            subtitle: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          }),
          search: fc.record({
            departure_stop: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            arrival_stop: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            search_button: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            clear_results: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          })
        }),
        (translations1, translations2) => {
          // 同じ構造を持つ翻訳データは整合性チェックを通過する
          const consistencyValidation = TranslationValidator.validateConsistency({
            locale1: translations1,
            locale2: translations2
          });
          expect(consistencyValidation.isValid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('Property 7: 翻訳データの構造整合性 - 不正なデータの検出', () => {
    fc.assert(
      fc.property(
        // 不正な翻訳データを生成（必須キーが欠けている）
        fc.record({
          app: fc.option(fc.record({
            title: fc.option(fc.string(), { nil: undefined }),
            subtitle: fc.option(fc.string(), { nil: undefined })
          }), { nil: undefined }),
          search: fc.option(fc.record({
            departure_stop: fc.option(fc.string(), { nil: undefined })
            // 他の必須キーを意図的に省略
          }), { nil: undefined })
        }),
        fc.constantFrom('ja', 'en'),
        (incompleteTranslations, locale) => {
          // 不完全な翻訳データは検証に失敗する
          const validation = TranslationValidator.validateStructure(incompleteTranslations, locale);
          
          // 必須セクションやキーが欠けている場合は検証が失敗することを確認
          if (!incompleteTranslations.app || !incompleteTranslations.search ||
              !incompleteTranslations.app.title || !incompleteTranslations.app.subtitle ||
              !incompleteTranslations.search.departure_stop) {
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});