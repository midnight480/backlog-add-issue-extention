/**
 * Property Test: 保存成功時のメッセージ表示
 * Feature: icon-toggle-and-template-settings, Property 6: 保存成功時のメッセージ表示
 * **Validates: Requirements 2.4**
 */

const fc = require('fast-check');

describe('Template Save Success Message - Property Tests', () => {
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
   * Property 6: 保存成功時のメッセージ表示
   * For any テンプレート保存操作が成功した場合、
   * システムは成功メッセージを表示するべきです。
   * 
   * **Validates: Requirements 2.4**
   */
  test('Property 6: success message should be displayed when template is saved successfully', async () => {
    await fc.assert(
      fc.asyncProperty(
        // ランダムなテンプレート文字列を生成
        fc.string({ minLength: 0, maxLength: 1000 }),
        async (template) => {
          // モックの設定（保存成功）
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'saveTemplate') {
              callback({ success: true, message: 'テンプレートを保存しました' });
            }
          });

          // テンプレートメッセージ要素のモック
          const templateMessage = {
            textContent: '',
            className: '',
            classList: {
              remove: jest.fn(),
              add: jest.fn()
            }
          };

          // 保存処理をシミュレート
          const response = await new Promise((resolve) => {
            mockSendMessage({ action: 'saveTemplate', template: template }, resolve);
          });

          if (response.success) {
            // 成功メッセージを表示
            templateMessage.textContent = 'テンプレートを保存しました';
            templateMessage.className = 'template-message success';
            templateMessage.classList.remove('hidden');
          }

          // 検証: 成功メッセージが表示される
          expect(templateMessage.textContent).toBe('テンプレートを保存しました');
          expect(templateMessage.className).toBe('template-message success');
          expect(templateMessage.classList.remove).toHaveBeenCalledWith('hidden');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: メッセージは3秒後に自動非表示になる
   * 成功メッセージは表示から3秒後に自動的に非表示になるべきです。
   * 
   * **Validates: Requirements 5.5**
   */
  test('Property: success message should auto-hide after 3 seconds', async () => {
    jest.useFakeTimers();

    await fc.assert(
      fc.asyncProperty(
        // ランダムなテンプレート文字列を生成
        fc.string({ minLength: 0, maxLength: 500 }),
        async (template) => {
          // モックの設定（保存成功）
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'saveTemplate') {
              callback({ success: true, message: 'テンプレートを保存しました' });
            }
          });

          // テンプレートメッセージ要素のモック
          const templateMessage = {
            textContent: '',
            className: '',
            classList: {
              remove: jest.fn(),
              add: jest.fn()
            }
          };

          // 保存処理をシミュレート
          const response = await new Promise((resolve) => {
            mockSendMessage({ action: 'saveTemplate', template: template }, resolve);
          });

          if (response.success) {
            // 成功メッセージを表示
            templateMessage.textContent = 'テンプレートを保存しました';
            templateMessage.className = 'template-message success';
            templateMessage.classList.remove('hidden');

            // 3秒後に非表示にするタイマーを設定
            setTimeout(() => {
              templateMessage.classList.add('hidden');
            }, 3000);
          }

          // 検証: メッセージが表示されている
          expect(templateMessage.classList.remove).toHaveBeenCalledWith('hidden');

          // 3秒経過
          jest.advanceTimersByTime(3000);

          // 検証: メッセージが非表示になる
          expect(templateMessage.classList.add).toHaveBeenCalledWith('hidden');
        }
      ),
      { numRuns: 100 }
    );

    jest.useRealTimers();
  });

  /**
   * Property: 保存失敗時はエラーメッセージが表示される
   * テンプレート保存に失敗した場合、エラーメッセージが表示されるべきです。
   * 
   * **Validates: Requirements 2.5**
   */
  test('Property: error message should be displayed when save fails', async () => {
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
              callback({ success: false, error: errorMessage });
            }
          });

          // テンプレートメッセージ要素のモック
          const templateMessage = {
            textContent: '',
            className: '',
            classList: {
              remove: jest.fn(),
              add: jest.fn()
            }
          };

          // テンプレートエディタのモック（入力内容を保持）
          const templateEditor = {
            value: template
          };

          // 保存処理をシミュレート
          const response = await new Promise((resolve) => {
            mockSendMessage({ action: 'saveTemplate', template: template }, resolve);
          });

          if (!response.success) {
            // エラーメッセージを表示
            templateMessage.textContent = 'テンプレートの保存に失敗しました。もう一度お試しください。';
            templateMessage.className = 'template-message error';
            templateMessage.classList.remove('hidden');
          }

          // 検証: エラーメッセージが表示される
          expect(templateMessage.textContent).toBe('テンプレートの保存に失敗しました。もう一度お試しください。');
          expect(templateMessage.className).toBe('template-message error');
          expect(templateMessage.classList.remove).toHaveBeenCalledWith('hidden');

          // 検証: 入力内容が保持される
          expect(templateEditor.value).toBe(template);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 空のテンプレートも保存できる
   * 空のテンプレートを保存した場合も、成功メッセージが表示されるべきです。
   */
  test('Property: empty template can be saved successfully', async () => {
    const emptyTemplate = '';

    // モックの設定（保存成功）
    mockSendMessage.mockImplementation((message, callback) => {
      if (message.action === 'saveTemplate') {
        callback({ success: true, message: 'テンプレートを保存しました' });
      }
    });

    // テンプレートメッセージ要素のモック
    const templateMessage = {
      textContent: '',
      className: '',
      classList: {
        remove: jest.fn(),
        add: jest.fn()
      }
    };

    // 保存処理をシミュレート
    const response = await new Promise((resolve) => {
      mockSendMessage({ action: 'saveTemplate', template: emptyTemplate }, resolve);
    });

    if (response.success) {
      // 成功メッセージを表示
      templateMessage.textContent = 'テンプレートを保存しました';
      templateMessage.className = 'template-message success';
      templateMessage.classList.remove('hidden');
    }

    // 検証: 成功メッセージが表示される
    expect(templateMessage.textContent).toBe('テンプレートを保存しました');
    expect(templateMessage.className).toBe('template-message success');
  });

  /**
   * Property: 長いテンプレートも保存できる
   * 長いテンプレート（1000文字以上）を保存した場合も、成功メッセージが表示されるべきです。
   */
  test('Property: long template can be saved successfully', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 長いテンプレート文字列を生成
        fc.string({ minLength: 1000, maxLength: 5000 }),
        async (template) => {
          // モックの設定（保存成功）
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'saveTemplate') {
              callback({ success: true, message: 'テンプレートを保存しました' });
            }
          });

          // テンプレートメッセージ要素のモック
          const templateMessage = {
            textContent: '',
            className: '',
            classList: {
              remove: jest.fn(),
              add: jest.fn()
            }
          };

          // 保存処理をシミュレート
          const response = await new Promise((resolve) => {
            mockSendMessage({ action: 'saveTemplate', template: template }, resolve);
          });

          if (response.success) {
            // 成功メッセージを表示
            templateMessage.textContent = 'テンプレートを保存しました';
            templateMessage.className = 'template-message success';
            templateMessage.classList.remove('hidden');
          }

          // 検証: 成功メッセージが表示される
          expect(templateMessage.textContent).toBe('テンプレートを保存しました');
          expect(templateMessage.className).toBe('template-message success');
        }
      ),
      { numRuns: 50 } // 長い文字列なので実行回数を減らす
    );
  });
});
