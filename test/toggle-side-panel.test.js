/**
 * サイドパネルトグル機能のユニットテスト
 * Feature: icon-toggle-and-template-settings
 * 検証: 要件 1.1, 1.2, 1.4, 1.5
 */

const { getSidePanelState, closeSidePanel } = require('../background/service-worker-test-exports');

describe('サイドパネルトグル機能', () => {
  let mockChrome;

  beforeEach(() => {
    // Chrome API のモック
    mockChrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn().mockResolvedValue(undefined)
        }
      },
      runtime: {
        sendMessage: jest.fn().mockResolvedValue(undefined)
      }
    };

    global.chrome = mockChrome;

    // コンソールログをモック
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 要件 1.4: getSidePanelState() - 現在の状態を取得
   */
  describe('getSidePanelState() - 現在の状態を取得', () => {
    test('サイドパネルが開いている場合、trueを返す', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: true });

      const result = await getSidePanelState();

      expect(result).toBe(true);
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['sidePanelIsOpen']);
    });

    test('サイドパネルが閉じている場合、falseを返す', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: false });

      const result = await getSidePanelState();

      expect(result).toBe(false);
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['sidePanelIsOpen']);
    });

    test('状態が保存されていない場合、falseを返す', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});

      const result = await getSidePanelState();

      expect(result).toBe(false);
    });

    test('要件1.5: 状態クエリが失敗した場合、falseを返す（デフォルトで開く動作）', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      const result = await getSidePanelState();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'サイドパネル状態の取得に失敗:',
        expect.any(Error)
      );
    });
  });

  /**
   * 要件 1.2: closeSidePanel() - サイドパネルを閉じる
   */
  describe('closeSidePanel() - サイドパネルを閉じる', () => {
    test('サイドパネルにクローズメッセージを送信する', async () => {
      const windowId = 123;

      await closeSidePanel(windowId);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'closeSidePanel',
        windowId: windowId
      });
    });

    test('要件1.3: サイドパネルの状態をfalseに更新する', async () => {
      const windowId = 123;

      await closeSidePanel(windowId);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        sidePanelIsOpen: false,
        sidePanelClosedAt: expect.any(Number)
      });
    });

    test('メッセージング失敗時もストレージの状態は更新する', async () => {
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Messaging error'));
      const windowId = 123;

      await closeSidePanel(windowId);

      expect(console.error).toHaveBeenCalledWith(
        'サイドパネルのクローズに失敗:',
        expect.any(Error)
      );
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        sidePanelIsOpen: false,
        sidePanelClosedAt: expect.any(Number)
      });
    });

    test('メッセージングとストレージ両方が失敗した場合、エラーログを出力する', async () => {
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Messaging error'));
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage error'));
      const windowId = 123;

      await closeSidePanel(windowId);

      expect(console.error).toHaveBeenCalledWith(
        'サイドパネルのクローズに失敗:',
        expect.any(Error)
      );
      expect(console.error).toHaveBeenCalledWith(
        'ストレージの更新にも失敗:',
        expect.any(Error)
      );
    });
  });

  /**
   * エッジケースのテスト
   */
  describe('エッジケースのテスト', () => {
    test('getSidePanelState: sidePanelIsOpenがnullの場合、falseを返す', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: null });

      const result = await getSidePanelState();

      expect(result).toBe(false);
    });

    test('getSidePanelState: sidePanelIsOpenがundefinedの場合、falseを返す', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: undefined });

      const result = await getSidePanelState();

      expect(result).toBe(false);
    });

    test('getSidePanelState: sidePanelIsOpenが文字列"true"の場合、falseを返す', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelIsOpen: 'true' });

      const result = await getSidePanelState();

      expect(result).toBe(false);
    });

    test('closeSidePanel: windowIdが0の場合でも正常に動作する', async () => {
      const windowId = 0;

      await closeSidePanel(windowId);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'closeSidePanel',
        windowId: 0
      });
    });

    test('closeSidePanel: windowIdが負の値の場合でも正常に動作する', async () => {
      const windowId = -1;

      await closeSidePanel(windowId);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'closeSidePanel',
        windowId: -1
      });
    });

    test('closeSidePanel: windowIdが非常に大きな値の場合でも正常に動作する', async () => {
      const windowId = 999999999;

      await closeSidePanel(windowId);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'closeSidePanel',
        windowId: 999999999
      });
    });
  });
});
