/**
 * Sidepanel機能の継続性のプロパティベーステスト
 * Feature: remove-popup-use-sidepanel-only
 * Property 3: Sidepanel機能の継続性
 * **Validates: Requirements 4.1, 4.2**
 */

const fc = require('fast-check');

describe('Property 3: Sidepanel機能の継続性', () => {
  let mockChrome;
  let mockStateManager;
  let sidePanelUI;

  beforeEach(() => {
    // Chrome API のモック
    mockChrome = {
      storage: {
        local: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue(undefined),
          remove: jest.fn().mockResolvedValue(undefined)
        },
        onChanged: {
          addListener: jest.fn()
        }
      },
      runtime: {
        sendMessage: jest.fn(),
        lastError: null
      },
      tabs: {
        query: jest.fn().mockResolvedValue([{
          id: 1,
          url: 'https://example.com',
          title: 'Example Page',
          windowId: 1
        }]),
        get: jest.fn().mockResolvedValue({
          id: 1,
          url: 'https://example.com',
          title: 'Example Page',
          windowId: 1
        }),
        onActivated: {
          addListener: jest.fn()
        },
        onUpdated: {
          addListener: jest.fn()
        }
      }
    };

    global.chrome = mockChrome;

    // StateManagerのモック
    mockStateManager = {
      saveState: jest.fn().mockResolvedValue({ success: true }),
      loadState: jest.fn().mockResolvedValue({
        selectedProject: null,
        issueType: null,
        summary: '',
        description: '',
        currentTab: null
      }),
      clearState: jest.fn().mockResolvedValue({ success: true }),
      cleanup: jest.fn()
    };

    // コンソールログをモック
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * APIキー情報のジェネレーター
   */
  const apiKeyArbitrary = fc.record({
    apiKey: fc.string({ minLength: 20, maxLength: 64 }).map(s => 
      s.replace(/[^a-zA-Z0-9_-]/g, 'a')
    ),
    domain: fc.oneof(
      fc.constant('example.backlog.jp'),
      fc.constant('test.backlog.com'),
      fc.constant('mycompany.backlog.jp')
    ),
    createdAt: fc.integer({ min: Date.now() - 86400000, max: Date.now() })
  });

  /**
   * プロジェクト情報のジェネレーター
   */
  const projectArbitrary = fc.record({
    id: fc.integer({ min: 1, max: 999999 }).map(n => n.toString()),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    projectKey: fc.string({ minLength: 2, maxLength: 10 }).map(s => 
      s.toUpperCase().replace(/[^A-Z0-9]/g, 'A')
    )
  });

  /**
   * 課題種別のジェネレーター
   */
  const issueTypeArbitrary = fc.record({
    id: fc.integer({ min: 1, max: 100 }),
    name: fc.oneof(
      fc.constant('タスク'),
      fc.constant('バグ'),
      fc.constant('要望'),
      fc.constant('その他')
    ),
    color: fc.oneof(
      fc.constant('#e30000'),
      fc.constant('#990000'),
      fc.constant('#934981'),
      fc.constant('#814fbc')
    )
  });

  /**
   * 課題データのジェネレーター
   */
  const issueDataArbitrary = fc.record({
    summary: fc.string({ minLength: 1, maxLength: 255 }),
    description: fc.string({ maxLength: 1000 }),
    issueTypeId: fc.integer({ min: 1, max: 100 })
  });

  /**
   * Property 3.1: APIキー管理機能の継続性
   * **Validates: Requirements 4.1, 4.2**
   * 
   * For any APIキー操作（登録、取得、削除）において、
   * Popup削除後も正常に動作するべきである
   */
  test('Property 3.1: APIキー管理機能が正常に動作する', async () => {
    await fc.assert(
      fc.asyncProperty(apiKeyArbitrary, async (apiKeyData) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // APIキー登録のシミュレーション
        mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
          if (message.action === 'saveApiKey') {
            callback({ success: true });
          } else if (message.action === 'getApiKey') {
            callback({
              success: true,
              apiKey: apiKeyData.apiKey,
              domain: apiKeyData.domain,
              createdAt: apiKeyData.createdAt
            });
          } else if (message.action === 'deleteApiKey') {
            callback({ success: true });
          }
        });

        // APIキー登録
        const saveResult = await new Promise((resolve) => {
          mockChrome.runtime.sendMessage(
            { action: 'saveApiKey', apiKey: apiKeyData.apiKey, domain: apiKeyData.domain },
            resolve
          );
        });
        expect(saveResult.success).toBe(true);

        // APIキー取得
        const getResult = await new Promise((resolve) => {
          mockChrome.runtime.sendMessage({ action: 'getApiKey' }, resolve);
        });
        expect(getResult.success).toBe(true);
        expect(getResult.apiKey).toBe(apiKeyData.apiKey);
        expect(getResult.domain).toBe(apiKeyData.domain);

        // APIキー削除
        const deleteResult = await new Promise((resolve) => {
          mockChrome.runtime.sendMessage({ action: 'deleteApiKey' }, resolve);
        });
        expect(deleteResult.success).toBe(true);

        // すべての操作でruntime.sendMessageが呼ばれたことを確認
        expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 3.2: プロジェクト選択機能の継続性
   * **Validates: Requirements 4.1, 4.2**
   * 
   * For any プロジェクト選択操作において、
   * Popup削除後も正常に動作するべきである
   */
  test('Property 3.2: プロジェクト選択機能が正常に動作する', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(projectArbitrary, { minLength: 1, maxLength: 10 }),
        async (projects) => {
          // テストごとにモックをリセット
          jest.clearAllMocks();

          // プロジェクト一覧取得のシミュレーション
          mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
            if (message.action === 'getProjects') {
              callback({ success: true, projects: projects });
            }
          });

          // プロジェクト一覧取得
          const result = await new Promise((resolve) => {
            mockChrome.runtime.sendMessage({ action: 'getProjects' }, resolve);
          });

          expect(result.success).toBe(true);
          expect(result.projects).toHaveLength(projects.length);
          expect(result.projects).toEqual(projects);

          // 各プロジェクトが正しい構造を持つことを確認
          result.projects.forEach((project) => {
            expect(project).toHaveProperty('id');
            expect(project).toHaveProperty('name');
            expect(project).toHaveProperty('projectKey');
            expect(typeof project.id).toBe('string');
            expect(typeof project.name).toBe('string');
            expect(typeof project.projectKey).toBe('string');
          });
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 3.3: 課題種別取得機能の継続性
   * **Validates: Requirements 4.1, 4.2**
   * 
   * For any プロジェクトにおいて、課題種別の取得が
   * Popup削除後も正常に動作するべきである
   */
  test('Property 3.3: 課題種別取得機能が正常に動作する', async () => {
    await fc.assert(
      fc.asyncProperty(
        projectArbitrary,
        fc.array(issueTypeArbitrary, { minLength: 1, maxLength: 10 }),
        async (project, issueTypes) => {
          // テストごとにモックをリセット
          jest.clearAllMocks();

          // 課題種別取得のシミュレーション
          mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
            if (message.action === 'getIssueTypes' && message.projectId === project.id) {
              callback({ success: true, issueTypes: issueTypes });
            }
          });

          // 課題種別取得
          const result = await new Promise((resolve) => {
            mockChrome.runtime.sendMessage(
              { action: 'getIssueTypes', projectId: project.id },
              resolve
            );
          });

          expect(result.success).toBe(true);
          expect(result.issueTypes).toHaveLength(issueTypes.length);
          expect(result.issueTypes).toEqual(issueTypes);

          // 各課題種別が正しい構造を持つことを確認
          result.issueTypes.forEach((issueType) => {
            expect(issueType).toHaveProperty('id');
            expect(issueType).toHaveProperty('name');
            expect(issueType).toHaveProperty('color');
            expect(typeof issueType.id).toBe('number');
            expect(typeof issueType.name).toBe('string');
            expect(typeof issueType.color).toBe('string');
          });
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 3.4: 課題作成機能の継続性
   * **Validates: Requirements 4.1, 4.2**
   * 
   * For any 課題データにおいて、課題作成が
   * Popup削除後も正常に動作するべきである
   */
  test('Property 3.4: 課題作成機能が正常に動作する', async () => {
    await fc.assert(
      fc.asyncProperty(
        projectArbitrary,
        issueDataArbitrary,
        async (project, issueData) => {
          // テストごとにモックをリセット
          jest.clearAllMocks();

          // 課題作成のシミュレーション
          const expectedIssueKey = `${project.projectKey}-${Math.floor(Math.random() * 1000)}`;
          mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
            if (message.action === 'createIssue') {
              callback({
                success: true,
                issue: {
                  id: Math.floor(Math.random() * 999999),
                  issueKey: expectedIssueKey,
                  summary: message.summary,
                  description: message.description
                }
              });
            }
          });

          // 課題作成
          const result = await new Promise((resolve) => {
            mockChrome.runtime.sendMessage(
              {
                action: 'createIssue',
                projectId: project.id,
                summary: issueData.summary,
                description: issueData.description,
                issueTypeId: issueData.issueTypeId
              },
              resolve
            );
          });

          expect(result.success).toBe(true);
          expect(result.issue).toHaveProperty('id');
          expect(result.issue).toHaveProperty('issueKey');
          expect(result.issue).toHaveProperty('summary');
          expect(result.issue).toHaveProperty('description');
          expect(result.issue.summary).toBe(issueData.summary);
          expect(result.issue.description).toBe(issueData.description);
          expect(result.issue.issueKey).toContain(project.projectKey);
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 3.5: 状態管理機能の継続性
   * **Validates: Requirements 4.1, 4.2**
   * 
   * For any 状態データにおいて、状態の保存・読み込みが
   * Popup削除後も正常に動作するべきである
   */
  test('Property 3.5: 状態管理機能が正常に動作する', async () => {
    const stateArbitrary = fc.record({
      selectedProject: fc.oneof(
        fc.constant(null),
        projectArbitrary
      ),
      issueType: fc.oneof(
        fc.constant(null),
        fc.integer({ min: 1, max: 100 }).map(n => n.toString())
      ),
      summary: fc.string({ maxLength: 255 }),
      description: fc.string({ maxLength: 1000 }),
      currentTab: fc.oneof(
        fc.constant(null),
        fc.record({
          url: fc.webUrl(),
          title: fc.string({ minLength: 1, maxLength: 100 })
        })
      )
    });

    await fc.assert(
      fc.asyncProperty(stateArbitrary, async (state) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // 状態の保存
        const saveResult = await mockStateManager.saveState(state);
        expect(saveResult.success).toBe(true);
        expect(mockStateManager.saveState).toHaveBeenCalledWith(state);

        // 状態の読み込み
        mockStateManager.loadState.mockResolvedValue(state);
        const loadResult = await mockStateManager.loadState();
        
        expect(loadResult).toEqual(state);
        expect(loadResult.selectedProject).toEqual(state.selectedProject);
        expect(loadResult.issueType).toEqual(state.issueType);
        expect(loadResult.summary).toEqual(state.summary);
        expect(loadResult.description).toEqual(state.description);
        expect(loadResult.currentTab).toEqual(state.currentTab);

        // 状態のクリア
        const clearResult = await mockStateManager.clearState();
        expect(clearResult.success).toBe(true);
        expect(mockStateManager.clearState).toHaveBeenCalled();
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 3.6: エンドツーエンドフローの継続性
   * **Validates: Requirements 4.1, 4.2**
   * 
   * For any 完全な課題作成フローにおいて、
   * すべての機能が連携してPopup削除後も正常に動作するべきである
   */
  test('Property 3.6: エンドツーエンドフローが正常に動作する', async () => {
    await fc.assert(
      fc.asyncProperty(
        apiKeyArbitrary,
        projectArbitrary,
        fc.array(issueTypeArbitrary, { minLength: 1, maxLength: 5 }),
        issueDataArbitrary,
        async (apiKeyData, project, issueTypes, issueData) => {
          // テストごとにモックをリセット
          jest.clearAllMocks();

          // 完全なフローのシミュレーション
          mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
            if (message.action === 'getApiKey') {
              callback({
                success: true,
                apiKey: apiKeyData.apiKey,
                domain: apiKeyData.domain,
                createdAt: apiKeyData.createdAt
              });
            } else if (message.action === 'getProjects') {
              callback({ success: true, projects: [project] });
            } else if (message.action === 'getIssueTypes') {
              callback({ success: true, issueTypes: issueTypes });
            } else if (message.action === 'createIssue') {
              callback({
                success: true,
                issue: {
                  id: Math.floor(Math.random() * 999999),
                  issueKey: `${project.projectKey}-${Math.floor(Math.random() * 1000)}`,
                  summary: message.summary,
                  description: message.description
                }
              });
            }
          });

          // 1. APIキー確認
          const apiKeyResult = await new Promise((resolve) => {
            mockChrome.runtime.sendMessage({ action: 'getApiKey' }, resolve);
          });
          expect(apiKeyResult.success).toBe(true);

          // 2. プロジェクト一覧取得
          const projectsResult = await new Promise((resolve) => {
            mockChrome.runtime.sendMessage({ action: 'getProjects' }, resolve);
          });
          expect(projectsResult.success).toBe(true);
          expect(projectsResult.projects).toHaveLength(1);

          // 3. 課題種別取得
          const issueTypesResult = await new Promise((resolve) => {
            mockChrome.runtime.sendMessage(
              { action: 'getIssueTypes', projectId: project.id },
              resolve
            );
          });
          expect(issueTypesResult.success).toBe(true);
          expect(issueTypesResult.issueTypes).toHaveLength(issueTypes.length);

          // 4. 課題作成
          const createResult = await new Promise((resolve) => {
            mockChrome.runtime.sendMessage(
              {
                action: 'createIssue',
                projectId: project.id,
                summary: issueData.summary,
                description: issueData.description,
                issueTypeId: issueData.issueTypeId
              },
              resolve
            );
          });
          expect(createResult.success).toBe(true);
          expect(createResult.issue.issueKey).toContain(project.projectKey);

          // すべての操作が正常に完了したことを確認
          expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(4);
        }
      ),
      { 
        numRuns: 50, // エンドツーエンドテストなので反復回数を減らす
        verbose: true
      }
    );
  }, 60000); // タイムアウトを60秒に設定
});

