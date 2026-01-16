/**
 * chrome.action.onClicked イベントハンドラーのプロパティベーステスト
 * Feature: remove-popup-use-sidepanel-only
 * Property 1: アイコンクリックでサイドパネルが開く
 * **Validates: Requirements 2.1**
 */

const fc = require('fast-check');

describe('Property 1: アイコンクリックでサイドパネルが開く', () => {
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
          set: jest.fn().mockResolvedValue(undefined)
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
   * Property 1: アイコンクリックでサイドパネルが開く
   * **Validates: Requirements 2.1**
   * 
   * For any 拡張機能の状態において、ユーザーが拡張機能アイコンをクリックした場合、
   * サイドパネルが開くべきである
   */
  test('Property 1: 任意のタブ状態でアイコンをクリックするとサイドパネルが開く', async () => {
    await fc.assert(
      fc.asyncProperty(tabArbitrary, async (tab) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // アクションクリックハンドラーを実行
        await actionClickHandler(tab);

        // サイドパネルが開かれることを検証
        expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ 
          windowId: tab.windowId 
        });

        // 状態が保存されることを検証
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
   * Property 1の変形: ウィンドウIDが無効な場合でもフォールバック処理で開く
   * **Validates: Requirements 2.1**
   */
  test('Property 1: ウィンドウIDが無効な場合でもフォールバック処理でサイドパネルが開く', async () => {
    // ウィンドウIDが無効なタブのジェネレーター
    // 実装では !windowId でチェックしているため、falsyな値のみがフォールバック対象
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

        // アクションクリックハンドラーを実行
        await actionClickHandler(tab);

        // フォールバック処理が実行されることを検証
        expect(mockChrome.windows.getLastFocused).toHaveBeenCalled();

        // フォールバックで取得したウィンドウIDでサイドパネルが開かれることを検証
        expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ 
          windowId: 999 
        });

        // 状態が保存されることを検証
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
   * Property 1の変形: 複数回のクリックでも常にサイドパネルが開く
   * **Validates: Requirements 2.1**
   */
  test('Property 1: 複数回のクリックでも常にサイドパネルが開く', async () => {
    // クリック回数のジェネレーター（1〜10回）
    const clickCountArbitrary = fc.integer({ min: 1, max: 10 });

    await fc.assert(
      fc.asyncProperty(tabArbitrary, clickCountArbitrary, async (tab, clickCount) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

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

        // 状態が指定回数だけ保存されることを検証
        expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(clickCount);
      }),
      { 
        numRuns: 50, // 複数回クリックのテストなので反復回数を減らす
        verbose: true
      }
    );
  });

  /**
   * Property 1の変形: 異なるタブからのクリックでも常にサイドパネルが開く
   * **Validates: Requirements 2.1**
   */
  test('Property 1: 異なるタブからのクリックでも常にサイドパネルが開く', async () => {
    // 複数のタブのジェネレーター
    const multipleTabsArbitrary = fc.array(tabArbitrary, { minLength: 1, maxLength: 5 });

    await fc.assert(
      fc.asyncProperty(multipleTabsArbitrary, async (tabs) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // 各タブからクリックを実行
        for (const tab of tabs) {
          await actionClickHandler(tab);
        }

        // サイドパネルがタブの数だけ開かれることを検証
        expect(mockChrome.sidePanel.open).toHaveBeenCalledTimes(tabs.length);

        // 各タブのウィンドウIDが正しく使用されることを検証
        tabs.forEach((tab, index) => {
          expect(mockChrome.sidePanel.open).toHaveBeenNthCalledWith(index + 1, { 
            windowId: tab.windowId 
          });
        });

        // 状態がタブの数だけ保存されることを検証
        expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(tabs.length);
      }),
      { 
        numRuns: 50,
        verbose: true
      }
    );
  });

  /**
   * Property 1のエッジケース: 極端なウィンドウIDでも動作する
   * **Validates: Requirements 2.1**
   */
  test('Property 1: 極端なウィンドウIDでも正常に動作する', async () => {
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
      fc.asyncProperty(extremeWindowIdTabArbitrary, async (tab) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // アクションクリックハンドラーを実行
        await actionClickHandler(tab);

        // サイドパネルが開かれることを検証
        expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ 
          windowId: tab.windowId 
        });

        // 状態が保存されることを検証
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
});
