/**
 * State Manager
 * サイドパネルとポップアップの状態を管理するクラス
 * Chrome Storageへの保存・読み込み・クリア・デバウンス処理を提供
 * 
 * 要件7.3: 入力内容を保存する時、デバウンス処理を適用する
 * 要件7.5: メモリ使用量を最小限に抑える
 */

class StateManager {
  /**
   * @param {string} storageKey - Chrome Storageに保存する際のキー
   * @param {number} debounceMs - デバウンス処理の待機時間（ミリ秒）
   */
  constructor(storageKey, debounceMs = 500) {
    this.storageKey = storageKey;
    this.debounceMs = debounceMs;
    this.debounceTimer = null;
    this.memoryState = null;
    this.pendingSave = null; // 保留中の保存Promise
  }

  /**
   * 状態をChrome Storageに保存
   * 要件7.3: デバウンス処理を適用
   * @param {Object} state - 保存する状態オブジェクト
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async saveState(state) {
    // 既存のデバウンスタイマーをキャンセル
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 既存の保留中の保存をキャンセル
    if (this.pendingSave) {
      this.pendingSave = null;
    }

    // 新しいPromiseを作成
    this.pendingSave = new Promise((resolve) => {
      this.debounceTimer = setTimeout(async () => {
        const result = await this.saveStateWithRetry(state, 3);
        this.pendingSave = null;
        resolve(result);
      }, this.debounceMs);
    });

    return this.pendingSave;
  }

  /**
   * リトライ機能付きで状態を保存
   * 要件8.2: 状態の保存失敗時のリトライ処理
   * @param {Object} state - 保存する状態オブジェクト
   * @param {number} maxRetries - 最大リトライ回数
   * @returns {Promise<{success: boolean, message?: string, retries?: number}>}
   */
  async saveStateWithRetry(state, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const stateWithTimestamp = {
          ...state,
          timestamp: Date.now()
        };

        await chrome.storage.local.set({
          [this.storageKey]: stateWithTimestamp
        });

        this.memoryState = stateWithTimestamp;
        
        if (i > 0) {
          console.log(`状態の保存に成功しました（リトライ ${i} 回目）`);
        }
        
        return { success: true, retries: i };
      } catch (error) {
        console.error(`保存試行 ${i + 1} 回目が失敗:`, error);
        
        if (i === maxRetries - 1) {
          // 最後のリトライも失敗した場合
          return {
            success: false,
            message: '状態の保存に失敗しました。ブラウザの設定を確認してください。',
            retries: i + 1
          };
        }
        
        // 次のリトライまで待機（指数バックオフ）
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  /**
   * Chrome Storageから状態を読み込み
   * 要件8.3: 状態の復元失敗時のデフォルト状態処理
   * @returns {Promise<Object>} 読み込んだ状態オブジェクト
   */
  async loadState() {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      const state = result[this.storageKey];

      if (!state) {
        console.log('保存された状態が見つかりません。デフォルト状態を使用します。');
        return this.getDefaultState();
      }

      if (!this.validateState(state)) {
        console.warn('無効な状態データが検出されました。デフォルト状態を使用します。');
        // 破損した状態をクリア
        await this.clearState();
        return this.getDefaultState();
      }

      this.memoryState = state;
      return state;
    } catch (error) {
      console.error('状態の読み込みに失敗しました:', error);
      console.log('デフォルト状態で起動します。');
      return this.getDefaultState();
    }
  }

  /**
   * Chrome Storageから状態をクリア
   * 要件7.5: メモリ使用量を最小限に抑える
   * @returns {Promise<{success: boolean}>}
   */
  async clearState() {
    try {
      // 保留中の保存をキャンセル
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }

      if (this.pendingSave) {
        this.pendingSave = null;
      }

      await chrome.storage.local.remove(this.storageKey);
      this.memoryState = null;

      return { success: true };
    } catch (error) {
      console.error('Failed to clear state:', error);
      return { success: false };
    }
  }

  /**
   * メモリ上の状態をクリア（テスト用）
   */
  clearMemory() {
    this.memoryState = null;
  }

  /**
   * 状態の妥当性を検証
   * @param {Object} state - 検証する状態オブジェクト
   * @returns {boolean}
   */
  validateState(state) {
    return (
      typeof state === 'object' &&
      state !== null &&
      typeof state.summary === 'string' &&
      typeof state.description === 'string'
    );
  }

  /**
   * デフォルト状態を取得
   * @returns {Object}
   */
  getDefaultState() {
    return {
      selectedProject: null,
      issueType: null,
      summary: '',
      description: '',
      currentTab: null,
      timestamp: Date.now()
    };
  }

  /**
   * リソースのクリーンアップ
   * 要件7.2: サイドパネルが閉じられる時、不要なリソースを解放する
   */
  cleanup() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    if (this.pendingSave) {
      this.pendingSave = null;
    }
    
    this.memoryState = null;
    console.log('StateManager: リソースをクリーンアップしました');
  }
}

// Node.js環境（テスト用）とブラウザ環境の両方で動作するようにエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateManager;
}

// ブラウザ環境ではwindowに登録（テスト環境でのeval対応）
if (typeof window !== 'undefined') {
  window.StateManager = StateManager;
}
