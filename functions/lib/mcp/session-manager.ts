/**
 * セッション管理
 * 
 * MCPセッションの作成、取得、タイムアウト処理、クリーンアップを行う
 * 要件1.1: セッション管理部分
 */

/**
 * セッション情報
 */
export interface Session {
  id: string; // UUID v4
  createdAt: number; // タイムスタンプ（ミリ秒）
  lastAccessedAt: number; // 最終アクセス時刻（ミリ秒）
  state: {
    initialized: boolean;
    clientInfo?: {
      name: string;
      version: string;
    };
  };
}

/**
 * セッションマネージャー
 */
export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private readonly timeoutMs: number;

  /**
   * コンストラクタ
   * @param timeoutMs セッションタイムアウト時間（ミリ秒）デフォルト: 30分
   */
  constructor(timeoutMs: number = 30 * 60 * 1000) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * 新しいセッションを作成
   * @returns 作成されたセッション
   */
  create(): Session {
    const session: Session = {
      id: this.generateSessionId(),
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      state: {
        initialized: false,
      },
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * セッションIDでセッションを取得
   * @param id セッションID
   * @returns セッション（存在しない場合はnull）
   */
  get(id: string): Session | null {
    const session = this.sessions.get(id);
    
    if (!session) {
      return null;
    }

    // タイムアウトチェック
    if (this.isExpired(session)) {
      this.delete(id);
      return null;
    }

    // 最終アクセス時刻を更新
    session.lastAccessedAt = Date.now();
    return session;
  }

  /**
   * セッション状態を更新
   * @param id セッションID
   * @param state 更新する状態
   */
  update(id: string, state: Partial<Session['state']>): void {
    const session = this.sessions.get(id);
    
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    // 状態を更新
    session.state = {
      ...session.state,
      ...state,
    };

    // 最終アクセス時刻を更新
    session.lastAccessedAt = Date.now();
  }

  /**
   * セッションを削除
   * @param id セッションID
   */
  delete(id: string): void {
    this.sessions.delete(id);
  }

  /**
   * タイムアウトしたセッションをクリーンアップ
   * @returns クリーンアップされたセッション数
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (this.isExpired(session)) {
        this.sessions.delete(id);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * セッションがタイムアウトしているかチェック
   * @param session セッション
   * @returns タイムアウトしている場合はtrue
   */
  private isExpired(session: Session): boolean {
    const now = Date.now();
    return now - session.lastAccessedAt > this.timeoutMs;
  }

  /**
   * UUID v4形式のセッションIDを生成
   * @returns セッションID
   */
  private generateSessionId(): string {
    // UUID v4形式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // y は 8, 9, a, b のいずれか
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * 全セッション数を取得（テスト用）
   * @returns セッション数
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * 全セッションをクリア（テスト用）
   */
  clear(): void {
    this.sessions.clear();
  }
}
