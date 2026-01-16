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
    global.chrome = {
      ...global.chrome,
      runtime: {
        ...global.chrome.runtime,
        sendMessage: mockSendMessage
      }
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
   * プロパティ3: プロジェクト選択の永続性
   * 任意のプロジェクトを選択した場合、そのプロジェクトが正しく記録され、
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
          // プロジェクトを選択
          popupUI.selectProject(project);
          
          // 選択されたプロジェクトが正しく記録されていることを確認
          expect(popupUI.selectedProjectData).toEqual(project);
          
          // UI要素が正しく更新されていることを確認
          const expectedDisplayText = `${project.name} (${project.projectKey})`;
          expect(popupUI.selectedProjectName.textContent).toBe(expectedDisplayText);
          
          // 選択されたプロジェクト表示が可視化されていることを確認
          expect(popupUI.selectedProject.classList.contains('hidden')).toBe(false);
          
          // 課題フォームセクションが表示されていることを確認
          expect(popupUI.issueFormSection.classList.contains('hidden')).toBe(false);
          
          // 検索入力フィールドがクリアされていることを確認
          expect(popupUI.projectSearchInput.value).toBe('');
          
          // プロジェクトドロップダウンが非表示になっていることを確認
          expect(popupUI.projectDropdown.classList.contains('hidden')).toBe(true);
        }
      ),
      { numRuns: 100 } // 最小100回の反復実行
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
          // まずプロジェクトを選択
          popupUI.selectProject(project);
          expect(popupUI.selectedProjectData).toEqual(project);
          
          // プロジェクト選択を解除
          popupUI.clearSelectedProject();
          
          // 選択されたプロジェクトがクリアされていることを確認
          expect(popupUI.selectedProjectData).toBeNull();
          
          // 選択されたプロジェクト表示が非表示になっていることを確認
          expect(popupUI.selectedProject.classList.contains('hidden')).toBe(true);
          
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
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000 }).map(n => n.toString()),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            projectKey: fc.string({ minLength: 2, maxLength: 10 }).map(s => s.toUpperCase())
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (projects) => {
          // 複数のプロジェクトを順次選択
          for (let i = 0; i < projects.length; i++) {
            const project = projects[i];
            
            popupUI.selectProject(project);
            
            // 最後に選択されたプロジェクトのみが記録されていることを確認
            expect(popupUI.selectedProjectData).toEqual(project);
            
            // UI表示も最後に選択されたプロジェクトのものになっていることを確認
            const expectedDisplayText = `${project.name} (${project.projectKey})`;
            expect(popupUI.selectedProjectName.textContent).toBe(expectedDisplayText);
          }
          
          // 最終的に最後のプロジェクトが選択されていることを確認
          const lastProject = projects[projects.length - 1];
          expect(popupUI.selectedProjectData).toEqual(lastProject);
        }
      ),
      { numRuns: 100 }
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
          // プロジェクトを選択
          popupUI.selectProject(project);
          
          // 選択状態の一貫性を確認
          const isProjectSelected = popupUI.selectedProjectData !== null;
          const isSelectedProjectVisible = !popupUI.selectedProject.classList.contains('hidden');
          const isIssueFormVisible = !popupUI.issueFormSection.classList.contains('hidden');
          const isSearchInputEmpty = popupUI.projectSearchInput.value === '';
          const isDropdownHidden = popupUI.projectDropdown.classList.contains('hidden');
          
          // すべての状態が一貫していることを確認
          expect(isProjectSelected).toBe(true);
          expect(isSelectedProjectVisible).toBe(true);
          expect(isIssueFormVisible).toBe(true);
          expect(isSearchInputEmpty).toBe(true);
          expect(isDropdownHidden).toBe(true);
        }
      ),
      { numRuns: 100 }
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
          
          popupUI.selectProject(unsafeProject);
          
          // HTMLエスケープが正しく行われていることを確認
          const displayText = popupUI.selectedProjectName.textContent;
          
          // スクリプトタグが実行されずにテキストとして表示されていることを確認
          expect(displayText).toContain('<script>');
          expect(displayText).toContain('&<>"');
          
          // 実際のDOM要素にスクリプトが挿入されていないことを確認
          expect(popupUI.selectedProjectName.innerHTML).not.toContain('<script>alert("xss")</script>');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('プロパティ3-6: プロジェクト選択後の検索状態リセット', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }).map(n => n.toString()),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          projectKey: fc.string({ minLength: 2, maxLength: 20 }).map(s => s.toUpperCase())
        }),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (project, searchQuery) => {
          // 検索クエリを設定
          popupUI.projectSearchInput.value = searchQuery;
          popupUI.showProjectDropdown();
          
          // 検索状態を確認
          expect(popupUI.projectSearchInput.value).toBe(searchQuery);
          expect(popupUI.projectDropdown.classList.contains('hidden')).toBe(false);
          
          // プロジェクトを選択
          popupUI.selectProject(project);
          
          // 検索状態がリセットされていることを確認
          expect(popupUI.projectSearchInput.value).toBe('');
          expect(popupUI.projectDropdown.classList.contains('hidden')).toBe(true);
          
          // プロジェクト選択状態は維持されていることを確認
          expect(popupUI.selectedProjectData).toEqual(project);
        }
      ),
      { numRuns: 100 }
    );
  });
});