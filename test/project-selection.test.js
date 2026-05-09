/**
 * プロジェクト選択機能のプロパティベーステスト
 * Feature: backlog-issue-creator, Property 3: プロジェクト選択の永続性
 * 検証: 要件 3.5
 */

const fc = require('fast-check');

// DOM環境のセットアップ
const fs = require('fs');
const path = require('path');

// HTMLファイルを読み込み
const html = fs.readFileSync(path.resolve(__dirname, '../sidepanel/sidepanel.html'), 'utf8');

describe('プロジェクト選択機能のプロパティテスト', () => {
  let popupUI;
  let mockSendMessage;
  jest.setTimeout(10000); // タイムアウトを延長

  beforeEach(async () => {
    // DOMを初期化
    document.documentElement.innerHTML = html;
    
    // CSSファイルを読み込み
    const css = fs.readFileSync(path.resolve(__dirname, '../sidepanel/sidepanel.css'), 'utf8');
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Chrome runtime API のモック
    mockSendMessage = jest.fn((message, callback) => {
      if (message.action === 'getFavoriteProjects') {
        callback({ success: true, projects: [] });
      } else if (typeof callback === 'function') {
        callback({ success: true });
      }
    });
    global.chrome.runtime.sendMessage = mockSendMessage;

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
   * プロパティ3: プロジェクト選択の永続性
   * 任意のお気に入りプロジェクトを選択した場合、そのプロジェクトが正しく記録され、
   * 後続の操作で参照可能である
   */
  test('プロパティ3: プロジェクト選択の永続性', async () => {
    await fc.assert(
      fc.asyncProperty(
        // プロジェクトデータのジェネレータ
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }).map(n => n.toString()),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          projectKey: fc.string({ minLength: 2, maxLength: 20 }).map(s => s.toUpperCase())
        }),
        async (project) => {
          // 内部データを設定
          popupUI.allProjects = [project];

          // お気に入りプロジェクトとしてモックレスポンスを設定
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'getFavoriteProjects') {
              callback({ success: true, projects: [project] });
            } else if (message.action === 'getProjectIssueTypes') {
              callback({ success: true, issueTypes: [{ id: 1, name: 'Bug' }] });
            }
          });

          // お気に入りプロジェクトをプルダウンに描画
          await popupUI.renderFavoriteProjectsInAddIssue();
          
          // プロジェクトを選択
          popupUI.favoriteProjectSelect.value = project.id;
          const event = new Event('change');
          popupUI.favoriteProjectSelect.dispatchEvent(event);
          
          // 非同期の課題種別読み込みを待機
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // 選択されたプロジェクトが正しく記録されていることを確認
          expect(popupUI.selectedProjectData).toEqual(project);
          
          // 課題フォームセクションが表示されていることを確認
          expect(popupUI.issueFormSection.classList.contains('hidden')).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('プロパティ3-2: プロジェクト選択解除の正確性', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }).map(n => n.toString()),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          projectKey: fc.string({ minLength: 2, maxLength: 20 }).map(s => s.toUpperCase())
        }),
        async (project) => {
          // プロジェクトを選択状態にする
          popupUI.selectedProjectData = project;
          popupUI.issueFormSection.classList.remove('hidden');
          
          // プロジェクト選択を解除（プルダウンを未選択に）
          popupUI.favoriteProjectSelect.value = '';
          const event = new Event('change');
          popupUI.favoriteProjectSelect.dispatchEvent(event);
          
          // 選択されたプロジェクトがクリアされていることを確認
          expect(popupUI.selectedProjectData).toBeNull();
          
          // 課題フォームセクションが非表示になっていることを確認
          expect(popupUI.issueFormSection.classList.contains('hidden')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('プロパティ3-3: 複数プロジェクト選択の一意性', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(
          fc.record({
            id: fc.integer({ min: 1, max: 1000 }).map(n => n.toString()),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            projectKey: fc.string({ minLength: 2, maxLength: 10 }).map(s => s.toUpperCase())
          }),
          { selector: p => p.id, minLength: 2, maxLength: 5 }
        ),
        async (projects) => {
          // 内部データを設定
          popupUI.allProjects = projects;

          // お気に入りプロジェクトとしてモックレスポンスを設定
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'getFavoriteProjects') {
              callback({ success: true, projects: projects });
            } else if (message.action === 'getProjectIssueTypes') {
              callback({ success: true, issueTypes: [{ id: 1, name: 'Bug' }] });
            }
          });

          // お気に入りプロジェクトをプルダウンに描画
          await popupUI.renderFavoriteProjectsInAddIssue();

          // 複数のプロジェクトを順次選択
          for (let i = 0; i < projects.length; i++) {
            const project = projects[i];

            popupUI.favoriteProjectSelect.value = project.id;
            const event = new Event('change');
            popupUI.favoriteProjectSelect.dispatchEvent(event);

            // 非同期処理を待機
            await new Promise(resolve => setTimeout(resolve, 10));

            // 最後に選択されたプロジェクトのみが記録されていることを確認
            expect(popupUI.selectedProjectData).toEqual(project);
          }

          // 最終的に最後のプロジェクトが選択されていることを確認
          const lastProject = projects[projects.length - 1];
          expect(popupUI.selectedProjectData).toEqual(lastProject);
        }
      ),
      { numRuns: 20 }
    );
  });
  test('プロパティ3-4: プロジェクト選択状態の一貫性', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }).map(n => n.toString()),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          projectKey: fc.string({ minLength: 2, maxLength: 20 }).map(s => s.toUpperCase())
        }),
        async (project) => {
          // 内部データを設定
          popupUI.allProjects = [project];

          // お気に入りプロジェクトとして設定
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'getFavoriteProjects') {
              callback({ success: true, projects: [project] });
            } else if (message.action === 'getProjectIssueTypes') {
              callback({ success: true, issueTypes: [{ id: 1, name: 'Bug' }] });
            }
          });

          await popupUI.renderFavoriteProjectsInAddIssue();

          // プロジェクトを選択
          popupUI.favoriteProjectSelect.value = project.id;
          const event = new Event('change');
          popupUI.favoriteProjectSelect.dispatchEvent(event);
          
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // 選択状態の一貫性を確認
          const isProjectSelected = popupUI.selectedProjectData !== null;
          const isIssueFormVisible = !popupUI.issueFormSection.classList.contains('hidden');
          const isDropdownCorrect = popupUI.favoriteProjectSelect.value.toString() === project.id.toString();
          
          // すべての状態が一貫していることを確認
          expect(isProjectSelected).toBe(true);
          expect(isIssueFormVisible).toBe(true);
          expect(isDropdownCorrect).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('プロパティ3-5: HTMLエスケープの安全性', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }).map(n => n.toString()),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          projectKey: fc.string({ minLength: 2, maxLength: 10 })
        }),
        async (project) => {
          // HTMLエスケープが必要な文字を含むプロジェクト名をテスト
          const unsafeProject = {
            ...project,
            name: project.name + '<script>alert("xss")</script>',
            projectKey: project.projectKey + '&<>"'
          };
          
          // 内部データを設定
          popupUI.allProjects = [unsafeProject];
          
          mockSendMessage.mockImplementation((message, callback) => {
            if (message.action === 'getFavoriteProjects') {
              callback({ success: true, projects: [unsafeProject] });
            } else if (message.action === 'getProjectIssueTypes') {
              callback({ success: true, issueTypes: [{ id: 1, name: 'Bug' }] });
            }
          });

          await popupUI.renderFavoriteProjectsInAddIssue();

          // プルダウンのオプションのテキストを確認
          const option = popupUI.favoriteProjectSelect.querySelector(`option[value="${unsafeProject.id}"]`);
          const displayText = option.textContent;
          
          // スクリプトタグが実行されずにテキストとして表示されていることを確認
          expect(displayText).toContain('<script>');
          expect(displayText).toContain('&<>"');
          
          // 実際のDOM要素にスクリプトが挿入されていないことを確認
          expect(option.innerHTML).not.toContain('<script>alert("xss")</script>');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('プロパティ3-6: お気に入りプロジェクト未設定時の表示', async () => {
    // お気に入りなしのレスポンス
    mockSendMessage.mockImplementation((message, callback) => {
      if (message.action === 'getFavoriteProjects') {
        callback({ success: true, projects: [] });
      }
    });

    await popupUI.renderFavoriteProjectsInAddIssue();

    // メッセージが表示されていることを確認
    expect(popupUI.noFavoriteProjectsMessage.classList.contains('hidden')).toBe(false);
    expect(popupUI.favoriteProjectSelect.classList.contains('hidden')).toBe(true);
    expect(popupUI.issueFormSection.classList.contains('hidden')).toBe(true);
  });
});
