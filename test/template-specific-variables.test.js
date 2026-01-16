/**
 * 特定の変数の置換ユニットテスト
 * Feature: icon-toggle-and-template-settings
 * 検証: 要件 4.1, 4.2
 */

const { replaceTemplateVariables } = require('../background/service-worker-test-exports');

describe('特定の変数の置換', () => {
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
   * 要件4.1: {{url}}が正しく置換される
   */
  describe('{{url}}変数の置換', () => {
    test('要件4.1: {{url}}が実際のURLに置換される', () => {
      const template = '参照: {{url}}';
      const url = 'https://example.com/page';
      const title = 'Test Page';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe('参照: https://example.com/page');
      expect(result).toContain(url);
      expect(result).not.toContain('{{url}}');
    });

    test('{{url}}のみを含むテンプレートで正しく置換される', () => {
      const template = '{{url}}';
      const url = 'https://example.com';
      const title = '';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe(url);
    });

    test('複数の{{url}}が全て置換される', () => {
      const template = '{{url}} と {{url}}';
      const url = 'https://example.com';
      const title = '';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe('https://example.com と https://example.com');
      expect(result).not.toContain('{{url}}');
    });

    test('{{url}}がテンプレートの先頭にある場合も正しく置換される', () => {
      const template = '{{url}} - 参照元';
      const url = 'https://example.com';
      const title = '';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe('https://example.com - 参照元');
    });

    test('{{url}}がテンプレートの末尾にある場合も正しく置換される', () => {
      const template = '参照元: {{url}}';
      const url = 'https://example.com';
      const title = '';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe('参照元: https://example.com');
    });

    test('{{url}}が改行を含むテンプレートで正しく置換される', () => {
      const template = '参照元:\n{{url}}';
      const url = 'https://example.com';
      const title = '';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe('参照元:\nhttps://example.com');
    });

    test('クエリパラメータを含むURLが正しく置換される', () => {
      const template = '{{url}}';
      const url = 'https://example.com/page?query=value&other=123';
      const title = '';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe(url);
    });

    test('フラグメントを含むURLが正しく置換される', () => {
      const template = '{{url}}';
      const url = 'https://example.com/page#section';
      const title = '';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe(url);
    });

    test('特殊文字を含むURLが正しく置換される', () => {
      const template = '{{url}}';
      const url = 'https://example.com/path?q=test&value=$100';
      const title = '';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe(url);
    });

    test('非常に長いURLが正しく置換される', () => {
      const template = '{{url}}';
      const url = 'https://example.com/' + 'a'.repeat(500);
      const title = '';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe(url);
      expect(result.length).toBe(url.length);
    });
  });

  /**
   * 要件4.2: {{title}}が正しく置換される
   */
  describe('{{title}}変数の置換', () => {
    test('要件4.2: {{title}}が実際のタイトルに置換される', () => {
      const template = 'タイトル: {{title}}';
      const url = 'https://example.com';
      const title = 'Test Page';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe('タイトル: Test Page');
      expect(result).toContain(title);
      expect(result).not.toContain('{{title}}');
    });

    test('{{title}}のみを含むテンプレートで正しく置換される', () => {
      const template = '{{title}}';
      const url = '';
      const title = 'Test Page';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe(title);
    });

    test('複数の{{title}}が全て置換される', () => {
      const template = '{{title}} - {{title}}';
      const url = '';
      const title = 'Test Page';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe('Test Page - Test Page');
      expect(result).not.toContain('{{title}}');
    });

    test('{{title}}がテンプレートの先頭にある場合も正しく置換される', () => {
      const template = '{{title}} について';
      const url = '';
      const title = 'Test Page';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe('Test Page について');
    });

    test('{{title}}がテンプレートの末尾にある場合も正しく置換される', () => {
      const template = '件名: {{title}}';
      const url = '';
      const title = 'Test Page';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe('件名: Test Page');
    });

    test('{{title}}が改行を含むテンプレートで正しく置換される', () => {
      const template = 'タイトル:\n{{title}}';
      const url = '';
      const title = 'Test Page';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe('タイトル:\nTest Page');
    });

    test('日本語を含むタイトルが正しく置換される', () => {
      const template = '{{title}}';
      const url = '';
      const title = 'テストページ - 日本語タイトル';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe(title);
    });

    test('特殊文字を含むタイトルが正しく置換される', () => {
      const template = '{{title}}';
      const url = '';
      const title = 'Title with "quotes" and \'apostrophes\'';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe(title);
    });

    test('HTMLタグを含むタイトルが正しく置換される', () => {
      const template = '{{title}}';
      const url = '';
      const title = 'Title with <html> tags';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe(title);
    });

    test('非常に長いタイトルが正しく置換される', () => {
      const template = '{{title}}';
      const url = '';
      const title = 'A'.repeat(500);

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe(title);
      expect(result.length).toBe(title.length);
    });
  });

  /**
   * {{url}}と{{title}}の両方を含むテンプレート
   */
  describe('{{url}}と{{title}}の両方を含むテンプレート', () => {
    test('要件4.1, 4.2: {{url}}と{{title}}が両方とも正しく置換される', () => {
      const template = '参照元:\n{{title}}\n{{url}}';
      const url = 'https://example.com/page';
      const title = 'Test Page';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe('参照元:\nTest Page\nhttps://example.com/page');
      expect(result).toContain(url);
      expect(result).toContain(title);
      expect(result).not.toContain('{{url}}');
      expect(result).not.toContain('{{title}}');
    });

    test('{{url}}と{{title}}が同じ行にある場合も正しく置換される', () => {
      const template = '{{title}} - {{url}}';
      const url = 'https://example.com';
      const title = 'Test Page';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe('Test Page - https://example.com');
    });

    test('{{url}}と{{title}}が複数回出現する場合も正しく置換される', () => {
      const template = '{{title}} ({{url}})\n再掲: {{title}} - {{url}}';
      const url = 'https://example.com';
      const title = 'Test Page';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe('Test Page (https://example.com)\n再掲: Test Page - https://example.com');
      expect(result).not.toContain('{{url}}');
      expect(result).not.toContain('{{title}}');
    });

    test('デフォルトテンプレートの形式で正しく置換される', () => {
      const template = '参照元:\n{{title}}\n{{url}}';
      const url = 'https://backlog.example.com/view/PROJECT-123';
      const title = 'PROJECT-123: バグ修正';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe('参照元:\nPROJECT-123: バグ修正\nhttps://backlog.example.com/view/PROJECT-123');
    });
  });

  /**
   * エッジケースのテスト
   */
  describe('エッジケースのテスト', () => {
    test('変数が提供されない場合、元のテンプレートがそのまま返される', () => {
      const template = '{{url}} {{title}}';

      const result = replaceTemplateVariables(template, {});

      expect(result).toBe(template);
    });

    test('urlのみ提供された場合、{{url}}のみ置換される', () => {
      const template = '{{url}} {{title}}';
      const url = 'https://example.com';

      const result = replaceTemplateVariables(template, { url });

      expect(result).toBe('https://example.com {{title}}');
      expect(result).toContain(url);
      expect(result).not.toContain('{{url}}');
      expect(result).toContain('{{title}}');
    });

    test('titleのみ提供された場合、{{title}}のみ置換される', () => {
      const template = '{{url}} {{title}}';
      const title = 'Test Page';

      const result = replaceTemplateVariables(template, { title });

      expect(result).toBe('{{url}} Test Page');
      expect(result).toContain(title);
      expect(result).toContain('{{url}}');
      expect(result).not.toContain('{{title}}');
    });

    test('空文字列のurlは置換されない', () => {
      const template = '{{url}}';
      const url = '';
      const title = 'Test';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe('{{url}}');
    });

    test('空文字列のtitleは置換されない', () => {
      const template = '{{title}}';
      const url = 'https://example.com';
      const title = '';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe('{{title}}');
    });

    test('変数を含まないテンプレートはそのまま返される', () => {
      const template = '参照元: テストページ';
      const url = 'https://example.com';
      const title = 'Test Page';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe(template);
    });

    test('$記号を含むURLが正しく置換される（エスケープ処理の確認）', () => {
      const template = '{{url}}';
      const url = 'https://example.com/path?price=$100';
      const title = '';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe(url);
      expect(result).toContain('$100');
    });

    test('$$を含むURLが正しく置換される（エスケープ処理の確認）', () => {
      const template = '{{url}}';
      const url = 'https://example.com/$$test';
      const title = '';

      const result = replaceTemplateVariables(template, { url, title });

      expect(result).toBe(url);
      expect(result).toContain('$$');
    });
  });
});
