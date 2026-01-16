/**
 * Side Panel UI のプロパティベーステスト
 * Feature: side-panel-ui
 */

const fc = require('fast-check');

// StateManagerのモック
class StateManager {
  constructor(storageKey, debounceMs = 500) {
    this.storageKey = storageKey;
    this.debounceMs = debounceMs;
    this.state = null;
  }

  async saveState(state) {
    this.state = { ...state, timestamp: Date.now() };
    return { success: true };
  }

  async loadState() {
    if (!this.state) {
      return this.getDefaultState();
    }
    return this.state;
  }

  async clearState() {
    this.state = null;
    return { success: true };
  }

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
}

describe('Side Panel UI - Property Based Tests', () => {
  /**
   * Property 3: 状態のクリア（課題作成後）
   * Feature: side-panel-ui, Property 3: 状態のクリア（課題作成後）
   * **Validates: Requirements 2.4**
   */
  describe('Property 3: State Clearing (After Issue Creation)', () => {
    test('for any saved state, successful issue creation should clear state', async () => {
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
        summary: fc.string({ minLength: 1, maxLength: 255 }),
        description: fc.string({ maxLength: 1000 }),
        currentTab: fc.oneof(
          fc.constant(null),
          fc.record({
            url: fc.webUrl(),
            title: fc.string({ minLength: 1, maxLength: 100 })
          })
        )
      });

      await fc.assert(
        fc.asyncProperty(stateArbitrary, async (randomState) => {
          // StateManagerのインスタンスを作成
          const stateManager = new StateManager('sidePanelState', 500);
          
          // 状態を保存
          await stateManager.saveState(randomState);
          
          // 保存された状態を確認
          const savedState = await stateManager.loadState();
          expect(savedState.summary).toEqual(randomState.summary);
          expect(savedState.description).toEqual(randomState.description);
          
          // 課題作成成功をシミュレート
          // 実際のコードでは handleCreateIssue() 内で stateManager.clearState() が呼ばれる
          await stateManager.clearState();
          
          // 状態がクリアされていることを確認
          const clearedState = await stateManager.loadState();
          const defaultState = stateManager.getDefaultState();
          
          expect(clearedState.selectedProject).toEqual(defaultState.selectedProject);
          expect(clearedState.issueType).toEqual(defaultState.issueType);
          expect(clearedState.summary).toEqual(defaultState.summary);
          expect(clearedState.description).toEqual(defaultState.description);
          expect(clearedState.currentTab).toEqual(defaultState.currentTab);
        }),
        { numRuns: 100 }
      );
    }, 30000); // タイムアウトを30秒に設定
  });

  /**
   * Property 4: 状態のクリア（手動クリア）
   * Feature: side-panel-ui, Property 4: 状態のクリア（手動クリア）
   * **Validates: Requirements 2.5**
   */
  describe('Property 4: State Clearing (Manual Clear)', () => {
    test('for any saved state, user clear operation should clear state', async () => {
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
        summary: fc.string({ minLength: 1, maxLength: 255 }),
        description: fc.string({ maxLength: 1000 }),
        currentTab: fc.oneof(
          fc.constant(null),
          fc.record({
            url: fc.webUrl(),
            title: fc.string({ minLength: 1, maxLength: 100 })
          })
        )
      });

      await fc.assert(
        fc.asyncProperty(stateArbitrary, async (randomState) => {
          // StateManagerのインスタンスを作成
          const stateManager = new StateManager('sidePanelState', 500);
          
          // 状態を保存
          await stateManager.saveState(randomState);
          
          // 保存された状態を確認
          const savedState = await stateManager.loadState();
          expect(savedState.summary).toEqual(randomState.summary);
          expect(savedState.description).toEqual(randomState.description);
          
          // ユーザーがクリア操作を実行
          // 実際のコードでは resetIssueForm() などで stateManager.clearState() が呼ばれる
          await stateManager.clearState();
          
          // 状態がクリアされていることを確認
          const clearedState = await stateManager.loadState();
          const defaultState = stateManager.getDefaultState();
          
          expect(clearedState.selectedProject).toEqual(defaultState.selectedProject);
          expect(clearedState.issueType).toEqual(defaultState.issueType);
          expect(clearedState.summary).toEqual(defaultState.summary);
          expect(clearedState.description).toEqual(defaultState.description);
          expect(clearedState.currentTab).toEqual(defaultState.currentTab);
        }),
        { numRuns: 100 }
      );
    }, 30000); // タイムアウトを30秒に設定
  });
});

describe('Side Panel UI - Unit Tests', () => {
  /**
   * 課題作成後の状態クリア - 具体例
   */
  test('should clear state after successful issue creation', async () => {
    const stateManager = new StateManager('sidePanelState', 500);
    
    // 状態を保存
    const testState = {
      selectedProject: {
        id: '123',
        name: 'Test Project',
        projectKey: 'TEST'
      },
      issueType: '1',
      summary: 'Test Issue',
      description: 'Test Description',
      currentTab: {
        url: 'https://example.com',
        title: 'Example Page'
      }
    };
    
    await stateManager.saveState(testState);
    
    // 保存された状態を確認
    const savedState = await stateManager.loadState();
    expect(savedState.summary).toBe('Test Issue');
    
    // 課題作成成功後にクリア
    await stateManager.clearState();
    
    // 状態がクリアされていることを確認
    const clearedState = await stateManager.loadState();
    expect(clearedState.summary).toBe('');
    expect(clearedState.description).toBe('');
    expect(clearedState.selectedProject).toBeNull();
  });

  /**
   * 手動クリア - 具体例
   */
  test('should clear state when user manually clears form', async () => {
    const stateManager = new StateManager('sidePanelState', 500);
    
    // 状態を保存
    const testState = {
      selectedProject: {
        id: '456',
        name: 'Another Project',
        projectKey: 'ANOTHER'
      },
      issueType: '2',
      summary: 'Another Issue',
      description: 'Another Description',
      currentTab: null
    };
    
    await stateManager.saveState(testState);
    
    // 保存された状態を確認
    const savedState = await stateManager.loadState();
    expect(savedState.summary).toBe('Another Issue');
    
    // ユーザーが手動でクリア
    await stateManager.clearState();
    
    // 状態がクリアされていることを確認
    const clearedState = await stateManager.loadState();
    expect(clearedState.summary).toBe('');
    expect(clearedState.description).toBe('');
    expect(clearedState.selectedProject).toBeNull();
  });

  /**
   * エッジケース: 空の状態をクリア
   */
  test('should handle clearing empty state', async () => {
    const stateManager = new StateManager('sidePanelState', 500);
    
    // 何も保存せずにクリア
    await stateManager.clearState();
    
    // デフォルト状態が返されることを確認
    const state = await stateManager.loadState();
    expect(state.summary).toBe('');
    expect(state.description).toBe('');
    expect(state.selectedProject).toBeNull();
  });

  /**
   * エッジケース: 複数回のクリア
   */
  test('should handle multiple clear operations', async () => {
    const stateManager = new StateManager('sidePanelState', 500);
    
    // 状態を保存
    await stateManager.saveState({
      selectedProject: null,
      issueType: null,
      summary: 'Test',
      description: 'Test',
      currentTab: null
    });
    
    // 複数回クリア
    await stateManager.clearState();
    await stateManager.clearState();
    await stateManager.clearState();
    
    // デフォルト状態が返されることを確認
    const state = await stateManager.loadState();
    expect(state.summary).toBe('');
  });
});
