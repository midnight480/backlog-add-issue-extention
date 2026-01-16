/**
 * 件名入力フィールドの視認性テスト
 * Feature: backlog-issue-creator, Property 5: 件名入力フィールドの視認性
 * 検証: 要件 4.4, 4.5
 */

const fc = require('fast-check');

// DOM環境のセットアップ
const fs = require('fs');
const path = require('path');

// HTMLファイルを読み込み
const html = fs.readFileSync(path.resolve(__dirname, '../sidepanel/sidepanel.html'), 'utf8');

describe('件名入力フィールドの視認性プロパティテスト', () => {
  let popupUI;
  let mockSendMessage;

  beforeEach(() => {
    // DOMを初期化
    document.documentElement.innerHTML = html;
    
    // CSSファイルを読み込み
    const css = fs.readFileSync(path.resolve(__dirname, '../sidepanel/sidepanel.css'), 'utf8');
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Chrome runtime API のモック
    mockSendMessage = jest.fn();
    
    // Chrome tabs API のモック
    const mockTabs = {
      query: jest.fn().mockResolvedValue([{
        url: 'https://example.com/test',
        title: 'Test Page'
      }])
    };

    global.chrome = {
      ...global.chrome,
      runtime: {
        ...global.chrome.runtime,
        sendMessage: mockSendMessage
      },
      tabs: mockTabs
    };

    // StateManagerを読み込み
    const stateManagerScript = fs.readFileSync(path.resolve(__dirname, '../shared/state-manager.js'), 'utf8');
    eval(stateManagerScript);

    // sidepanel.jsを読み込み
    const sidepanelScript = fs.readFileSync(path.resolve(__dirname, '../sidepanel/sidepanel.js'), 'utf8');
    eval(sidepanelScript);

    // DOMContentLoadedイベントを手動で発火
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);

    popupUI = window.sidePanelUI;
  });

  afterEach(() => {
    // DOMをクリーンアップ
    document.documentElement.innerHTML = '';
    delete window.popupUI;
    jest.clearAllMocks();
  });

  /**
   * プロパティ5: 件名入力フィールドの視認性
   * 任意の長さの入力テキストに対して、件名入力フィールドは入力テキスト全体を
   * 視認可能にする（複数行表示または自動スクロール）
   */
  test('プロパティ5: 件名入力フィールドの自動高さ調整', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 様々な長さの文字列を生成
        fc.string({ minLength: 0, maxLength: 255 }),
        async (inputString) => {
          // 件名入力フィールドに値を設定
          popupUI.issueSummary.value = inputString;
          
          // 自動高さ調整を実行
          popupUI.autoResizeSummaryField(popupUI.issueSummary);
          
          // 高さの取得
          const height = parseInt(popupUI.issueSummary.style.height);
          
          // 最小高さと最大高さの範囲内であることを確認
          const minHeight = 36;
          const maxHeight = 108;
          
          expect(height).toBeGreaterThanOrEqual(minHeight);
          expect(height).toBeLessThanOrEqual(maxHeight);
          
          // 短いテキストの場合は最小高さ
          if (inputString.length < 30) {
            expect(height).toBe(minHeight);
            expect(popupUI.issueSummary.style.overflowY).toBe('hidden');
          }
          
          // 最大高さに達した場合はスクロール表示
          if (height === maxHeight) {
            expect(popupUI.issueSummary.style.overflowY).toBe('auto');
          }
        }
      ),
      { numRuns: 100 } // 最小100回の反復実行
    );
  });

  test('プロパティ5-2: 改行を含むテキストの高さ調整', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 改行を含む文字列を生成（空白のみの行を除外）
        fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        async (lines) => {
          const inputString = lines.join('\n');
          
          // 件名入力フィールドに値を設定
          popupUI.issueSummary.value = inputString;
          
          // scrollHeightをモック（JSDOMでは正しく計算されないため）
          Object.defineProperty(popupUI.issueSummary, 'scrollHeight', {
            value: Math.min(36 + (lines.length - 1) * 24, 120),
            configurable: true
          });
          
          // 自動高さ調整を実行
          popupUI.autoResizeSummaryField(popupUI.issueSummary);
          
          // 高さの取得
          const height = parseInt(popupUI.issueSummary.style.height);
          
          // 最小高さと最大高さの範囲内であることを確認
          const minHeight = 36;
          const maxHeight = 108;
          
          expect(height).toBeGreaterThanOrEqual(minHeight);
          expect(height).toBeLessThanOrEqual(maxHeight);
          
          // 行数が多い場合は最大高さに達する
          if (lines.length >= 3) {
            expect(height).toBeGreaterThan(minHeight);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('プロパティ5-3: 入力イベントでの自動高さ調整', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 255 }),
        async (inputString) => {
          // 件名入力フィールドに値を設定
          popupUI.issueSummary.value = inputString;
          
          // 入力イベントを発火（自動高さ調整が実行される）
          const inputEvent = new Event('input', { bubbles: true });
          popupUI.issueSummary.dispatchEvent(inputEvent);
          
          // 高さが設定されていることを確認
          const height = popupUI.issueSummary.style.height;
          expect(height).toBeTruthy();
          expect(height).not.toBe('auto');
          
          // 高さが数値であることを確認
          const heightValue = parseInt(height);
          expect(heightValue).toBeGreaterThan(0);
          expect(heightValue).toBeGreaterThanOrEqual(36);
          expect(heightValue).toBeLessThanOrEqual(108);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('プロパティ5-4: フォームリセット時の高さリセット', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 100, maxLength: 255 }),
        async (longString) => {
          // 長いテキストを入力して高さを拡張
          popupUI.issueSummary.value = longString;
          
          // scrollHeightをモック（JSDOMでは正しく計算されないため）
          Object.defineProperty(popupUI.issueSummary, 'scrollHeight', {
            value: 100,
            configurable: true
          });
          
          popupUI.autoResizeSummaryField(popupUI.issueSummary);
          
          // 高さが拡張されていることを確認
          const expandedHeight = parseInt(popupUI.issueSummary.style.height);
          expect(expandedHeight).toBeGreaterThan(36);
          
          // フォームをリセット
          popupUI.resetIssueForm();
          
          // 高さが最小値にリセットされていることを確認
          const resetHeight = parseInt(popupUI.issueSummary.style.height);
          expect(resetHeight).toBe(36);
          expect(popupUI.issueSummary.style.overflowY).toBe('hidden');
          expect(popupUI.issueSummary.value).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('プロパティ5-5: プロジェクト選択時の高さ初期化', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          name: fc.string({ minLength: 5, maxLength: 50 }),
          projectKey: fc.string({ minLength: 2, maxLength: 10 })
        }),
        async (project) => {
          // 長いテキストを入力して高さを拡張
          popupUI.issueSummary.value = 'a'.repeat(200);
          
          // scrollHeightをモック（JSDOMでは正しく計算されないため）
          Object.defineProperty(popupUI.issueSummary, 'scrollHeight', {
            value: 100,
            configurable: true
          });
          
          popupUI.autoResizeSummaryField(popupUI.issueSummary);
          
          // 高さが拡張されていることを確認
          const expandedHeight = parseInt(popupUI.issueSummary.style.height);
          expect(expandedHeight).toBeGreaterThan(36);
          
          // プロジェクトを選択
          popupUI.selectProject(project);
          
          // 高さが最小値にリセットされていることを確認
          const resetHeight = parseInt(popupUI.issueSummary.style.height);
          expect(resetHeight).toBe(36);
          expect(popupUI.issueSummary.style.overflowY).toBe('hidden');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('プロパティ5-6: 最大高さ到達時のスクロール表示', async () => {
    // 非常に長いテキストを生成
    const veryLongText = 'これは非常に長いテキストです。'.repeat(20);
    
    // 件名入力フィールドに値を設定
    popupUI.issueSummary.value = veryLongText;
    
    // scrollHeightをモック（JSDOMでは正しく計算されないため）
    Object.defineProperty(popupUI.issueSummary, 'scrollHeight', {
      value: 150,
      configurable: true
    });
    
    // 自動高さ調整を実行
    popupUI.autoResizeSummaryField(popupUI.issueSummary);
    
    // 最大高さに達していることを確認
    const height = parseInt(popupUI.issueSummary.style.height);
    expect(height).toBe(108);
    
    // スクロール表示が有効になっていることを確認
    expect(popupUI.issueSummary.style.overflowY).toBe('auto');
  });

  test('プロパティ5-7: 空文字列の場合の最小高さ', async () => {
    // 空文字列を設定
    popupUI.issueSummary.value = '';
    
    // 自動高さ調整を実行
    popupUI.autoResizeSummaryField(popupUI.issueSummary);
    
    // 最小高さであることを確認
    const height = parseInt(popupUI.issueSummary.style.height);
    expect(height).toBe(36);
    
    // スクロールが無効であることを確認
    expect(popupUI.issueSummary.style.overflowY).toBe('hidden');
  });

  test('プロパティ5-8: 段階的な入力での高さ変化', async () => {
    const testStrings = [
      'short',
      'This is a medium length text that should expand the field',
      'This is a very long text that should expand the field even more and potentially reach the maximum height limit'
    ];
    
    let previousHeight = 0;
    
    for (const testString of testStrings) {
      // 件名入力フィールドに値を設定
      popupUI.issueSummary.value = testString;
      
      // 自動高さ調整を実行
      popupUI.autoResizeSummaryField(popupUI.issueSummary);
      
      // 高さを取得
      const currentHeight = parseInt(popupUI.issueSummary.style.height);
      
      // 高さが適切な範囲内であることを確認
      expect(currentHeight).toBeGreaterThanOrEqual(36);
      expect(currentHeight).toBeLessThanOrEqual(108);
      
      // テキストが長くなるにつれて高さが増加または維持されることを確認
      if (previousHeight > 0) {
        expect(currentHeight).toBeGreaterThanOrEqual(previousHeight);
      }
      
      previousHeight = currentHeight;
    }
  });
});
