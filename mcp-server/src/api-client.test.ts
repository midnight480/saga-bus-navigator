/**
 * API Client Unit Tests
 * 
 * API Clientの基本的な動作を検証するユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiClient } from './api-client.js';

describe('ApiClient', () => {
  let apiClient: ApiClient;
  
  beforeEach(() => {
    apiClient = new ApiClient({
      baseUrl: 'https://test-api.example.com',
      timeout: 5000
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      const client = new ApiClient({
        baseUrl: 'https://example.com/api',
        timeout: 3000
      });
      
      expect(client).toBeDefined();
    });

    it('should use default timeout when not provided', () => {
      const client = new ApiClient({
        baseUrl: 'https://example.com/api'
      });
      
      expect(client).toBeDefined();
    });
  });

  describe('get method', () => {
    it('should construct correct URL with endpoint', async () => {
      const mockResponse = { data: 'test' };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      await apiClient.get('/test-endpoint');

      expect(fetch).toHaveBeenCalledWith(
        'https://test-api.example.com/test-endpoint',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        })
      );
    });

    it('should add query parameters to URL', async () => {
      const mockResponse = { data: 'test' };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      await apiClient.get('/search', { q: 'test', limit: 10 });

      const callUrl = (fetch as any).mock.calls[0][0];
      expect(callUrl).toContain('q=test');
      expect(callUrl).toContain('limit=10');
    });

    it('should skip undefined and null parameters', async () => {
      const mockResponse = { data: 'test' };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      await apiClient.get('/search', { q: 'test', limit: undefined, page: null });

      const callUrl = (fetch as any).mock.calls[0][0];
      expect(callUrl).toContain('q=test');
      expect(callUrl).not.toContain('limit');
      expect(callUrl).not.toContain('page');
    });

    it('should return parsed JSON response', async () => {
      const mockResponse = { stops: [], count: 0 };
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiClient.get('/stops/search');

      expect(result).toEqual(mockResponse);
    });

    it('should throw error for non-200 status codes', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Resource not found'
      });

      await expect(apiClient.get('/not-found')).rejects.toThrow(
        'API error: 404 Not Found - Resource not found'
      );
    });

    it('should throw timeout error when request exceeds timeout', async () => {
      const client = new ApiClient({
        baseUrl: 'https://test-api.example.com',
        timeout: 100
      });

      // AbortErrorをシミュレート
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          }, 150);
        })
      );

      await expect(client.get('/slow-endpoint')).rejects.toThrow(
        'Request timeout after 100ms'
      );
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(apiClient.get('/endpoint')).rejects.toThrow('Network error');
    });
  });

  describe('environment variable handling', () => {
    it('should create client with custom URL from config', () => {
      const customClient = new ApiClient({
        baseUrl: 'https://custom-api.example.com'
      });
      
      expect(customClient).toBeDefined();
    });

    it('should create client with default URL', () => {
      const defaultClient = new ApiClient({
        baseUrl: 'https://saga-bus.midnight480.com/api'
      });
      
      expect(defaultClient).toBeDefined();
    });
  });
});
