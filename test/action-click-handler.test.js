/**
 * chrome.action.onClicked イベントハンドラーのユニットテスト
 * Feature: remove-popup-use-sidepanel-only
 * 検証: 要件 2.1, 2.2
 */

describe('chrome.action.onClicked イベントハンドラー', () => {
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
   * 要件 2.1: アイコンクリック時にサイドパネルを開く
   */
  describe('要件 2.1: アイコンクリック時にサイドパネルを開く', () => {
    test('正常なタブ情報でサイドパネルが開く', async () => {
      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com',
        title: 'Example'
      };

      await actionClickHandler(tab);

      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 123 });
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        sidePanelIsOpen: true,
        sidePanelOpenedAt: expect.any(Number)
      });
      expect(console.log).toHaveBeenCalledWith('サイドパネルを正常に開きました');
    });

    test('ウィンドウIDが指定されている場合、そのウィンドウでサイドパネルを開く', async () => {
      const tab = {
        id: 1,
        windowId: 456,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 456 });
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('サイドパネルが既に開いている場合でも正常に動作する（フォーカスが移動する）', async () => {
      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      // 1回目の呼び出し
      await actionClickHandler(tab);
      expect(mockChrome.sidePanel.open).toHaveBeenCalledTimes(1);

      // 2回目の呼び出し（既に開いている状態）
      await actionClickHandler(tab);
      expect(mockChrome.sidePanel.open).toHaveBeenCalledTimes(2);
      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 123 });
    });
  });

  /**
   * 要件 2.2: Service Workerがアクションクリックイベントを処理
   */
  describe('要件 2.2: Service Workerがアクションクリックイベントを処理', () => {
    test('イベントハンドラーが正しく実行される', async () => {
      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(console.log).toHaveBeenCalledWith('拡張機能アイコンがクリックされました');
      expect(mockChrome.sidePanel.open).toHaveBeenCalled();
    });

    test('複数回のクリックを正しく処理できる', async () => {
      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      // 3回連続でクリック
      await actionClickHandler(tab);
      await actionClickHandler(tab);
      await actionClickHandler(tab);

      expect(mockChrome.sidePanel.open).toHaveBeenCalledTimes(3);
      expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(3);
    });
  });

  /**
   * エラーハンドリングのテスト
   */
  describe('エラーハンドリング', () => {
    test('Side Panel APIが存在しない場合、エラー通知を表示する', async () => {
      delete global.chrome.sidePanel;

      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(showErrorNotification).toHaveBeenCalledWith(
        'サイドパネル機能について',
        'このブラウザではサイドパネル機能がサポートされていません'
      );
      expect(console.error).toHaveBeenCalledWith(
        'このブラウザではサイドパネル機能がサポートされていません'
      );
    });

    test('ウィンドウIDが取得できない場合、フォールバック処理を実行する', async () => {
      const tab = {
        id: 1,
        windowId: null, // ウィンドウIDがnull
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(console.warn).toHaveBeenCalledWith(
        'タブからウィンドウIDを取得できませんでした。フォールバック処理を実行します'
      );
      expect(mockChrome.windows.getLastFocused).toHaveBeenCalled();
      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 999 });
    });

    test('ウィンドウIDがundefinedの場合、フォールバック処理を実行する', async () => {
      const tab = {
        id: 1,
        url: 'https://example.com'
        // windowIdが存在しない
      };

      await actionClickHandler(tab);

      expect(mockChrome.windows.getLastFocused).toHaveBeenCalled();
      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 999 });
    });

    test('フォールバック処理も失敗した場合、エラー通知を表示する', async () => {
      mockChrome.windows.getLastFocused.mockRejectedValue(new Error('No window found'));

      const tab = {
        id: 1,
        windowId: null,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(showErrorNotification).toHaveBeenCalledWith(
        'エラー',
        'アクティブなウィンドウが見つかりません'
      );
      expect(console.error).toHaveBeenCalledWith(
        'ウィンドウIDの取得に失敗:',
        expect.any(Error)
      );
    });

    test('サイドパネルを開く処理が失敗した場合、エラー通知を表示する', async () => {
      mockChrome.sidePanel.open.mockRejectedValue(new Error('Failed to open side panel'));

      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(showErrorNotification).toHaveBeenCalledWith(
        'サイドパネルエラー',
        'サイドパネルを開けませんでした: Failed to open side panel'
      );
      expect(handleErrorWithRecovery).toHaveBeenCalledWith(
        expect.any(Error),
        'open_side_panel'
      );
    });

    test('エラー回復処理が成功した場合、ログを出力する', async () => {
      mockChrome.sidePanel.open.mockRejectedValue(new Error('Temporary error'));
      handleErrorWithRecovery.mockResolvedValue({
        success: false,
        recovered: true,
        guidance: 'エラーから回復しました'
      });

      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(console.log).toHaveBeenCalledWith('エラー回復に成功しました');
    });

    test('エラー回復処理も失敗した場合、エラーログを出力する', async () => {
      mockChrome.sidePanel.open.mockRejectedValue(new Error('Fatal error'));
      handleErrorWithRecovery.mockRejectedValue(new Error('Recovery failed'));

      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(console.error).toHaveBeenCalledWith(
        'エラー回復処理も失敗しました:',
        expect.any(Error)
      );
    });
  });

  /**
   * エッジケースのテスト
   */
  describe('エッジケースのテスト', () => {
    test('タブ情報が空のオブジェクトの場合、フォールバック処理を実行する', async () => {
      const tab = {};

      await actionClickHandler(tab);

      expect(mockChrome.windows.getLastFocused).toHaveBeenCalled();
      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 999 });
    });

    test('ウィンドウIDが0の場合、フォールバック処理を実行する', async () => {
      const tab = {
        id: 1,
        windowId: 0, // 0はfalsyな値
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(mockChrome.windows.getLastFocused).toHaveBeenCalled();
      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 999 });
    });

    test('ウィンドウIDが負の値の場合でも正常に動作する', async () => {
      const tab = {
        id: 1,
        windowId: -1,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: -1 });
    });

    test('非常に大きなウィンドウIDでも正常に動作する', async () => {
      const tab = {
        id: 1,
        windowId: 999999999,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 999999999 });
    });

    test('ストレージへの保存が失敗してもサイドパネルは開く', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage error'));

      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      // サイドパネルは開かれる
      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 123 });
      // エラーハンドリングが実行される
      expect(showErrorNotification).toHaveBeenCalled();
    });
  });

  /**
   * 統合テスト
   */
  describe('統合テスト', () => {
    test('正常なフロー全体が正しく動作する', async () => {
      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com',
        title: 'Example Page'
      };

      await actionClickHandler(tab);

      // 1. ログが出力される
      expect(console.log).toHaveBeenCalledWith('拡張機能アイコンがクリックされました');
      
      // 2. サイドパネルが開かれる
      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 123 });
      
      // 3. 状態が保存される
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        sidePanelIsOpen: true,
        sidePanelOpenedAt: expect.any(Number)
      });
      
      // 4. 成功ログが出力される
      expect(console.log).toHaveBeenCalledWith('サイドパネルを正常に開きました');
      
      // 5. エラー通知は表示されない
      expect(showErrorNotification).not.toHaveBeenCalled();
    });

    test('エラー発生時のフロー全体が正しく動作する', async () => {
      mockChrome.sidePanel.open.mockRejectedValue(new Error('Test error'));

      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      // 1. エラーログが出力される
      expect(console.error).toHaveBeenCalledWith(
        '拡張機能アイコンクリック処理エラー:',
        expect.any(Error)
      );
      
      // 2. エラー通知が表示される
      expect(showErrorNotification).toHaveBeenCalledWith(
        'サイドパネルエラー',
        expect.stringContaining('サイドパネルを開けませんでした')
      );
      
      // 3. エラー回復処理が実行される
      expect(handleErrorWithRecovery).toHaveBeenCalledWith(
        expect.any(Error),
        'open_side_panel'
      );
    });
  });
});
