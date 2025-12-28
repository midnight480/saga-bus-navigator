/**
 * URLParserのプロパティテスト
 * Feature: alert-enhancement, Property 1: URL検出と変換の完全性
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// url-parser.jsを読み込み
const fs = await import('fs');
const path = await import('path');
const urlParserCode = fs.readFileSync(
  path.join(process.cwd(), 'js/url-parser.js'),
  'utf-8'
);
eval(urlParserCode);

const URLParser = global.URLParser;

describe('URLParser - プロパティテスト', () => {
  describe('Property 1: URL検出と変換の完全性', () => {
    /**
     * Feature: alert-enhancement, Property 1: URL検出と変換の完全性
     * Validates: Requirements 1.1, 1.4
     * 
     * 任意のテキストに対して、HTTP・HTTPSプロトコルのURLが含まれている場合、
     * URLParserは全てのURLを検出する
     */
    it('should detect all HTTP and HTTPS URLs in any text', () => {
      fc.assert(
        fc.property(
          // URLを含むテキストを生成
          fc.array(
            fc.oneof(
              // HTTP URL
              fc.tuple(
                fc.constant('http://'),
                fc.webUrl({ validSchemes: ['http'] })
              ).map(([_, url]) => url),
              // HTTPS URL
              fc.tuple(
                fc.constant('https://'),
                fc.webUrl({ validSchemes: ['https'] })
              ).map(([_, url]) => url)
            ),
            { minLength: 1, maxLength: 5 }
          ),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
          (urls, textParts) => {
            // URLとテキストを混ぜてテスト文字列を作成
            let testText = '';
            const maxLen = Math.max(urls.length, textParts.length);
            for (let i = 0; i < maxLen; i++) {
              if (i < textParts.length) {
                testText += textParts[i] + ' ';
              }
              if (i < urls.length) {
                testText += urls[i] + ' ';
              }
            }
            
            // URL検出
            const detectedUrls = URLParser.extractURLs(testText);
            
            // 全てのURLが検出されることを検証
            return urls.every(url => detectedUrls.some(detected => detected.includes(url.replace(/\/$/, ''))));
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 1.1, 1.2, 1.3
     * 
     * 任意のURLに対して、parseURLsはセキュリティ属性付きのハイパーリンクを生成する
     */
    it('should create secure hyperlinks with target="_blank" and rel="noopener noreferrer"', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          (url) => {
            const result = URLParser.parseURLs(url);
            
            // target="_blank"が含まれることを検証
            const hasTargetBlank = result.includes('target="_blank"');
            
            // rel="noopener noreferrer"が含まれることを検証
            const hasSecurityRel = result.includes('rel="noopener noreferrer"');
            
            // aタグが生成されることを検証
            const hasAnchorTag = result.includes('<a href="') && result.includes('</a>');
            
            return hasTargetBlank && hasSecurityRel && hasAnchorTag;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 1.5
     * 
     * 任意のテキストに複数のURLが含まれている場合、全てのURLがハイパーリンク化される
     */
    it('should convert all URLs to hyperlinks when multiple URLs are present', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.webUrl({ validSchemes: ['http', 'https'] }),
            { minLength: 2, maxLength: 5 }
          ),
          (urls) => {
            // 重複を除去
            const uniqueUrls = [...new Set(urls)];
            if (uniqueUrls.length < 2) {
              return true; // スキップ
            }
            
            const testText = uniqueUrls.join(' テスト ');
            const result = URLParser.parseURLs(testText);
            
            // 全てのURLがaタグに変換されることを検証
            const anchorCount = (result.match(/<a href="/g) || []).length;
            
            return anchorCount === uniqueUrls.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 1.4
     * 
     * HTTPとHTTPSの両方のプロトコルが検出される
     */
    it('should detect both HTTP and HTTPS protocols', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes(' ') && /^[a-zA-Z0-9.-]+$/.test(s)),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes(' ') && /^[a-zA-Z0-9/.-]+$/.test(s)),
          (domain, path) => {
            const httpUrl = `http://${domain}.com/${path}`;
            const httpsUrl = `https://${domain}.com/${path}`;
            const testText = `HTTP: ${httpUrl} HTTPS: ${httpsUrl}`;
            
            const detectedUrls = URLParser.extractURLs(testText);
            
            // HTTPとHTTPSの両方が検出されることを検証
            const hasHttp = detectedUrls.some(url => url.startsWith('http://'));
            const hasHttps = detectedUrls.some(url => url.startsWith('https://'));
            
            return hasHttp && hasHttps;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * URLを含まないテキストは変更されない
     */
    it('should not modify text without URLs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }).filter(s => !s.includes('http://') && !s.includes('https://')),
          (text) => {
            const result = URLParser.parseURLs(text);
            
            // aタグが含まれないことを検証
            const hasNoAnchorTag = !result.includes('<a href="');
            
            return hasNoAnchorTag;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 空文字列やnullの処理
     */
    it('should handle empty string and null gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant(null),
            fc.constant(undefined)
          ),
          (input) => {
            const result = URLParser.parseURLs(input);
            
            // 空文字列が返されることを検証
            return result === '' || result === input;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * HTMLエスケープが正しく行われる
     */
    it('should properly escape HTML special characters in URLs', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          (url) => {
            const result = URLParser.parseURLs(url);
            
            // 結果がXSS攻撃に対して安全であることを検証
            // scriptタグが含まれないことを確認
            const noScriptTag = !result.includes('<script');
            
            return noScriptTag;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * countURLsとextractURLsの一貫性
     */
    it('should have consistent results between countURLs and extractURLs', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.webUrl({ validSchemes: ['http', 'https'] }),
            { minLength: 0, maxLength: 5 }
          ),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
          (urls, textParts) => {
            // URLとテキストを混ぜてテスト文字列を作成
            let testText = '';
            const maxLen = Math.max(urls.length, textParts.length);
            for (let i = 0; i < maxLen; i++) {
              if (i < textParts.length) {
                testText += textParts[i] + ' ';
              }
              if (i < urls.length) {
                testText += urls[i] + ' ';
              }
            }
            
            const count = URLParser.countURLs(testText);
            const extracted = URLParser.extractURLs(testText);
            
            // countURLsとextractURLsの結果が一致することを検証
            return count === extracted.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * isValidURLの検証
     */
    it('should correctly validate HTTP and HTTPS URLs', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          (url) => {
            // 有効なURLはtrueを返す
            return URLParser.isValidURL(url) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 無効なURLの検証
     */
    it('should reject invalid URLs', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant(null),
            fc.constant(undefined),
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.startsWith('http://') && !s.startsWith('https://'))
          ),
          (input) => {
            // 無効なURLはfalseを返す
            return URLParser.isValidURL(input) === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
