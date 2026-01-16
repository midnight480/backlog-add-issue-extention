/**
 * デフォルトテンプレートのユニットテスト
 * Feature: icon-toggle-and-template-settings
 * 検証: 要件 3.2
 */

const { getDefaultTemplate } = require('../background/service-worker-test-exports');

describe('デフォルトテンプレートの内容', () => {
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
   * 要件3.2: デフォルトテンプレートにはページURLとタイトルのプレースホルダーを含む
   */
  describe('getDefaultTemplate() - デフォルトテンプレートの取得', () => {
    test('デフォルトテンプレートが文字列として返される', () => {
      const template = getDefaultTemplate();

      expect(typeof template).toBe('string');
      expect(template.length).toBeGreaterThan(0);
    });

    test('要件3.2: デフォルトテンプレートに{{url}}が含まれる', () => {
      const template = getDefaultTemplate();

      expect(template).toContain('{{url}}');
    });

    test('要件3.2: デフォルトテンプレートに{{title}}が含まれる', () => {
      const template = getDefaultTemplate();

      expect(template).toContain('{{title}}');
    });

    test('デフォルトテンプレートに{{url}}と{{title}}の両方が含まれる', () => {
      const template = getDefaultTemplate();

      expect(template).toContain('{{url}}');
      expect(template).toContain('{{title}}');
    });

    test('デフォルトテンプレートの形式が期待通りである', () => {
      const template = getDefaultTemplate();

      // 期待される形式: "参照元:\n{{title}}\n{{url}}"
      expect(template).toContain('参照元:');
      expect(template).toContain('{{title}}');
      expect(template).toContain('{{url}}');
    });

    test('デフォルトテンプレートが正確な内容である', () => {
      const template = getDefaultTemplate();

      const expectedTemplate = `参照元:
{{title}}
{{url}}`;

      expect(template).toBe(expectedTemplate);
    });

    test('デフォルトテンプレートに改行が含まれる', () => {
      const template = getDefaultTemplate();

      expect(template).toContain('\n');
    });

    test('デフォルトテンプレートの{{url}}と{{title}}の順序が正しい', () => {
      const template = getDefaultTemplate();

      const titleIndex = template.indexOf('{{title}}');
      const urlIndex = template.indexOf('{{url}}');

      // {{title}}が{{url}}より前に出現することを確認
      expect(titleIndex).toBeLessThan(urlIndex);
    });

    test('デフォルトテンプレートが毎回同じ内容を返す', () => {
      const template1 = getDefaultTemplate();
      const template2 = getDefaultTemplate();
      const template3 = getDefaultTemplate();

      expect(template1).toBe(template2);
      expect(template2).toBe(template3);
    });

    test('デフォルトテンプレートに未知の変数が含まれない', () => {
      const template = getDefaultTemplate();

      // {{url}}と{{title}}以外の変数が含まれていないことを確認
      const variables = template.match(/\{\{[^}]+\}\}/g) || [];
      const validVariables = variables.filter(v => v === '{{url}}' || v === '{{title}}');

      expect(variables.length).toBe(validVariables.length);
    });

    test('デフォルトテンプレートの長さが妥当である', () => {
      const template = getDefaultTemplate();

      // 妥当な長さ（短すぎず長すぎない）
      expect(template.length).toBeGreaterThan(10);
      expect(template.length).toBeLessThan(200);
    });

    test('デフォルトテンプレートに特殊文字が含まれない（変数以外）', () => {
      const template = getDefaultTemplate();

      // 変数を除去
      const withoutVariables = template.replace(/\{\{url\}\}/g, '').replace(/\{\{title\}\}/g, '');

      // 特殊文字（<, >, &, ", '）が含まれていないことを確認
      expect(withoutVariables).not.toContain('<');
      expect(withoutVariables).not.toContain('>');
      expect(withoutVariables).not.toContain('&');
      expect(withoutVariables).not.toContain('"');
      expect(withoutVariables).not.toContain("'");
    });

    test('デフォルトテンプレートが日本語を含む', () => {
      const template = getDefaultTemplate();

      // 日本語文字が含まれることを確認
      expect(template).toMatch(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/);
    });
  });

  /**
   * エッジケースのテスト
   */
  describe('エッジケースのテスト', () => {
    test('デフォルトテンプレートが空文字列ではない', () => {
      const template = getDefaultTemplate();

      expect(template).not.toBe('');
    });

    test('デフォルトテンプレートがnullやundefinedではない', () => {
      const template = getDefaultTemplate();

      expect(template).not.toBeNull();
      expect(template).not.toBeUndefined();
    });

    test('デフォルトテンプレートが配列やオブジェクトではない', () => {
      const template = getDefaultTemplate();

      expect(Array.isArray(template)).toBe(false);
      expect(typeof template).not.toBe('object');
    });

    test('デフォルトテンプレートに余分な空白が含まれない', () => {
      const template = getDefaultTemplate();

      // 行頭・行末の余分な空白がないことを確認
      const lines = template.split('\n');
      lines.forEach(line => {
        if (line.trim().length > 0) {
          expect(line).toBe(line.trim());
        }
      });
    });

    test('デフォルトテンプレートの変数が正しい形式である', () => {
      const template = getDefaultTemplate();

      // {{url}}の形式が正しいことを確認
      expect(template).toContain('{{url}}');
      expect(template).not.toContain('{{ url }}');
      expect(template).not.toContain('{{URL}}');

      // {{title}}の形式が正しいことを確認
      expect(template).toContain('{{title}}');
      expect(template).not.toContain('{{ title }}');
      expect(template).not.toContain('{{TITLE}}');
    });
  });
});
