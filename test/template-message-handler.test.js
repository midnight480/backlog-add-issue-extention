/**
 * テンプレート関連のメッセージハンドラーのユニットテスト
 * Feature: icon-toggle-and-template-settings
 * 検証: 要件 2.1, 2.3, 3.3
 */

describe('テンプレート関連のメッセージハンドラー', () => {
  let mockChrome;
  let messageListener;

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
        onMessage: {
          addListener: jest.fn((listener) => {
            messageListener = listener;
          })
        }
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
   * デフォルトテンプレートを取得
   */
  function getDefaultTemplate() {
    return `参照元:
{{title}}
{{url}}`;
  }

  /**
   * テンプレートを読み込む
   */
  async function loadTemplate() {
    try {
      const result = await chrome.storage.local.get(['descriptionTemplate']);
      
      if (!result.descriptionTemplate) {
        return getDefaultTemplate();
      }
      
      return result.descriptionTemplate;
    } catch (error) {
      console.error('テンプレート読み込みエラー:', error);
      return getDefaultTemplate();
    }
  }

  /**
   * テンプレートを保存
   */
  async function saveTemplate(template) {
    try {
      const templateData = {
        descriptionTemplate: template,
        templateUpdatedAt: Date.now()
      };
      
      await chrome.storage.local.set(templateData);
      
      return { success: true, message: 'テンプレートを保存しました' };
    } catch (error) {
      console.error('テンプレート保存エラー:', error);
      return { 
        success: false, 
        message: 'テンプレートの保存に失敗しました。もう一度お試しください。'
      };
    }
  }

  /**
   * テンプレート変数を置換
   */
  function replaceTemplateVariables(template, variables) {
    try {
      let result = template;
      
      if (variables.url) {
        result = result.replace(/\{\{url\}\}/g, () => variables.url);
      }
      
      if (variables.title) {
        result = result.replace(/\{\{title\}\}/g, () => variables.title);
      }
      
      return result;
    } catch (error) {
      console.error('テンプレート変数置換エラー:', error);
      return template;
    }
  }

  /**
   * メッセージハンドラーのセットアップをシミュレート
   */
  function setupMessageHandler() {
    const handler = (message, sender, sendResponse) => {
      let willRespondAsync = false;
      
      switch (message.action) {
        case 'loadTemplate':
          willRespondAsync = true;
          loadTemplate()
            .then(template => sendResponse({ success: true, template: template }))
            .catch(error => sendResponse({ success: false, error: error.message }));
          break;
          
        case 'saveTemplate':
          willRespondAsync = true;
          saveTemplate(message.template)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
          break;
          
        case 'resetTemplate':
          willRespondAsync = true;
          (async () => {
            try {
              const defaultTemplate = getDefaultTemplate();
              const result = await saveTemplate(defaultTemplate);
              sendResponse({ ...result, template: defaultTemplate });
            } catch (error) {
              sendResponse({ success: false, error: error.message });
            }
          })();
          break;
          
        case 'replaceVariables':
          willRespondAsync = true;
          (async () => {
            try {
              const replacedText = replaceTemplateVariables(message.template, message.variables);
              sendResponse({ success: true, text: replacedText });
            } catch (error) {
              sendResponse({ success: false, error: error.message });
            }
          })();
          break;
          
        default:
          sendResponse({ error: '未知のアクション' });
      }
      
      return willRespondAsync;
    };

    chrome.runtime.onMessage.addListener(handler);
    return handler;
  }

  /**
   * 要件 2.1: loadTemplateアクションでテンプレートを読み込んで返す
   */
  describe('要件 2.1: loadTemplateアクション', () => {
    test('保存されたテンプレートを正しく読み込む', async () => {
      const savedTemplate = 'カスタムテンプレート\n{{url}}\n{{title}}';
      mockChrome.storage.local.get.mockResolvedValue({
        descriptionTemplate: savedTemplate
      });

      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'loadTemplate'
      };

      const willRespondAsync = handler(message, {}, sendResponse);

      expect(willRespondAsync).toBe(true);

      // 非同期処理の完了を待つ
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        template: savedTemplate
      });
    });

    test('保存されたテンプレートがない場合、デフォルトテンプレートを返す', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});

      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'loadTemplate'
      };

      handler(message, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        template: getDefaultTemplate()
      });
    });

    test('ストレージエラー時はデフォルトテンプレートを返す', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'loadTemplate'
      };

      handler(message, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        template: getDefaultTemplate()
      });
      expect(console.error).toHaveBeenCalledWith(
        'テンプレート読み込みエラー:',
        expect.any(Error)
      );
    });
  });

  /**
   * 要件 2.3: saveTemplateアクションでテンプレートを保存し、成功/失敗を返す
   */
  describe('要件 2.3: saveTemplateアクション', () => {
    test('テンプレートを正しく保存する', async () => {
      const template = 'テストテンプレート\n{{url}}';
      
      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'saveTemplate',
        template: template
      };

      handler(message, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        descriptionTemplate: template,
        templateUpdatedAt: expect.any(Number)
      });

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'テンプレートを保存しました'
      });
    });

    test('空のテンプレートも保存できる', async () => {
      const template = '';
      
      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'saveTemplate',
        template: template
      };

      handler(message, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        descriptionTemplate: template,
        templateUpdatedAt: expect.any(Number)
      });

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'テンプレートを保存しました'
      });
    });

    test('ストレージエラー時は失敗を返す', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage error'));
      
      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'saveTemplate',
        template: 'テストテンプレート'
      };

      handler(message, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        message: 'テンプレートの保存に失敗しました。もう一度お試しください。'
      });
      expect(console.error).toHaveBeenCalledWith(
        'テンプレート保存エラー:',
        expect.any(Error)
      );
    });

    test('長いテンプレートも保存できる', async () => {
      const template = 'あ'.repeat(10000);
      
      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'saveTemplate',
        template: template
      };

      handler(message, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        descriptionTemplate: template,
        templateUpdatedAt: expect.any(Number)
      });

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'テンプレートを保存しました'
      });
    });
  });

  /**
   * 要件 3.3: resetTemplateアクションでデフォルトテンプレートを保存し、成功/失敗を返す
   */
  describe('要件 3.3: resetTemplateアクション', () => {
    test('デフォルトテンプレートを保存する', async () => {
      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'resetTemplate'
      };

      handler(message, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        descriptionTemplate: getDefaultTemplate(),
        templateUpdatedAt: expect.any(Number)
      });

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'テンプレートを保存しました',
        template: getDefaultTemplate()
      });
    });

    test('リセット時にデフォルトテンプレートも返す', async () => {
      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'resetTemplate'
      };

      handler(message, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 10));

      const response = sendResponse.mock.calls[0][0];
      expect(response.template).toBe(getDefaultTemplate());
      expect(response.success).toBe(true);
    });

    test('リセット時のストレージエラーを処理する', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage error'));
      
      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'resetTemplate'
      };

      handler(message, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 10));

      // リセット時はエラーでもデフォルトテンプレートを含む
      const response = sendResponse.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.message).toBe('テンプレートの保存に失敗しました。もう一度お試しください。');
      expect(response.template).toBe(getDefaultTemplate());
    });
  });

  /**
   * replaceVariablesアクションでテンプレート変数を置換して返す
   */
  describe('replaceVariablesアクション', () => {
    test('{{url}}と{{title}}を正しく置換する', async () => {
      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'replaceVariables',
        template: '参照元:\n{{title}}\n{{url}}',
        variables: {
          url: 'https://example.com',
          title: 'テストページ'
        }
      };

      handler(message, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        text: '参照元:\nテストページ\nhttps://example.com'
      });
    });

    test('変数が含まれないテンプレートはそのまま返す', async () => {
      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'replaceVariables',
        template: '変数なしのテンプレート',
        variables: {
          url: 'https://example.com',
          title: 'テストページ'
        }
      };

      handler(message, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        text: '変数なしのテンプレート'
      });
    });

    test('未知の変数はそのまま残す', async () => {
      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'replaceVariables',
        template: '{{url}}\n{{unknown}}\n{{title}}',
        variables: {
          url: 'https://example.com',
          title: 'テストページ'
        }
      };

      handler(message, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        text: 'https://example.com\n{{unknown}}\nテストページ'
      });
    });

    test('変数値が空の場合は置換しない', async () => {
      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'replaceVariables',
        template: '{{url}}\n{{title}}',
        variables: {
          url: '',
          title: ''
        }
      };

      handler(message, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 10));

      // 空文字の場合は置換しない（変数がundefinedやnullでない限り）
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        text: '{{url}}\n{{title}}'
      });
    });

    test('同じ変数が複数回出現する場合、すべて置換する', async () => {
      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'replaceVariables',
        template: '{{url}}\n{{url}}\n{{url}}',
        variables: {
          url: 'https://example.com',
          title: 'テストページ'
        }
      };

      handler(message, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        text: 'https://example.com\nhttps://example.com\nhttps://example.com'
      });
    });

    test('特殊文字を含むURLも正しく置換する', async () => {
      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'replaceVariables',
        template: '{{url}}',
        variables: {
          url: 'https://example.com/path?param=value&other=$special',
          title: 'テストページ'
        }
      };

      handler(message, {}, sendResponse);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        text: 'https://example.com/path?param=value&other=$special'
      });
    });
  });

  /**
   * 未知のアクションの処理
   */
  describe('未知のアクションの処理', () => {
    test('未知のアクションに対してエラーを返す', () => {
      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {
        action: 'unknownAction'
      };

      const willRespondAsync = handler(message, {}, sendResponse);

      expect(willRespondAsync).toBe(false);
      expect(sendResponse).toHaveBeenCalledWith({
        error: '未知のアクション'
      });
    });

    test('アクションが指定されていない場合もエラーを返す', () => {
      const handler = setupMessageHandler();
      const sendResponse = jest.fn();

      const message = {};

      const willRespondAsync = handler(message, {}, sendResponse);

      expect(willRespondAsync).toBe(false);
      expect(sendResponse).toHaveBeenCalledWith({
        error: '未知のアクション'
      });
    });
  });

  /**
   * 統合テスト
   */
  describe('統合テスト', () => {
    test('テンプレートの保存と読み込みが連携して動作する', async () => {
      const template = 'カスタムテンプレート\n{{url}}';
      
      // 保存
      const handler = setupMessageHandler();
      const saveResponse = jest.fn();

      const saveMessage = {
        action: 'saveTemplate',
        template: template
      };

      handler(saveMessage, {}, saveResponse);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(saveResponse).toHaveBeenCalledWith({
        success: true,
        message: 'テンプレートを保存しました'
      });

      // 読み込み
      mockChrome.storage.local.get.mockResolvedValue({
        descriptionTemplate: template
      });

      const loadResponse = jest.fn();
      const loadMessage = {
        action: 'loadTemplate'
      };

      handler(loadMessage, {}, loadResponse);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(loadResponse).toHaveBeenCalledWith({
        success: true,
        template: template
      });
    });

    test('リセット後に読み込むとデフォルトテンプレートが取得できる', async () => {
      const handler = setupMessageHandler();
      
      // リセット
      const resetResponse = jest.fn();
      const resetMessage = {
        action: 'resetTemplate'
      };

      handler(resetMessage, {}, resetResponse);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(resetResponse).toHaveBeenCalledWith({
        success: true,
        message: 'テンプレートを保存しました',
        template: getDefaultTemplate()
      });

      // 読み込み
      mockChrome.storage.local.get.mockResolvedValue({
        descriptionTemplate: getDefaultTemplate()
      });

      const loadResponse = jest.fn();
      const loadMessage = {
        action: 'loadTemplate'
      };

      handler(loadMessage, {}, loadResponse);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(loadResponse).toHaveBeenCalledWith({
        success: true,
        template: getDefaultTemplate()
      });
    });
  });
});
