/**
 * Template Editor UI の存在確認テスト
 * Feature: icon-toggle-and-template-settings
 * Requirements: 5.1
 */

const fs = require('fs');
const path = require('path');

describe('Template Editor UI - Unit Tests', () => {
  let htmlContent;

  beforeAll(() => {
    // sidepanel.htmlを読み込む
    const htmlPath = path.join(__dirname, '../sidepanel/sidepanel.html');
    htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  });

  /**
   * テンプレートエディタが表示されることを確認
   * Requirements: 5.1
   */
  test('should have template editor section in HTML', () => {
    // テンプレートエディタセクションが存在することを確認
    expect(htmlContent).toContain('説明文テンプレート');
    expect(htmlContent).toContain('id="templateEditor"');
  });

  /**
   * テンプレート編集用のtextareaが存在することを確認
   * Requirements: 5.1
   */
  test('should have template editor textarea', () => {
    expect(htmlContent).toContain('id="templateEditor"');
    expect(htmlContent).toContain('class="form-textarea template-textarea"');
  });

  /**
   * 文字数カウンターが表示されることを確認
   * Requirements: 5.1
   */
  test('should have character counter element', () => {
    expect(htmlContent).toContain('id="templateCharCounter"');
    expect(htmlContent).toContain('class="character-counter-template"');
  });

  /**
   * 保存ボタンが存在することを確認
   * Requirements: 5.1
   */
  test('should have save button', () => {
    expect(htmlContent).toContain('id="saveTemplateBtn"');
    expect(htmlContent).toContain('保存');
  });

  /**
   * リセットボタンが存在することを確認
   * Requirements: 5.1
   */
  test('should have reset button', () => {
    expect(htmlContent).toContain('id="resetTemplateBtn"');
    expect(htmlContent).toContain('リセット');
  });

  /**
   * 変数の説明テキストが存在することを確認
   * Requirements: 5.1
   */
  test('should have variable description text', () => {
    expect(htmlContent).toContain('{{url}}');
    expect(htmlContent).toContain('{{title}}');
    expect(htmlContent).toContain('使用可能な変数');
  });

  /**
   * メッセージ表示エリアが存在することを確認
   * Requirements: 5.1
   */
  test('should have message display area', () => {
    expect(htmlContent).toContain('id="templateMessage"');
    expect(htmlContent).toContain('class="template-message hidden"');
  });

  /**
   * テンプレートエディタセクションの構造を確認
   * Requirements: 5.1
   */
  test('should have proper template editor section structure', () => {
    // セクションクラスが存在することを確認
    expect(htmlContent).toContain('class="template-editor-section"');
    
    // フォームグループが存在することを確認
    expect(htmlContent).toContain('class="form-group"');
    
    // ラベルが存在することを確認
    expect(htmlContent).toContain('for="templateEditor"');
    expect(htmlContent).toContain('class="form-label"');
  });

  /**
   * ボタンのスタイルクラスを確認
   * Requirements: 5.1
   */
  test('should have proper button styles', () => {
    // 保存ボタンのスタイル
    const saveButtonMatch = htmlContent.match(/<button[^>]*id="saveTemplateBtn"[^>]*>/);
    expect(saveButtonMatch).toBeTruthy();
    expect(saveButtonMatch[0]).toContain('btn');
    expect(saveButtonMatch[0]).toContain('btn-primary');
    
    // リセットボタンのスタイル
    const resetButtonMatch = htmlContent.match(/<button[^>]*id="resetTemplateBtn"[^>]*>/);
    expect(resetButtonMatch).toBeTruthy();
    expect(resetButtonMatch[0]).toContain('btn');
    expect(resetButtonMatch[0]).toContain('btn-secondary');
  });

  /**
   * テキストエリアのプレースホルダーを確認
   * Requirements: 5.1
   */
  test('should have placeholder text in textarea', () => {
    const textareaMatch = htmlContent.match(/<textarea[^>]*id="templateEditor"[^>]*>/);
    expect(textareaMatch).toBeTruthy();
    expect(textareaMatch[0]).toContain('placeholder');
  });

  /**
   * ヘルプテキストが存在することを確認
   * Requirements: 5.1
   */
  test('should have help text for variables', () => {
    expect(htmlContent).toContain('class="form-help"');
    expect(htmlContent).toContain('現在のページURL');
    expect(htmlContent).toContain('現在のページタイトル');
  });
});

describe('Template Editor CSS - Unit Tests', () => {
  let cssContent;

  beforeAll(() => {
    // sidepanel.cssを読み込む
    const cssPath = path.join(__dirname, '../sidepanel/sidepanel.css');
    cssContent = fs.readFileSync(cssPath, 'utf-8');
  });

  /**
   * テンプレートエディタセクションのスタイルが定義されていることを確認
   * Requirements: 5.1
   */
  test('should have template editor section styles', () => {
    expect(cssContent).toContain('.template-editor-section');
  });

  /**
   * テンプレートテキストエリアのスタイルが定義されていることを確認
   * Requirements: 5.1
   */
  test('should have template textarea styles', () => {
    expect(cssContent).toContain('.template-textarea');
  });

  /**
   * 文字数カウンターのスタイルが定義されていることを確認
   * Requirements: 5.1
   */
  test('should have character counter styles', () => {
    expect(cssContent).toContain('.character-counter-template');
  });

  /**
   * メッセージ表示エリアのスタイルが定義されていることを確認（成功/エラー）
   * Requirements: 5.1
   */
  test('should have message area styles for success and error', () => {
    expect(cssContent).toContain('.template-message');
    expect(cssContent).toContain('.template-message.success');
    expect(cssContent).toContain('.template-message.error');
  });

  /**
   * コード表示のスタイルが定義されていることを確認
   * Requirements: 5.1
   */
  test('should have code element styles', () => {
    expect(cssContent).toContain('code');
  });

  /**
   * ボタンスタイルが既存のものを再利用していることを確認
   * Requirements: 5.1
   */
  test('should reuse existing button styles', () => {
    expect(cssContent).toContain('.btn');
    expect(cssContent).toContain('.btn-primary');
    expect(cssContent).toContain('.btn-secondary');
  });
});
