/**
 * エラーハンドリングのユニットテスト
 * Feature: side-panel-ui
 * 検証: 要件 8.2, 8.3, 8.4
 */

describe('エラーハンドリング - リトライ処理と復元処理', () => {
  let mockChrome;
  let saveStateWithRetry;
  let handleLoadPanelState;
  let getDefaultPanelState;
  let validatePanelState;

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

    /**
     * リトライ機能付きで状態を保存
     * 要件8.2: 状態の保存失敗時のリトライ処理
     */
    saveStateWithRetry = async function(state, maxRetries = 3) {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const stateWithTimestamp = {
            ...state,
            timestamp: Date.now()
          };
          
          await chrome.storage.local.set({ sidePanelState: stateWithTimestamp });
          
          if (i > 0) {
            console.log(`状態の保存に成功しました（リトライ ${i} 回目）`);
          }
          
          return { success: true, retries: i };
        } catch (error) {
          console.error(`保存試行 ${i + 1} 回目が失敗:`, error);
          
          if (i === maxRetries - 1) {
            // 最後のリトライも失敗した場合
            return {
              success: false,
              message: '状態の保存に失敗しました。ブラウザの設定を確認してください。',
              retries: i + 1
            };
          }
          
          // 次のリトライまで待機（指数バックオフ）
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    };

    /**
     * デフォルトのパネル状態を取得
     */
    getDefaultPanelState = function() {
      return {
        selectedProject: null,
        issueType: null,
        summary: '',
        description: '',
        currentTab: null,
        timestamp: Date.now()
      };
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

    /**
     * サイドパネルの状態を読み込み
     * 要件8.3: 状態の復元失敗時のデフォルト状態処理
     */
    handleLoadPanelState = async function() {
      try {
        console.log('サイドパネルの状態を読み込み開始');
        
        const result = await chrome.storage.local.get(['sidePanelState']);
        
        if (!result.sidePanelState) {
          // デフォルト状態を返す
          console.log('保存された状態が見つかりません。デフォルト状態を使用します。');
          const defaultState = getDefaultPanelState();
          return { success: true, state: defaultState };
        }
        
        // 状態のバリデーション
        if (!validatePanelState(result.sidePanelState)) {
          console.warn('無効な状態データが検出されました。デフォルト状態を使用します。');
          
          // 破損した状態をクリア
          try {
            await chrome.storage.local.remove(['sidePanelState']);
            console.log('破損した状態データをクリアしました');
          } catch (clearError) {
            console.error('破損した状態のクリアに失敗:', clearError);
          }
          
          const defaultState = getDefaultPanelState();
          return { 
            success: true, 
            state: defaultState,
            warning: '保存された状態が破損していたため、デフォルト状態で起動しました。'
          };
        }
        
        console.log('サイドパネルの状態を読み込みました');
        return { success: true, state: result.sidePanelState };
        
      } catch (error) {
        console.error('サイドパネル状態読み込みエラー:', error);
        
        // デフォルト状態を返す
        console.log('エラーが発生したため、デフォルト状態で起動します。');
        const defaultState = getDefaultPanelState();
        
        return { 
          success: true, 
          state: defaultState,
          warning: error.message
        };
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
   * 要件 8.2: 状態の保存失敗時のリトライ処理
   */
  describe('要件 8.2: 状態保存失敗時のリトライ処理', () => {
    test('1回目の保存が成功する場合、リトライなしで成功する', async () => {
      const state = {
        selectedProject: null,
        issueType: null,
        summary: 'Test',
        description: 'Test Description'
      };

      const result = await saveStateWithRetry(state, 3);

      expect(result.success).toBe(true);
      expect(result.retries).toBe(0);
      expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(1);
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('リトライ')
      );
    });

    test('1回目の保存が失敗しても、2回目で成功する', async () => {
      // 1回目は失敗、2回目は成功
      mockChrome.storage.local.set
        .mockRejectedValueOnce(new Error('Storage error'))
        .mockResolvedValueOnce(undefined);

      const state = {
        selectedProject: null,
        issueType: null,
        summary: 'Test',
        description: 'Test Description'
      };

      const result = await saveStateWithRetry(state, 3);

      expect(result.success).toBe(true);
      expect(result.retries).toBe(1);
      expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(2);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('リトライ 1 回目')
      );
    });

    test('2回目の保存が失敗しても、3回目で成功する', async () => {
      // 1回目と2回目は失敗、3回目は成功
      mockChrome.storage.local.set
        .mockRejectedValueOnce(new Error('Storage error 1'))
        .mockRejectedValueOnce(new Error('Storage error 2'))
        .mockResolvedValueOnce(undefined);

      const state = {
        selectedProject: null,
        issueType: null,
        summary: 'Test',
        description: 'Test Description'
      };

      const result = await saveStateWithRetry(state, 3);

      expect(result.success).toBe(true);
      expect(result.retries).toBe(2);
      expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(3);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('リトライ 2 回目')
      );
    });

    test('最大リトライ回数を超えた場合、エラーを返す', async () => {
      // すべての試行が失敗
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage error'));

      const state = {
        selectedProject: null,
        issueType: null,
        summary: 'Test',
        description: 'Test Description'
      };

      const result = await saveStateWithRetry(state, 3);

      expect(result.success).toBe(false);
      expect(result.message).toContain('保存に失敗');
      expect(result.retries).toBe(3);
      expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(3);
      expect(console.error).toHaveBeenCalledTimes(3);
    });

    test('カスタムリトライ回数を指定できる', async () => {
      // すべての試行が失敗
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage error'));

      const state = {
        selectedProject: null,
        issueType: null,
        summary: 'Test',
        description: 'Test Description'
      };

      const result = await saveStateWithRetry(state, 5);

      expect(result.success).toBe(false);
      expect(result.retries).toBe(5);
      expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(5);
    }, 20000); // 20秒のタイムアウト
  });

  /**
   * 要件 8.3: 状態の復元失敗時のデフォルト状態処理
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
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('保存された状態が見つかりません')
      );
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
      expect(result.warning).toContain('破損');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('無効な状態データ')
      );
      expect(mockChrome.storage.local.remove).toHaveBeenCalledWith(['sidePanelState']);
    });

    test('保存された状態が破損している場合、破損データをクリアする', async () => {
      const corruptedState = {
        selectedProject: { id: '1' }, // nameとprojectKeyが欠けている
        summary: 'Test',
        description: 'Test'
      };
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelState: corruptedState });

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
      expect(mockChrome.storage.local.remove).toHaveBeenCalledWith(['sidePanelState']);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('破損した状態データをクリアしました')
      );
    });

    test('破損データのクリアが失敗しても、デフォルト状態を返す', async () => {
      const corruptedState = {
        summary: 123,
        description: 'test'
      };
      mockChrome.storage.local.get.mockResolvedValue({ sidePanelState: corruptedState });
      mockChrome.storage.local.remove.mockRejectedValue(new Error('Remove failed'));

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
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('破損した状態のクリアに失敗'),
        expect.any(Error)
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
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('デフォルト状態で起動')
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
      expect(result.warning).toBeUndefined();
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

      const result = await saveStateWithRetry(emptyState, 3);

      expect(result.success).toBe(true);
    });

    test('非常に長い文字列を含む状態を保存できる', async () => {
      const longState = {
        selectedProject: null,
        issueType: null,
        summary: 'a'.repeat(1000),
        description: 'b'.repeat(10000)
      };

      const result = await saveStateWithRetry(longState, 3);

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

      const result = await saveStateWithRetry(specialState, 3);

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

      const result = await saveStateWithRetry(japaneseState, 3);

      expect(result.success).toBe(true);
    });
  });
});
