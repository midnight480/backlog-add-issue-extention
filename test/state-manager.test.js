/**
 * State Manager のプロパティベーステスト
 * Feature: side-panel-ui
 */

const StateManager = require('../shared/state-manager');
const fc = require('fast-check');

describe('State Manager - Property Based Tests', () => {
  let stateManager;

  beforeEach(() => {
    // Chrome Storage APIのモックをリセット
    jest.clearAllMocks();
    
    // chrome.storage.local.set のモック実装
    chrome.storage.local.set.mockImplementation((data) => {
      return Promise.resolve();
    });
    
    // chrome.storage.local.get のモック実装
    chrome.storage.local.get.mockImplementation((key) => {
      // 保存されたデータを返す（最後にsetされたデータ）
      const lastCall = chrome.storage.local.set.mock.calls[chrome.storage.local.set.mock.calls.length - 1];
      if (lastCall && lastCall[0]) {
        return Promise.resolve(lastCall[0]);
      }
      return Promise.resolve({});
    });
    
    // chrome.storage.local.remove のモック実装
    chrome.storage.local.remove.mockImplementation(() => {
      return Promise.resolve();
    });

    stateManager = new StateManager('testKey', 100);
  });

  /**
   * Property 1: 状態の永続化（ラウンドトリップ）
   * Feature: side-panel-ui, Property 1: 状態の永続化（ラウンドトリップ）
   * Validates: Requirements 2.2, 2.3
   */
  describe('Property 1: State Persistence (Round Trip)', () => {
    test('for any input state, closing and reopening should restore state', async () => {
      // ランダムな状態を生成するArbitrary
      const stateArbitrary = fc.record({
        selectedProject: fc.oneof(
          fc.constant(null),
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            projectKey: fc.string({ minLength: 1, maxLength: 20 })
          })
        ),
        issueType: fc.oneof(
          fc.constant(null),
          fc.string({ minLength: 1, maxLength: 10 })
        ),
        summary: fc.string({ maxLength: 255 }),
        description: fc.string({ maxLength: 1000 })
      });

      await fc.assert(
        fc.asyncProperty(stateArbitrary, async (randomState) => {
          // 状態を保存
          await stateManager.saveState(randomState);
          
          // デバウンス期間を待つ
          await new Promise(resolve => setTimeout(resolve, 150));
          
          // メモリをクリア（サイドパネルを閉じる）
          stateManager.clearMemory();
          
          // 状態を復元（サイドパネルを開く）
          const restoredState = await stateManager.loadState();
          
          // 復元された状態が元の状態と一致することを確認
          // timestampは自動的に追加されるので除外して比較
          expect(restoredState.selectedProject).toEqual(randomState.selectedProject);
          expect(restoredState.issueType).toEqual(randomState.issueType);
          expect(restoredState.summary).toEqual(randomState.summary);
          expect(restoredState.description).toEqual(randomState.description);
          expect(typeof restoredState.timestamp).toBe('number');
        }),
        { numRuns: 100 }
      );
    }, 30000); // タイムアウトを30秒に設定
  });

  /**
   * Property 2: 自動保存
   * Feature: side-panel-ui, Property 2: 自動保存
   * Validates: Requirements 2.1
   */
  describe('Property 2: Auto Save', () => {
    test('for any form input, it should be automatically saved to storage', async () => {
      const stateArbitrary = fc.record({
        selectedProject: fc.oneof(
          fc.constant(null),
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            projectKey: fc.string({ minLength: 1, maxLength: 20 })
          })
        ),
        issueType: fc.oneof(
          fc.constant(null),
          fc.string({ minLength: 1, maxLength: 10 })
        ),
        summary: fc.string({ maxLength: 255 }),
        description: fc.string({ maxLength: 1000 })
      });

      await fc.assert(
        fc.asyncProperty(stateArbitrary, async (randomState) => {
          // 状態を保存
          const result = await stateManager.saveState(randomState);
          
          // デバウンス期間を待つ
          await new Promise(resolve => setTimeout(resolve, 150));
          
          // chrome.storage.local.setが呼ばれたことを確認
          expect(chrome.storage.local.set).toHaveBeenCalled();
          
          // 保存が成功したことを確認
          expect(result.success).toBe(true);
          
          // 保存されたデータを確認
          const savedData = chrome.storage.local.set.mock.calls[chrome.storage.local.set.mock.calls.length - 1][0];
          expect(savedData.testKey).toBeDefined();
          expect(savedData.testKey.summary).toEqual(randomState.summary);
          expect(savedData.testKey.description).toEqual(randomState.description);
        }),
        { numRuns: 100 }
      );
    }, 30000);
  });

  /**
   * Property 12: デバウンス処理
   * Feature: side-panel-ui, Property 12: デバウンス処理
   * Validates: Requirements 7.3
   */
  describe('Property 12: Debounce Processing', () => {
    test('for any continuous inputs, only last save should execute within debounce period', async () => {
      // 連続入力回数を生成するArbitrary（2〜10回）
      const inputCountArbitrary = fc.integer({ min: 2, max: 10 });
      
      const stateArbitrary = fc.record({
        selectedProject: fc.constant(null),
        issueType: fc.constant(null),
        summary: fc.string({ maxLength: 100 }),
        description: fc.string({ maxLength: 100 })
      });

      await fc.assert(
        fc.asyncProperty(
          inputCountArbitrary,
          fc.array(stateArbitrary, { minLength: 2, maxLength: 10 }),
          async (inputCount, states) => {
            // 新しいStateManagerインスタンスを作成
            const manager = new StateManager('testKey', 100);
            jest.clearAllMocks();
            
            // 連続して状態を保存
            const statesToSave = states.slice(0, inputCount);
            for (const state of statesToSave) {
              manager.saveState(state);
              // 短い間隔で連続入力をシミュレート
              await new Promise(resolve => setTimeout(resolve, 20));
            }
            
            // デバウンス期間を待つ
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // chrome.storage.local.setが1回だけ呼ばれたことを確認
            expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
            
            // 最後の状態が保存されていることを確認
            const lastState = statesToSave[statesToSave.length - 1];
            const savedData = chrome.storage.local.set.mock.calls[0][0];
            expect(savedData.testKey.summary).toEqual(lastState.summary);
            expect(savedData.testKey.description).toEqual(lastState.description);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });
});

describe('State Manager - Unit Tests', () => {
  let stateManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    chrome.storage.local.set.mockImplementation((data) => {
      return Promise.resolve();
    });
    
    chrome.storage.local.get.mockImplementation((key) => {
      const lastCall = chrome.storage.local.set.mock.calls[chrome.storage.local.set.mock.calls.length - 1];
      if (lastCall && lastCall[0]) {
        return Promise.resolve(lastCall[0]);
      }
      return Promise.resolve({});
    });
    
    chrome.storage.local.remove.mockImplementation(() => {
      return Promise.resolve();
    });

    stateManager = new StateManager('testKey', 100);
  });

  test('should return default state when storage is empty', async () => {
    chrome.storage.local.get.mockResolvedValue({});
    
    const state = await stateManager.loadState();
    
    expect(state).toEqual(stateManager.getDefaultState());
  });

  test('should clear state from storage', async () => {
    await stateManager.clearState();
    
    expect(chrome.storage.local.remove).toHaveBeenCalledWith('testKey');
  });

  test('should validate state correctly', () => {
    const validState = {
      summary: 'Test',
      description: 'Test description'
    };
    
    expect(stateManager.validateState(validState)).toBe(true);
    
    const invalidState = {
      summary: 123,
      description: 'Test'
    };
    
    expect(stateManager.validateState(invalidState)).toBe(false);
  });
});
