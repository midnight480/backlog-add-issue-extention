/**
 * サイドパネルトグル機能のプロパティベーステスト
 * Feature: icon-toggle-and-template-settings
 * Property 1: サイドパネルのトグル動作の正確性
 * **Validates: Requirements 1.1, 1.2**
 */

const fc = require('fast-check');
const { getSidePanelState, closeSidePanel } = require('../background/service-worker-test-exports');

describe('Property 1: サイドパネルのトグル動作の正確性', () => {
  let mockChrome;
  let actionClickHandler;

  beforeEach(() => {
    // Chrome API のモック
    mockChrome = {
      sidePanel: {
        open: jest.fn().mockResolvedValue(undefined)
      },
      storage: {
        local: {
          get: jest.fn(),
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
        
        // 現在のサイドパネル状態を取得
        const isOpen = await getSidePanelState();
        console.log('現在のサイドパネル状態:', isOpen ? '開いている' : '閉じている');
        
        if (isOpen) {
          // サイドパネルが開いている場合は閉じる
          console.log('サイドパネルを閉じます');
          await closeSidePanel(windowId);
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
  });

  /**
   * ウィンドウIDのジェネレーター
   * 有効なウィンドウIDを生成する
   */
  const windowIdArbitrary = fc.integer({ min: 1, max: 999999 });

  /**
   * サイドパネルの初期状態のジェネレーター
   * true（開いている）またはfalse（閉じている）
   */
  const sidePanelStateArbitrary = fc.boolean();

  /**
   * タブオブジェクトのジェネレーター
   */
  const tabArbitrary = fc.record({
    id: fc.integer({ min: 1, max: 999999 }),
    windowId: windowIdArbitrary,
    url: fc.oneof(
      fc.constant('https://example.com'),
      fc.constant('https://backlog.com'),
      fc.webUrl()
    ),
    title: fc.string({ minLength: 1, maxLength: 100 })
  });

  /**
   * Property 1: サイドパネルのトグル動作の正確性
   * **Validates: Requirements 1.1, 1.2**
   * 
   * For any ウィンドウIDとサイドパネルの初期状態（開いている/閉じている）に対して、
   * アイコンをクリックした時、サイドパネルの状態は反転する
   * （開いている→閉じる、閉じている→開く）べきです。
   */
  test('Property 1: 任意の初期状態でアイコンをクリックすると状態が反転する', async () => {
    await fc.assert(
      fc.asyncProperty(tabArbitrary, sidePanelStateArbitrary, async (tab, initialState) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // 初期状態を設定
        mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: initialState });

        // アクションクリックハンドラーを実行
        await actionClickHandler(tab);

        // 状態が反転することを検証
        if (initialState) {
          // 開いている→閉じる
          expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
            action: 'closeSidePanel',
            windowId: tab.windowId
          });
          expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
            sidePanelIsOpen: false,
            sidePanelClosedAt: expect.any(Number)
          });
          expect(mockChrome.sidePanel.open).not.toHaveBeenCalled();
        } else {
          // 閉じている→開く
          expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ 
            windowId: tab.windowId 
          });
          expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
            sidePanelIsOpen: true,
            sidePanelOpenedAt: expect.any(Number)
          });
          expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
        }
      }),
      { 
        numRuns: 100, // 最小100回の反復実行
        verbose: true // 詳細なログを出力
      }
    );
  });

  /**
   * Property 1の変形: 複数回のトグルで状態が正しく反転し続ける
   * **Validates: Requirements 1.1, 1.2**
   */
  test('Property 1: 複数回のトグルで状態が正しく反転し続ける', async () => {
    // トグル回数のジェネレーター（2〜10回）
    const toggleCountArbitrary = fc.integer({ min: 2, max: 10 });

    await fc.assert(
      fc.asyncProperty(
        tabArbitrary, 
        sidePanelStateArbitrary, 
        toggleCountArbitrary, 
        async (tab, initialState, toggleCount) => {
          // テストごとにモックをリセット
          jest.clearAllMocks();

          let currentState = initialState;

          // 指定回数だけトグルを実行
          for (let i = 0; i < toggleCount; i++) {
            // 現在の状態を設定
            mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: currentState });

            // アクションクリックハンドラーを実行
            await actionClickHandler(tab);

            // 状態が反転することを検証
            if (currentState) {
              // 開いている→閉じる
              expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
                action: 'closeSidePanel',
                windowId: tab.windowId
              });
            } else {
              // 閉じている→開く
              expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ 
                windowId: tab.windowId 
              });
            }

            // 状態を反転
            currentState = !currentState;

            // 次のイテレーションのためにモックをクリア
            jest.clearAllMocks();
          }
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 1の変形: 異なるウィンドウでのトグル動作が独立している
   * **Validates: Requirements 1.1, 1.2**
   */
  test('Property 1: 異なるウィンドウでのトグル動作が正しく機能する', async () => {
    // 複数のタブのジェネレーター（異なるウィンドウID）
    const multipleTabsArbitrary = fc.array(tabArbitrary, { minLength: 2, maxLength: 5 });

    await fc.assert(
      fc.asyncProperty(
        multipleTabsArbitrary, 
        sidePanelStateArbitrary, 
        async (tabs, initialState) => {
          // テストごとにモックをリセット
          jest.clearAllMocks();

          // 各タブでトグル操作を実行
          for (const tab of tabs) {
            // 初期状態を設定
            mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: initialState });

            // アクションクリックハンドラーを実行
            await actionClickHandler(tab);

            // 各ウィンドウで正しいウィンドウIDが使用されることを検証
            if (initialState) {
              expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
                action: 'closeSidePanel',
                windowId: tab.windowId
              });
            } else {
              expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ 
                windowId: tab.windowId 
              });
            }

            // 次のイテレーションのためにモックをクリア
            jest.clearAllMocks();
          }
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 1のエッジケース: 極端なウィンドウIDでもトグル動作が正しく機能する
   * **Validates: Requirements 1.1, 1.2**
   */
  test('Property 1: 極端なウィンドウIDでもトグル動作が正しく機能する', async () => {
    // 極端なウィンドウIDのジェネレーター
    const extremeWindowIdTabArbitrary = fc.record({
      id: fc.integer({ min: 1, max: 999999 }),
      windowId: fc.oneof(
        fc.constant(1), // 最小値
        fc.constant(999999999), // 非常に大きな値
        fc.integer({ min: 1, max: 999999999 }) // ランダムな正の整数
      ),
      url: fc.webUrl(),
      title: fc.string({ minLength: 1, maxLength: 100 })
    });

    await fc.assert(
      fc.asyncProperty(
        extremeWindowIdTabArbitrary, 
        sidePanelStateArbitrary, 
        async (tab, initialState) => {
          // テストごとにモックをリセット
          jest.clearAllMocks();

          // 初期状態を設定
          mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: initialState });

          // アクションクリックハンドラーを実行
          await actionClickHandler(tab);

          // 状態が反転することを検証
          if (initialState) {
            expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
              action: 'closeSidePanel',
              windowId: tab.windowId
            });
          } else {
            expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ 
              windowId: tab.windowId 
            });
          }
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 1のエッジケース: 状態が未定義の場合はfalse（閉じている）として扱う
   * **Validates: Requirements 1.1, 1.2**
   */
  test('Property 1: 状態が未定義の場合は閉じている状態として扱い、開く動作を実行する', async () => {
    // 未定義状態のジェネレーター
    const undefinedStateArbitrary = fc.oneof(
      fc.constant({}), // 空のオブジェクト
      fc.constant({ sidePanelIsOpen: undefined }), // undefined
      fc.constant({ sidePanelIsOpen: null }) // null
    );

    await fc.assert(
      fc.asyncProperty(tabArbitrary, undefinedStateArbitrary, async (tab, storageResult) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // 未定義状態を設定
        mockChrome.storage.local.get.mockResolvedValue(storageResult);

        // アクションクリックハンドラーを実行
        await actionClickHandler(tab);

        // 閉じている状態として扱われ、開く動作が実行されることを検証
        expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ 
          windowId: tab.windowId 
        });
        expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
          sidePanelIsOpen: true,
          sidePanelOpenedAt: expect.any(Number)
        });
        expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 1のエッジケース: 開く→閉じる→開くのサイクルが正しく動作する
   * **Validates: Requirements 1.1, 1.2**
   */
  test('Property 1: 開く→閉じる→開くのサイクルが正しく動作する', async () => {
    await fc.assert(
      fc.asyncProperty(tabArbitrary, async (tab) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // 1回目: 閉じている状態から開く
        mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: false });
        await actionClickHandler(tab);
        expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: tab.windowId });
        expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();

        jest.clearAllMocks();

        // 2回目: 開いている状態から閉じる
        mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: true });
        await actionClickHandler(tab);
        expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
          action: 'closeSidePanel',
          windowId: tab.windowId
        });
        expect(mockChrome.sidePanel.open).not.toHaveBeenCalled();

        jest.clearAllMocks();

        // 3回目: 閉じている状態から開く
        mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: false });
        await actionClickHandler(tab);
        expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: tab.windowId });
        expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });
});
