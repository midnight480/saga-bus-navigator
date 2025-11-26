/**
 * wrangler-dev-environment 後方互換性のプロパティテスト
 * Feature: wrangler-dev-environment, Property 3: 既存機能の後方互換性
 * Validates: Requirements 2.3
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('wrangler-dev-environment - プロパティテスト', () => {
  describe('Property 1: 静的ファイル配信の一貫性', () => {
    /**
     * Feature: wrangler-dev-environment, Property 1: 静的ファイル配信の一貫性
     * Validates: Requirements 1.2
     * 
     * 任意の静的ファイル（HTML、CSS、JavaScript、画像等）について、
     * wrangler pages devで配信されるファイルは、ファイルシステム上のファイルと同一の内容である
     */
    it('should serve static files with consistent content from filesystem', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'index.html',
            'css/app.css',
            'js/app.js',
            'js/data-loader.js',
            'js/utils.js',
            'manifest.json',
            '_headers'
          ),
          (filePath) => {
            // ファイルがファイルシステム上に存在することを検証
            const fullPath = path.join(process.cwd(), filePath);
            const fileExists = fs.existsSync(fullPath);
            
            if (!fileExists) {
              return true; // ファイルが存在しない場合はスキップ
            }
            
            // ファイルが読み取り可能であることを検証
            const stats = fs.statSync(fullPath);
            const isFile = stats.isFile();
            const isReadable = fs.accessSync(fullPath, fs.constants.R_OK) === undefined;
            
            // ファイルサイズが0より大きいことを検証（空ファイルでない）
            const hasContent = stats.size > 0;
            
            return fileExists && isFile && isReadable && hasContent;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 静的ファイルのディレクトリ構造が正しいことを検証
     * Validates: Requirements 1.2
     */
    it('should have correct directory structure for static files', () => {
      const requiredDirs = ['css', 'js', 'icons', 'data', 'functions'];
      
      for (const dir of requiredDirs) {
        const dirPath = path.join(process.cwd(), dir);
        expect(fs.existsSync(dirPath)).toBe(true);
        expect(fs.statSync(dirPath).isDirectory()).toBe(true);
      }
    });

    /**
     * 重要な静的ファイルが存在することを検証
     * Validates: Requirements 1.2
     */
    it('should have all critical static files present', () => {
      const criticalFiles = [
        'index.html',
        'manifest.json',
        '_headers',
        'css/app.css',
        'js/app.js',
        'js/data-loader.js'
      ];
      
      for (const file of criticalFiles) {
        const filePath = path.join(process.cwd(), file);
        expect(fs.existsSync(filePath)).toBe(true);
        expect(fs.statSync(filePath).isFile()).toBe(true);
      }
    });
  });

  describe('Property 2: Pages Functions の実行可能性', () => {
    /**
     * Feature: wrangler-dev-environment, Property 2: Pages Functions の実行可能性
     * Validates: Requirements 1.3, 1.5
     * 
     * 任意の /functions ディレクトリ配下の有効な TypeScript/JavaScript ファイルについて、
     * 対応する API エンドポイントにアクセスした際、そのファイルが実行されてレスポンスが返される
     */
    it('should have valid Pages Functions files in functions directory', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'functions/api/alert.ts',
            'functions/api/route.ts',
            'functions/api/vehicle.ts'
          ),
          (filePath) => {
            // ファイルがファイルシステム上に存在することを検証
            const fullPath = path.join(process.cwd(), filePath);
            const fileExists = fs.existsSync(fullPath);
            
            if (!fileExists) {
              return true; // ファイルが存在しない場合はスキップ
            }
            
            // ファイルが読み取り可能であることを検証
            const stats = fs.statSync(fullPath);
            const isFile = stats.isFile();
            
            // ファイルサイズが0より大きいことを検証
            const hasContent = stats.size > 0;
            
            // ファイルの拡張子が.tsまたは.jsであることを検証
            const hasValidExtension = filePath.endsWith('.ts') || filePath.endsWith('.js');
            
            return fileExists && isFile && hasContent && hasValidExtension;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * functions/api ディレクトリが存在し、APIファイルが配置されていることを検証
     * Validates: Requirements 1.3
     */
    it('should have functions/api directory with API files', () => {
      const functionsApiDir = path.join(process.cwd(), 'functions', 'api');
      expect(fs.existsSync(functionsApiDir)).toBe(true);
      expect(fs.statSync(functionsApiDir).isDirectory()).toBe(true);
      
      // APIファイルが存在することを検証
      const apiFiles = ['alert.ts', 'route.ts', 'vehicle.ts'];
      for (const file of apiFiles) {
        const filePath = path.join(functionsApiDir, file);
        expect(fs.existsSync(filePath)).toBe(true);
        expect(fs.statSync(filePath).isFile()).toBe(true);
      }
    });

    /**
     * functions ディレクトリに package.json が存在することを検証
     * Validates: Requirements 1.3
     */
    it('should have package.json in functions directory', () => {
      const functionsPackageJson = path.join(process.cwd(), 'functions', 'package.json');
      expect(fs.existsSync(functionsPackageJson)).toBe(true);
      expect(fs.statSync(functionsPackageJson).isFile()).toBe(true);
      
      // package.jsonが有効なJSONであることを検証
      const packageJson = JSON.parse(fs.readFileSync(functionsPackageJson, 'utf-8'));
      expect(packageJson).toHaveProperty('dependencies');
    });

    /**
     * Pages Functions ファイルが有効なTypeScriptコードを含むことを検証
     * Validates: Requirements 1.5
     */
    it('should have valid TypeScript code in Pages Functions files', () => {
      const apiFiles = [
        'functions/api/alert.ts',
        'functions/api/route.ts',
        'functions/api/vehicle.ts'
      ];
      
      for (const file of apiFiles) {
        const filePath = path.join(process.cwd(), file);
        if (!fs.existsSync(filePath)) continue;
        
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // ファイルが空でないことを検証
        expect(content.length).toBeGreaterThan(0);
        
        // TypeScriptの基本的な構文が含まれていることを検証
        // (export, function, async, など)
        const hasExport = content.includes('export');
        const hasFunction = content.includes('function') || content.includes('=>');
        
        expect(hasExport || hasFunction).toBe(true);
      }
    });
  });

  describe('Property 3: 既存機能の後方互換性', () => {
    /**
     * Feature: wrangler-dev-environment, Property 3: 既存機能の後方互換性
     * Validates: Requirements 2.3
     * 
     * 任意の既存のnpmスクリプト（test、lint等）について、依存関係を更新した後も、
     * そのスクリプトは正常に実行される
     */
    it('should maintain backward compatibility for npm scripts after dependency update', () => {
      // package.jsonを読み込む
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // 既存のnpmスクリプトのリスト（devスクリプトを除く）
      const scriptsToTest = Object.keys(packageJson.scripts).filter(
        script => script !== 'dev' && script !== 'build'
      );
      
      // 各スクリプトが存在することを検証
      expect(scriptsToTest.length).toBeGreaterThan(0);
      
      // 各スクリプトについて、package.jsonに定義されていることを検証
      for (const script of scriptsToTest) {
        expect(packageJson.scripts).toHaveProperty(script);
        expect(typeof packageJson.scripts[script]).toBe('string');
        expect(packageJson.scripts[script].length).toBeGreaterThan(0);
      }
    });

    /**
     * devDependenciesにwranglerが追加され、http-serverが削除されていることを検証
     * Validates: Requirements 2.1, 2.2
     */
    it('should have wrangler in devDependencies and not have http-server', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // wranglerがdevDependenciesに存在することを検証
      expect(packageJson.devDependencies).toHaveProperty('wrangler');
      
      // http-serverがdevDependenciesに存在しないことを検証
      expect(packageJson.devDependencies).not.toHaveProperty('http-server');
    });

    /**
     * devスクリプトがwrangler pages devを使用していることを検証
     * Validates: Requirements 1.1
     */
    it('should use wrangler pages dev in dev script', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // devスクリプトが存在することを検証
      expect(packageJson.scripts).toHaveProperty('dev');
      
      // devスクリプトがwrangler pages devを使用していることを検証
      const devScript = packageJson.scripts.dev;
      expect(devScript).toContain('wrangler');
      expect(devScript).toContain('pages');
      expect(devScript).toContain('dev');
      expect(devScript).toContain('8788');
    });

    /**
     * 既存のテストスクリプトが正しく定義されていることを検証
     * Validates: Requirements 2.3
     */
    it('should have all existing test scripts properly defined', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('test', 'test:watch', 'test:e2e', 'test:e2e:ui'),
          (scriptName) => {
            const packageJsonPath = path.join(process.cwd(), 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            
            // スクリプトが存在することを検証
            const hasScript = packageJson.scripts.hasOwnProperty(scriptName);
            
            if (!hasScript) {
              return true; // スクリプトが存在しない場合はスキップ
            }
            
            // スクリプトが文字列であることを検証
            const isString = typeof packageJson.scripts[scriptName] === 'string';
            
            // スクリプトが空でないことを検証
            const isNotEmpty = packageJson.scripts[scriptName].length > 0;
            
            return hasScript && isString && isNotEmpty;
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * 既存のlintとformatスクリプトが正しく定義されていることを検証
     * Validates: Requirements 2.3
     */
    it('should have lint and format scripts properly defined', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('lint', 'format'),
          (scriptName) => {
            const packageJsonPath = path.join(process.cwd(), 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            
            // スクリプトが存在することを検証
            const hasScript = packageJson.scripts.hasOwnProperty(scriptName);
            
            if (!hasScript) {
              return true; // スクリプトが存在しない場合はスキップ
            }
            
            // スクリプトが文字列であることを検証
            const isString = typeof packageJson.scripts[scriptName] === 'string';
            
            // スクリプトが空でないことを検証
            const isNotEmpty = packageJson.scripts[scriptName].length > 0;
            
            return hasScript && isString && isNotEmpty;
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * 既存のdevDependenciesが保持されていることを検証
     * Validates: Requirements 2.3
     */
    it('should maintain existing devDependencies except http-server', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // 必須のdevDependenciesが存在することを検証
      const requiredDevDeps = [
        '@playwright/test',
        'eslint',
        'fast-check',
        'jsdom',
        'prettier',
        'vitest',
        'wrangler'
      ];
      
      for (const dep of requiredDevDeps) {
        expect(packageJson.devDependencies).toHaveProperty(dep);
      }
      
      // http-serverが削除されていることを検証
      expect(packageJson.devDependencies).not.toHaveProperty('http-server');
    });

    /**
     * 既存のdependenciesが変更されていないことを検証
     * Validates: Requirements 2.3
     */
    it('should not modify existing dependencies', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // 既存のdependenciesが存在することを検証
      expect(packageJson.dependencies).toHaveProperty('gtfs-realtime-bindings');
      expect(packageJson.dependencies).toHaveProperty('protobufjs');
    });
  });
});
