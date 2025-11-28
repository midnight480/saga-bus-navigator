/**
 * UIController - createDirectionLabel()メソッドの単体テスト
 * 要件: 1.1, 1.2, 1.3, 1.4, 5.1
 */

import { describe, it, expect, beforeEach } from 'vitest';

// UIControllerクラスをインポート
import '../js/app.js';

describe('UIController - createDirectionLabel()', () => {
  let uiController;

  beforeEach(() => {
    // UIControllerのインスタンスを作成
    uiController = new window.UIController();
  });

  describe('direction="0"（往路）の場合', () => {
    it('往路ラベルを生成する', () => {
      const label = uiController.createDirectionLabel('0');
      
      expect(label).not.toBeNull();
      expect(label.tagName).toBe('SPAN');
      expect(label.className).toContain('direction-label');
      expect(label.className).toContain('direction-label-outbound');
    });

    it('aria-label属性が"往路"に設定される', () => {
      const label = uiController.createDirectionLabel('0');
      
      expect(label.getAttribute('aria-label')).toBe('往路');
    });

    it('アイコン要素とテキスト要素を含む', () => {
      const label = uiController.createDirectionLabel('0');
      
      const icon = label.querySelector('.direction-label-icon');
      const text = label.querySelector('.direction-label-text');
      
      expect(icon).not.toBeNull();
      expect(text).not.toBeNull();
    });

    it('テキスト要素にdata-short="往"とdata-full="往路"が設定される', () => {
      const label = uiController.createDirectionLabel('0');
      
      const text = label.querySelector('.direction-label-text');
      
      expect(text.getAttribute('data-short')).toBe('往');
      expect(text.getAttribute('data-full')).toBe('往路');
    });
  });

  describe('direction="1"（復路）の場合', () => {
    it('復路ラベルを生成する', () => {
      const label = uiController.createDirectionLabel('1');
      
      expect(label).not.toBeNull();
      expect(label.tagName).toBe('SPAN');
      expect(label.className).toContain('direction-label');
      expect(label.className).toContain('direction-label-inbound');
    });

    it('aria-label属性が"復路"に設定される', () => {
      const label = uiController.createDirectionLabel('1');
      
      expect(label.getAttribute('aria-label')).toBe('復路');
    });

    it('アイコン要素とテキスト要素を含む', () => {
      const label = uiController.createDirectionLabel('1');
      
      const icon = label.querySelector('.direction-label-icon');
      const text = label.querySelector('.direction-label-text');
      
      expect(icon).not.toBeNull();
      expect(text).not.toBeNull();
    });

    it('テキスト要素にdata-short="復"とdata-full="復路"が設定される', () => {
      const label = uiController.createDirectionLabel('1');
      
      const text = label.querySelector('.direction-label-text');
      
      expect(text.getAttribute('data-short')).toBe('復');
      expect(text.getAttribute('data-full')).toBe('復路');
    });
  });

  describe('direction="unknown"の場合', () => {
    it('ラベルを生成しない（nullを返す）', () => {
      const label = uiController.createDirectionLabel('unknown');
      
      expect(label).toBeNull();
    });
  });

  describe('directionがundefinedまたはnullの場合', () => {
    it('undefinedの場合はnullを返す', () => {
      const label = uiController.createDirectionLabel(undefined);
      
      expect(label).toBeNull();
    });

    it('nullの場合はnullを返す', () => {
      const label = uiController.createDirectionLabel(null);
      
      expect(label).toBeNull();
    });

    it('空文字列の場合はnullを返す', () => {
      const label = uiController.createDirectionLabel('');
      
      expect(label).toBeNull();
    });
  });

  describe('不正な方向値の場合', () => {
    it('不正な値の場合はnullを返す', () => {
      const label = uiController.createDirectionLabel('2');
      
      expect(label).toBeNull();
    });

    it('文字列以外の値の場合はnullを返す', () => {
      const label1 = uiController.createDirectionLabel(0);
      const label2 = uiController.createDirectionLabel(1);
      
      // 数値の0と1は文字列の'0'と'1'とは異なるため、nullを返す
      expect(label1).toBeNull();
      expect(label2).toBeNull();
    });
  });

  describe('アクセシビリティ', () => {
    it('往路ラベルにaria-label属性が設定される', () => {
      const label = uiController.createDirectionLabel('0');
      
      expect(label.hasAttribute('aria-label')).toBe(true);
      expect(label.getAttribute('aria-label')).toBe('往路');
    });

    it('復路ラベルにaria-label属性が設定される', () => {
      const label = uiController.createDirectionLabel('1');
      
      expect(label.hasAttribute('aria-label')).toBe(true);
      expect(label.getAttribute('aria-label')).toBe('復路');
    });
  });

  describe('レスポンシブ対応', () => {
    it('往路ラベルにレスポンシブ用のdata属性が設定される', () => {
      const label = uiController.createDirectionLabel('0');
      const text = label.querySelector('.direction-label-text');
      
      expect(text.getAttribute('data-short')).toBe('往');
      expect(text.getAttribute('data-full')).toBe('往路');
    });

    it('復路ラベルにレスポンシブ用のdata属性が設定される', () => {
      const label = uiController.createDirectionLabel('1');
      const text = label.querySelector('.direction-label-text');
      
      expect(text.getAttribute('data-short')).toBe('復');
      expect(text.getAttribute('data-full')).toBe('復路');
    });
  });
});
