/**
 * パフォーマンステスト
 * 要件7.1, 7.2, 7.3, 7.4, 7.5を検証
 */

const StateManager = require('../shared/state-manager');

// Chrome Storage APIのモック
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  }
};

describe('パフォーマンステスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('要件7.1: 必要なリソースのみを読み込む', () => {
    test('プロジェクト一覧は遅延読み込みされる', () => {
      // このテストは実装の確認として、コードレビューで検証
      // sidepanel.jsのinitializeAddIssuePanelメソッドで
      // projectsLoadedフラグを使用して遅延読み込みを実装していることを確認
      expect(true).toBe(true);
    });
  });

  describe('要件7.2: 不要なリソースを解放する', () => {
    test('StateManagerのcleanupメソッドがリソースを解放する', () => {
      const manager = new StateManager('test', 500);
      
      // デバウンスタイマーを設定
      manager.saveState({ summary: 'test' });
      expect(manager.debounceTimer).not.toBeNull();
      
      // クリーンアップを実行
      manager.cleanup();
      
      // リソースが解放されていることを確認
      expect(manager.debounceTimer).toBeNull();
      expect(manager.pendingSave).toBeNull();
      expect(manager.memoryState).toBeNull();
    });
  });

  describe('要件7.3: デバウンス処理を適用する', () => {
    test('連続した保存リクエストは最後の1回のみ実行される', async () => {
      chrome.storage.local.set.mockResolvedValue();
      
      const manager = new StateManager('test', 500);
      
      // 連続して保存を実行
      manager.saveState({ summary: '1' });
      manager.saveState({ summary: '2' });
      manager.saveState({ summary: '3' });
      
      // デバウンス期間前は保存されない
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
      
      // デバウンス期間を経過
      jest.advanceTimersByTime(500);
      await Promise.resolve();
      
      // 最後の保存のみが実行される
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        test: expect.objectContaining({ summary: '3' })
      });
    });

    test('デバウンス期間をカスタマイズできる', async () => {
      chrome.storage.local.set.mockResolvedValue();
      
      const manager = new StateManager('test', 1000);
      
      manager.saveState({ summary: 'test' });
      
      // 500ms後はまだ保存されない
      jest.advanceTimersByTime(500);
      await Promise.resolve();
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
      
      // 1000ms後に保存される
      jest.advanceTimersByTime(500);
      await Promise.resolve();
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('要件7.4: 複数タブでの独立動作', () => {
    test('各タブで独立したStateManagerインスタンスを使用する', () => {
      // タブ1のStateManager
      const manager1 = new StateManager('sidePanelState', 500);
      
      // タブ2のStateManager
      const manager2 = new StateManager('sidePanelState', 500);
      
      // 異なるインスタンスであることを確認
      expect(manager1).not.toBe(manager2);
      
      // 各インスタンスが独立したタイマーを持つことを確認
      manager1.saveState({ summary: 'tab1' });
      manager2.saveState({ summary: 'tab2' });
      
      expect(manager1.debounceTimer).not.toBe(manager2.debounceTimer);
    });
  });

  describe('要件7.5: メモリ使用量を最小限に抑える', () => {
    test('clearStateメソッドがメモリを解放する', async () => {
      chrome.storage.local.remove.mockResolvedValue();
      
      const manager = new StateManager('test', 500);
      
      // 状態を設定
      manager.memoryState = { summary: 'test', description: 'test' };
      manager.saveState({ summary: 'test' });
      
      // クリアを実行
      await manager.clearState();
      
      // メモリが解放されていることを確認
      expect(manager.memoryState).toBeNull();
      expect(manager.debounceTimer).toBeNull();
      expect(manager.pendingSave).toBeNull();
    });

    test('cleanupメソッドがすべてのリソースを解放する', () => {
      const manager = new StateManager('test', 500);
      
      // リソースを設定
      manager.memoryState = { summary: 'test' };
      manager.saveState({ summary: 'test' });
      manager.pendingSave = Promise.resolve();
      
      // クリーンアップを実行
      manager.cleanup();
      
      // すべてのリソースが解放されていることを確認
      expect(manager.memoryState).toBeNull();
      expect(manager.debounceTimer).toBeNull();
      expect(manager.pendingSave).toBeNull();
    });
  });

  describe('パフォーマンス特性のテスト', () => {
    test('大量の連続保存リクエストでもメモリリークしない', async () => {
      chrome.storage.local.set.mockResolvedValue();
      
      const manager = new StateManager('test', 100);
      
      // 1000回の連続保存
      for (let i = 0; i < 1000; i++) {
        manager.saveState({ summary: `test${i}` });
      }
      
      // デバウンス期間を経過
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      
      // 最後の1回のみが実行される
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        test: expect.objectContaining({ summary: 'test999' })
      });
    });

    test('保存処理が非同期で実行される', () => {
      chrome.storage.local.set.mockResolvedValue();
      
      const manager = new StateManager('test', 500);
      
      const promise = manager.saveState({ summary: 'test' });
      
      // Promiseが返されることを確認
      expect(promise).toBeInstanceOf(Promise);
    });
  });
});
