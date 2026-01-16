/**
 * アイコンクリックによるトグル機能の統合テスト
 * Feature: icon-toggle-and-template-settings
 * 検証: 要件 1.1, 1.2, 1.4, 1.5
 */

const { getSidePanelState, closeSidePanel } = require('../background/service-worker-test-exports');

describe('アイコンクリックによるトグル機能', () => {
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
          get: jest.fn(),
          set: jest.fn().mockResolvedValue(undefined)
        }
      },
      runtime: {
        sendMessage: jest.fn().mockResolvedValue(undefined)
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

    // アクションクリックハンドラーの実装（トグル機能付き）
    actionClickHandler = async function(tab) {
      try {
        console.log('拡張機能アイコンがクリックされました');
        
        if (!chrome.sidePanel) {
          const errorMessage = 'このブラウザではサイドパネル機能がサポートされていません';
          console.error(errorMessage);
          showErrorNotification('サイドパネル機能について', errorMessage);
          return;
        }
        
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
        
        let errorMessage = 'サイドパネルの操作に失敗しました';
        if (error.message) {
          errorMessage += ': ' + error.message;
        }
        
        showErrorNotification('サイドパネルエラー', errorMessage);
        
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
   * 要件 1.1: サイドパネルが閉じている場合は開く
   */
  describe('要件 1.1: サイドパネルが閉じている場合は開く', () => {
    test('サイドパネルが閉じている状態でアイコンをクリックすると開く', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: false });
      
      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 123 });
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        sidePanelIsOpen: true,
        sidePanelOpenedAt: expect.any(Number)
      });
      expect(console.log).toHaveBeenCalledWith('サイドパネルを正常に開きました');
    });

    test('初回起動時（状態が保存されていない）はサイドパネルを開く', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});
      
      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 123 });
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        sidePanelIsOpen: true,
        sidePanelOpenedAt: expect.any(Number)
      });
    });
  });

  /**
   * 要件 1.2: サイドパネルが開いている場合は閉じる
   */
  describe('要件 1.2: サイドパネルが開いている場合は閉じる', () => {
    test('サイドパネルが開いている状態でアイコンをクリックすると閉じる', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: true });
      
      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'closeSidePanel',
        windowId: 123
      });
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        sidePanelIsOpen: false,
        sidePanelClosedAt: expect.any(Number)
      });
      expect(mockChrome.sidePanel.open).not.toHaveBeenCalled();
    });
  });

  /**
   * 要件 1.4: トグル操作前に状態をクエリ
   */
  describe('要件 1.4: トグル操作前に状態をクエリ', () => {
    test('アイコンクリック時に必ず状態をクエリする', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: false });
      
      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['sidePanelIsOpen']);
      expect(console.log).toHaveBeenCalledWith('現在のサイドパネル状態:', '閉じている');
    });

    test('状態クエリ後に適切な動作を実行する', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: true });
      
      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['sidePanelIsOpen']);
      expect(console.log).toHaveBeenCalledWith('現在のサイドパネル状態:', '開いている');
      expect(console.log).toHaveBeenCalledWith('サイドパネルを閉じます');
    });
  });

  /**
   * 要件 1.5: 状態クエリ失敗時のフォールバック
   */
  describe('要件 1.5: 状態クエリ失敗時のフォールバック', () => {
    test('状態クエリが失敗した場合、デフォルトで開く動作にフォールバック', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));
      
      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      // 状態取得失敗時はfalseが返されるため、開く動作になる
      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 123 });
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        sidePanelIsOpen: true,
        sidePanelOpenedAt: expect.any(Number)
      });
    });
  });

  /**
   * トグル動作の統合テスト
   */
  describe('トグル動作の統合テスト', () => {
    test('開く→閉じる→開くのサイクルが正しく動作する', async () => {
      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      // 1回目: 閉じている状態から開く
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: false });
      await actionClickHandler(tab);
      expect(mockChrome.sidePanel.open).toHaveBeenCalledTimes(1);
      expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();

      jest.clearAllMocks();

      // 2回目: 開いている状態から閉じる
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: true });
      await actionClickHandler(tab);
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockChrome.sidePanel.open).not.toHaveBeenCalled();

      jest.clearAllMocks();

      // 3回目: 閉じている状態から開く
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: false });
      await actionClickHandler(tab);
      expect(mockChrome.sidePanel.open).toHaveBeenCalledTimes(1);
      expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
    });

    test('異なるウィンドウでのトグル動作が正しく機能する', async () => {
      // ウィンドウ1で開く
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: false });
      await actionClickHandler({ id: 1, windowId: 100, url: 'https://example.com' });
      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 100 });

      jest.clearAllMocks();

      // ウィンドウ2で開く
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: false });
      await actionClickHandler({ id: 2, windowId: 200, url: 'https://example.com' });
      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 200 });

      jest.clearAllMocks();

      // ウィンドウ1で閉じる
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: true });
      await actionClickHandler({ id: 1, windowId: 100, url: 'https://example.com' });
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'closeSidePanel',
        windowId: 100
      });
    });
  });

  /**
   * エラーハンドリングのテスト
   */
  describe('エラーハンドリング', () => {
    test('サイドパネルを開く処理が失敗した場合、エラー通知を表示する', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: false });
      mockChrome.sidePanel.open.mockRejectedValue(new Error('Failed to open'));

      const tab = {
        id: 1,
        windowId: 123,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(showErrorNotification).toHaveBeenCalledWith(
        'サイドパネルエラー',
        'サイドパネルの操作に失敗しました: Failed to open'
      );
    });

    test('ウィンドウIDが取得できない場合、フォールバック処理を実行する', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: false });

      const tab = {
        id: 1,
        windowId: null,
        url: 'https://example.com'
      };

      await actionClickHandler(tab);

      expect(mockChrome.windows.getLastFocused).toHaveBeenCalled();
      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 999 });
    });
  });
});
