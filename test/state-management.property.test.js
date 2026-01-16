/**
 * 状態管理機能の継続性のプロパティベーステスト
 * Feature: remove-popup-use-sidepanel-only
 * Property 4: 状態管理機能の継続性
 * **Validates: Requirements 4.3**
 */

const fc = require('fast-check');
const StateManager = require('../shared/state-manager');

describe('Property 4: 状態管理機能の継続性', () => {
  let mockChrome;
  let stateManager;

  beforeEach(() => {
    // Chrome API のモック
    mockChrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn().mockResolvedValue(undefined),
          remove: jest.fn().mockResolvedValue(undefined)
        }
      }
    };

    global.chrome = mockChrome;

    // StateManagerのインスタンスを作成
    stateManager = new StateManager('testState', 50); // デバウンス時間をさらに短く設定

    // コンソールログをモック
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (stateManager) {
      stateManager.cleanup();
    }
  });

  /**
   * 状態データのジェネレーター
   */
  const stateArbitrary = fc.record({
    selectedProject: fc.oneof(
      fc.constant(null),
      fc.record({
        id: fc.integer({ min: 1, max: 999999 }).map(n => n.toString()),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        projectKey: fc.string({ minLength: 2, maxLength: 10 }).map(s => 
          s.toUpperCase().replace(/[^A-Z0-9]/g, 'A')
        )
      })
    ),
    issueType: fc.oneof(
      fc.constant(null),
      fc.integer({ min: 1, max: 100 }).map(n => n.toString())
    ),
    summary: fc.string({ maxLength: 255 }),
    description: fc.string({ maxLength: 1000 }),
    currentTab: fc.oneof(
      fc.constant(null),
      fc.record({
        url: fc.webUrl(),
        title: fc.string({ minLength: 1, maxLength: 100 })
      })
    )
  });

  /**
   * Property 4.1: 状態の保存が正常に動作する
   * **Validates: Requirements 4.3**
   * 
   * For any 状態データにおいて、状態の保存が
   * Popup削除後も正常に動作するべきである
   */
  test('Property 4.1: 任意の状態データを保存できる', async () => {
    await fc.assert(
      fc.asyncProperty(stateArbitrary, async (state) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // 状態を保存
        const savePromise = stateManager.saveState(state);
        
        // デバウンス時間を待つ
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const result = await savePromise;

        // 保存が成功することを検証
        expect(result.success).toBe(true);

        // Chrome Storage APIが呼ばれることを検証
        expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
          testState: expect.objectContaining({
            selectedProject: state.selectedProject,
            issueType: state.issueType,
            summary: state.summary,
            description: state.description,
            currentTab: state.currentTab,
            timestamp: expect.any(Number)
          })
        });
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 4.2: 状態の読み込みが正常に動作する
   * **Validates: Requirements 4.3**
   * 
   * For any 保存された状態データにおいて、状態の読み込みが
   * Popup削除後も正常に動作するべきである
   */
  test('Property 4.2: 任意の保存された状態データを読み込める', async () => {
    await fc.assert(
      fc.asyncProperty(stateArbitrary, async (state) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // タイムスタンプを追加
        const stateWithTimestamp = {
          ...state,
          timestamp: Date.now()
        };

        // Chrome Storage APIのモックを設定
        mockChrome.storage.local.get.mockResolvedValue({
          testState: stateWithTimestamp
        });

        // 状態を読み込み
        const loadedState = await stateManager.loadState();

        // 読み込んだ状態が保存した状態と一致することを検証
        expect(loadedState).toEqual(stateWithTimestamp);
        expect(loadedState.selectedProject).toEqual(state.selectedProject);
        expect(loadedState.issueType).toEqual(state.issueType);
        expect(loadedState.summary).toEqual(state.summary);
        expect(loadedState.description).toEqual(state.description);
        expect(loadedState.currentTab).toEqual(state.currentTab);
        expect(loadedState.timestamp).toBeDefined();

        // Chrome Storage APIが呼ばれることを検証
        expect(mockChrome.storage.local.get).toHaveBeenCalledWith('testState');
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 4.3: 状態のクリアが正常に動作する
   * **Validates: Requirements 4.3**
   * 
   * For any 状態において、状態のクリアが
   * Popup削除後も正常に動作するべきである
   */
  test('Property 4.3: 任意の状態をクリアできる', async () => {
    await fc.assert(
      fc.asyncProperty(stateArbitrary, async (state) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // まず状態を保存
        const savePromise = stateManager.saveState(state);
        await new Promise(resolve => setTimeout(resolve, 100));
        await savePromise;

        // モックをリセット
        jest.clearAllMocks();

        // 状態をクリア
        const result = await stateManager.clearState();

        // クリアが成功することを検証
        expect(result.success).toBe(true);

        // Chrome Storage APIが呼ばれることを検証
        expect(mockChrome.storage.local.remove).toHaveBeenCalledWith('testState');

        // メモリ上の状態もクリアされることを検証
        expect(stateManager.memoryState).toBeNull();
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 4.4: 保存・読み込み・クリアのサイクルが正常に動作する
   * **Validates: Requirements 4.3**
   * 
   * For any 状態データにおいて、保存→読み込み→クリアのサイクルが
   * Popup削除後も正常に動作するべきである
   */
  test('Property 4.4: 保存・読み込み・クリアのサイクルが正常に動作する', async () => {
    await fc.assert(
      fc.asyncProperty(stateArbitrary, async (state) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // 1. 状態を保存
        const savePromise = stateManager.saveState(state);
        await new Promise(resolve => setTimeout(resolve, 100));
        const saveResult = await savePromise;
        expect(saveResult.success).toBe(true);

        // 保存された状態を取得
        const savedState = mockChrome.storage.local.set.mock.calls[0][0].testState;

        // 2. 状態を読み込み
        mockChrome.storage.local.get.mockResolvedValue({
          testState: savedState
        });
        const loadedState = await stateManager.loadState();
        expect(loadedState).toEqual(savedState);

        // 3. 状態をクリア
        const clearResult = await stateManager.clearState();
        expect(clearResult.success).toBe(true);

        // 4. クリア後にデフォルト状態が読み込まれることを確認
        mockChrome.storage.local.get.mockResolvedValue({});
        const defaultState = await stateManager.loadState();
        
        // タイムスタンプ以外のフィールドを検証
        expect(defaultState.selectedProject).toBeNull();
        expect(defaultState.issueType).toBeNull();
        expect(defaultState.summary).toBe('');
        expect(defaultState.description).toBe('');
        expect(defaultState.currentTab).toBeNull();
        expect(defaultState.timestamp).toBeDefined();
      }),
      { 
        numRuns: 20, // サイクルテストなので反復回数を減らす
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 4.5: デバウンス処理の基本動作
   * **Validates: Requirements 4.3**
   * 
   * デバウンス処理により、連続した状態更新が適切に処理されるべきである
   */
  test('Property 4.5: デバウンス処理の基本動作が正常に機能する', async () => {
    // テストごとにモックとStateManagerをリセット
    jest.clearAllMocks();
    stateManager.cleanup();
    stateManager = new StateManager('testState', 50);

    const state1 = { selectedProject: null, issueType: null, summary: 'test1', description: 'desc1', currentTab: null };
    const state2 = { selectedProject: null, issueType: null, summary: 'test2', description: 'desc2', currentTab: null };

    // 最初の状態を保存
    const promise1 = stateManager.saveState(state1);
    
    // すぐに2番目の状態を保存（デバウンス時間内）
    const promise2 = stateManager.saveState(state2);

    // デバウンス時間を待つ
    await new Promise(resolve => setTimeout(resolve, 150));

    // 2番目のPromiseのみを待つ（最後の保存のみが有効）
    const result = await promise2;

    // 保存が成功することを検証
    expect(result.success).toBe(true);

    // デバウンスにより1回だけ保存されることを検証
    expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(1);

    // 最後の状態（state2）が保存されることを検証
    const savedState = mockChrome.storage.local.set.mock.calls[0][0].testState;
    expect(savedState.summary).toEqual(state2.summary);
    expect(savedState.description).toEqual(state2.description);
  }, 5000);

  /**
   * Property 4.6: リトライ処理が正常に動作する
   * **Validates: Requirements 4.3**
   * 
   * For any 保存失敗のシナリオにおいて、リトライ処理により
   * 最終的に保存が成功するか、適切なエラーが返されるべきである
   */
  test('Property 4.6: 保存失敗時にリトライ処理が動作する', async () => {
    await fc.assert(
      fc.asyncProperty(
        stateArbitrary,
        fc.integer({ min: 0, max: 2 }), // 失敗回数（0〜2回）
        async (state, failureCount) => {
          // テストごとにモックをリセット
          jest.clearAllMocks();

          // 指定回数だけ失敗してから成功するようにモックを設定
          let callCount = 0;
          mockChrome.storage.local.set.mockImplementation(() => {
            callCount++;
            if (callCount <= failureCount) {
              return Promise.reject(new Error('Storage error'));
            }
            return Promise.resolve(undefined);
          });

          // 状態を保存（リトライ付き）
          const result = await stateManager.saveStateWithRetry(state, 3);

          if (failureCount < 3) {
            // リトライ回数内で成功する場合
            expect(result.success).toBe(true);
            expect(result.retries).toBe(failureCount);
            expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(failureCount + 1);
          } else {
            // すべてのリトライが失敗する場合
            expect(result.success).toBe(false);
            expect(result.message).toBeDefined();
            expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(3);
          }
        }
      ),
      { 
        numRuns: 30,
        verbose: true
      }
    );
  }, 90000); // リトライ処理の待機時間を考慮してタイムアウトを延長

  /**
   * Property 4.7: 無効な状態データの処理が正常に動作する
   * **Validates: Requirements 4.3**
   * 
   * For any 無効な状態データにおいて、デフォルト状態が返されるべきである
   */
  test('Property 4.7: 無効な状態データに対してデフォルト状態が返される', async () => {
    // 無効な状態データのジェネレーター
    const invalidStateArbitrary = fc.oneof(
      fc.constant({}),
      fc.constant({ summary: 123 }), // 型が間違っている
      fc.constant({ description: true }), // 型が間違っている
      fc.record({
        selectedProject: fc.string(), // 本来はオブジェクトまたはnull
        issueType: fc.boolean(), // 本来は文字列またはnull
        summary: fc.integer(), // 本来は文字列
        description: fc.integer() // 本来は文字列
      })
    );

    await fc.assert(
      fc.asyncProperty(invalidStateArbitrary, async (invalidState) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // Chrome Storage APIのモックを設定
        mockChrome.storage.local.get.mockResolvedValue({
          testState: invalidState
        });

        // 状態を読み込み
        const loadedState = await stateManager.loadState();

        // デフォルト状態のフィールドが返されることを検証（タイムスタンプは除く）
        expect(loadedState.selectedProject).toBeNull();
        expect(loadedState.issueType).toBeNull();
        expect(loadedState.summary).toBe('');
        expect(loadedState.description).toBe('');
        expect(loadedState.currentTab).toBeNull();
        expect(loadedState.timestamp).toBeDefined();

        // 破損した状態がクリアされることを検証
        expect(mockChrome.storage.local.remove).toHaveBeenCalledWith('testState');
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  }, 30000);
});
