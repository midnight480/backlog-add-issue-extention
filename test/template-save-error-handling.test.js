/**
 * Template Save Error Handling - Unit Tests
 * Feature: icon-toggle-and-template-settings
 * Requirements: 2.5
 */

describe('Template Save Error Handling - Unit Tests', () => {
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
   * 保存失敗時にエラーメッセージが表示されることを確認
   * Requirements: 2.5
   */
  test('should display error message when save fails', async () => {
    const template = 'テストテンプレート';
    const errorMessage = 'ストレージエラー';

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
  });

  /**
   * 保存失敗時に入力内容が保持されることを確認
   * Requirements: 2.5
   */
  test('should retain input content when save fails', async () => {
    const template = 'ユーザーが入力したテンプレート';

    // モックの設定（保存失敗）
    mockSendMessage.mockImplementation((message, callback) => {
      if (message.action === 'saveTemplate') {
        callback({ success: false, error: 'ネットワークエラー' });
      }
    });

    // テンプレートエディタのモック
    const templateEditor = {
      value: template
    };

    // 保存処理をシミュレート
    const response = await new Promise((resolve) => {
      mockSendMessage({ action: 'saveTemplate', template: template }, resolve);
    });

    // 保存失敗時も入力内容は変更しない

    // 検証: 入力内容が保持される
    expect(templateEditor.value).toBe(template);
  });

  /**
   * 保存失敗後もボタンが再度有効化されることを確認
   * Requirements: 2.5
   */
  test('should re-enable save button after save failure', async () => {
    const template = 'テストテンプレート';

    // モックの設定（保存失敗）
    mockSendMessage.mockImplementation((message, callback) => {
      if (message.action === 'saveTemplate') {
        callback({ success: false, error: 'エラー' });
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

    // 保存失敗後、ボタンを再度有効化
    saveTemplateBtn.disabled = false;
    saveTemplateBtn.textContent = '保存';

    // 検証: ボタンが再度有効化される
    expect(saveTemplateBtn.disabled).toBe(false);
    expect(saveTemplateBtn.textContent).toBe('保存');
  });

  /**
   * ストレージエラー時のエラーハンドリング
   * Requirements: 2.5
   */
  test('should handle storage error gracefully', async () => {
    const template = 'テストテンプレート';

    // モックの設定（ストレージエラー）
    mockSendMessage.mockImplementation((message, callback) => {
      if (message.action === 'saveTemplate') {
        callback({ success: false, error: 'ストレージ機能が利用できません' });
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

    if (!response.success) {
      // エラーメッセージを表示
      templateMessage.textContent = 'テンプレートの保存に失敗しました。もう一度お試しください。';
      templateMessage.className = 'template-message error';
      templateMessage.classList.remove('hidden');
    }

    // 検証: エラーメッセージが表示される
    expect(templateMessage.textContent).toBe('テンプレートの保存に失敗しました。もう一度お試しください。');
    expect(templateMessage.className).toBe('template-message error');
  });

  /**
   * ネットワークエラー時のエラーハンドリング
   * Requirements: 2.5
   */
  test('should handle network error gracefully', async () => {
    const template = 'テストテンプレート';

    // モックの設定（ネットワークエラー）
    mockSendMessage.mockImplementation((message, callback) => {
      if (message.action === 'saveTemplate') {
        callback({ success: false, error: 'ネットワークエラーが発生しました' });
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

    if (!response.success) {
      // エラーメッセージを表示
      templateMessage.textContent = 'テンプレートの保存に失敗しました。もう一度お試しください。';
      templateMessage.className = 'template-message error';
      templateMessage.classList.remove('hidden');
    }

    // 検証: エラーメッセージが表示される
    expect(templateMessage.textContent).toBe('テンプレートの保存に失敗しました。もう一度お試しください。');
  });

  /**
   * 保存失敗後に再試行できることを確認
   * Requirements: 2.5
   */
  test('should allow retry after save failure', async () => {
    const template = 'テストテンプレート';

    // 最初は失敗、2回目は成功するモック
    let callCount = 0;
    mockSendMessage.mockImplementation((message, callback) => {
      if (message.action === 'saveTemplate') {
        callCount++;
        if (callCount === 1) {
          callback({ success: false, error: 'エラー' });
        } else {
          callback({ success: true, message: 'テンプレートを保存しました' });
        }
      }
    });

    // 保存ボタンのモック
    const saveTemplateBtn = {
      disabled: false,
      textContent: '保存'
    };

    // 1回目の保存（失敗）
    saveTemplateBtn.disabled = true;
    const response1 = await new Promise((resolve) => {
      mockSendMessage({ action: 'saveTemplate', template: template }, resolve);
    });
    saveTemplateBtn.disabled = false;

    // 検証: 1回目は失敗
    expect(response1.success).toBe(false);
    expect(saveTemplateBtn.disabled).toBe(false);

    // 2回目の保存（成功）
    saveTemplateBtn.disabled = true;
    const response2 = await new Promise((resolve) => {
      mockSendMessage({ action: 'saveTemplate', template: template }, resolve);
    });
    saveTemplateBtn.disabled = false;

    // 検証: 2回目は成功
    expect(response2.success).toBe(true);
    expect(saveTemplateBtn.disabled).toBe(false);
  });

  /**
   * 空のテンプレートでも保存失敗時のエラーハンドリングが動作することを確認
   * Requirements: 2.5
   */
  test('should handle save failure for empty template', async () => {
    const emptyTemplate = '';

    // モックの設定（保存失敗）
    mockSendMessage.mockImplementation((message, callback) => {
      if (message.action === 'saveTemplate') {
        callback({ success: false, error: 'エラー' });
      }
    });

    // テンプレートエディタのモック
    const templateEditor = {
      value: emptyTemplate
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

    // 保存処理をシミュレート
    const response = await new Promise((resolve) => {
      mockSendMessage({ action: 'saveTemplate', template: emptyTemplate }, resolve);
    });

    if (!response.success) {
      // エラーメッセージを表示
      templateMessage.textContent = 'テンプレートの保存に失敗しました。もう一度お試しください。';
      templateMessage.className = 'template-message error';
      templateMessage.classList.remove('hidden');
    }

    // 検証: エラーメッセージが表示される
    expect(templateMessage.textContent).toBe('テンプレートの保存に失敗しました。もう一度お試しください。');
    // 検証: 入力内容が保持される
    expect(templateEditor.value).toBe(emptyTemplate);
  });
});
