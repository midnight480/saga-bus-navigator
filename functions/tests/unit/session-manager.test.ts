/**
 * セッションマネージャーの単体テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager, Session } from '../../lib/mcp/session-manager';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
    vi.useFakeTimers();
  });

  describe('セッション作成', () => {
    it('新しいセッションを作成できる', () => {
      const session = sessionManager.create();

      expect(session).toBeDefined();
      expect(session.id).toBeTruthy();
      expect(session.createdAt).toBeGreaterThan(0);
      expect(session.lastAccessedAt).toBeGreaterThan(0);
      expect(session.state.initialized).toBe(false);
    });

    it('セッションIDはUUID v4形式である', () => {
      const session = sessionManager.create();
      
      // UUID v4形式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(session.id).toMatch(uuidV4Pattern);
    });

    it('複数のセッションを作成すると異なるIDが生成される', () => {
      const session1 = sessionManager.create();
      const session2 = sessionManager.create();

      expect(session1.id).not.toBe(session2.id);
    });

    it('作成時刻と最終アクセス時刻が同じである', () => {
      const session = sessionManager.create();

      expect(session.createdAt).toBe(session.lastAccessedAt);
    });
  });

  describe('セッション取得', () => {
    it('存在するセッションを取得できる', () => {
      const created = sessionManager.create();
      const retrieved = sessionManager.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('存在しないセッションIDの場合はnullを返す', () => {
      const session = sessionManager.get('non-existent-id');

      expect(session).toBeNull();
    });

    it('セッション取得時に最終アクセス時刻が更新される', () => {
      const created = sessionManager.create();
      const initialAccessTime = created.lastAccessedAt;

      // 1秒経過
      vi.advanceTimersByTime(1000);

      const retrieved = sessionManager.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.lastAccessedAt).toBeGreaterThan(initialAccessTime);
    });
  });

  describe('セッション更新', () => {
    it('セッション状態を更新できる', () => {
      const session = sessionManager.create();

      sessionManager.update(session.id, {
        initialized: true,
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      });

      const updated = sessionManager.get(session.id);
      expect(updated?.state.initialized).toBe(true);
      expect(updated?.state.clientInfo?.name).toBe('test-client');
      expect(updated?.state.clientInfo?.version).toBe('1.0.0');
    });

    it('部分的な状態更新が可能', () => {
      const session = sessionManager.create();

      // 初期化フラグのみ更新
      sessionManager.update(session.id, {
        initialized: true,
      });

      const updated = sessionManager.get(session.id);
      expect(updated?.state.initialized).toBe(true);
      expect(updated?.state.clientInfo).toBeUndefined();
    });

    it('存在しないセッションIDの場合はエラーをスロー', () => {
      expect(() => {
        sessionManager.update('non-existent-id', { initialized: true });
      }).toThrow('Session not found');
    });

    it('更新時に最終アクセス時刻が更新される', () => {
      const session = sessionManager.create();
      const initialAccessTime = session.lastAccessedAt;

      // 1秒経過
      vi.advanceTimersByTime(1000);

      sessionManager.update(session.id, { initialized: true });

      const updated = sessionManager.get(session.id);
      expect(updated!.lastAccessedAt).toBeGreaterThan(initialAccessTime);
    });
  });

  describe('セッション削除', () => {
    it('セッションを削除できる', () => {
      const session = sessionManager.create();

      sessionManager.delete(session.id);

      const retrieved = sessionManager.get(session.id);
      expect(retrieved).toBeNull();
    });

    it('存在しないセッションIDを削除してもエラーにならない', () => {
      expect(() => {
        sessionManager.delete('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('タイムアウト処理', () => {
    it('タイムアウトしたセッションは取得できない', () => {
      const session = sessionManager.create();

      // 30分 + 1秒経過（デフォルトタイムアウト）
      vi.advanceTimersByTime(30 * 60 * 1000 + 1000);

      const retrieved = sessionManager.get(session.id);
      expect(retrieved).toBeNull();
    });

    it('タイムアウト前のセッションは取得できる', () => {
      const session = sessionManager.create();

      // 29分経過
      vi.advanceTimersByTime(29 * 60 * 1000);

      const retrieved = sessionManager.get(session.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(session.id);
    });

    it('カスタムタイムアウト時間を設定できる', () => {
      // 5分タイムアウト
      const customSessionManager = new SessionManager(5 * 60 * 1000);
      const session = customSessionManager.create();

      // 5分 + 1秒経過
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

      const retrieved = customSessionManager.get(session.id);
      expect(retrieved).toBeNull();
    });

    it('アクセスするとタイムアウトがリセットされる', () => {
      const session = sessionManager.create();

      // 20分経過
      vi.advanceTimersByTime(20 * 60 * 1000);

      // アクセス（タイムアウトリセット）
      sessionManager.get(session.id);

      // さらに20分経過（合計40分だが、最終アクセスから20分）
      vi.advanceTimersByTime(20 * 60 * 1000);

      const retrieved = sessionManager.get(session.id);
      expect(retrieved).toBeDefined();
    });
  });

  describe('クリーンアップ', () => {
    it('タイムアウトしたセッションをクリーンアップできる', () => {
      const session1 = sessionManager.create();
      const session2 = sessionManager.create();

      // 30分 + 1秒経過
      vi.advanceTimersByTime(30 * 60 * 1000 + 1000);

      const cleanedCount = sessionManager.cleanup();

      expect(cleanedCount).toBe(2);
      expect(sessionManager.getSessionCount()).toBe(0);
    });

    it('タイムアウトしていないセッションは残る', () => {
      const session1 = sessionManager.create();

      // 20分経過
      vi.advanceTimersByTime(20 * 60 * 1000);

      const session2 = sessionManager.create();

      // さらに15分経過（session1は35分、session2は15分）
      vi.advanceTimersByTime(15 * 60 * 1000);

      const cleanedCount = sessionManager.cleanup();

      expect(cleanedCount).toBe(1); // session1のみクリーンアップ
      expect(sessionManager.getSessionCount()).toBe(1);
      expect(sessionManager.get(session2.id)).toBeDefined();
    });

    it('クリーンアップ対象がない場合は0を返す', () => {
      sessionManager.create();

      // 10分経過
      vi.advanceTimersByTime(10 * 60 * 1000);

      const cleanedCount = sessionManager.cleanup();

      expect(cleanedCount).toBe(0);
      expect(sessionManager.getSessionCount()).toBe(1);
    });
  });

  describe('ユーティリティメソッド', () => {
    it('セッション数を取得できる', () => {
      expect(sessionManager.getSessionCount()).toBe(0);

      sessionManager.create();
      expect(sessionManager.getSessionCount()).toBe(1);

      sessionManager.create();
      expect(sessionManager.getSessionCount()).toBe(2);
    });

    it('全セッションをクリアできる', () => {
      sessionManager.create();
      sessionManager.create();

      expect(sessionManager.getSessionCount()).toBe(2);

      sessionManager.clear();

      expect(sessionManager.getSessionCount()).toBe(0);
    });
  });
});
