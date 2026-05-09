/**
 * 課題入力フォーム機能のプロパティベーステスト
 * Feature: backlog-issue-creator, Property 4: 件名文字数制限の適用
 * 検証: 要件 4.2
 */

const fc = require('fast-check');

// DOM環境のセットアップ
const fs = require('fs');
const path = require('path');

// HTMLファイルを読み込み
const html = fs.readFileSync(path.resolve(__dirname, '../sidepanel/sidepanel.html'), 'utf8');

describe('課題入力フォーム機能のプロパティテスト', () => {
  let popupUI;
  let mockSendMessage;

  beforeEach(async () => {
    // DOMを初期化
    document.documentElement.innerHTML = html;
    
    // CSSファイルを読み込み
    const css = fs.readFileSync(path.resolve(__dirname, '../sidepanel/sidepanel.css'), 'utf8');
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Chrome runtime API のモック（個別テストで上書き可能なように定義）
    mockSendMessage = jest.fn((message, callback) => {
      if (typeof callback === 'function') {
        callback({ success: true });
      }
    });
    
    global.chrome.runtime.sendMessage = mockSendMessage;
    global.chrome.tabs.query = jest.fn().mockResolvedValue([{
      url: 'https://example.com/test',
      title: 'Test Page'
    }]);

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

    // 非同期の初期化処理を待機
    await new Promise(resolve => setTimeout(resolve, 100));

    // 初期化時の通信をクリア
    mockSendMessage.mockClear();
  });

  afterEach(() => {
    // DOMをクリーンアップ
    document.documentElement.innerHTML = '';
    delete window.popupUI;
    jest.clearAllMocks();
  });

  /**
   * プロパティ4: 件名文字数制限の適用
   * 任意の入力文字列に対して、件名入力フィールドは255文字以内の制限を正しく適用し、
   * 超過した場合は適切に制限する
   */
  test('プロパティ4: 件名文字数制限の適用', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 文字列ジェネレータ（0文字から300文字まで）
        fc.string({ minLength: 0, maxLength: 300 }),
        async (inputString) => {
          // 件名入力フィールドに値を設定
          popupUI.issueSummary.value = inputString;
          
          // 入力イベントを発火
          popupUI.handleSummaryInput(inputString);
          
          // 文字数カウンターの表示確認
          const expectedCounter = `${inputString.length}/255`;
          expect(popupUI.summaryCounter.textContent).toBe(expectedCounter);
          
          // 255文字以内の場合
          if (inputString.length <= 255) {
            // バリデーションが成功することを確認
            const isValid = popupUI.validateSummary(inputString);
            
            // 空文字列でない場合はバリデーション成功
            if (inputString.trim() !== '') {
              expect(isValid).toBe(true);
              expect(popupUI.summaryError.classList.contains('hidden')).toBe(true);
            } else {
              // 空文字列の場合はバリデーション失敗
              expect(isValid).toBe(false);
              expect(popupUI.summaryError.classList.contains('hidden')).toBe(false);
            }
          } else {
            // 255文字を超える場合はバリデーション失敗
            const isValid = popupUI.validateSummary(inputString);
            expect(isValid).toBe(false);
            expect(popupUI.summaryError.classList.contains('hidden')).toBe(false);
            expect(popupUI.summaryError.textContent).toBe('件名は255文字以内で入力してください');
          }
          
          // 文字数に応じたスタイルクラスの確認
          const length = inputString.length;
          if (length > 255 * 0.9) {
            expect(popupUI.summaryCounter.classList.contains('danger')).toBe(true);
          } else if (length > 255 * 0.8) {
            expect(popupUI.summaryCounter.classList.contains('warning')).toBe(true);
          } else {
            expect(popupUI.summaryCounter.classList.contains('warning')).toBe(false);
            expect(popupUI.summaryCounter.classList.contains('danger')).toBe(false);
          }
        }
      ),
      { numRuns: 100 } // 最小100回の反復実行
    );
  });

  test('プロパティ4-2: 空白文字のバリデーション', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 空白文字のみの文字列ジェネレータ
        fc.string({ minLength: 0, maxLength: 50 }).map(s => ' '.repeat(s.length)),
        async (whitespaceString) => {
          // 件名入力フィールドに空白文字列を設定
          popupUI.issueSummary.value = whitespaceString;
          
          // 入力処理を実行（カウンター更新のため）
          popupUI.handleSummaryInput(whitespaceString);
          
          // バリデーション実行
          const isValid = popupUI.validateSummary(whitespaceString);
          
          // 空白文字のみの場合は常にバリデーション失敗
          expect(isValid).toBe(false);
          expect(popupUI.summaryError.classList.contains('hidden')).toBe(false);
          expect(popupUI.summaryError.textContent).toBe('件名は必須です');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('プロパティ4-3: 作成ボタンの状態制御', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 300 }),
        async (inputString) => {
          // プロジェクトを選択状態にする
          const mockProject = {
            id: '1',
            name: 'Test Project',
            projectKey: 'TEST'
          };
          popupUI.selectedProjectData = mockProject;
          
          // 課題種別を選択状態にする
          popupUI.issueTypeSelect.innerHTML = '<option value="1">Bug</option>';
          popupUI.issueTypeSelect.value = '1';
          
          // 件名入力フィールドに値を設定
          popupUI.issueSummary.value = inputString;
          
          // 入力処理を実行
          popupUI.handleSummaryInput(inputString);
          
          // 作成ボタンの状態を確認
          const shouldBeEnabled = inputString.trim() !== '' && inputString.length <= 255;
          expect(popupUI.createIssueBtn.disabled).toBe(!shouldBeEnabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('プロパティ4-4: HTMLエスケープの安全性', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (baseString) => {
          // HTMLタグを含む文字列を生成
          const htmlString = baseString + '<script>alert("xss")</script>';
          
          // 件名入力フィールドに設定
          popupUI.issueSummary.value = htmlString;
          
          // 入力処理を実行
          popupUI.handleSummaryInput(htmlString);
          
          // 入力フィールドの値がそのまま保持されていることを確認
          expect(popupUI.issueSummary.value).toBe(htmlString);
          
          // 文字数カウンターが正しく表示されていることを確認
          const expectedCounter = `${htmlString.length}/255`;
          expect(popupUI.summaryCounter.textContent).toBe(expectedCounter);
          
          // スクリプトが実行されていないことを確認（入力したスクリプトが挿入されていない）
          const scripts = Array.from(document.querySelectorAll('script'));
          const xssScript = scripts.find(s => s.textContent.includes('alert("xss")'));
          expect(xssScript).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('プロパティ4-5: 文字数制限の境界値テスト', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 250, max: 260 }),
        async (length) => {
          // 指定された長さの文字列を生成
          const testString = 'a'.repeat(length);
          
          // 件名入力フィールドに設定
          popupUI.issueSummary.value = testString;
          
          // 入力処理を実行
          popupUI.handleSummaryInput(testString);
          
          // バリデーション実行
          const isValid = popupUI.validateSummary(testString);
          
          // 255文字以下の場合は有効、超える場合は無効
          if (length <= 255) {
            expect(isValid).toBe(true);
            expect(popupUI.summaryError.classList.contains('hidden')).toBe(true);
          } else {
            expect(isValid).toBe(false);
            expect(popupUI.summaryError.classList.contains('hidden')).toBe(false);
            expect(popupUI.summaryError.textContent).toBe('件名は255文字以内で入力してください');
          }
          
          // 文字数カウンターの表示確認
          const expectedCounter = `${length}/255`;
          expect(popupUI.summaryCounter.textContent).toBe(expectedCounter);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('プロパティ4-6: 特殊文字の処理', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).map(s => 
          s.replace(/./g, () => String.fromCharCode(Math.floor(Math.random() * 65536)))
        ),
        async (specialString) => {
          // 特殊文字を含む文字列を件名に設定
          popupUI.issueSummary.value = specialString;
          
          // 入力処理を実行
          popupUI.handleSummaryInput(specialString);
          
          // 文字数が正しくカウントされていることを確認
          const expectedCounter = `${specialString.length}/255`;
          expect(popupUI.summaryCounter.textContent).toBe(expectedCounter);
          
          // バリデーション結果の確認
          const isValid = popupUI.validateSummary(specialString);
          const shouldBeValid = specialString.trim() !== '' && specialString.length <= 255;
          expect(isValid).toBe(shouldBeValid);
        }
      ),
      { numRuns: 100 }
    );
  });
});