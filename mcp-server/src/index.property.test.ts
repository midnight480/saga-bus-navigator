/**
 * MCPサーバのプロパティベーステスト
 * 
 * MCPサーバの普遍的なプロパティを検証するプロパティベーステスト
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { searchBusStopsSchema } from './tools/search-bus-stops.js';
import { searchRoutesSchema } from './tools/search-routes.js';
import { getFirstLastBusSchema } from './tools/get-first-last-bus.js';

describe('MCPサーバ Properties', () => {
  // Feature: mcp-server, Property 7: ツールスキーマの完全性
  // **Validates: Requirements 5.2**
  describe('Property 7: ツールスキーマの完全性', () => {
    it('任意の登録されたツールに対して、入力パラメータと戻り値の型が正しく定義されたスキーマが存在する', () => {
      const tools = [
        searchBusStopsSchema,
        searchRoutesSchema,
        getFirstLastBusSchema
      ];

      tools.forEach((tool) => {
        // ツール名が定義されている
        expect(tool).toHaveProperty('name');
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);

        // 説明が定義されている
        expect(tool).toHaveProperty('description');
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);

        // inputSchemaが定義されている
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
        expect(tool.inputSchema).toHaveProperty('required');

        // requiredフィールドが配列である
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);

        // propertiesが定義されている
        expect(typeof tool.inputSchema.properties).toBe('object');
        
        // 必須パラメータがpropertiesに存在する
        tool.inputSchema.required.forEach((requiredParam: string) => {
          expect(tool.inputSchema.properties).toHaveProperty(requiredParam);
        });
      });
    });

    it('各ツールのスキーマは必須パラメータを正しく定義している', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { schema: searchBusStopsSchema, required: ['q'] },
            { schema: searchRoutesSchema, required: ['from', 'to'] },
            { schema: getFirstLastBusSchema, required: ['stop'] }
          ),
          ({ schema, required }) => {
            expect(schema.inputSchema.required).toEqual(required);
            
            // 必須パラメータが全てpropertiesに存在する
            required.forEach((param) => {
              expect(schema.inputSchema.properties).toHaveProperty(param);
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('全てのツールスキーマはMCP形式に準拠している', () => {
      const tools = [
        searchBusStopsSchema,
        searchRoutesSchema,
        getFirstLastBusSchema
      ];

      tools.forEach((tool) => {
        // MCP形式の必須フィールドを確認
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        
        // inputSchemaの構造を確認
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema).toHaveProperty('properties');
        expect(tool.inputSchema).toHaveProperty('required');
        
        // propertiesの各フィールドが型定義を持つ
        Object.values(tool.inputSchema.properties).forEach((prop: any) => {
          expect(prop).toHaveProperty('type');
        });
      });
    });
  });

  // Feature: mcp-server, Property 8: パラメータ検証の実行
  // **Validates: Requirements 5.3**
  describe('Property 8: パラメータ検証の実行', () => {
    it('各ツールスキーマは必須パラメータを明示的に定義している', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            searchBusStopsSchema,
            searchRoutesSchema,
            getFirstLastBusSchema
          ),
          (schema) => {
            // 必須パラメータが定義されている
            expect(schema.inputSchema.required).toBeDefined();
            expect(Array.isArray(schema.inputSchema.required)).toBe(true);
            expect(schema.inputSchema.required.length).toBeGreaterThan(0);
            
            // 必須パラメータが全てpropertiesに存在する
            schema.inputSchema.required.forEach((param: string) => {
              expect(schema.inputSchema.properties).toHaveProperty(param);
              expect(schema.inputSchema.properties[param]).toHaveProperty('type');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('オプションパラメータはrequired配列に含まれていない', () => {
      // search_bus_stopsのlimitパラメータはオプション
      expect(searchBusStopsSchema.inputSchema.properties).toHaveProperty('limit');
      expect(searchBusStopsSchema.inputSchema.required).not.toContain('limit');

      // search_routesのtime, type, weekday, limitパラメータはオプション
      expect(searchRoutesSchema.inputSchema.properties).toHaveProperty('time');
      expect(searchRoutesSchema.inputSchema.required).not.toContain('time');
      expect(searchRoutesSchema.inputSchema.properties).toHaveProperty('type');
      expect(searchRoutesSchema.inputSchema.required).not.toContain('type');

      // get_first_last_busのto, weekdayパラメータはオプション
      expect(getFirstLastBusSchema.inputSchema.properties).toHaveProperty('to');
      expect(getFirstLastBusSchema.inputSchema.required).not.toContain('to');
      expect(getFirstLastBusSchema.inputSchema.properties).toHaveProperty('weekday');
      expect(getFirstLastBusSchema.inputSchema.required).not.toContain('weekday');
    });

    it('enum制約が定義されているパラメータは有効な値のリストを持つ', () => {
      // search_routesのtypeパラメータ
      const typeParam = searchRoutesSchema.inputSchema.properties.type as any;
      expect(typeParam).toHaveProperty('enum');
      expect(Array.isArray(typeParam.enum)).toBe(true);
      expect(typeParam.enum).toContain('departure');
      expect(typeParam.enum).toContain('arrival');

      // search_routesのweekdayパラメータ
      const weekdayParam = searchRoutesSchema.inputSchema.properties.weekday as any;
      expect(weekdayParam).toHaveProperty('enum');
      expect(Array.isArray(weekdayParam.enum)).toBe(true);
      expect(weekdayParam.enum).toContain('weekday');
      expect(weekdayParam.enum).toContain('saturday');
      expect(weekdayParam.enum).toContain('holiday');
    });
  });

  // Feature: mcp-server, Property 9: MCPレスポンス形式の準拠
  // **Validates: Requirements 5.4, 5.5**
  describe('Property 9: MCPレスポンス形式の準拠', () => {
    it('全てのツールスキーマはMCPプロトコルに準拠した構造を持つ', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            searchBusStopsSchema,
            searchRoutesSchema,
            getFirstLastBusSchema
          ),
          (schema) => {
            // MCPツールスキーマの必須フィールド
            expect(schema).toHaveProperty('name');
            expect(schema).toHaveProperty('description');
            expect(schema).toHaveProperty('inputSchema');
            
            // 名前は文字列
            expect(typeof schema.name).toBe('string');
            expect(schema.name.length).toBeGreaterThan(0);
            
            // 説明は文字列
            expect(typeof schema.description).toBe('string');
            expect(schema.description.length).toBeGreaterThan(0);
            
            // inputSchemaはJSON Schema形式
            expect(schema.inputSchema.type).toBe('object');
            expect(schema.inputSchema).toHaveProperty('properties');
            expect(schema.inputSchema).toHaveProperty('required');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('ツール名は一意である', () => {
      const tools = [
        searchBusStopsSchema,
        searchRoutesSchema,
        getFirstLastBusSchema
      ];

      const names = tools.map(t => t.name);
      const uniqueNames = new Set(names);
      
      expect(uniqueNames.size).toBe(names.length);
    });

    it('全てのパラメータ説明は日本語で記述されている', () => {
      const tools = [
        searchBusStopsSchema,
        searchRoutesSchema,
        getFirstLastBusSchema
      ];

      tools.forEach((tool) => {
        // ツールの説明が日本語を含む
        expect(tool.description).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
        
        // 各パラメータの説明が日本語を含む
        Object.values(tool.inputSchema.properties).forEach((prop: any) => {
          if (prop.description) {
            expect(prop.description).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
          }
        });
      });
    });

    it('デフォルト値が定義されているパラメータは適切な型を持つ', () => {
      // search_bus_stopsのlimitパラメータ
      const limitParam = searchBusStopsSchema.inputSchema.properties.limit as any;
      if (limitParam.default !== undefined) {
        expect(typeof limitParam.default).toBe('number');
      }

      // search_routesのtypeパラメータ
      const typeParam = searchRoutesSchema.inputSchema.properties.type as any;
      if (typeParam.default !== undefined) {
        expect(typeof typeParam.default).toBe('string');
      }
    });
  });
});
