/**
 * テンプレート変数の置換プロパティベーステスト
 * Feature: icon-toggle-and-template-settings
 * Property 8: テンプレート変数の置換
 * **Validates: Requirements 2.8, 4.3, 4.4**
 */

const fc = require('fast-check');
const { replaceTemplateVariables } = require('../background/service-worker-test-exports');

describe('Property 8: テンプレート変数の置換', () => {
  beforeEach(() => {
    // コンソールログをモック
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * URL文字列のジェネレーター
   */
  const urlArbitrary = fc.oneof(
    fc.webUrl(),
    fc.constantFrom(
      'https://example.com',
      'https://example.com/path/to/page',
      'https://example.com/path?query=value',
      'https://example.com/path#fragment',
      'https://backlog.example.com/view/PROJECT-123',
      'http://localhost:3000',
      'https://github.com/user/repo/issues/123'
    )
  );

  /**
   * タイトル文字列のジェネレーター
   */
  const titleArbitrary = fc.oneof(
    fc.string({ minLength: 1, maxLength: 200 }),
    fc.constantFrom(
      'ページタイトル',
      'Issue #123: バグ修正',
      'プロジェクト管理 - Backlog',
      'GitHub - user/repo',
      'タイトル with 特殊文字 !@#$%',
      'Title with "quotes" and \'apostrophes\'',
      'タイトル\nwith\nnewlines'
    )
  );

  /**
   * テンプレート文字列のジェネレーター（変数を含む）
   */
  const templateWithVariablesArbitrary = fc.oneof(
    fc.constantFrom(
      '{{url}}',
      '{{title}}',
      '{{url}} {{title}}',
      '参照元:\n{{title}}\n{{url}}',
      'タイトル: {{title}}\nURL: {{url}}',
      '{{title}}\n\n{{url}}\n\n詳細説明',
      '# {{title}}\n\n参照: {{url}}',
      'Before {{url}} Middle {{title}} After',
      '{{url}}{{url}}{{url}}',
      '{{title}}{{title}}',
      '{{url}} and {{title}} and {{url}} and {{title}}'
    ),
    fc.string({ minLength: 10, maxLength: 200 }).map(s => 
      `参照元:\n{{title}}\n{{url}}\n\n${s}`
    )
  );

  /**
   * Property 8: テンプレート変数の置換
   * **Validates: Requirements 2.8, 4.3, 4.4**
   * 
   * For any テンプレート文字列と現在のページ情報（URL、タイトル）に対して、
   * 課題作成時にテンプレート内の{{url}}と{{title}}は実際のURLとタイトルに置換されるべきです。
   */
  test('Property 8: {{url}}と{{title}}が実際の値に正しく置換される', async () => {
    await fc.assert(
      fc.asyncProperty(
        templateWithVariablesArbitrary,
        urlArbitrary,
        titleArbitrary,
        async (template, url, title) => {
          // 変数を置換
          const result = replaceTemplateVariables(template, { url, title });

          // {{url}}が置換されていることを確認
          if (template.includes('{{url}}')) {
            expect(result).toContain(url);
            expect(result).not.toContain('{{url}}');
          }

          // {{title}}が置換されていることを確認
          if (template.includes('{{title}}')) {
            expect(result).toContain(title);
            expect(result).not.toContain('{{title}}');
          }

          // 結果が文字列であることを確認
          expect(typeof result).toBe('string');
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 8の変形: {{url}}のみを含むテンプレートで正しく置換される
   * **Validates: Requirements 4.3**
   */
  test('Property 8: {{url}}のみを含むテンプレートで正しく置換される', async () => {
    const urlOnlyTemplateArbitrary = fc.constantFrom(
      '{{url}}',
      'URL: {{url}}',
      '参照: {{url}}',
      '{{url}}\n\n詳細',
      'リンク: {{url}} をご確認ください'
    );

    await fc.assert(
      fc.asyncProperty(
        urlOnlyTemplateArbitrary,
        urlArbitrary,
        async (template, url) => {
          const result = replaceTemplateVariables(template, { url, title: '' });

          // {{url}}が置換されていることを確認
          expect(result).toContain(url);
          expect(result).not.toContain('{{url}}');

          // 元のテンプレートの構造が保持されていることを確認
          // 置換関数を使用して$のエスケープ問題を回避
          const expectedResult = template.replace(/\{\{url\}\}/g, () => url);
          expect(result).toBe(expectedResult);
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 8の変形: {{title}}のみを含むテンプレートで正しく置換される
   * **Validates: Requirements 4.4**
   */
  test('Property 8: {{title}}のみを含むテンプレートで正しく置換される', async () => {
    const titleOnlyTemplateArbitrary = fc.constantFrom(
      '{{title}}',
      'タイトル: {{title}}',
      '件名: {{title}}',
      '{{title}}\n\n詳細',
      '# {{title}}'
    );

    await fc.assert(
      fc.asyncProperty(
        titleOnlyTemplateArbitrary,
        titleArbitrary,
        async (template, title) => {
          const result = replaceTemplateVariables(template, { url: '', title });

          // {{title}}が置換されていることを確認
          expect(result).toContain(title);
          expect(result).not.toContain('{{title}}');

          // 元のテンプレートの構造が保持されていることを確認
          // 置換関数を使用して$のエスケープ問題を回避
          const expectedResult = template.replace(/\{\{title\}\}/g, () => title);
          expect(result).toBe(expectedResult);
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 8の変形: 複数の{{url}}と{{title}}が全て置換される
   * **Validates: Requirements 2.8, 4.3, 4.4**
   */
  test('Property 8: 複数の変数が全て正しく置換される', async () => {
    const multipleVariablesTemplateArbitrary = fc.constantFrom(
      '{{url}} {{url}}',
      '{{title}} {{title}}',
      '{{url}} {{title}} {{url}} {{title}}',
      '1: {{url}}\n2: {{url}}\n3: {{url}}',
      'A: {{title}}\nB: {{title}}'
    );

    await fc.assert(
      fc.asyncProperty(
        multipleVariablesTemplateArbitrary,
        urlArbitrary,
        titleArbitrary,
        async (template, url, title) => {
          const result = replaceTemplateVariables(template, { url, title });

          // 全ての{{url}}が置換されていることを確認
          expect(result).not.toContain('{{url}}');

          // 全ての{{title}}が置換されていることを確認
          expect(result).not.toContain('{{title}}');

          // 置換された値が含まれていることを確認
          if (template.includes('{{url}}')) {
            expect(result).toContain(url);
          }
          if (template.includes('{{title}}')) {
            expect(result).toContain(title);
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
   * Property 8の変形: 変数がない場合は元のテンプレートがそのまま返される
   * **Validates: Requirements 2.8**
   */
  test('Property 8: 変数がない場合は元のテンプレートがそのまま返される', async () => {
    const noVariablesTemplateArbitrary = fc.string({ minLength: 0, maxLength: 500 })
      .filter(s => !s.includes('{{url}}') && !s.includes('{{title}}'));

    await fc.assert(
      fc.asyncProperty(
        noVariablesTemplateArbitrary,
        urlArbitrary,
        titleArbitrary,
        async (template, url, title) => {
          const result = replaceTemplateVariables(template, { url, title });

          // 元のテンプレートと同じであることを確認
          expect(result).toBe(template);
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 8のエッジケース: 空の変数値の場合は変数が残る
   * **Validates: Requirements 2.8, 4.3, 4.4**
   * 注: 空文字列の場合、変数は置換されずそのまま残る（意図的な動作）
   */
  test('Property 8: 空の変数値の場合は変数がそのまま残る', async () => {
    await fc.assert(
      fc.asyncProperty(
        templateWithVariablesArbitrary,
        async (template) => {
          // 空の値で置換を試みる
          const result = replaceTemplateVariables(template, { url: '', title: '' });

          // 元のテンプレートと同じであることを確認（空文字列では置換されない）
          expect(result).toBe(template);

          // 結果が文字列であることを確認
          expect(typeof result).toBe('string');
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 8のエッジケース: 特殊文字を含む値でも正しく置換される
   * **Validates: Requirements 2.8, 4.3, 4.4**
   */
  test('Property 8: 特殊文字を含む値でも正しく置換される', async () => {
    const specialCharsArbitrary = fc.constantFrom(
      'https://example.com?query=value&other=123',
      'Title with "quotes" and \'apostrophes\'',
      'URL with #fragment',
      'Title with <html> tags',
      'URL: https://example.com/path?a=1&b=2',
      'Title: Test & Development',
      'https://example.com/path/to/page?q=test%20value'
    );

    await fc.assert(
      fc.asyncProperty(
        templateWithVariablesArbitrary,
        specialCharsArbitrary,
        specialCharsArbitrary,
        async (template, url, title) => {
          const result = replaceTemplateVariables(template, { url, title });

          // 特殊文字が正しく保持されていることを確認
          if (template.includes('{{url}}')) {
            expect(result).toContain(url);
          }
          if (template.includes('{{title}}')) {
            expect(result).toContain(title);
          }

          // 変数が置換されていることを確認
          expect(result).not.toContain('{{url}}');
          expect(result).not.toContain('{{title}}');
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 8のエッジケース: 変数オブジェクトが不完全でもエラーにならない
   * **Validates: Requirements 2.8**
   */
  test('Property 8: 変数オブジェクトが不完全でもエラーにならない', async () => {
    await fc.assert(
      fc.asyncProperty(
        templateWithVariablesArbitrary,
        async (template) => {
          // urlのみ提供
          const result1 = replaceTemplateVariables(template, { url: 'https://example.com' });
          expect(typeof result1).toBe('string');

          // titleのみ提供
          const result2 = replaceTemplateVariables(template, { title: 'Test Title' });
          expect(typeof result2).toBe('string');

          // 空のオブジェクト
          const result3 = replaceTemplateVariables(template, {});
          expect(typeof result3).toBe('string');
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 8のエッジケース: 置換後の文字列長が正しい
   * **Validates: Requirements 2.8, 4.3, 4.4**
   */
  test('Property 8: 置換後の文字列長が正しく計算される', async () => {
    await fc.assert(
      fc.asyncProperty(
        templateWithVariablesArbitrary,
        urlArbitrary,
        titleArbitrary,
        async (template, url, title) => {
          const result = replaceTemplateVariables(template, { url, title });

          // 期待される文字列長を計算
          let expectedLength = template.length;
          const urlCount = (template.match(/\{\{url\}\}/g) || []).length;
          const titleCount = (template.match(/\{\{title\}\}/g) || []).length;

          expectedLength -= urlCount * '{{url}}'.length;
          expectedLength += urlCount * url.length;
          expectedLength -= titleCount * '{{title}}'.length;
          expectedLength += titleCount * title.length;

          // 実際の文字列長と一致することを確認
          expect(result.length).toBe(expectedLength);
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });
});
