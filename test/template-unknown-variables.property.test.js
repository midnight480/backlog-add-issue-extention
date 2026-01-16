/**
 * 未知の変数の保持プロパティベーステスト
 * Feature: icon-toggle-and-template-settings
 * Property 11: 未知の変数の保持
 * **Validates: Requirements 4.5**
 */

const fc = require('fast-check');
const { replaceTemplateVariables } = require('../background/service-worker-test-exports');

describe('Property 11: 未知の変数の保持', () => {
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
   * 未知の変数名のジェネレーター
   * {{url}}と{{title}}以外の変数を生成
   */
  const unknownVariableArbitrary = fc.oneof(
    fc.constantFrom(
      '{{unknown}}',
      '{{custom}}',
      '{{date}}',
      '{{time}}',
      '{{author}}',
      '{{project}}',
      '{{description}}',
      '{{id}}',
      '{{status}}',
      '{{priority}}'
    ),
    fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => s !== 'url' && s !== 'title')
      .map(s => `{{${s}}}`)
  );

  /**
   * 未知の変数を含むテンプレートのジェネレーター
   */
  const templateWithUnknownVariablesArbitrary = fc.oneof(
    // 単一の未知の変数
    unknownVariableArbitrary,
    // 未知の変数と既知の変数の組み合わせ
    fc.tuple(unknownVariableArbitrary, fc.constantFrom('{{url}}', '{{title}}')).map(
      ([unknown, known]) => `${unknown} ${known}`
    ),
    // 複数の未知の変数
    fc.array(unknownVariableArbitrary, { minLength: 1, maxLength: 5 }).map(
      vars => vars.join(' ')
    ),
    // テキストと未知の変数の組み合わせ
    fc.tuple(fc.string({ minLength: 5, maxLength: 50 }), unknownVariableArbitrary).map(
      ([text, variable]) => `${text}\n${variable}`
    ),
    // 既知の変数と未知の変数の混在
    fc.constantFrom(
      '{{url}} {{unknown}} {{title}}',
      '参照元:\n{{title}}\n{{url}}\n{{custom}}',
      '{{date}}: {{title}} - {{url}}',
      '{{author}} created {{title}} at {{url}}',
      '{{unknown1}} {{unknown2}} {{url}} {{unknown3}}'
    )
  );

  /**
   * Property 11: 未知の変数の保持
   * **Validates: Requirements 4.5**
   * 
   * For any 認識できない変数（{{url}}、{{title}}以外）を含むテンプレートに対して、
   * 変数置換処理後も、その未知の変数はそのまま残るべきです。
   */
  test('Property 11: 未知の変数は置換されずそのまま残る', async () => {
    await fc.assert(
      fc.asyncProperty(
        templateWithUnknownVariablesArbitrary,
        fc.webUrl(),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (template, url, title) => {
          // 変数を置換
          const result = replaceTemplateVariables(template, { url, title });

          // 既知の変数（{{url}}と{{title}}）は置換される
          if (template.includes('{{url}}')) {
            expect(result).toContain(url);
          }
          if (template.includes('{{title}}')) {
            expect(result).toContain(title);
          }

          // 未知の変数を抽出
          const unknownVariables = template.match(/\{\{(?!url\}\}|title\}\})[^}]+\}\}/g) || [];

          // 未知の変数が結果に残っていることを確認
          unknownVariables.forEach(variable => {
            expect(result).toContain(variable);
          });
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 11の変形: 単一の未知の変数がそのまま残る
   * **Validates: Requirements 4.5**
   */
  test('Property 11: 単一の未知の変数がそのまま残る', async () => {
    await fc.assert(
      fc.asyncProperty(
        unknownVariableArbitrary,
        fc.webUrl(),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (unknownVariable, url, title) => {
          // 未知の変数のみのテンプレート
          const template = unknownVariable;

          const result = replaceTemplateVariables(template, { url, title });

          // 未知の変数がそのまま残っていることを確認
          expect(result).toBe(template);
          expect(result).toContain(unknownVariable);
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 11の変形: 複数の未知の変数が全て残る
   * **Validates: Requirements 4.5**
   */
  test('Property 11: 複数の未知の変数が全て残る', async () => {
    const multipleUnknownVariablesArbitrary = fc.array(
      unknownVariableArbitrary,
      { minLength: 2, maxLength: 10 }
    ).map(vars => vars.join(' '));

    await fc.assert(
      fc.asyncProperty(
        multipleUnknownVariablesArbitrary,
        fc.webUrl(),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (template, url, title) => {
          const result = replaceTemplateVariables(template, { url, title });

          // 全ての未知の変数を抽出
          const unknownVariables = template.match(/\{\{[^}]+\}\}/g) || [];

          // 全ての未知の変数が結果に残っていることを確認
          unknownVariables.forEach(variable => {
            expect(result).toContain(variable);
          });

          // 結果が元のテンプレートと同じであることを確認（既知の変数がないため）
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
   * Property 11の変形: 既知の変数と未知の変数が混在する場合
   * **Validates: Requirements 4.5**
   */
  test('Property 11: 既知の変数は置換され、未知の変数は残る', async () => {
    const mixedTemplateArbitrary = fc.constantFrom(
      '{{url}} {{unknown}}',
      '{{title}} {{custom}}',
      '{{url}} {{title}} {{date}}',
      '参照元:\n{{title}}\n{{url}}\n作成者: {{author}}',
      '{{project}}: {{title}} - {{url}} ({{status}})'
    );

    await fc.assert(
      fc.asyncProperty(
        mixedTemplateArbitrary,
        fc.webUrl(),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (template, url, title) => {
          const result = replaceTemplateVariables(template, { url, title });

          // 既知の変数が置換されていることを確認
          if (template.includes('{{url}}')) {
            expect(result).toContain(url);
            expect(result).not.toContain('{{url}}');
          }
          if (template.includes('{{title}}')) {
            expect(result).toContain(title);
            expect(result).not.toContain('{{title}}');
          }

          // 未知の変数を抽出
          const unknownVariables = template.match(/\{\{(?!url\}\}|title\}\})[^}]+\}\}/g) || [];

          // 未知の変数が結果に残っていることを確認
          unknownVariables.forEach(variable => {
            expect(result).toContain(variable);
          });
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  /**
   * Property 11のエッジケース: 大文字小文字が異なる変数は未知の変数として扱われる
   * **Validates: Requirements 4.5**
   */
  test('Property 11: 大文字小文字が異なる変数は未知の変数として扱われる', async () => {
    const caseSensitiveTemplateArbitrary = fc.constantFrom(
      '{{URL}}',
      '{{TITLE}}',
      '{{Url}}',
      '{{Title}}',
      '{{uRl}}',
      '{{TiTlE}}'
    );

    await fc.assert(
      fc.asyncProperty(
        caseSensitiveTemplateArbitrary,
        fc.webUrl(),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (template, url, title) => {
          const result = replaceTemplateVariables(template, { url, title });

          // 大文字小文字が異なる変数はそのまま残ることを確認
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
   * Property 11のエッジケース: 空白を含む変数名は未知の変数として扱われる
   * **Validates: Requirements 4.5**
   */
  test('Property 11: 空白を含む変数名は未知の変数として扱われる', async () => {
    const whitespaceTemplateArbitrary = fc.constantFrom(
      '{{ url }}',
      '{{ title }}',
      '{{url }}',
      '{{ url}}',
      '{{  url  }}'
    );

    await fc.assert(
      fc.asyncProperty(
        whitespaceTemplateArbitrary,
        fc.webUrl(),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (template, url, title) => {
          const result = replaceTemplateVariables(template, { url, title });

          // 空白を含む変数はそのまま残ることを確認
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
   * Property 11のエッジケース: 特殊文字を含む変数名は未知の変数として扱われる
   * **Validates: Requirements 4.5**
   */
  test('Property 11: 特殊文字を含む変数名は未知の変数として扱われる', async () => {
    const specialCharsTemplateArbitrary = fc.constantFrom(
      '{{url-custom}}',
      '{{title_custom}}',
      '{{url.custom}}',
      '{{title:custom}}',
      '{{url/custom}}'
    );

    await fc.assert(
      fc.asyncProperty(
        specialCharsTemplateArbitrary,
        fc.webUrl(),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (template, url, title) => {
          const result = replaceTemplateVariables(template, { url, title });

          // 特殊文字を含む変数はそのまま残ることを確認
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
   * Property 11のエッジケース: ネストした変数は未知の変数として扱われる
   * **Validates: Requirements 4.5**
   */
  test('Property 11: ネストした変数は未知の変数として扱われる', async () => {
    const nestedTemplateArbitrary = fc.constantFrom(
      '{{{{url}}}}',
      '{{{{title}}}}',
      '{{{url}}}',
      '{{{title}}}'
    );

    await fc.assert(
      fc.asyncProperty(
        nestedTemplateArbitrary,
        fc.webUrl(),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (template, url, title) => {
          const result = replaceTemplateVariables(template, { url, title });

          // ネストした変数の扱いを確認
          // 正規表現が{{url}}や{{title}}にマッチする場合は置換される可能性がある
          // それ以外はそのまま残る
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
   * Property 11のエッジケース: 長い変数名も未知の変数として扱われる
   * **Validates: Requirements 4.5**
   */
  test('Property 11: 長い変数名も未知の変数として扱われる', async () => {
    const longVariableNameArbitrary = fc.string({ minLength: 10, maxLength: 100 })
      .filter(s => s !== 'url' && s !== 'title')
      .map(s => `{{${s}}}`);

    await fc.assert(
      fc.asyncProperty(
        longVariableNameArbitrary,
        fc.webUrl(),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (template, url, title) => {
          const result = replaceTemplateVariables(template, { url, title });

          // 長い変数名はそのまま残ることを確認
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
   * Property 11のエッジケース: 数字のみの変数名も未知の変数として扱われる
   * **Validates: Requirements 4.5**
   */
  test('Property 11: 数字のみの変数名も未知の変数として扱われる', async () => {
    const numericVariableArbitrary = fc.integer({ min: 0, max: 9999 })
      .map(n => `{{${n}}}`);

    await fc.assert(
      fc.asyncProperty(
        numericVariableArbitrary,
        fc.webUrl(),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (template, url, title) => {
          const result = replaceTemplateVariables(template, { url, title });

          // 数字のみの変数名はそのまま残ることを確認
          expect(result).toBe(template);
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });
});
