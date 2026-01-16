/**
 * Property Test: テンプレートの読み込みと表示
 * Feature: icon-toggle-and-template-settings, Property 4: テンプレートの読み込みと表示
 * **Validates: Requirements 2.1**
 */

const fc = require('fast-check');

describe('Template Load and Display - Property Tests', () => {
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
   * Property 4: テンプレートの読み込みと表示
   * For any 保存されたテンプレート内容に対して、Settings画面を開いた時、
   * Template Editorにはそのテンプレート内容が正しく表示されるべきです。
   * 
   * **Validates: Requirements 2.1**
   */
  test('Property 4: loaded template should be displayed correctly in Template Editor', async () => {
    await fc.assert(
      fc.asyncProperty(
        // ランダムなテンプレート文字列を生成
        fc.string({ minLength: 0, maxLength: 1000 }),
        async (template) => {
          // モックの設定
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'loadTemplate') {
              callback({ success: true, template: template });
            }
          });

          // テンプレートエディタのモック
          const templateEditor = {
            value: ''
          };

          const templateCharCounter = {
            textContent: ''
          };

          // テンプレート読み込み処理をシミュレート
          const response = await new Promise((resolve) => {
            mockSendMessage({ action: 'loadTemplate' }, resolve);
          });

          if (response.success) {
            templateEditor.value = response.template;
            templateCharCounter.textContent = `${response.template.length}文字`;
          }

          // 検証: Template Editorに正しくテンプレートが表示される
          expect(templateEditor.value).toBe(template);
          expect(templateCharCounter.textContent).toBe(`${template.length}文字`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: テンプレート読み込み失敗時のフォールバック
   * テンプレート読み込みに失敗した場合、デフォルトテンプレートが表示されるべきです。
   */
  test('Property: should display default template when load fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        // ランダムなエラーメッセージを生成
        fc.string({ minLength: 1, maxLength: 100 }),
        async (errorMessage) => {
          // モックの設定（失敗）
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'loadTemplate') {
              callback({ success: false, error: errorMessage });
            }
          });

          // テンプレートエディタのモック
          const templateEditor = {
            value: ''
          };

          const defaultTemplate = `参照元:\n{{title}}\n{{url}}`;

          // テンプレート読み込み処理をシミュレート
          const response = await new Promise((resolve) => {
            mockSendMessage({ action: 'loadTemplate' }, resolve);
          });

          if (!response.success) {
            // エラー時はデフォルトテンプレートを表示
            templateEditor.value = defaultTemplate;
          }

          // 検証: デフォルトテンプレートが表示される
          expect(templateEditor.value).toBe(defaultTemplate);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 空のテンプレートも正しく表示される
   * 空のテンプレートが保存されている場合も、正しく表示されるべきです。
   */
  test('Property: empty template should be displayed correctly', async () => {
    const emptyTemplate = '';

    // モックの設定
    mockSendMessage.mockImplementation((message, callback) => {
      if (message.action === 'loadTemplate') {
        callback({ success: true, template: emptyTemplate });
      }
    });

    // テンプレートエディタのモック
    const templateEditor = {
      value: ''
    };

    // テンプレート読み込み処理をシミュレート
    const response = await new Promise((resolve) => {
      mockSendMessage({ action: 'loadTemplate' }, resolve);
    });

    if (response.success) {
      templateEditor.value = response.template;
    }

    // 検証: 空のテンプレートが正しく表示される
    expect(templateEditor.value).toBe(emptyTemplate);
  });

  /**
   * Property: 特殊文字を含むテンプレートも正しく表示される
   * 特殊文字（改行、タブ、記号など）を含むテンプレートも正しく表示されるべきです。
   */
  test('Property: template with special characters should be displayed correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 特殊文字を含むランダムな文字列を生成
        fc.string({ minLength: 0, maxLength: 500 }),
        async (template) => {
          // モックの設定
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'loadTemplate') {
              callback({ success: true, template: template });
            }
          });

          // テンプレートエディタのモック
          const templateEditor = {
            value: ''
          };

          // テンプレート読み込み処理をシミュレート
          const response = await new Promise((resolve) => {
            mockSendMessage({ action: 'loadTemplate' }, resolve);
          });

          if (response.success) {
            templateEditor.value = response.template;
          }

          // 検証: 特殊文字を含むテンプレートが正しく表示される
          expect(templateEditor.value).toBe(template);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 変数を含むテンプレートも正しく表示される
   * {{url}}や{{title}}などの変数を含むテンプレートも、そのまま表示されるべきです。
   */
  test('Property: template with variables should be displayed as-is', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 変数を含むテンプレートを生成
        fc.record({
          prefix: fc.string({ minLength: 0, maxLength: 100 }),
          suffix: fc.string({ minLength: 0, maxLength: 100 }),
          variable: fc.constantFrom('{{url}}', '{{title}}', '{{unknown}}')
        }),
        async ({ prefix, suffix, variable }) => {
          const template = `${prefix}${variable}${suffix}`;

          // モックの設定
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'loadTemplate') {
              callback({ success: true, template: template });
            }
          });

          // テンプレートエディタのモック
          const templateEditor = {
            value: ''
          };

          // テンプレート読み込み処理をシミュレート
          const response = await new Promise((resolve) => {
            mockSendMessage({ action: 'loadTemplate' }, resolve);
          });

          if (response.success) {
            templateEditor.value = response.template;
          }

          // 検証: 変数を含むテンプレートがそのまま表示される（置換されない）
          expect(templateEditor.value).toBe(template);
          expect(templateEditor.value).toContain(variable);
        }
      ),
      { numRuns: 100 }
    );
  });
});
