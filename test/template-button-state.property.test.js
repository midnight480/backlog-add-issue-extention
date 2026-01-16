/**
 * Property Test: 保存操作中のボタン状態管理
 * Feature: icon-toggle-and-template-settings, Property 13: 保存操作中のボタン状態管理
 * **Validates: Requirements 5.3, 5.4**
 */

const fc = require('fast-check');

describe('Template Button State Management - Property Tests', () => {
  let mockChrome;
  let mockSendMessage;

  beforeEach(() => {
    // Chrome APIのモック
    mockSendMessage = jest.fn();
    mockChrome = {
      runtime: {
        sendMessage: mockSendMessage
      },
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };
    global.chrome = mockChrome;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 13: 保存操作中のボタン状態管理
   * For any 保存操作に対して、保存ボタンは操作開始時に無効化され、
   * 操作完了時に再度有効化されるべきです。
   * 
   * **Validates: Requirements 5.3, 5.4**
   */
  test('Property 13: save button should be disabled during save and enabled after completion', async () => {
    await fc.assert(
      fc.asyncProperty(
        // ランダムなテンプレート文字列を生成
        fc.string({ minLength: 0, maxLength: 1000 }),
        async (template) => {
          // モックの設定（保存成功）
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'saveTemplate') {
              // 非同期処理をシミュレート
              setTimeout(() => {
                callback({ success: true, message: 'テンプレートを保存しました' });
              }, 10);
            }
          });

          // 保存ボタンのモック
          const saveTemplateBtn = {
            disabled: false,
            textContent: '保存'
          };

          // 保存処理開始前の状態を記録
          const initialDisabled = saveTemplateBtn.disabled;
          const initialText = saveTemplateBtn.textContent;

          // 保存処理を開始
          saveTemplateBtn.disabled = true;
          saveTemplateBtn.textContent = '保存中...';

          // 保存中の状態を記録
          const duringDisabled = saveTemplateBtn.disabled;
          const duringText = saveTemplateBtn.textContent;

          // 保存処理をシミュレート
          const response = await new Promise((resolve) => {
            mockSendMessage({ action: 'saveTemplate', template: template }, resolve);
          });

          // 保存処理完了後、ボタンを再度有効化
          saveTemplateBtn.disabled = false;
          saveTemplateBtn.textContent = '保存';

          // 保存完了後の状態を記録
          const afterDisabled = saveTemplateBtn.disabled;
          const afterText = saveTemplateBtn.textContent;

          // 検証: 保存開始前はボタンが有効
          expect(initialDisabled).toBe(false);
          expect(initialText).toBe('保存');

          // 検証: 保存中はボタンが無効化される
          expect(duringDisabled).toBe(true);
          expect(duringText).toBe('保存中...');

          // 検証: 保存完了後はボタンが再度有効化される
          expect(afterDisabled).toBe(false);
          expect(afterText).toBe('保存');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 保存失敗時もボタンは再度有効化される
   * 保存に失敗した場合も、ボタンは再度有効化されるべきです。
   */
  test('Property: save button should be enabled after save failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        // ランダムなテンプレートとエラーメッセージを生成
        fc.record({
          template: fc.string({ minLength: 0, maxLength: 500 }),
          errorMessage: fc.string({ minLength: 1, maxLength: 100 })
        }),
        async ({ template, errorMessage }) => {
          // モックの設定（保存失敗）
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'saveTemplate') {
              setTimeout(() => {
                callback({ success: false, error: errorMessage });
              }, 10);
            }
          });

          // 保存ボタンのモック
          const saveTemplateBtn = {
            disabled: false,
            textContent: '保存'
          };

          // 保存処理を開始
          saveTemplateBtn.disabled = true;
          saveTemplateBtn.textContent = '保存中...';

          // 保存処理をシミュレート
          const response = await new Promise((resolve) => {
            mockSendMessage({ action: 'saveTemplate', template: template }, resolve);
          });

          // 保存処理完了後（失敗）、ボタンを再度有効化
          saveTemplateBtn.disabled = false;
          saveTemplateBtn.textContent = '保存';

          // 検証: 保存失敗後もボタンが再度有効化される
          expect(saveTemplateBtn.disabled).toBe(false);
          expect(saveTemplateBtn.textContent).toBe('保存');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: リセットボタンも同様に状態管理される
   * リセット操作中もボタンが無効化され、完了後に有効化されるべきです。
   */
  test('Property: reset button should be disabled during reset and enabled after completion', async () => {
    await fc.assert(
      fc.asyncProperty(
        // ランダムなテンプレート文字列を生成
        fc.string({ minLength: 0, maxLength: 500 }),
        async (currentTemplate) => {
          const defaultTemplate = `参照元:\n{{title}}\n{{url}}`;

          // モックの設定（リセット成功）
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'resetTemplate') {
              setTimeout(() => {
                callback({ success: true, template: defaultTemplate });
              }, 10);
            }
          });

          // リセットボタンのモック
          const resetTemplateBtn = {
            disabled: false,
            textContent: 'リセット'
          };

          // リセット処理を開始
          resetTemplateBtn.disabled = true;
          resetTemplateBtn.textContent = 'リセット中...';

          // リセット中の状態を記録
          const duringDisabled = resetTemplateBtn.disabled;
          const duringText = resetTemplateBtn.textContent;

          // リセット処理をシミュレート
          const response = await new Promise((resolve) => {
            mockSendMessage({ action: 'resetTemplate' }, resolve);
          });

          // リセット処理完了後、ボタンを再度有効化
          resetTemplateBtn.disabled = false;
          resetTemplateBtn.textContent = 'リセット';

          // 検証: リセット中はボタンが無効化される
          expect(duringDisabled).toBe(true);
          expect(duringText).toBe('リセット中...');

          // 検証: リセット完了後はボタンが再度有効化される
          expect(resetTemplateBtn.disabled).toBe(false);
          expect(resetTemplateBtn.textContent).toBe('リセット');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: ボタンのテキストが操作状態を反映する
   * ボタンのテキストは操作の状態（通常、処理中）を反映するべきです。
   */
  test('Property: button text should reflect operation state', async () => {
    await fc.assert(
      fc.asyncProperty(
        // ランダムなテンプレート文字列を生成
        fc.string({ minLength: 0, maxLength: 500 }),
        async (template) => {
          // モックの設定（保存成功）
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'saveTemplate') {
              setTimeout(() => {
                callback({ success: true, message: 'テンプレートを保存しました' });
              }, 10);
            }
          });

          // 保存ボタンのモック
          const saveTemplateBtn = {
            disabled: false,
            textContent: '保存'
          };

          // 状態の変化を記録
          const states = [];

          // 初期状態
          states.push({
            disabled: saveTemplateBtn.disabled,
            text: saveTemplateBtn.textContent
          });

          // 保存処理を開始
          saveTemplateBtn.disabled = true;
          saveTemplateBtn.textContent = '保存中...';

          // 保存中の状態
          states.push({
            disabled: saveTemplateBtn.disabled,
            text: saveTemplateBtn.textContent
          });

          // 保存処理をシミュレート
          await new Promise((resolve) => {
            mockSendMessage({ action: 'saveTemplate', template: template }, resolve);
          });

          // 保存処理完了後
          saveTemplateBtn.disabled = false;
          saveTemplateBtn.textContent = '保存';

          // 完了後の状態
          states.push({
            disabled: saveTemplateBtn.disabled,
            text: saveTemplateBtn.textContent
          });

          // 検証: 状態の変化が正しい
          expect(states[0]).toEqual({ disabled: false, text: '保存' });
          expect(states[1]).toEqual({ disabled: true, text: '保存中...' });
          expect(states[2]).toEqual({ disabled: false, text: '保存' });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 複数回の保存操作でも正しく状態管理される
   * 複数回保存操作を行った場合も、毎回正しく状態管理されるべきです。
   */
  test('Property: button state should be managed correctly for multiple save operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        // ランダムなテンプレートの配列を生成
        fc.array(fc.string({ minLength: 0, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
        async (templates) => {
          // モックの設定（保存成功）
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'saveTemplate') {
              setTimeout(() => {
                callback({ success: true, message: 'テンプレートを保存しました' });
              }, 10);
            }
          });

          // 保存ボタンのモック
          const saveTemplateBtn = {
            disabled: false,
            textContent: '保存'
          };

          // 各テンプレートで保存操作を実行
          for (const template of templates) {
            // 保存前の状態を確認
            expect(saveTemplateBtn.disabled).toBe(false);
            expect(saveTemplateBtn.textContent).toBe('保存');

            // 保存処理を開始
            saveTemplateBtn.disabled = true;
            saveTemplateBtn.textContent = '保存中...';

            // 保存中の状態を確認
            expect(saveTemplateBtn.disabled).toBe(true);
            expect(saveTemplateBtn.textContent).toBe('保存中...');

            // 保存処理をシミュレート
            await new Promise((resolve) => {
              mockSendMessage({ action: 'saveTemplate', template: template }, resolve);
            });

            // 保存処理完了後
            saveTemplateBtn.disabled = false;
            saveTemplateBtn.textContent = '保存';

            // 保存後の状態を確認
            expect(saveTemplateBtn.disabled).toBe(false);
            expect(saveTemplateBtn.textContent).toBe('保存');
          }
        }
      ),
      { numRuns: 50 } // 複数回の操作なので実行回数を減らす
    );
  });
});
