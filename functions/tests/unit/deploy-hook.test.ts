/**
 * Deploy Hook統合のユニットテスト
 * 
 * このテストは、Cloudflare Pages Deploy Hookエンドポイントの機能をテストします。
 * 
 * 検証項目:
 * - POSTリクエストの処理
 * - 環境変数の取得と検証
 * - エラーハンドリング
 * - レスポンス形式の検証
 * 
 * 要件: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 * 
 * 注意: このテストは、deploy-hook.jsの基本的な機能（HTTPメソッドチェック、
 * 環境変数検証、レスポンス形式）をテストします。実際のGTFS処理とKVアップロードは
 * 統合テストで検証されます。
 */

import { describe, it, expect, vi } from 'vitest';

describe('Deploy Hook統合', () => {
  describe('POSTリクエストの処理', () => {
    it('GETリクエストを拒否する（405 Method Not Allowed）', async () => {
      const { onRequest } = await import('../../deploy-hook.js');
      
      const getRequest = new Request('http://localhost/deploy-hook', {
        method: 'GET'
      });
      
      const mockEnv = {
        CLOUDFLARE_ACCOUNT_ID: 'test_account',
        CLOUDFLARE_API_TOKEN: 'test_token',
        KV_NAMESPACE_ID: 'test_namespace'
      };
      
      const response = await onRequest({
        request: getRequest,
        env: mockEnv
      });
      
      expect(response.status).toBe(405);
      expect(response.headers.get('Allow')).toBe('POST');
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Method not allowed');
      expect(body.message).toContain('POSTリクエストのみ');
    });
    
    it('PUTリクエストを拒否する（405 Method Not Allowed）', async () => {
      const { onRequest } = await import('../../deploy-hook.js');
      
      const putRequest = new Request('http://localhost/deploy-hook', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const mockEnv = {
        CLOUDFLARE_ACCOUNT_ID: 'test_account',
        CLOUDFLARE_API_TOKEN: 'test_token',
        KV_NAMESPACE_ID: 'test_namespace'
      };
      
      const response = await onRequest({
        request: putRequest,
        env: mockEnv
      });
      
      expect(response.status).toBe(405);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Method not allowed');
    });
    
    it('DELETEリクエストを拒否する（405 Method Not Allowed）', async () => {
      const { onRequest } = await import('../../deploy-hook.js');
      
      const deleteRequest = new Request('http://localhost/deploy-hook', {
        method: 'DELETE'
      });
      
      const mockEnv = {
        CLOUDFLARE_ACCOUNT_ID: 'test_account',
        CLOUDFLARE_API_TOKEN: 'test_token',
        KV_NAMESPACE_ID: 'test_namespace'
      };
      
      const response = await onRequest({
        request: deleteRequest,
        env: mockEnv
      });
      
      expect(response.status).toBe(405);
      
      const body = await response.json();
      expect(body.success).toBe(false);
    });
    
    it('PATCHリクエストを拒否する（405 Method Not Allowed）', async () => {
      const { onRequest } = await import('../../deploy-hook.js');
      
      const patchRequest = new Request('http://localhost/deploy-hook', {
        method: 'PATCH'
      });
      
      const mockEnv = {
        CLOUDFLARE_ACCOUNT_ID: 'test_account',
        CLOUDFLARE_API_TOKEN: 'test_token',
        KV_NAMESPACE_ID: 'test_namespace'
      };
      
      const response = await onRequest({
        request: patchRequest,
        env: mockEnv
      });
      
      expect(response.status).toBe(405);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Method not allowed');
    });
  });
  
  describe('環境変数の取得と検証', () => {
    it('CLOUDFLARE_ACCOUNT_IDが未設定の場合はエラーを返す', async () => {
      const { onRequest } = await import('../../deploy-hook.js');
      
      const mockRequest = new Request('http://localhost/deploy-hook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const envWithoutAccountId = {
        CLOUDFLARE_API_TOKEN: 'test_token',
        KV_NAMESPACE_ID: 'test_namespace'
      };
      
      const response = await onRequest({
        request: mockRequest,
        env: envWithoutAccountId
      });
      
      expect(response.status).toBe(500);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Missing environment variables');
      expect(body.details.missingVars).toContain('CLOUDFLARE_ACCOUNT_ID');
    });
    
    it('CLOUDFLARE_API_TOKENが未設定の場合はエラーを返す', async () => {
      const { onRequest } = await import('../../deploy-hook.js');
      
      const mockRequest = new Request('http://localhost/deploy-hook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const envWithoutToken = {
        CLOUDFLARE_ACCOUNT_ID: 'test_account',
        KV_NAMESPACE_ID: 'test_namespace'
      };
      
      const response = await onRequest({
        request: mockRequest,
        env: envWithoutToken
      });
      
      expect(response.status).toBe(500);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Missing environment variables');
      expect(body.details.missingVars).toContain('CLOUDFLARE_API_TOKEN');
    });
    
    it('KV_NAMESPACE_IDが未設定の場合はエラーを返す', async () => {
      const { onRequest } = await import('../../deploy-hook.js');
      
      const mockRequest = new Request('http://localhost/deploy-hook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const envWithoutNamespace = {
        CLOUDFLARE_ACCOUNT_ID: 'test_account',
        CLOUDFLARE_API_TOKEN: 'test_token'
      };
      
      const response = await onRequest({
        request: mockRequest,
        env: envWithoutNamespace
      });
      
      expect(response.status).toBe(500);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Missing environment variables');
      expect(body.details.missingVars).toContain('KV_NAMESPACE_ID');
    });
    
    it('複数の環境変数が未設定の場合は全てをリストアップする', async () => {
      const { onRequest } = await import('../../deploy-hook.js');
      
      const mockRequest = new Request('http://localhost/deploy-hook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const emptyEnv = {};
      
      const response = await onRequest({
        request: mockRequest,
        env: emptyEnv
      });
      
      expect(response.status).toBe(500);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Missing environment variables');
      expect(body.details.missingVars).toHaveLength(3);
      expect(body.details.missingVars).toContain('CLOUDFLARE_ACCOUNT_ID');
      expect(body.details.missingVars).toContain('CLOUDFLARE_API_TOKEN');
      expect(body.details.missingVars).toContain('KV_NAMESPACE_ID');
    });
    
    it('環境変数が空文字列の場合は未設定として扱う', async () => {
      const { onRequest } = await import('../../deploy-hook.js');
      
      const mockRequest = new Request('http://localhost/deploy-hook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const envWithEmptyStrings = {
        CLOUDFLARE_ACCOUNT_ID: '',
        CLOUDFLARE_API_TOKEN: '',
        KV_NAMESPACE_ID: ''
      };
      
      const response = await onRequest({
        request: mockRequest,
        env: envWithEmptyStrings
      });
      
      expect(response.status).toBe(500);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.details.missingVars).toHaveLength(3);
    });
    
    it('環境変数が部分的に空文字列の場合は未設定のもののみリストアップする', async () => {
      const { onRequest } = await import('../../deploy-hook.js');
      
      const mockRequest = new Request('http://localhost/deploy-hook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const envWithPartialEmpty = {
        CLOUDFLARE_ACCOUNT_ID: 'test_account',
        CLOUDFLARE_API_TOKEN: '',
        KV_NAMESPACE_ID: ''
      };
      
      const response = await onRequest({
        request: mockRequest,
        env: envWithPartialEmpty
      });
      
      expect(response.status).toBe(500);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.details.missingVars).toHaveLength(2);
      expect(body.details.missingVars).toContain('CLOUDFLARE_API_TOKEN');
      expect(body.details.missingVars).toContain('KV_NAMESPACE_ID');
      expect(body.details.missingVars).not.toContain('CLOUDFLARE_ACCOUNT_ID');
    });
  });
  
  describe('レスポンス形式', () => {
    it('エラーレスポンスにContent-Typeヘッダーが設定される', async () => {
      const { onRequest } = await import('../../deploy-hook.js');
      
      const mockRequest = new Request('http://localhost/deploy-hook', {
        method: 'GET'
      });
      
      const mockEnv = {
        CLOUDFLARE_ACCOUNT_ID: 'test_account',
        CLOUDFLARE_API_TOKEN: 'test_token',
        KV_NAMESPACE_ID: 'test_namespace'
      };
      
      const response = await onRequest({
        request: mockRequest,
        env: mockEnv
      });
      
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
    
    it('環境変数エラーレスポンスに詳細情報が含まれる', async () => {
      const { onRequest } = await import('../../deploy-hook.js');
      
      const mockRequest = new Request('http://localhost/deploy-hook', {
        method: 'POST'
      });
      
      const emptyEnv = {};
      
      const response = await onRequest({
        request: mockRequest,
        env: emptyEnv
      });
      
      const body = await response.json();
      
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('details');
      expect(body.details).toHaveProperty('missingVars');
      expect(Array.isArray(body.details.missingVars)).toBe(true);
    });
    
    it('エラーメッセージが日本語で返される', async () => {
      const { onRequest } = await import('../../deploy-hook.js');
      
      const mockRequest = new Request('http://localhost/deploy-hook', {
        method: 'POST'
      });
      
      const emptyEnv = {};
      
      const response = await onRequest({
        request: mockRequest,
        env: emptyEnv
      });
      
      const body = await response.json();
      
      expect(body.message).toMatch(/環境変数/);
      expect(body.message).toMatch(/設定されていません/);
    });
  });
  
  describe('ログ出力', () => {
    it('処理開始時にログを出力する', async () => {
      const { onRequest } = await import('../../deploy-hook.js');
      
      const consoleSpy = vi.spyOn(console, 'log');
      
      const mockRequest = new Request('http://localhost/deploy-hook', {
        method: 'GET'
      });
      
      const mockEnv = {
        CLOUDFLARE_ACCOUNT_ID: 'test_account',
        CLOUDFLARE_API_TOKEN: 'test_token',
        KV_NAMESPACE_ID: 'test_namespace'
      };
      
      await onRequest({
        request: mockRequest,
        env: mockEnv
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Deploy Hook実行開始'));
      
      consoleSpy.mockRestore();
    });
    
    it('エラー発生時にエラーログを出力する', async () => {
      const { onRequest } = await import('../../deploy-hook.js');
      
      const consoleErrorSpy = vi.spyOn(console, 'error');
      
      const mockRequest = new Request('http://localhost/deploy-hook', {
        method: 'POST'
      });
      
      const emptyEnv = {};
      
      await onRequest({
        request: mockRequest,
        env: emptyEnv
      });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('エラー'));
      
      consoleErrorSpy.mockRestore();
    });
    
    it('不正なHTTPメソッドのエラーログを出力する', async () => {
      const { onRequest } = await import('../../deploy-hook.js');
      
      const consoleErrorSpy = vi.spyOn(console, 'error');
      
      const mockRequest = new Request('http://localhost/deploy-hook', {
        method: 'DELETE'
      });
      
      const mockEnv = {
        CLOUDFLARE_ACCOUNT_ID: 'test_account',
        CLOUDFLARE_API_TOKEN: 'test_token',
        KV_NAMESPACE_ID: 'test_namespace'
      };
      
      await onRequest({
        request: mockRequest,
        env: mockEnv
      });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('不正なHTTPメソッド'));
      
      consoleErrorSpy.mockRestore();
    });
  });
});
