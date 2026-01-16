/**
 * プロジェクト検索機能のプロパティベーステスト
 * Feature: backlog-issue-creator, Property 2: プロジェクト検索の正確性
 * 検証: 要件 3.4
 */

const fc = require('fast-check');

// DOM環境のセットアップ
const fs = require('fs');
const path = require('path');

// HTMLファイルを読み込み
const html = fs.readFileSync(path.resolve(__dirname, '../sidepanel/sidepanel.html'), 'utf8');

describe('プロジェクト検索機能のプロパティテスト', () => {
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
   * プロパティ2: プロジェクト検索の正確性
   * 任意の検索文字列に対して、プロジェクト絞り込み検索を実行した場合、
   * 返される結果はすべて検索文字列を含むプロジェクトのみである
   */
  test('プロパティ2: プロジェクト検索の正確性', async () => {
    await fc.assert(
      fc.asyncProperty(
        // プロジェクトリストのジェネレータ
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000 }).map(n => n.toString()),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            projectKey: fc.string({ minLength: 2, maxLength: 10 }).map(s => s.toUpperCase())
          }),
          { minLength: 0, maxLength: 20 }
        ),
        // 検索クエリのジェネレータ
        fc.string({ minLength: 0, maxLength: 20 }),
        async (projects, searchQuery) => {
          // プロジェクトデータを設定
          popupUI.allProjects = projects;
          
          // 検索を実行
          popupUI.handleProjectSearch(searchQuery);
          
          // 検索結果を取得
          const filteredProjects = popupUI.filteredProjects;
          
          // 検索クエリが空の場合は全プロジェクトが返される
          if (searchQuery.trim() === '') {
            expect(filteredProjects).toEqual(projects);
            return;
          }
          
          // 検索結果の正確性を検証
          const searchTerm = searchQuery.toLowerCase().trim();
          
          for (const project of filteredProjects) {
            const nameMatches = project.name.toLowerCase().includes(searchTerm);
            const keyMatches = project.projectKey.toLowerCase().includes(searchTerm);
            
            // 検索結果のプロジェクトは、名前またはプロジェクトキーに検索文字列を含む必要がある
            expect(nameMatches || keyMatches).toBe(true);
          }
          
          // 元のプロジェクトリストから、検索条件に一致するものがすべて含まれていることを確認
          const expectedProjects = projects.filter(project => 
            project.name.toLowerCase().includes(searchTerm) ||
            project.projectKey.toLowerCase().includes(searchTerm)
          );
          
          expect(filteredProjects).toEqual(expectedProjects);
        }
      ),
      { numRuns: 100 } // 最小100回の反復実行
    );
  });

  test('プロパティ2-2: 検索結果の一意性', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 重複を含む可能性のあるプロジェクトリスト
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }).map(n => n.toString()),
            name: fc.constantFrom('Project A', 'Project B', 'Test Project', 'Sample'),
            projectKey: fc.constantFrom('PROJ', 'TEST', 'SAMPLE', 'DEMO')
          }),
          { minLength: 0, maxLength: 15 }
        ),
        fc.string({ minLength: 1, maxLength: 10 }),
        async (projects, searchQuery) => {
          // プロジェクトデータを設定
          popupUI.allProjects = projects;
          
          // 検索を実行
          popupUI.handleProjectSearch(searchQuery);
          
          // 検索結果を取得
          const filteredProjects = popupUI.filteredProjects;
          
          // 検索結果に重複がないことを確認
          const projectIds = filteredProjects.map(p => p.id);
          const uniqueIds = [...new Set(projectIds)];
          
          expect(projectIds.length).toBe(uniqueIds.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('プロパティ2-3: 大文字小文字を区別しない検索', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000 }).map(n => n.toString()),
            name: fc.string({ minLength: 1, maxLength: 30 }),
            projectKey: fc.string({ minLength: 2, maxLength: 8 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.string({ minLength: 1, maxLength: 15 }),
        async (projects, searchQuery) => {
          // プロジェクトデータを設定
          popupUI.allProjects = projects;
          
          // 小文字で検索
          popupUI.handleProjectSearch(searchQuery.toLowerCase());
          const lowerCaseResults = [...popupUI.filteredProjects];
          
          // 大文字で検索
          popupUI.handleProjectSearch(searchQuery.toUpperCase());
          const upperCaseResults = [...popupUI.filteredProjects];
          
          // 元の文字列で検索
          popupUI.handleProjectSearch(searchQuery);
          const originalResults = [...popupUI.filteredProjects];
          
          // 大文字小文字に関係なく同じ結果が返されることを確認
          expect(lowerCaseResults).toEqual(upperCaseResults);
          expect(lowerCaseResults).toEqual(originalResults);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('プロパティ2-4: 空白文字の処理', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000 }).map(n => n.toString()),
            name: fc.string({ minLength: 1, maxLength: 30 }),
            projectKey: fc.string({ minLength: 2, maxLength: 8 })
          }),
          { minLength: 0, maxLength: 10 }
        ),
        fc.string({ minLength: 0, maxLength: 20 }),
        async (projects, searchQuery) => {
          // プロジェクトデータを設定
          popupUI.allProjects = projects;
          
          // 前後に空白を追加した検索クエリ
          const paddedQuery = '  ' + searchQuery + '  ';
          
          // 元のクエリで検索
          popupUI.handleProjectSearch(searchQuery);
          const originalResults = [...popupUI.filteredProjects];
          
          // 空白付きクエリで検索
          popupUI.handleProjectSearch(paddedQuery);
          const paddedResults = [...popupUI.filteredProjects];
          
          // 前後の空白は無視されて同じ結果が返されることを確認
          expect(originalResults).toEqual(paddedResults);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('プロパティ2-5: 検索結果の順序保持', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000 }).map(n => n.toString()),
            name: fc.string({ minLength: 1, maxLength: 30 }),
            projectKey: fc.string({ minLength: 2, maxLength: 8 })
          }),
          { minLength: 0, maxLength: 15 }
        ),
        fc.string({ minLength: 1, maxLength: 10 }),
        async (projects, searchQuery) => {
          // プロジェクトデータを設定
          popupUI.allProjects = projects;
          
          // 検索を実行
          popupUI.handleProjectSearch(searchQuery);
          
          // 検索結果を取得
          const filteredProjects = popupUI.filteredProjects;
          
          // 元のプロジェクトリストでの順序を保持していることを確認
          const searchTerm = searchQuery.toLowerCase().trim();
          const expectedOrder = projects.filter(project => 
            project.name.toLowerCase().includes(searchTerm) ||
            project.projectKey.toLowerCase().includes(searchTerm)
          );
          
          expect(filteredProjects).toEqual(expectedOrder);
        }
      ),
      { numRuns: 100 }
    );
  });
});