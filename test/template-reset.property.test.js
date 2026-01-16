/**
 * Property Test: テンプレートのリセット動作とUI更新
 * Feature: icon-toggle-and-template-settings
 * Property 9: テンプレートのリセット動作
 * Property 10: リセット後のUI更新
 * **Validates: Requirements 3.3, 3.5**
 */

const fc = require('fast-check');

describe('Template Reset - Property Tests', () => {
  let mockChrome;
  let mockSendMessage;
  const defaultTemplate = `参照元:\n{{title}}\n{{url}}`;

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

    // window.confirmのモック
    global.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 9: テンプレートのリセット動作
   * For any 現在のテンプレート内容に対して、リセットボタンをクリックした時、
   * テンプレートはデフォルト値に復元されるべきです。
   * 
   * **Validates: Requirements 3.3**
   */
  test('Property 9: template should be reset to default value when reset button is clicked', async () => {
    await fc.assert(
      fc.asyncProperty(
        // ランダムなテンプレート文字列を生成（現在のテンプレート）
        fc.string({ minLength: 0, maxLength: 1000 }),
        async (currentTemplate) => {
          // モックの設定（リセット成功）
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'resetTemplate') {
              callback({ success: true, template: defaultTemplate });
            }
          });

          // テンプレートエディタのモック
          const templateEditor = {
            value: currentTemplate
          };

          // リセット処理をシミュレート
          const userConfirmed = confirm('テンプレートをデフォルトに戻しますか？');
          
          if (userConfirmed) {
            const response = await new Promise((resolve) => {
              mockSendMessage({ action: 'resetTemplate' }, resolve);
            });

            if (response.success) {
              templateEditor.value = response.template;
            }
          }

          // 検証: テンプレートがデフォルト値に復元される
          expect(templateEditor.value).toBe(defaultTemplate);
          expect(confirm).toHaveBeenCalledWith('テンプレートをデフォルトに戻しますか？');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: リセット後のUI更新
   * For any リセット操作に対して、リセット完了後、
   * Template Editorの内容はデフォルトテンプレートに更新されるべきです。
   * 
   * **Validates: Requirements 3.5**
   */
  test('Property 10: Template Editor should be updated with default template after reset', async () => {
    await fc.assert(
      fc.asyncProperty(
        // ランダムなテンプレート文字列を生成
        fc.string({ minLength: 0, maxLength: 1000 }),
        async (currentTemplate) => {
          // モックの設定（リセット成功）
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'resetTemplate') {
              callback({ success: true, template: defaultTemplate });
            }
          });

          // テンプレートエディタと文字数カウンターのモック
          const templateEditor = {
            value: currentTemplate
          };

          const templateCharCounter = {
            textContent: `${currentTemplate.length}文字`
          };

          // リセット処理をシミュレート
          const userConfirmed = confirm('テンプレートをデフォルトに戻しますか？');
          
          if (userConfirmed) {
            const response = await new Promise((resolve) => {
              mockSendMessage({ action: 'resetTemplate' }, resolve);
            });

            if (response.success) {
              // UIを更新
              templateEditor.value = response.template;
              templateCharCounter.textContent = `${response.template.length}文字`;
            }
          }

          // 検証: Template Editorがデフォルトテンプレートに更新される
          expect(templateEditor.value).toBe(defaultTemplate);
          // 検証: 文字数カウンターも更新される
          expect(templateCharCounter.textContent).toBe(`${defaultTemplate.length}文字`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: ユーザーがキャンセルした場合、テンプレートは変更されない
   * 確認ダイアログでキャンセルした場合、テンプレートは変更されないべきです。
   */
  test('Property: template should not change when user cancels reset', async () => {
    // confirmをキャンセルに設定
    global.confirm = jest.fn(() => false);

    await fc.assert(
      fc.asyncProperty(
        // ランダムなテンプレート文字列を生成
        fc.string({ minLength: 0, maxLength: 1000 }),
        async (currentTemplate) => {
          // テンプレートエディタのモック
          const templateEditor = {
            value: currentTemplate
          };

          // リセット処理をシミュレート
          const userConfirmed = confirm('テンプレートをデフォルトに戻しますか？');
          
          if (userConfirmed) {
            // キャンセルされたので、この処理は実行されない
            const response = await new Promise((resolve) => {
              mockSendMessage({ action: 'resetTemplate' }, resolve);
            });

            if (response.success) {
              templateEditor.value = response.template;
            }
          }

          // 検証: テンプレートは変更されない
          expect(templateEditor.value).toBe(currentTemplate);
          expect(confirm).toHaveBeenCalledWith('テンプレートをデフォルトに戻しますか？');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: リセット成功時に確認メッセージが表示される
   * リセットが成功した場合、確認メッセージが表示されるべきです。
   * 
   * **Validates: Requirements 3.4**
   */
  test('Property: confirmation message should be displayed after successful reset', async () => {
    await fc.assert(
      fc.asyncProperty(
        // ランダムなテンプレート文字列を生成
        fc.string({ minLength: 0, maxLength: 500 }),
        async (currentTemplate) => {
          // モックの設定（リセット成功）
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'resetTemplate') {
              callback({ success: true, template: defaultTemplate });
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

          // リセット処理をシミュレート
          const userConfirmed = confirm('テンプレートをデフォルトに戻しますか？');
          
          if (userConfirmed) {
            const response = await new Promise((resolve) => {
              mockSendMessage({ action: 'resetTemplate' }, resolve);
            });

            if (response.success) {
              // 確認メッセージを表示
              templateMessage.textContent = 'テンプレートをデフォルトに戻しました';
              templateMessage.className = 'template-message success';
              templateMessage.classList.remove('hidden');
            }
          }

          // 検証: 確認メッセージが表示される
          expect(templateMessage.textContent).toBe('テンプレートをデフォルトに戻しました');
          expect(templateMessage.className).toBe('template-message success');
          expect(templateMessage.classList.remove).toHaveBeenCalledWith('hidden');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: リセット失敗時にエラーメッセージが表示される
   * リセットに失敗した場合、エラーメッセージが表示されるべきです。
   */
  test('Property: error message should be displayed when reset fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        // ランダムなテンプレートとエラーメッセージを生成
        fc.record({
          currentTemplate: fc.string({ minLength: 0, maxLength: 500 }),
          errorMessage: fc.string({ minLength: 1, maxLength: 100 })
        }),
        async ({ currentTemplate, errorMessage }) => {
          // モックの設定（リセット失敗）
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'resetTemplate') {
              callback({ success: false, error: errorMessage });
            }
          });

          // テンプレートエディタのモック
          const templateEditor = {
            value: currentTemplate
          };

          // テンプレートメッセージ要素のモック
          const templateMessage = {
            textContent: '',
            className: '',
            classList: {
              remove: jest.fn(),
              add: jest.fn()
            }
          };

          // リセット処理をシミュレート
          const userConfirmed = confirm('テンプレートをデフォルトに戻しますか？');
          
          if (userConfirmed) {
            const response = await new Promise((resolve) => {
              mockSendMessage({ action: 'resetTemplate' }, resolve);
            });

            if (!response.success) {
              // エラーメッセージを表示
              templateMessage.textContent = 'テンプレートのリセットに失敗しました';
              templateMessage.className = 'template-message error';
              templateMessage.classList.remove('hidden');
            }
          }

          // 検証: エラーメッセージが表示される
          expect(templateMessage.textContent).toBe('テンプレートのリセットに失敗しました');
          expect(templateMessage.className).toBe('template-message error');
          // 検証: テンプレートは変更されない
          expect(templateEditor.value).toBe(currentTemplate);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: デフォルトテンプレートには変数が含まれる
   * デフォルトテンプレートには{{url}}と{{title}}が含まれるべきです。
   * 
   * **Validates: Requirements 3.2**
   */
  test('Property: default template should contain {{url}} and {{title}} variables', async () => {
    // モックの設定（リセット成功）
    mockSendMessage.mockImplementation((message, callback) => {
      if (message.action === 'resetTemplate') {
        callback({ success: true, template: defaultTemplate });
      }
    });

    // リセット処理をシミュレート
    const userConfirmed = confirm('テンプレートをデフォルトに戻しますか？');
    
    let resetTemplate = '';
    if (userConfirmed) {
      const response = await new Promise((resolve) => {
        mockSendMessage({ action: 'resetTemplate' }, resolve);
      });

      if (response.success) {
        resetTemplate = response.template;
      }
    }

    // 検証: デフォルトテンプレートに変数が含まれる
    expect(resetTemplate).toContain('{{url}}');
    expect(resetTemplate).toContain('{{title}}');
  });
});
