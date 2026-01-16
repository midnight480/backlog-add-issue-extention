/**
 * テンプレート保存のプロパティベーステスト
 * Feature: icon-toggle-and-template-settings
 * Property 5: テンプレートの保存
 * **Validates: Requirements 2.3**
 */

const fc = require('fast-check');
const { saveTemplate, loadTemplate } = require('../background/service-worker-test-exports');

describe('Property 5: テンプレートの保存', () => {
  let mockChrome;

  beforeEach(() => {
    // Chrome API のモック
    mockChrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn().mockResolvedValue(undefined)
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
   * テンプレート文字列のジェネレーター
   * 様々なテンプレート文字列を生成
   */
  const templateArbitrary = fc.oneof(
    // 通常のテキスト
    fc.string({ minLength: 0, maxLength: 1000 }),
    // 変数を含むテンプレート
    fc.constantFrom(
      '{{url}}',
      '{{title}}',
      '{{url}} {{title}}',
      '参照元:\n{{title}}\n{{url}}',
      'タイトル: {{title}}\nURL: {{url}}',
      '{{title}}\n\n{{url}}\n\n詳細説明',
      '# {{title}}\n\n参照: {{url}}',
      '{{unknown}} {{url}} {{title}}'
    ),
    // 複雑なテンプレート
    fc.string({ minLength: 10, maxLength: 500 }).map(s => 
      `参照元:\n{{title}}\n{{url}}\n\n${s}`
    )
  );

  /**
   * Property 5: テンプレートの保存
   * **Validates: Requirements 2.3**
   * 
   * For any テンプレート文字列に対して、
   * 保存ボタンをクリックした時、そのテンプレートはChrome Storage APIに正しく保存されるべきです。
   */
  test('Property 5: 任意のテンプレート文字列が正しくStorage APIに保存される', async () => {
    await fc.assert(
      fc.asyncProperty(templateArbitrary, async (template) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // テンプレートを保存
        const result = await saveTemplate(template);

        // 保存が成功することを検証
        expect(result.success).toBe(true);
        expect(result.message).toBeDefined();

        // Storage APIが呼ばれたことを確認
        expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(1);

        // 保存されたデータを取得
        const savedData = mockChrome.storage.local.set.mock.calls[0][0];

        // テンプレートが正しく保存されていることを確認
        expect(savedData.descriptionTemplate).toBe(template);

        // タイムスタンプが保存されていることを確認
        expect(savedData.templateUpdatedAt).toBeDefined();
        expect(typeof savedData.templateUpdatedAt).toBe('number');
        expect(savedData.templateUpdatedAt).toBeGreaterThan(0);
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 5の変形: 空文字列のテンプレートも保存できる
   * **Validates: Requirements 2.3**
   */
  test('Property 5: 空文字列のテンプレートも正しく保存される', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(''), async (template) => {
        jest.clearAllMocks();

        const result = await saveTemplate(template);

        expect(result.success).toBe(true);
        expect(mockChrome.storage.local.set).toHaveBeenCalled();

        const savedData = mockChrome.storage.local.set.mock.calls[0][0];
        expect(savedData.descriptionTemplate).toBe('');
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 5の変形: 非常に長いテンプレートも保存できる
   * **Validates: Requirements 2.3**
   */
  test('Property 5: 非常に長いテンプレート（最大5000文字）も正しく保存される', async () => {
    const longTemplateArbitrary = fc.string({ minLength: 1000, maxLength: 5000 });

    await fc.assert(
      fc.asyncProperty(longTemplateArbitrary, async (template) => {
        jest.clearAllMocks();

        const result = await saveTemplate(template);

        expect(result.success).toBe(true);
        expect(mockChrome.storage.local.set).toHaveBeenCalled();

        const savedData = mockChrome.storage.local.set.mock.calls[0][0];
        expect(savedData.descriptionTemplate).toBe(template);
        expect(savedData.descriptionTemplate.length).toBeGreaterThanOrEqual(1000);
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 5の変形: 複数回の保存で毎回正しく保存される
   * **Validates: Requirements 2.3**
   */
  test('Property 5: 複数回の保存で毎回Storage APIに正しく保存される', async () => {
    const templateSequenceArbitrary = fc.array(
      templateArbitrary,
      { minLength: 2, maxLength: 5 }
    );

    await fc.assert(
      fc.asyncProperty(templateSequenceArbitrary, async (templates) => {
        jest.clearAllMocks();

        for (let i = 0; i < templates.length; i++) {
          const template = templates[i];
          const result = await saveTemplate(template);

          expect(result.success).toBe(true);

          // 各保存でStorage APIが呼ばれることを確認
          expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(i + 1);

          // 最後の呼び出しで正しいテンプレートが保存されていることを確認
          const savedData = mockChrome.storage.local.set.mock.calls[i][0];
          expect(savedData.descriptionTemplate).toBe(template);
        }
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 5の変形: タイムスタンプが保存時刻を正しく反映する
   * **Validates: Requirements 2.3**
   */
  test('Property 5: タイムスタンプが保存時刻を正しく反映する', async () => {
    await fc.assert(
      fc.asyncProperty(templateArbitrary, async (template) => {
        jest.clearAllMocks();

        const beforeTime = Date.now();
        const result = await saveTemplate(template);
        const afterTime = Date.now();

        expect(result.success).toBe(true);

        const savedData = mockChrome.storage.local.set.mock.calls[0][0];

        // タイムスタンプが妥当な範囲内であることを確認
        expect(savedData.templateUpdatedAt).toBeGreaterThanOrEqual(beforeTime);
        expect(savedData.templateUpdatedAt).toBeLessThanOrEqual(afterTime);
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 5のエッジケース: Storage API失敗時のエラーハンドリング
   * **Validates: Requirements 2.3**
   */
  test('Property 5: Storage API失敗時でも適切にエラーハンドリングされる', async () => {
    await fc.assert(
      fc.asyncProperty(templateArbitrary, async (template) => {
        jest.clearAllMocks();

        // Storage APIを失敗させる
        const storageError = new Error('Storage API error');
        mockChrome.storage.local.set.mockRejectedValue(storageError);

        const result = await saveTemplate(template);

        // エラーが適切に処理されることを確認
        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
        expect(result.message).toContain('失敗');

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
   * Property 5のエッジケース: 特殊文字を含むテンプレートも保存できる
   * **Validates: Requirements 2.3**
   */
  test('Property 5: 特殊文字を含むテンプレートも正しく保存される', async () => {
    const specialCharsTemplateArbitrary = fc.constantFrom(
      '{{url}}\n{{title}}\n\n改行\tタブ',
      '特殊文字: !@#$%^&*()_+-=[]{}|;:\'",.<>?/',
      'Unicode: 日本語 中文 한글 العربية',
      'Emoji: 😀 🎉 ✨ 🚀',
      '{{url}} & {{title}} < > " \' \\',
      'HTML: <div>{{title}}</div>\n<a href="{{url}}">Link</a>'
    );

    await fc.assert(
      fc.asyncProperty(specialCharsTemplateArbitrary, async (template) => {
        jest.clearAllMocks();

        const result = await saveTemplate(template);

        expect(result.success).toBe(true);

        const savedData = mockChrome.storage.local.set.mock.calls[0][0];
        expect(savedData.descriptionTemplate).toBe(template);
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 5のエッジケース: 保存後に読み込んで同じ内容が取得できる
   * **Validates: Requirements 2.3**
   * 注: 空文字列の場合はloadTemplate()がデフォルトテンプレートを返すため、
   * 空文字列以外のテンプレートでテストする
   */
  test('Property 5: 保存後に読み込んで同じ内容が取得できる', async () => {
    // 空文字列以外のテンプレートを生成
    const nonEmptyTemplateArbitrary = templateArbitrary.filter(t => t.length > 0);

    await fc.assert(
      fc.asyncProperty(nonEmptyTemplateArbitrary, async (template) => {
        jest.clearAllMocks();

        // テンプレートを保存
        const saveResult = await saveTemplate(template);
        expect(saveResult.success).toBe(true);

        // 保存されたデータを取得してモックに設定
        const savedData = mockChrome.storage.local.set.mock.calls[0][0];
        mockChrome.storage.local.get.mockResolvedValue({
          descriptionTemplate: savedData.descriptionTemplate
        });

        // テンプレートを読み込み
        const loadedTemplate = await loadTemplate();

        // 保存したテンプレートと読み込んだテンプレートが一致することを確認
        expect(loadedTemplate).toBe(template);
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });
});
