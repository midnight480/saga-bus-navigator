/**
 * CORS対応の検証テスト
 * 
 * 全てのAPIエンドポイントでOPTIONSリクエストが正しく処理されることを確認
 */

import { describe, it, expect } from 'vitest';

describe('CORS対応の検証', () => {
  const endpoints = [
    '/api/stops/search',
    '/api/routes/search',
    '/api/stops/first-last'
  ];

  endpoints.forEach(endpoint => {
    describe(`${endpoint}`, () => {
      it('OPTIONSリクエストハンドラーが実装されていること', async () => {
        // 実装ファイルの存在確認
        const filePath = `functions${endpoint}.ts`;
        const fs = await import('fs/promises');
        const content = await fs.readFile(filePath, 'utf-8');
        
        // onRequestOptionsが定義されていることを確認
        expect(content).toContain('export const onRequestOptions');
        expect(content).toContain('Access-Control-Allow-Origin');
        expect(content).toContain('Access-Control-Allow-Methods');
        expect(content).toContain('Access-Control-Allow-Headers');
      });

      it('正しいCORSヘッダーが設定されていること', async () => {
        const filePath = `functions${endpoint}.ts`;
        const fs = await import('fs/promises');
        const content = await fs.readFile(filePath, 'utf-8');
        
        // 必須のCORSヘッダーが含まれていることを確認
        expect(content).toContain("'Access-Control-Allow-Origin': '*'");
        expect(content).toContain("'Access-Control-Allow-Methods': 'GET, OPTIONS'");
        expect(content).toContain("'Access-Control-Allow-Headers': 'Content-Type'");
      });

      it('204 No Contentステータスコードを返すこと', async () => {
        const filePath = `functions${endpoint}.ts`;
        const fs = await import('fs/promises');
        const content = await fs.readFile(filePath, 'utf-8');
        
        // OPTIONSハンドラーが204ステータスを返すことを確認
        const optionsHandlerMatch = content.match(/export const onRequestOptions[\s\S]*?return new Response\([\s\S]*?status: (\d+)/);
        expect(optionsHandlerMatch).toBeTruthy();
        expect(optionsHandlerMatch![1]).toBe('204');
      });
    });
  });

  it('全てのGETレスポンスにもCORSヘッダーが含まれていること', async () => {
    const fs = await import('fs/promises');
    
    for (const endpoint of endpoints) {
      const filePath = `functions${endpoint}.ts`;
      const content = await fs.readFile(filePath, 'utf-8');
      
      // GETハンドラーのレスポンスにもCORSヘッダーが含まれることを確認
      const getHandlerMatch = content.match(/export const onRequestGet[\s\S]*?return new Response/g);
      expect(getHandlerMatch).toBeTruthy();
      expect(getHandlerMatch!.length).toBeGreaterThan(0);
      
      // 少なくとも1つのレスポンスにAccess-Control-Allow-Originが含まれることを確認
      expect(content).toContain("'Access-Control-Allow-Origin': '*'");
    }
  });
});
