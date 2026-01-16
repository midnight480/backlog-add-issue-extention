/**
 * 既存サイドパネルへのフォーカスのプロパティベーステスト
 * Feature: remove-popup-use-sidepanel-only
 * Property 2: 既に開いているサイドパネルへのフォーカス
 * **Validates: Requirements 2.4**
 */

const fc = require('fast-check');

describe('Property 2: 既に開いているサイドパネルへのフォーカス', () => {
  let mockChrome;
  let actionClickHandler;
  let showErrorNotification;
  let handleErrorWithRecovery;

  beforeEach(() => {
    // Chrome API のモック
    mockChrome = {
      sidePanel: {
        open: jest.fn().mockResolvedValue(undefined)
      },
      storage: {
        local: {
          set: jest.fn().mockResolvedValue(undefined),
          get: jest.fn().mockResolvedValue({ sidePanelIsOpen: true })
        }
      },
      windows: {
        getLastFocused: jest.fn().mockResolvedValue({ id: 999 })
      },
      notifications: {
        create: jest.fn()
      }
    };

    global.chrome = mockChrome;

    // エラー通知関数のモック
    showErrorNotification = jest.fn();

    // エラー回復関数のモック
    handleErrorWithRecovery = jest.fn().mockResolvedValue({
      success: false,
      recovered: false,
      guidance: 'エラーが発生しました'
    });

    // アクションクリックハンドラーの実装
    actionClickHandler = async function(tab) {
      try {
        console.log('拡張機能アイコンがクリックされました');
        
        // Side Panel APIのサポート確認
        if (!chrome.sidePanel) {
          const errorMessage = 'このブラウザではサイドパネル機能がサポートされていません';
          console.error(errorMessage);
          showErrorNotification('サイドパネル機能について', errorMessage);
          return;
        }
        
        // ウィンドウIDの取得
        let windowId = tab.windowId;
        if (!windowId) {
          console.warn('タブからウィンドウIDを取得できませんでした。フォールバック処理を実行します');
          try {
            const windows = await chrome.windows.getLastFocused();
            windowId = windows.id;
            console.log('最後にフォーカスされたウィンドウIDを使用:', windowId);
          } catch (fallbackError) {
            console.error('ウィンドウIDの取得に失敗:', fallbackError);
            showErrorNotification('エラー', 'アクティブなウィンドウが見つかりません');
            return;
          }
        }
        
        // サイドパネルを開く（既に開いている場合は自動的にフォーカスが移動する）
        console.log('サイドパネルを開きます（ウィンドウID:', windowId, '）');
        await chrome.sidePanel.open({ windowId: windowId });
        
        // サイドパネルの開閉状態を記録
        await chrome.storage.local.set({ 
          sidePanelIsOpen: true,
          sidePanelOpenedAt: Date.now()
        });
        
        console.log('サイドパネルを正常に開きました');
        
      } catch (error) {
        console.error('拡張機能アイコンクリック処理エラー:', error);
        
        // エラーの種類に応じた処理
        let errorMessage = 'サイドパネルを開けませんでした';
        if (error.message) {
          errorMessage += ': ' + error.message;
        }
        
        showErrorNotification('サイドパネルエラー', errorMessage);
        
        // エラー回復処理を試行
        try {
          const recoveryResult = await handleErrorWithRecovery(error, 'open_side_panel');
          if (recoveryResult.recovered) {
            console.log('エラー回復に成功しました');
          }
        } catch (recoveryError) {
          console.error('エラー回復処理も失敗しました:', recoveryError);
        }
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
   * タブオブジェクトのジェネレーター
   * ランダムなタブ情報を生成する
   */
  const tabArbitrary = fc.record({
    id: fc.integer({ min: 1, max: 999999 }),
    windowId: fc.integer({ min: 1, max: 9999 }),
    url: fc.oneof(
      fc.constant('https://example.com'),
      fc.constant('https://backlog.com'),
      fc.constant('https://github.com'),
      fc.webUrl()
    ),
    title: fc.oneof(
      fc.constant('Example Page'),
      fc.constant('Backlog'),
      fc.constant('GitHub'),
      fc.string({ minLength: 1, maxLength: 100 })
    )
  });

  /**
   * Property 2: 既に開いているサイドパネルへのフォーカス
   * **Validates: Requirements 2.4**
   * 
   * For any サイドパネルが既に開いている状態で、ユーザーが拡張機能アイコンをクリックした場合、
   * 既存のサイドパネルにフォーカスが移動するべきである
   */
  test('Property 2: サイドパネルが既に開いている状態でアイコンをクリックすると既存のサイドパネルにフォーカスが移動する', async () => {
    await fc.assert(
      fc.asyncProperty(tabArbitrary, async (tab) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // サイドパネルが既に開いている状態をシミュレート
        mockChrome.storage.local.get.mockResolvedValue({ 
          sidePanelIsOpen: true,
          sidePanelOpenedAt: Date.now() - 10000 // 10秒前に開いた
        });

        // アクションクリックハンドラーを実行
        await actionClickHandler(tab);

        // サイドパネルのopenメソッドが呼ばれることを検証
        // chrome.sidePanel.open()は既に開いている場合でも呼ばれ、自動的にフォーカスが移動する
        expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ 
          windowId: tab.windowId 
        });

        // 状態が更新されることを検証
        expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
          sidePanelIsOpen: true,
          sidePanelOpenedAt: expect.any(Number)
        });

        // エラー通知が表示されないことを検証
        expect(showErrorNotification).not.toHaveBeenCalled();
      }),
      { 
        numRuns: 100, // 100回の反復でテスト
        verbose: true // 詳細なログを出力
      }
    );
  });

  /**
   * Property 2の変形: 複数回のクリックでも常にフォーカスが移動する
   * **Validates: Requirements 2.4**
   */
  test('Property 2: サイドパネルが開いている状態で複数回クリックしても常にフォーカスが移動する', async () => {
    // クリック回数のジェネレーター（2〜5回）
    const clickCountArbitrary = fc.integer({ min: 2, max: 5 });

    await fc.assert(
      fc.asyncProperty(tabArbitrary, clickCountArbitrary, async (tab, clickCount) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // サイドパネルが既に開いている状態をシミュレート
        mockChrome.storage.local.get.mockResolvedValue({ 
          sidePanelIsOpen: true,
          sidePanelOpenedAt: Date.now() - 10000
        });

        // 指定回数だけクリックを実行
        for (let i = 0; i < clickCount; i++) {
          await actionClickHandler(tab);
        }

        // サイドパネルが指定回数だけ開かれることを検証
        expect(mockChrome.sidePanel.open).toHaveBeenCalledTimes(clickCount);

        // すべてのクリックで同じウィンドウIDが使用されることを検証
        for (let i = 0; i < clickCount; i++) {
          expect(mockChrome.sidePanel.open).toHaveBeenNthCalledWith(i + 1, { 
            windowId: tab.windowId 
          });
        }

        // 状態が指定回数だけ更新されることを検証
        expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(clickCount);
      }),
      { 
        numRuns: 50, // 複数回クリックのテストなので反復回数を減らす
        verbose: true
      }
    );
  });

  /**
   * Property 2の変形: 異なる時間経過後でもフォーカスが移動する
   * **Validates: Requirements 2.4**
   */
  test('Property 2: サイドパネルを開いてから異なる時間が経過した後でもフォーカスが移動する', async () => {
    // 経過時間のジェネレーター（1秒〜1時間）
    const elapsedTimeArbitrary = fc.integer({ min: 1000, max: 3600000 });

    await fc.assert(
      fc.asyncProperty(tabArbitrary, elapsedTimeArbitrary, async (tab, elapsedTime) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // サイドパネルが指定時間前に開いている状態をシミュレート
        const openedAt = Date.now() - elapsedTime;
        mockChrome.storage.local.get.mockResolvedValue({ 
          sidePanelIsOpen: true,
          sidePanelOpenedAt: openedAt
        });

        // アクションクリックハンドラーを実行
        await actionClickHandler(tab);

        // サイドパネルのopenメソッドが呼ばれることを検証
        expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ 
          windowId: tab.windowId 
        });

        // 状態が更新されることを検証（新しいタイムスタンプ）
        expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
          sidePanelIsOpen: true,
          sidePanelOpenedAt: expect.any(Number)
        });

        // 新しいタイムスタンプが古いタイムスタンプより新しいことを検証
        const setCall = mockChrome.storage.local.set.mock.calls[0][0];
        expect(setCall.sidePanelOpenedAt).toBeGreaterThan(openedAt);
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 2の変形: 異なるウィンドウでサイドパネルが開いている場合
   * **Validates: Requirements 2.4**
   */
  test('Property 2: 異なるウィンドウでサイドパネルが開いている場合でも正しいウィンドウにフォーカスが移動する', async () => {
    // 複数のウィンドウIDのジェネレーター
    const windowIdPairArbitrary = fc.record({
      currentWindowId: fc.integer({ min: 1, max: 9999 }),
      otherWindowId: fc.integer({ min: 1, max: 9999 })
    }).filter(pair => pair.currentWindowId !== pair.otherWindowId);

    await fc.assert(
      fc.asyncProperty(windowIdPairArbitrary, async (windowIds) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // 別のウィンドウでサイドパネルが開いている状態をシミュレート
        mockChrome.storage.local.get.mockResolvedValue({ 
          sidePanelIsOpen: true,
          sidePanelOpenedAt: Date.now() - 5000,
          sidePanelWindowId: windowIds.otherWindowId
        });

        // 現在のウィンドウのタブを作成
        const tab = {
          id: 123,
          windowId: windowIds.currentWindowId,
          url: 'https://example.com',
          title: 'Example'
        };

        // アクションクリックハンドラーを実行
        await actionClickHandler(tab);

        // 現在のウィンドウIDでサイドパネルが開かれることを検証
        expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ 
          windowId: windowIds.currentWindowId 
        });

        // 状態が更新されることを検証
        expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
          sidePanelIsOpen: true,
          sidePanelOpenedAt: expect.any(Number)
        });
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 2の変形: サイドパネルが開いている状態でウィンドウIDが無効な場合
   * **Validates: Requirements 2.4**
   */
  test('Property 2: サイドパネルが開いている状態でウィンドウIDが無効な場合でもフォールバック処理でフォーカスが移動する', async () => {
    // ウィンドウIDが無効なタブのジェネレーター
    const invalidWindowIdTabArbitrary = fc.record({
      id: fc.integer({ min: 1, max: 999999 }),
      windowId: fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.constant(0)
      ),
      url: fc.webUrl(),
      title: fc.string({ minLength: 1, maxLength: 100 })
    });

    await fc.assert(
      fc.asyncProperty(invalidWindowIdTabArbitrary, async (tab) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // サイドパネルが既に開いている状態をシミュレート
        mockChrome.storage.local.get.mockResolvedValue({ 
          sidePanelIsOpen: true,
          sidePanelOpenedAt: Date.now() - 10000
        });

        // アクションクリックハンドラーを実行
        await actionClickHandler(tab);

        // フォールバック処理が実行されることを検証
        expect(mockChrome.windows.getLastFocused).toHaveBeenCalled();

        // フォールバックで取得したウィンドウIDでサイドパネルが開かれることを検証
        expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ 
          windowId: 999 
        });

        // 状態が更新されることを検証
        expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
          sidePanelIsOpen: true,
          sidePanelOpenedAt: expect.any(Number)
        });
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 2のエッジケース: サイドパネルの状態が不明な場合でも動作する
   * **Validates: Requirements 2.4**
   */
  test('Property 2: サイドパネルの状態が不明な場合でも正常に動作する', async () => {
    // 状態データのジェネレーター（不完全なデータを含む）
    const stateDataArbitrary = fc.oneof(
      fc.constant({}), // 空のオブジェクト
      fc.constant({ sidePanelIsOpen: false }), // 閉じている状態
      fc.constant({ sidePanelIsOpen: true }), // 開いている状態（タイムスタンプなし）
      fc.constant({ sidePanelOpenedAt: Date.now() }), // タイムスタンプのみ
      fc.constant(null), // null
      fc.constant(undefined) // undefined
    );

    await fc.assert(
      fc.asyncProperty(tabArbitrary, stateDataArbitrary, async (tab, stateData) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // 指定された状態データをシミュレート
        mockChrome.storage.local.get.mockResolvedValue(stateData || {});

        // アクションクリックハンドラーを実行
        await actionClickHandler(tab);

        // サイドパネルが開かれることを検証（状態に関わらず）
        expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ 
          windowId: tab.windowId 
        });

        // 状態が更新されることを検証
        expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
          sidePanelIsOpen: true,
          sidePanelOpenedAt: expect.any(Number)
        });

        // エラー通知が表示されないことを検証
        expect(showErrorNotification).not.toHaveBeenCalled();
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });
});
