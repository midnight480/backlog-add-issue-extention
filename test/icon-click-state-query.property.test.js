/**
 * アイコンクリック時の状態クエリプロパティベーステスト
 * Feature: icon-toggle-and-template-settings
 * Property 3: トグル操作前の状態クエリ
 * **Validates: Requirements 1.4**
 */

const fc = require('fast-check');
const { getSidePanelState } = require('../background/service-worker-test-exports');

describe('Property 3: トグル操作前の状態クエリ', () => {
  let mockChrome;
  let actionClickHandler;
  let stateQueryCalls;

  beforeEach(() => {
    // 状態クエリの呼び出しを追跡
    stateQueryCalls = [];

    // Chrome API のモック
    mockChrome = {
      sidePanel: {
        open: jest.fn().mockResolvedValue(undefined)
      },
      storage: {
        local: {
          get: jest.fn(async (keys) => {
            // 状態クエリが呼ばれたことを記録
            stateQueryCalls.push({
              timestamp: Date.now(),
              keys: keys
            });
            return { sidePanelIsOpen: false };
          }),
          set: jest.fn().mockResolvedValue(undefined)
        }
      },
      runtime: {
        sendMessage: jest.fn().mockResolvedValue(undefined)
      },
      windows: {
        getLastFocused: jest.fn().mockResolvedValue({ id: 999 })
      }
    };

    global.chrome = mockChrome;

    // アクションクリックハンドラーの実装（トグル機能付き）
    actionClickHandler = async function(tab) {
      try {
        console.log('拡張機能アイコンがクリックされました');
        
        if (!chrome.sidePanel) {
          console.error('サイドパネル機能がサポートされていません');
          return;
        }
        
        let windowId = tab.windowId;
        if (!windowId) {
          console.warn('ウィンドウIDを取得できませんでした');
          const windows = await chrome.windows.getLastFocused();
          windowId = windows.id;
        }
        
        // 現在のサイドパネル状態を取得（これが検証対象）
        const isOpen = await getSidePanelState();
        console.log('現在のサイドパネル状態:', isOpen ? '開いている' : '閉じている');
        
        if (isOpen) {
          // サイドパネルが開いている場合は閉じる
          console.log('サイドパネルを閉じます');
          await chrome.runtime.sendMessage({
            action: 'closeSidePanel',
            windowId: windowId
          });
          
          await chrome.storage.local.set({ 
            sidePanelIsOpen: false,
            sidePanelClosedAt: Date.now()
          });
        } else {
          // サイドパネルが閉じている場合は開く
          console.log('サイドパネルを開きます（ウィンドウID:', windowId, '）');
          await chrome.sidePanel.open({ windowId: windowId });
          
          await chrome.storage.local.set({ 
            sidePanelIsOpen: true,
            sidePanelOpenedAt: Date.now()
          });
          
          console.log('サイドパネルを正常に開きました');
        }
        
      } catch (error) {
        console.error('拡張機能アイコンクリック処理エラー:', error);
      }
    };

    // コンソールログをモック
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    stateQueryCalls = [];
  });

  /**
   * タブオブジェクトのジェネレーター
   */
  const tabArbitrary = fc.record({
    id: fc.integer({ min: 1, max: 999999 }),
    windowId: fc.integer({ min: 1, max: 999999 }),
    url: fc.oneof(
      fc.constant('https://example.com'),
      fc.constant('https://backlog.com'),
      fc.webUrl()
    ),
    title: fc.string({ minLength: 1, maxLength: 100 })
  });

  /**
   * サイドパネルの状態のジェネレーター
   */
  const sidePanelStateArbitrary = fc.boolean();

  /**
   * Property 3: トグル操作前の状態クエリ
   * **Validates: Requirements 1.4**
   * 
   * For any アイコンクリックイベントに対して、トグル操作を実行する前に、
   * システムは現在のサイドパネル状態をChrome Storage APIから取得するべきです。
   */
  test('Property 3: アイコンクリック時、トグル操作前に状態クエリが実行される', async () => {
    await fc.assert(
      fc.asyncProperty(tabArbitrary, sidePanelStateArbitrary, async (tab, initialState) => {
        // テストごとにモックとカウンターをリセット
        jest.clearAllMocks();
        stateQueryCalls = [];

        // 初期状態を設定
        mockChrome.storage.local.get.mockImplementation(async (keys) => {
          stateQueryCalls.push({
            timestamp: Date.now(),
            keys: keys
          });
          return { sidePanelIsOpen: initialState };
        });

        // アクションクリックハンドラーを実行
        await actionClickHandler(tab);

        // 状態クエリが実行されたことを検証
        expect(stateQueryCalls.length).toBeGreaterThan(0);
        
        // 状態クエリが正しいキーで実行されたことを検証
        const stateQuery = stateQueryCalls.find(call => 
          call.keys === 'sidePanelIsOpen' || 
          (Array.isArray(call.keys) && call.keys.includes('sidePanelIsOpen'))
        );
        expect(stateQuery).toBeDefined();

        // トグル操作が実行されたことを検証
        if (initialState) {
          // 開いている→閉じる
          expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
        } else {
          // 閉じている→開く
          expect(mockChrome.sidePanel.open).toHaveBeenCalled();
        }
      }),
      { 
        numRuns: 100, // 最小100回の反復実行
        verbose: true // 詳細なログを出力
      }
    );
  });

  /**
   * Property 3の変形: 状態クエリがトグル操作より前に実行される
   * **Validates: Requirements 1.4**
   */
  test('Property 3: 状態クエリがトグル操作より前に実行される（順序の検証）', async () => {
    await fc.assert(
      fc.asyncProperty(tabArbitrary, sidePanelStateArbitrary, async (tab, initialState) => {
        // テストごとにモックとカウンターをリセット
        jest.clearAllMocks();
        stateQueryCalls = [];

        const operationOrder = [];

        // 初期状態を設定し、呼び出し順序を記録
        mockChrome.storage.local.get.mockImplementation(async (keys) => {
          operationOrder.push('stateQuery');
          stateQueryCalls.push({
            timestamp: Date.now(),
            keys: keys
          });
          return { sidePanelIsOpen: initialState };
        });

        mockChrome.sidePanel.open.mockImplementation(async () => {
          operationOrder.push('open');
        });

        mockChrome.runtime.sendMessage.mockImplementation(async () => {
          operationOrder.push('close');
        });

        // アクションクリックハンドラーを実行
        await actionClickHandler(tab);

        // 状態クエリが最初に実行されたことを検証
        expect(operationOrder[0]).toBe('stateQuery');

        // トグル操作が状態クエリの後に実行されたことを検証
        if (initialState) {
          expect(operationOrder).toContain('close');
          const stateQueryIndex = operationOrder.indexOf('stateQuery');
          const closeIndex = operationOrder.indexOf('close');
          expect(stateQueryIndex).toBeLessThan(closeIndex);
        } else {
          expect(operationOrder).toContain('open');
          const stateQueryIndex = operationOrder.indexOf('stateQuery');
          const openIndex = operationOrder.indexOf('open');
          expect(stateQueryIndex).toBeLessThan(openIndex);
        }
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 3の変形: 複数回のアイコンクリックで毎回状態クエリが実行される
   * **Validates: Requirements 1.4**
   */
  test('Property 3: 複数回のアイコンクリックで毎回状態クエリが実行される', async () => {
    // クリック回数のジェネレーター（2〜5回）
    const clickCountArbitrary = fc.integer({ min: 2, max: 5 });

    await fc.assert(
      fc.asyncProperty(
        tabArbitrary, 
        sidePanelStateArbitrary, 
        clickCountArbitrary, 
        async (tab, initialState, clickCount) => {
          // テストごとにモックとカウンターをリセット
          jest.clearAllMocks();
          stateQueryCalls = [];

          let currentState = initialState;

          // 指定回数だけアイコンクリックを実行
          for (let i = 0; i < clickCount; i++) {
            // 現在の状態を設定
            mockChrome.storage.local.get.mockImplementation(async (keys) => {
              stateQueryCalls.push({
                timestamp: Date.now(),
                keys: keys,
                clickIndex: i
              });
              return { sidePanelIsOpen: currentState };
            });

            // アクションクリックハンドラーを実行
            await actionClickHandler(tab);

            // 状態を反転
            currentState = !currentState;
          }

          // 各クリックで状態クエリが実行されたことを検証
          expect(stateQueryCalls.length).toBeGreaterThanOrEqual(clickCount);

          // 各クリックで正しいキーがクエリされたことを検証
          const validQueries = stateQueryCalls.filter(call => 
            call.keys === 'sidePanelIsOpen' || 
            (Array.isArray(call.keys) && call.keys.includes('sidePanelIsOpen'))
          );
          expect(validQueries.length).toBeGreaterThanOrEqual(clickCount);
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 3のエッジケース: Storage API失敗時でも状態クエリが試行される
   * **Validates: Requirements 1.4**
   */
  test('Property 3: Storage API失敗時でも状態クエリが試行される', async () => {
    await fc.assert(
      fc.asyncProperty(tabArbitrary, async (tab) => {
        // テストごとにモックとカウンターをリセット
        jest.clearAllMocks();
        stateQueryCalls = [];

        // Storage APIを失敗させる
        const storageError = new Error('Storage API error');
        mockChrome.storage.local.get.mockImplementation(async (keys) => {
          stateQueryCalls.push({
            timestamp: Date.now(),
            keys: keys,
            error: true
          });
          throw storageError;
        });

        // アクションクリックハンドラーを実行（エラーが投げられないことを確認）
        await expect(actionClickHandler(tab)).resolves.not.toThrow();

        // 状態クエリが試行されたことを検証
        expect(stateQueryCalls.length).toBeGreaterThan(0);
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 3のエッジケース: 高速な連続クリックでも毎回状態クエリが実行される
   * **Validates: Requirements 1.4**
   */
  test('Property 3: 高速な連続クリックでも毎回状態クエリが実行される', async () => {
    // 高速クリック回数のジェネレーター（3〜10回）
    const rapidClickCountArbitrary = fc.integer({ min: 3, max: 10 });

    await fc.assert(
      fc.asyncProperty(
        tabArbitrary, 
        sidePanelStateArbitrary, 
        rapidClickCountArbitrary, 
        async (tab, initialState, clickCount) => {
          // テストごとにモックとカウンターをリセット
          jest.clearAllMocks();
          stateQueryCalls = [];

          let currentState = initialState;

          // 高速な連続クリックをシミュレート
          const clickPromises = [];
          for (let i = 0; i < clickCount; i++) {
            // 現在の状態を設定
            mockChrome.storage.local.get.mockImplementation(async (keys) => {
              stateQueryCalls.push({
                timestamp: Date.now(),
                keys: keys,
                clickIndex: i
              });
              return { sidePanelIsOpen: currentState };
            });

            // 非同期でクリックを実行
            clickPromises.push(actionClickHandler(tab));

            // 状態を反転
            currentState = !currentState;
          }

          // すべてのクリックが完了するまで待機
          await Promise.all(clickPromises);

          // 各クリックで状態クエリが実行されたことを検証
          expect(stateQueryCalls.length).toBeGreaterThanOrEqual(clickCount);
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 3のエッジケース: 異なるウィンドウでのクリックでも状態クエリが実行される
   * **Validates: Requirements 1.4**
   */
  test('Property 3: 異なるウィンドウでのクリックでも状態クエリが実行される', async () => {
    // 複数のタブのジェネレーター（異なるウィンドウID）
    const multipleTabsArbitrary = fc.array(tabArbitrary, { minLength: 2, maxLength: 5 });

    await fc.assert(
      fc.asyncProperty(
        multipleTabsArbitrary, 
        sidePanelStateArbitrary, 
        async (tabs, initialState) => {
          // テストごとにモックとカウンターをリセット
          jest.clearAllMocks();
          stateQueryCalls = [];

          // 各タブでクリックを実行
          for (const tab of tabs) {
            // 初期状態を設定
            mockChrome.storage.local.get.mockImplementation(async (keys) => {
              stateQueryCalls.push({
                timestamp: Date.now(),
                keys: keys,
                windowId: tab.windowId
              });
              return { sidePanelIsOpen: initialState };
            });

            // アクションクリックハンドラーを実行
            await actionClickHandler(tab);
          }

          // 各ウィンドウで状態クエリが実行されたことを検証
          expect(stateQueryCalls.length).toBeGreaterThanOrEqual(tabs.length);

          // 各ウィンドウIDに対して状態クエリが実行されたことを検証
          const uniqueWindowIds = new Set(tabs.map(t => t.windowId));
          const queriedWindowIds = new Set(stateQueryCalls.map(c => c.windowId));
          
          uniqueWindowIds.forEach(windowId => {
            expect(queriedWindowIds.has(windowId)).toBe(true);
          });
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 3のエッジケース: 状態が未定義でも状態クエリが実行される
   * **Validates: Requirements 1.4**
   */
  test('Property 3: 状態が未定義でも状態クエリが実行される', async () => {
    // 未定義状態のジェネレーター
    const undefinedStateArbitrary = fc.oneof(
      fc.constant({}), // 空のオブジェクト
      fc.constant({ sidePanelIsOpen: undefined }), // undefined
      fc.constant({ sidePanelIsOpen: null }) // null
    );

    await fc.assert(
      fc.asyncProperty(tabArbitrary, undefinedStateArbitrary, async (tab, storageResult) => {
        // テストごとにモックとカウンターをリセット
        jest.clearAllMocks();
        stateQueryCalls = [];

        // 未定義状態を設定
        mockChrome.storage.local.get.mockImplementation(async (keys) => {
          stateQueryCalls.push({
            timestamp: Date.now(),
            keys: keys
          });
          return storageResult;
        });

        // アクションクリックハンドラーを実行
        await actionClickHandler(tab);

        // 状態クエリが実行されたことを検証
        expect(stateQueryCalls.length).toBeGreaterThan(0);

        // 状態が未定義でも開く動作が実行されることを検証
        expect(mockChrome.sidePanel.open).toHaveBeenCalled();
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 3のエッジケース: 状態クエリの結果が正しく使用される
   * **Validates: Requirements 1.4**
   */
  test('Property 3: 状態クエリの結果が正しくトグル判定に使用される', async () => {
    await fc.assert(
      fc.asyncProperty(tabArbitrary, sidePanelStateArbitrary, async (tab, initialState) => {
        // テストごとにモックとカウンターをリセット
        jest.clearAllMocks();
        stateQueryCalls = [];

        let queriedState = null;

        // 初期状態を設定し、クエリされた状態を記録
        mockChrome.storage.local.get.mockImplementation(async (keys) => {
          stateQueryCalls.push({
            timestamp: Date.now(),
            keys: keys
          });
          queriedState = initialState;
          return { sidePanelIsOpen: initialState };
        });

        // アクションクリックハンドラーを実行
        await actionClickHandler(tab);

        // 状態クエリが実行されたことを検証
        expect(stateQueryCalls.length).toBeGreaterThan(0);
        expect(queriedState).toBe(initialState);

        // クエリされた状態に基づいて正しいトグル操作が実行されたことを検証
        if (queriedState) {
          // 開いている→閉じる
          expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
            action: 'closeSidePanel',
            windowId: tab.windowId
          });
          expect(mockChrome.sidePanel.open).not.toHaveBeenCalled();
        } else {
          // 閉じている→開く
          expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ 
            windowId: tab.windowId 
          });
          expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
        }
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });
});
