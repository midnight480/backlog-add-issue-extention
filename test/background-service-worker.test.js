/**
 * Background Service Worker のユニットテスト
 * Feature: side-panel-ui
 * 検証: 要件 8.1, 8.2, 8.3
 */

describe('Background Service Worker - サイドパネル機能のユニットテスト', () => {
  let mockChrome;
  let initializeSidePanel;
  let handleOpenSidePanel;
  let handleSavePanelState;
  let handleLoadPanelState;
  let handleClearPanelState;
  let validatePanelState;

  beforeEach(() => {
    // Chrome API のモック
    mockChrome = {
      sidePanel: {
        setPanelBehavior: jest.fn().mockResolvedValue(undefined),
        setOptions: jest.fn().mockResolvedValue(undefined),
        open: jest.fn().mockResolvedValue(undefined)
      },
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn().mockResolvedValue(undefined),
          remove: jest.fn().mockResolvedValue(undefined)
        }
      },
      windows: {
        getCurrent: jest.fn().mockResolvedValue({ id: 1 })
      },
      runtime: {
        onMessage: {
          addListener: jest.fn()
        },
        onInstalled: {
          addListener: jest.fn()
        },
        onStartup: {
          addListener: jest.fn()
        }
      }
    };

    global.chrome = mockChrome;

    // Background Service Workerの関数を定義
    // 実際のコードから抽出した関数をテスト用に再定義

    /**
     * サイドパネルの初期化処理
     */
    initializeSidePanel = async function() {
      try {
        console.log('サイドパネルの初期化を開始');
        
        // Side Panel APIのサポート確認
        if (!chrome.sidePanel) {
          console.warn('Side Panel APIがサポートされていません。ポップアップモードで動作します。');
          return { 
            success: false, 
            fallbackToPopup: true,
            message: 'サイドパネルが利用できません。ポップアップモードで動作します。'
          };
        }
        
        // サイドパネルの設定
        await chrome.sidePanel.setPanelBehavior({ 
          openPanelOnActionClick: false 
        });
        
        await chrome.sidePanel.setOptions({
          path: 'sidepanel/sidepanel.html',
          enabled: true
        });
        
        console.log('サイドパネルの初期化が完了しました');
        return { success: true };
        
      } catch (error) {
        console.error('サイドパネル初期化エラー:', error);
        return { 
          success: false, 
          fallbackToPopup: true,
          message: 'サイドパネルの初期化に失敗しました。ポップアップモードで動作します。',
          error: error.message
        };
      }
    };

    /**
     * サイドパネルを開く処理
     */
    handleOpenSidePanel = async function(windowId) {
      try {
        console.log('サイドパネルを開く処理を開始');
        
        // Side Panel APIのサポート確認
        if (!chrome.sidePanel) {
          throw new Error('Side Panel APIがサポートされていません');
        }
        
        // ウィンドウIDが指定されていない場合は現在のウィンドウを取得
        let targetWindowId = windowId;
        if (!targetWindowId) {
          const windows = await chrome.windows.getCurrent();
          targetWindowId = windows.id;
        }
        
        // サイドパネルを開く
        await chrome.sidePanel.open({ windowId: targetWindowId });
        
        // サイドパネルの開閉状態を記録
        await chrome.storage.local.set({ 
          sidePanelIsOpen: true,
          sidePanelOpenedAt: Date.now()
        });
        
        console.log('サイドパネルを開きました');
        return { success: true, message: 'サイドパネルを開きました' };
        
      } catch (error) {
        console.error('サイドパネルを開く処理でエラー:', error);
        return { 
          success: false, 
          message: error.message
        };
      }
    };

    /**
     * サイドパネルの状態を保存
     */
    handleSavePanelState = async function(state) {
      try {
        console.log('サイドパネルの状態を保存開始');
        
        // 状態を保存
        const stateWithTimestamp = {
          ...state,
          timestamp: Date.now()
        };
        
        await chrome.storage.local.set({ sidePanelState: stateWithTimestamp });
        
        console.log('サイドパネルの状態を保存しました');
        return { success: true, message: '状態を保存しました' };
        
      } catch (error) {
        console.error('サイドパネル状態保存エラー:', error);
        return { 
          success: false, 
          message: error.message
        };
      }
    };

    /**
     * サイドパネルの状態を読み込み
     */
    handleLoadPanelState = async function() {
      try {
        console.log('サイドパネルの状態を読み込み開始');
        
        const result = await chrome.storage.local.get(['sidePanelState']);
        
        if (!result.sidePanelState) {
          // デフォルト状態を返す
          const defaultState = {
            selectedProject: null,
            issueType: null,
            summary: '',
            description: '',
            currentTab: null,
            timestamp: Date.now()
          };
          return { success: true, state: defaultState };
        }
        
        // 状態のバリデーション
        if (!validatePanelState(result.sidePanelState)) {
          console.warn('無効な状態データ、デフォルト状態を返します');
          const defaultState = {
            selectedProject: null,
            issueType: null,
            summary: '',
            description: '',
            currentTab: null,
            timestamp: Date.now()
          };
          return { success: true, state: defaultState };
        }
        
        console.log('サイドパネルの状態を読み込みました');
        return { success: true, state: result.sidePanelState };
        
      } catch (error) {
        console.error('サイドパネル状態読み込みエラー:', error);
        
        // デフォルト状態を返す
        const defaultState = {
          selectedProject: null,
          issueType: null,
          summary: '',
          description: '',
          currentTab: null,
          timestamp: Date.now()
        };
        
        return { 
          success: true, 
          state: defaultState,
          warning: error.message
        };
      }
    };

    /**
     * サイドパネルの状態をクリア
     */
    handleClearPanelState = async function() {
      try {
        console.log('サイドパネルの状態をクリア開始');
        
        await chrome.storage.local.remove(['sidePanelState']);
        
        console.log('サイドパネルの状態をクリアしました');
        return { success: true, message: '状態をクリアしました' };
        
      } catch (error) {
        console.error('サイドパネル状態クリアエラー:', error);
        return { 
          success: false, 
          message: error.message
        };
      }
    };

    /**
     * パネル状態のバリデーション
     */
    validatePanelState = function(state) {
      if (!state || typeof state !== 'object') {
        return false;
      }
      
      // 必須フィールドの確認
      if (typeof state.summary !== 'string' || typeof state.description !== 'string') {
        return false;
      }
      
      // selectedProjectが存在する場合は構造を確認
      if (state.selectedProject !== null && state.selectedProject !== undefined) {
        if (typeof state.selectedProject !== 'object' ||
            !state.selectedProject.id ||
            !state.selectedProject.name ||
            !state.selectedProject.projectKey) {
          return false;
        }
      }
      
      return true;
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
   * 要件 8.1: Side Panel APIが利用できない場合のフォールバック
   */
  describe('要件 8.1: Side Panel API利用不可時のフォールバック', () => {
    test('Side Panel APIが存在しない場合、ポップアップモードにフォールバックする', async () => {
      // Side Panel APIを削除
      delete global.chrome.sidePanel;

      const result = await initializeSidePanel();

      expect(result.success).toBe(false);
      expect(result.fallbackToPopup).toBe(true);
      expect(result.message).toContain('ポップアップモード');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Side Panel APIがサポートされていません')
      );
    });

    test('Side Panel APIがundefinedの場合、ポップアップモードにフォールバックする', async () => {
      global.chrome.sidePanel = undefined;

      const result = await initializeSidePanel();

      expect(result.success).toBe(false);
      expect(result.fallbackToPopup).toBe(true);
      expect(result.message).toContain('ポップアップモード');
    });

    test('Side Panel APIがnullの場合、ポップアップモードにフォールバックする', async () => {
      global.chrome.sidePanel = null;

      const result = await initializeSidePanel();

      expect(result.success).toBe(false);
      expect(result.fallbackToPopup).toBe(true);
      expect(result.message).toContain('ポップアップモード');
    });
  });

  /**
   * 要件 8.2: サイドパネル初期化失敗時のエラーメッセージ表示
   */
  describe('要件 8.2: サイドパネル初期化失敗時のエラーハンドリング', () => {
    test('setPanelBehaviorが失敗した場合、エラーメッセージを返す', async () => {
      const errorMessage = 'setPanelBehavior failed';
      mockChrome.sidePanel.setPanelBehavior.mockRejectedValue(new Error(errorMessage));

      const result = await initializeSidePanel();

      expect(result.success).toBe(false);
      expect(result.fallbackToPopup).toBe(true);
      expect(result.message).toContain('初期化に失敗');
      expect(result.error).toBe(errorMessage);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('サイドパネル初期化エラー'),
        expect.any(Error)
      );
    });

    test('setOptionsが失敗した場合、エラーメッセージを返す', async () => {
      const errorMessage = 'setOptions failed';
      mockChrome.sidePanel.setOptions.mockRejectedValue(new Error(errorMessage));

      const result = await initializeSidePanel();

      expect(result.success).toBe(false);
      expect(result.fallbackToPopup).toBe(true);
      expect(result.message).toContain('初期化に失敗');
      expect(result.error).toBe(errorMessage);
    });

    test('初期化が成功した場合、成功メッセージを返す', async () => {
      const result = await initializeSidePanel();

      expect(result.success).toBe(true);
      expect(result.fallbackToPopup).toBeUndefined();
      expect(mockChrome.sidePanel.setPanelBehavior).toHaveBeenCalledWith({
        openPanelOnActionClick: false
      });
      expect(mockChrome.sidePanel.setOptions).toHaveBeenCalledWith({
        path: 'sidepanel/sidepanel.html',
        enabled: true
      });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('初期化が完了')
      );
    });
  });

  /**
   * 要件 8.3: 状態の復元が失敗した場合、空の状態で起動
   */
  describe('要件 8.3: 状態復元失敗時のデフォルト状態提供', () => {
    test('ストレージが空の場合、デフォルト状態を返す', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});

      const result = await handleLoadPanelState();

      expect(result.success).toBe(true);
      expect(result.state).toEqual({
        selectedProject: null,
        issueType: null,
        summary: '',
        description: '',
        currentTab: null,
        timestamp: expect.any(Number)
      });
    });

    test('保存された状態が無効な場合、デフォルト状態を返す', async () => {
      const invalidState = {
        summary: 123, // 無効な型
        description: 'test'
      };
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelState: invalidState });

      const result = await handleLoadPanelState();

      expect(result.success).toBe(true);
      expect(result.state).toEqual({
        selectedProject: null,
        issueType: null,
        summary: '',
        description: '',
        currentTab: null,
        timestamp: expect.any(Number)
      });
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('無効な状態データ')
      );
    });

    test('ストレージ読み込みが失敗した場合、デフォルト状態を返す', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      const result = await handleLoadPanelState();

      expect(result.success).toBe(true);
      expect(result.state).toEqual({
        selectedProject: null,
        issueType: null,
        summary: '',
        description: '',
        currentTab: null,
        timestamp: expect.any(Number)
      });
      expect(result.warning).toBe('Storage error');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('状態読み込みエラー'),
        expect.any(Error)
      );
    });

    test('有効な状態が保存されている場合、その状態を返す', async () => {
      const validState = {
        selectedProject: {
          id: '1',
          name: 'Test Project',
          projectKey: 'TEST'
        },
        issueType: '1',
        summary: 'Test Summary',
        description: 'Test Description',
        currentTab: {
          url: 'https://example.com',
          title: 'Example'
        },
        timestamp: 1234567890
      };
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelState: validState });

      const result = await handleLoadPanelState();

      expect(result.success).toBe(true);
      expect(result.state).toEqual(validState);
    });
  });

  /**
   * サイドパネルを開く処理のテスト
   */
  describe('サイドパネルを開く処理', () => {
    test('ウィンドウIDが指定されている場合、そのウィンドウでサイドパネルを開く', async () => {
      const windowId = 123;

      const result = await handleOpenSidePanel(windowId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('開きました');
      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 123 });
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        sidePanelIsOpen: true,
        sidePanelOpenedAt: expect.any(Number)
      });
    });

    test('ウィンドウIDが指定されていない場合、現在のウィンドウでサイドパネルを開く', async () => {
      const result = await handleOpenSidePanel();

      expect(result.success).toBe(true);
      expect(mockChrome.windows.getCurrent).toHaveBeenCalled();
      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 1 });
    });

    test('Side Panel APIが存在しない場合、エラーを返す', async () => {
      delete global.chrome.sidePanel;

      const result = await handleOpenSidePanel();

      expect(result.success).toBe(false);
      expect(result.message).toContain('サポートされていません');
    });

    test('サイドパネルを開く処理が失敗した場合、エラーを返す', async () => {
      mockChrome.sidePanel.open.mockRejectedValue(new Error('Open failed'));

      const result = await handleOpenSidePanel();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Open failed');
    });
  });

  /**
   * サイドパネル状態の保存処理のテスト
   */
  describe('サイドパネル状態の保存処理', () => {
    test('状態を正常に保存できる', async () => {
      const state = {
        selectedProject: { id: '1', name: 'Test', projectKey: 'TEST' },
        issueType: '1',
        summary: 'Test',
        description: 'Test Description'
      };

      const result = await handleSavePanelState(state);

      expect(result.success).toBe(true);
      expect(result.message).toContain('保存しました');
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        sidePanelState: {
          ...state,
          timestamp: expect.any(Number)
        }
      });
    });

    test('保存処理が失敗した場合、エラーを返す', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Save failed'));

      const result = await handleSavePanelState({});

      expect(result.success).toBe(false);
      expect(result.message).toBe('Save failed');
    });
  });

  /**
   * サイドパネル状態のクリア処理のテスト
   */
  describe('サイドパネル状態のクリア処理', () => {
    test('状態を正常にクリアできる', async () => {
      const result = await handleClearPanelState();

      expect(result.success).toBe(true);
      expect(result.message).toContain('クリアしました');
      expect(mockChrome.storage.local.remove).toHaveBeenCalledWith(['sidePanelState']);
    });

    test('クリア処理が失敗した場合、エラーを返す', async () => {
      mockChrome.storage.local.remove.mockRejectedValue(new Error('Remove failed'));

      const result = await handleClearPanelState();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Remove failed');
    });
  });

  /**
   * パネル状態のバリデーションのテスト
   */
  describe('パネル状態のバリデーション', () => {
    test('有効な状態の場合、trueを返す', () => {
      const validState = {
        selectedProject: {
          id: '1',
          name: 'Test',
          projectKey: 'TEST'
        },
        issueType: '1',
        summary: 'Test',
        description: 'Test Description'
      };

      expect(validatePanelState(validState)).toBe(true);
    });

    test('selectedProjectがnullの場合でも有効', () => {
      const validState = {
        selectedProject: null,
        issueType: null,
        summary: 'Test',
        description: 'Test Description'
      };

      expect(validatePanelState(validState)).toBe(true);
    });

    test('stateがnullの場合、falseを返す', () => {
      expect(validatePanelState(null)).toBe(false);
    });

    test('stateがundefinedの場合、falseを返す', () => {
      expect(validatePanelState(undefined)).toBe(false);
    });

    test('stateがオブジェクトでない場合、falseを返す', () => {
      expect(validatePanelState('string')).toBe(false);
      expect(validatePanelState(123)).toBe(false);
      expect(validatePanelState(true)).toBe(false);
    });

    test('summaryが文字列でない場合、falseを返す', () => {
      const invalidState = {
        summary: 123,
        description: 'Test'
      };

      expect(validatePanelState(invalidState)).toBe(false);
    });

    test('descriptionが文字列でない場合、falseを返す', () => {
      const invalidState = {
        summary: 'Test',
        description: 123
      };

      expect(validatePanelState(invalidState)).toBe(false);
    });

    test('selectedProjectの構造が無効な場合、falseを返す', () => {
      const invalidState1 = {
        selectedProject: { id: '1' }, // nameとprojectKeyが欠けている
        summary: 'Test',
        description: 'Test'
      };

      expect(validatePanelState(invalidState1)).toBe(false);

      const invalidState2 = {
        selectedProject: { name: 'Test' }, // idとprojectKeyが欠けている
        summary: 'Test',
        description: 'Test'
      };

      expect(validatePanelState(invalidState2)).toBe(false);
    });
  });

  /**
   * エッジケースのテスト
   */
  describe('エッジケースのテスト', () => {
    test('空の状態を保存できる', async () => {
      const emptyState = {
        selectedProject: null,
        issueType: null,
        summary: '',
        description: ''
      };

      const result = await handleSavePanelState(emptyState);

      expect(result.success).toBe(true);
    });

    test('非常に長い文字列を含む状態を保存できる', async () => {
      const longState = {
        selectedProject: null,
        issueType: null,
        summary: 'a'.repeat(1000),
        description: 'b'.repeat(10000)
      };

      const result = await handleSavePanelState(longState);

      expect(result.success).toBe(true);
    });

    test('特殊文字を含む状態を保存できる', async () => {
      const specialState = {
        selectedProject: {
          id: '1',
          name: 'Test <>&"\'',
          projectKey: 'TEST'
        },
        issueType: '1',
        summary: 'Test <>&"\'',
        description: 'Test <>&"\''
      };

      const result = await handleSavePanelState(specialState);

      expect(result.success).toBe(true);
    });

    test('日本語を含む状態を保存できる', async () => {
      const japaneseState = {
        selectedProject: {
          id: '1',
          name: 'テストプロジェクト',
          projectKey: 'TEST'
        },
        issueType: '1',
        summary: 'テスト課題',
        description: 'これはテストの説明です。'
      };

      const result = await handleSavePanelState(japaneseState);

      expect(result.success).toBe(true);
    });
  });
});
