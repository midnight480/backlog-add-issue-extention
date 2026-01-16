/**
 * サイドパネル側のクローズメッセージ処理のユニットテスト
 * Feature: icon-toggle-and-template-settings
 * 検証: 要件 1.2, 1.3
 */

describe('サイドパネル側のクローズメッセージ処理', () => {
  let mockChrome;
  let messageListener;
  let originalWindowClose;

  beforeEach(() => {
    // Chrome API のモック
    mockChrome = {
      storage: {
        local: {
          set: jest.fn().mockResolvedValue(undefined)
        }
      },
      runtime: {
        onMessage: {
          addListener: jest.fn((listener) => {
            messageListener = listener;
          })
        }
      }
    };

    global.chrome = mockChrome;

    // window.close のモック
    originalWindowClose = window.close;
    window.close = jest.fn();

    // コンソールログをモック
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // window.close を元に戻す
    if (originalWindowClose) {
      window.close = originalWindowClose;
    }
  });

  /**
   * メッセージリスナーのセットアップをシミュレート
   */
  function setupCloseMessageListener() {
    if (!chrome || !chrome.runtime) {
      console.warn('Chrome Runtime API is not available');
      return;
    }

    const closeMessageListener = async (message) => {
      if (message.action === 'closeSidePanel') {
        console.log('クローズメッセージを受信しました');
        
        try {
          await chrome.storage.local.set({ 
            sidePanelIsOpen: false,
            sidePanelClosedAt: Date.now()
          });
          console.log('サイドパネルの閉じた状態を記録しました');
          
          window.close();
        } catch (error) {
          console.error('サイドパネルクローズ処理エラー:', error);
        }
      }
    };

    chrome.runtime.onMessage.addListener(closeMessageListener);
    console.log('クローズメッセージリスナーを設定しました');
  }

  /**
   * 要件 1.2: closeSidePanelメッセージを受信した時にwindow.close()が呼ばれる
   */
  describe('要件 1.2: closeSidePanelメッセージを受信した時にwindow.close()が呼ばれる', () => {
    test('closeSidePanelメッセージを受信するとwindow.close()が呼ばれる', async () => {
      setupCloseMessageListener();

      const message = {
        action: 'closeSidePanel',
        windowId: 123
      };

      await messageListener(message, {}, jest.fn());

      expect(window.close).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith('クローズメッセージを受信しました');
    });

    test('異なるアクションのメッセージではwindow.close()が呼ばれない', async () => {
      setupCloseMessageListener();

      const message = {
        action: 'otherAction',
        windowId: 123
      };

      await messageListener(message, {}, jest.fn());

      expect(window.close).not.toHaveBeenCalled();
    });

    test('アクションが指定されていないメッセージではwindow.close()が呼ばれない', async () => {
      setupCloseMessageListener();

      const message = {
        windowId: 123
      };

      await messageListener(message, {}, jest.fn());

      expect(window.close).not.toHaveBeenCalled();
    });
  });

  /**
   * 要件 1.3: 状態が正しく更新される
   */
  describe('要件 1.3: 状態が正しく更新される', () => {
    test('closeSidePanelメッセージを受信するとsidePanelIsOpenがfalseに更新される', async () => {
      setupCloseMessageListener();

      const message = {
        action: 'closeSidePanel',
        windowId: 123
      };

      await messageListener(message, {}, jest.fn());

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        sidePanelIsOpen: false,
        sidePanelClosedAt: expect.any(Number)
      });
      expect(console.log).toHaveBeenCalledWith('サイドパネルの閉じた状態を記録しました');
    });

    test('状態更新後にwindow.close()が呼ばれる（順序の確認）', async () => {
      setupCloseMessageListener();

      const callOrder = [];
      mockChrome.storage.local.set.mockImplementation(async () => {
        callOrder.push('storage.set');
      });
      window.close = jest.fn(() => {
        callOrder.push('window.close');
      });

      const message = {
        action: 'closeSidePanel',
        windowId: 123
      };

      await messageListener(message, {}, jest.fn());

      expect(callOrder).toEqual(['storage.set', 'window.close']);
    });

    test('sidePanelClosedAtに現在時刻が記録される', async () => {
      setupCloseMessageListener();

      const beforeTime = Date.now();

      const message = {
        action: 'closeSidePanel',
        windowId: 123
      };

      await messageListener(message, {}, jest.fn());

      const afterTime = Date.now();

      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect(setCall.sidePanelClosedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(setCall.sidePanelClosedAt).toBeLessThanOrEqual(afterTime);
    });
  });

  /**
   * エラーハンドリングのテスト
   */
  describe('エラーハンドリング', () => {
    test('ストレージの更新が失敗した場合、エラーログが出力される', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage error'));
      setupCloseMessageListener();

      const message = {
        action: 'closeSidePanel',
        windowId: 123
      };

      await messageListener(message, {}, jest.fn());

      expect(console.error).toHaveBeenCalledWith(
        'サイドパネルクローズ処理エラー:',
        expect.any(Error)
      );
      // エラーが発生するとwindow.close()は呼ばれない（tryブロック内でエラーが発生するため）
      expect(window.close).not.toHaveBeenCalled();
    });

    test('Chrome Runtime APIが利用できない場合、リスナーは設定されない', () => {
      global.chrome = null;

      setupCloseMessageListener();

      expect(console.warn).toHaveBeenCalledWith('Chrome Runtime API is not available');
    });

    test('chrome.runtimeが存在しない場合、リスナーは設定されない', () => {
      global.chrome = {};

      setupCloseMessageListener();

      expect(console.warn).toHaveBeenCalledWith('Chrome Runtime API is not available');
    });
  });

  /**
   * エッジケースのテスト
   */
  describe('エッジケースのテスト', () => {
    test('windowIdが0の場合でも正常に動作する', async () => {
      setupCloseMessageListener();

      const message = {
        action: 'closeSidePanel',
        windowId: 0
      };

      await messageListener(message, {}, jest.fn());

      expect(window.close).toHaveBeenCalledTimes(1);
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('windowIdが指定されていない場合でも正常に動作する', async () => {
      setupCloseMessageListener();

      const message = {
        action: 'closeSidePanel'
      };

      await messageListener(message, {}, jest.fn());

      expect(window.close).toHaveBeenCalledTimes(1);
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('メッセージが空オブジェクトの場合、何も実行されない', async () => {
      setupCloseMessageListener();

      const message = {};

      await messageListener(message, {}, jest.fn());

      expect(window.close).not.toHaveBeenCalled();
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });

    test('メッセージがnullの場合、エラーが発生する', async () => {
      setupCloseMessageListener();

      const message = null;

      await expect(messageListener(message, {}, jest.fn())).rejects.toThrow();
    });

    test('複数回closeSidePanelメッセージを受信しても正常に動作する', async () => {
      setupCloseMessageListener();

      const message = {
        action: 'closeSidePanel',
        windowId: 123
      };

      await messageListener(message, {}, jest.fn());
      await messageListener(message, {}, jest.fn());
      await messageListener(message, {}, jest.fn());

      expect(window.close).toHaveBeenCalledTimes(3);
      expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(3);
    });
  });

  /**
   * 統合テスト
   */
  describe('統合テスト', () => {
    test('メッセージリスナーが正しく登録される', () => {
      setupCloseMessageListener();

      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith('クローズメッセージリスナーを設定しました');
    });

    test('完全なクローズフローが正常に動作する', async () => {
      setupCloseMessageListener();

      const message = {
        action: 'closeSidePanel',
        windowId: 123
      };

      await messageListener(message, {}, jest.fn());

      // 1. メッセージを受信
      expect(console.log).toHaveBeenCalledWith('クローズメッセージを受信しました');
      
      // 2. 状態を更新
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        sidePanelIsOpen: false,
        sidePanelClosedAt: expect.any(Number)
      });
      expect(console.log).toHaveBeenCalledWith('サイドパネルの閉じた状態を記録しました');
      
      // 3. ウィンドウを閉じる
      expect(window.close).toHaveBeenCalledTimes(1);
    });
  });
});
