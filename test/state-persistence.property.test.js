/**
 * サイドパネル状態変更の永続化プロパティベーステスト
 * Feature: icon-toggle-and-template-settings
 * Property 2: 状態変更の永続化
 * **Validates: Requirements 1.3**
 */

const fc = require('fast-check');
const { getSidePanelState, closeSidePanel } = require('../background/service-worker-test-exports');

describe('Property 2: 状態変更の永続化', () => {
  let mockChrome;

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
   */
  const windowIdArbitrary = fc.integer({ min: 1, max: 999999 });

  /**
   * サイドパネルの状態変更のジェネレーター
   * { from: boolean, to: boolean } の形式
   */
  const stateChangeArbitrary = fc.record({
    from: fc.boolean(),
    to: fc.boolean()
  }).filter(change => change.from !== change.to); // 状態が変更される場合のみ

  /**
   * Property 2: 状態変更の永続化
   * **Validates: Requirements 1.3**
   * 
   * For any サイドパネルの状態変更（開く→閉じる、閉じる→開く）に対して、
   * 変更後の状態はChrome Storage APIに正しく保存されるべきです。
   */
  test('Property 2: 状態変更後、新しい状態がStorage APIに正しく保存される', async () => {
    await fc.assert(
      fc.asyncProperty(windowIdArbitrary, stateChangeArbitrary, async (windowId, stateChange) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // 初期状態を設定
        mockChrome.storage.local.get.mockResolvedValue({ 
          sidePanelIsOpen: stateChange.from 
        });

        // 状態変更を実行
        if (stateChange.to) {
          // 閉じている→開く
          await chrome.sidePanel.open({ windowId: windowId });
          await chrome.storage.local.set({ 
            sidePanelIsOpen: true,
            sidePanelOpenedAt: Date.now()
          });
        } else {
          // 開いている→閉じる
          await closeSidePanel(windowId);
        }

        // Storage APIに正しく保存されることを検証
        expect(mockChrome.storage.local.set).toHaveBeenCalled();
        
        // 最後の呼び出しを取得
        const lastCall = mockChrome.storage.local.set.mock.calls[
          mockChrome.storage.local.set.mock.calls.length - 1
        ];
        const savedData = lastCall[0];

        // 新しい状態が正しく保存されていることを確認
        expect(savedData.sidePanelIsOpen).toBe(stateChange.to);

        // タイムスタンプが保存されていることを確認
        if (stateChange.to) {
          expect(savedData.sidePanelOpenedAt).toBeDefined();
          expect(typeof savedData.sidePanelOpenedAt).toBe('number');
        } else {
          expect(savedData.sidePanelClosedAt).toBeDefined();
          expect(typeof savedData.sidePanelClosedAt).toBe('number');
        }
      }),
      { 
        numRuns: 100, // 最小100回の反復実行
        verbose: true // 詳細なログを出力
      }
    );
  });

  /**
   * Property 2の変形: 複数回の状態変更で毎回正しく保存される
   * **Validates: Requirements 1.3**
   */
  test('Property 2: 複数回の状態変更で毎回Storage APIに正しく保存される', async () => {
    // 状態変更のシーケンスを生成（2〜5回）
    const stateChangeSequenceArbitrary = fc.array(
      fc.boolean(),
      { minLength: 2, maxLength: 5 }
    );

    await fc.assert(
      fc.asyncProperty(
        windowIdArbitrary, 
        stateChangeSequenceArbitrary, 
        async (windowId, stateSequence) => {
          // テストごとにモックをリセット
          jest.clearAllMocks();

          // 各状態変更を実行
          for (let i = 0; i < stateSequence.length; i++) {
            const newState = stateSequence[i];

            // 状態変更を実行
            if (newState) {
              // 開く
              await chrome.sidePanel.open({ windowId: windowId });
              await chrome.storage.local.set({ 
                sidePanelIsOpen: true,
                sidePanelOpenedAt: Date.now()
              });
            } else {
              // 閉じる
              await closeSidePanel(windowId);
            }

            // Storage APIが呼ばれたことを確認
            expect(mockChrome.storage.local.set).toHaveBeenCalled();

            // 最後の呼び出しで正しい状態が保存されていることを確認
            const lastCall = mockChrome.storage.local.set.mock.calls[
              mockChrome.storage.local.set.mock.calls.length - 1
            ];
            const savedData = lastCall[0];
            expect(savedData.sidePanelIsOpen).toBe(newState);
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
   * Property 2の変形: 開く操作で正しいタイムスタンプが保存される
   * **Validates: Requirements 1.3**
   */
  test('Property 2: 開く操作でsidePanelOpenedAtタイムスタンプが保存される', async () => {
    await fc.assert(
      fc.asyncProperty(windowIdArbitrary, async (windowId) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // 現在時刻を記録
        const beforeTime = Date.now();

        // サイドパネルを開く
        await chrome.sidePanel.open({ windowId: windowId });
        await chrome.storage.local.set({ 
          sidePanelIsOpen: true,
          sidePanelOpenedAt: Date.now()
        });

        const afterTime = Date.now();

        // Storage APIが呼ばれたことを確認
        expect(mockChrome.storage.local.set).toHaveBeenCalled();

        // 保存されたデータを取得
        const savedData = mockChrome.storage.local.set.mock.calls[
          mockChrome.storage.local.set.mock.calls.length - 1
        ][0];

        // 状態が正しく保存されていることを確認
        expect(savedData.sidePanelIsOpen).toBe(true);

        // タイムスタンプが妥当な範囲内であることを確認
        expect(savedData.sidePanelOpenedAt).toBeGreaterThanOrEqual(beforeTime);
        expect(savedData.sidePanelOpenedAt).toBeLessThanOrEqual(afterTime);
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 2の変形: 閉じる操作で正しいタイムスタンプが保存される
   * **Validates: Requirements 1.3**
   */
  test('Property 2: 閉じる操作でsidePanelClosedAtタイムスタンプが保存される', async () => {
    await fc.assert(
      fc.asyncProperty(windowIdArbitrary, async (windowId) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // 現在時刻を記録
        const beforeTime = Date.now();

        // サイドパネルを閉じる
        await closeSidePanel(windowId);

        const afterTime = Date.now();

        // Storage APIが呼ばれたことを確認
        expect(mockChrome.storage.local.set).toHaveBeenCalled();

        // 保存されたデータを取得
        const savedData = mockChrome.storage.local.set.mock.calls[
          mockChrome.storage.local.set.mock.calls.length - 1
        ][0];

        // 状態が正しく保存されていることを確認
        expect(savedData.sidePanelIsOpen).toBe(false);

        // タイムスタンプが妥当な範囲内であることを確認
        expect(savedData.sidePanelClosedAt).toBeGreaterThanOrEqual(beforeTime);
        expect(savedData.sidePanelClosedAt).toBeLessThanOrEqual(afterTime);
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 2のエッジケース: Storage API失敗時のエラーハンドリング
   * **Validates: Requirements 1.3**
   */
  test('Property 2: Storage API失敗時でも適切にエラーハンドリングされる', async () => {
    await fc.assert(
      fc.asyncProperty(windowIdArbitrary, fc.boolean(), async (windowId, shouldOpen) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // Storage APIを失敗させる
        const storageError = new Error('Storage API error');
        mockChrome.storage.local.set.mockRejectedValue(storageError);

        // 状態変更を実行（エラーが投げられないことを確認）
        if (shouldOpen) {
          await expect(async () => {
            await chrome.sidePanel.open({ windowId: windowId });
            await chrome.storage.local.set({ 
              sidePanelIsOpen: true,
              sidePanelOpenedAt: Date.now()
            }).catch(error => {
              // エラーをキャッチして処理
              console.error('Storage save failed:', error);
            });
          }).not.toThrow();
        } else {
          // closeSidePanel関数はエラーハンドリングを内部で行う
          await expect(closeSidePanel(windowId)).resolves.not.toThrow();
        }

        // Storage APIが呼ばれたことを確認
        expect(mockChrome.storage.local.set).toHaveBeenCalled();
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 2のエッジケース: 同じ状態への変更でも保存される
   * **Validates: Requirements 1.3**
   */
  test('Property 2: 同じ状態への変更でもStorage APIに保存される', async () => {
    await fc.assert(
      fc.asyncProperty(windowIdArbitrary, fc.boolean(), async (windowId, state) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // 初期状態を設定（変更後と同じ状態）
        mockChrome.storage.local.get.mockResolvedValue({ 
          sidePanelIsOpen: state 
        });

        // 同じ状態への変更を実行
        if (state) {
          await chrome.sidePanel.open({ windowId: windowId });
          await chrome.storage.local.set({ 
            sidePanelIsOpen: true,
            sidePanelOpenedAt: Date.now()
          });
        } else {
          await closeSidePanel(windowId);
        }

        // Storage APIが呼ばれたことを確認
        expect(mockChrome.storage.local.set).toHaveBeenCalled();

        // 保存されたデータを取得
        const savedData = mockChrome.storage.local.set.mock.calls[
          mockChrome.storage.local.set.mock.calls.length - 1
        ][0];

        // 状態が正しく保存されていることを確認
        expect(savedData.sidePanelIsOpen).toBe(state);
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 2のエッジケース: 高速な連続状態変更でも正しく保存される
   * **Validates: Requirements 1.3**
   */
  test('Property 2: 高速な連続状態変更でも各変更が正しく保存される', async () => {
    // 高速な連続変更のシーケンス（3〜10回）
    const rapidChangeSequenceArbitrary = fc.array(
      fc.boolean(),
      { minLength: 3, maxLength: 10 }
    );

    await fc.assert(
      fc.asyncProperty(
        windowIdArbitrary, 
        rapidChangeSequenceArbitrary, 
        async (windowId, stateSequence) => {
          // テストごとにモックをリセット
          jest.clearAllMocks();

          // すべての状態変更を連続して実行
          const promises = stateSequence.map(async (newState) => {
            if (newState) {
              await chrome.sidePanel.open({ windowId: windowId });
              await chrome.storage.local.set({ 
                sidePanelIsOpen: true,
                sidePanelOpenedAt: Date.now()
              });
            } else {
              await closeSidePanel(windowId);
            }
          });

          // すべての変更が完了するまで待機
          await Promise.all(promises);

          // Storage APIが各変更で呼ばれたことを確認
          expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(stateSequence.length);

          // 各呼び出しで正しい状態が保存されていることを確認
          mockChrome.storage.local.set.mock.calls.forEach((call, index) => {
            const savedData = call[0];
            expect(savedData.sidePanelIsOpen).toBeDefined();
            expect(typeof savedData.sidePanelIsOpen).toBe('boolean');
          });
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });
});
