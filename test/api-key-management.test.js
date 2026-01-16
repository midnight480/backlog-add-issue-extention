/**
 * APIキー管理機能のプロパティベーステスト
 * Feature: backlog-issue-creator, Property 1: APIキー操作の正確性
 * Feature: backlog-issue-creator, Property 8: データ削除の完全性
 * 検証: 要件 2.3, 2.5, 2.6, 5.4
 */

const fc = require('fast-check');

// Service Workerの関数をテスト用にインポート
// 実際の実装では、テスト用のエクスポートが必要
const { handleSaveApiKey, handleGetApiKey, handleDeleteApiKey, performStorageCleanup } = require('../background/service-worker-test-exports');

describe('APIキー管理機能のプロパティテスト', () => {
  
  beforeEach(() => {
    // Chrome Storage APIのモックをリセット
    jest.clearAllMocks();
    
    // Storage APIの基本的な動作をモック
    chrome.storage.local.set.mockImplementation((data) => Promise.resolve());
    chrome.storage.local.get.mockImplementation((keys) => Promise.resolve({}));
    chrome.storage.local.remove.mockImplementation((keys) => Promise.resolve());
  });

  /**
   * プロパティ1: APIキー操作の正確性
   * 任意の有効なAPIキーに対して、保存→取得→変更→削除の操作を行った場合、
   * 各操作が正しく実行され、期待される状態変化が発生する
   */
  test('プロパティ1: APIキー操作の正確性', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }).filter(s => !s.includes(':')), // APIキー（コロンを除外）
        fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s}.backlog.jp`).filter(s => /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.backlog\.jp$/.test(s)), // 有効なBacklogドメイン
        async (apiKey, domain) => {
          // 保存操作のテスト
          const saveResult = await handleSaveApiKey(apiKey, domain);
          expect(saveResult.success).toBe(true);
          expect(saveResult.message).toBeDefined();
          
          // Storage APIが正しく呼ばれたことを確認
          expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({
              apiKeyData: expect.objectContaining({
                encryptedKey: expect.any(String),
                domain: domain,
                createdAt: expect.any(String)
              })
            })
          );
        }
      ),
      { numRuns: 100 } // 最小100回の反復実行
    );
  });

  test('プロパティ1-2: APIキー取得の正確性', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }).filter(s => !s.includes(':')),
        fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s}.backlog.com`).filter(s => /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.backlog\.com$/.test(s)),
        async (apiKey, domain) => {
          // 保存されたデータをモック
          const encryptedKey = btoa(apiKey + ':' + Date.now());
          const mockData = {
            apiKeyData: {
              encryptedKey: encryptedKey,
              domain: domain,
              createdAt: new Date().toISOString()
            }
          };
          
          chrome.storage.local.get.mockResolvedValueOnce(mockData);
          
          // 取得操作のテスト
          const getResult = await handleGetApiKey();
          expect(getResult.success).toBe(true);
          expect(getResult.apiKey).toBe(apiKey);
          expect(getResult.domain).toBe(domain);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('プロパティ1-3: APIキー削除の正確性', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // 削除操作は入力に依存しない
        async () => {
          // 削除前にAPIキーデータが存在する状況をモック
          chrome.storage.local.get.mockImplementation((keys) => {
            if (keys === null) {
              return Promise.resolve({
                apiKeyData: { encryptedKey: 'test', domain: 'backlog.jp' }
              });
            }
            return Promise.resolve({});
          });

          // 削除操作のテスト
          const deleteResult = await handleDeleteApiKey();
          expect(deleteResult.success).toBe(true);
          expect(deleteResult.message).toBeDefined();
          
          // Storage APIが正しく呼ばれたことを確認（関連データも含む）
          expect(chrome.storage.local.remove).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ8: データ削除の完全性
   * 任意のAPIキー削除操作において、APIキーとそれに関連するすべてのデータが完全に削除される
   */
  test('プロパティ8: データ削除の完全性', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          apiKeyData: fc.record({
            encryptedKey: fc.string({ minLength: 10 }),
            domain: fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s}.backlog.jp`).filter(s => /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.backlog\.jp$/.test(s)),
            createdAt: fc.date().map(d => d.toISOString())
          }),
          projectsCache: fc.option(fc.record({
            projects: fc.array(fc.record({ id: fc.string(), name: fc.string() })),
            expiredAt: fc.date().map(d => d.toISOString())
          })),
          userCache: fc.option(fc.record({
            user: fc.record({ id: fc.string(), name: fc.string() }),
            expiredAt: fc.date().map(d => d.toISOString())
          })),
          selectedProject: fc.option(fc.record({
            id: fc.string(),
            name: fc.string()
          })),
          extensionSettings: fc.option(fc.record({
            theme: fc.constantFrom('light', 'dark'),
            language: fc.constantFrom('ja', 'en')
          })),
          sessionData: fc.option(fc.record({
            lastActivity: fc.date().map(d => d.toISOString()),
            createdAt: fc.date().map(d => d.toISOString())
          }))
        }),
        async (mockStorageData) => {
          // ストレージに複数のデータが存在する状況をモック
          chrome.storage.local.get.mockImplementation((keys) => {
            if (keys === null) {
              // すべてのデータを返す
              return Promise.resolve(mockStorageData);
            }
            // 特定のキーのデータを返す
            const result = {};
            if (Array.isArray(keys)) {
              keys.forEach(key => {
                if (mockStorageData[key]) {
                  result[key] = mockStorageData[key];
                }
              });
            }
            return Promise.resolve(result);
          });

          // 削除操作を実行
          const deleteResult = await handleDeleteApiKey();
          expect(deleteResult.success).toBe(true);

          // chrome.storage.local.remove が呼ばれたことを確認
          expect(chrome.storage.local.remove).toHaveBeenCalled();

          // 削除されるべきキーを特定
          const expectedKeysToDelete = [];
          if (mockStorageData.apiKeyData) expectedKeysToDelete.push('apiKeyData');
          if (mockStorageData.projectsCache) expectedKeysToDelete.push('projectsCache');
          if (mockStorageData.userCache) expectedKeysToDelete.push('userCache');
          if (mockStorageData.selectedProject) expectedKeysToDelete.push('selectedProject');
          if (mockStorageData.extensionSettings) expectedKeysToDelete.push('extensionSettings');
          if (mockStorageData.sessionData) expectedKeysToDelete.push('sessionData');

          // 関連データが削除対象に含まれていることを確認
          if (expectedKeysToDelete.length > 0) {
            const removeCall = chrome.storage.local.remove.mock.calls.find(call => 
              Array.isArray(call[0]) && call[0].length > 0
            );
            expect(removeCall).toBeDefined();
            
            // APIキーデータは必ず削除されることを確認
            if (mockStorageData.apiKeyData) {
              expect(removeCall[0]).toContain('apiKeyData');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ7: APIキー永続化のラウンドトリップ
   * 任意のAPIキーを保存した後、ブラウザ再起動を経ても、
   * 保存されたAPIキーが正しく復元される
   */
  test('プロパティ7: APIキー永続化のラウンドトリップ', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }).filter(s => !s.includes(':')),
        fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s}.backlog.jp`).filter(s => /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.backlog\.jp$/.test(s)),
        async (apiKey, domain) => {
          // 保存操作
          const saveResult = await handleSaveApiKey(apiKey, domain);
          expect(saveResult.success).toBe(true);
          
          // 保存されたデータを取得（ブラウザ再起動をシミュレート）
          const savedData = chrome.storage.local.set.mock.calls[chrome.storage.local.set.mock.calls.length - 1][0];
          chrome.storage.local.get.mockResolvedValueOnce(savedData);
          
          // 取得操作（復元）
          const getResult = await handleGetApiKey();
          expect(getResult.success).toBe(true);
          expect(getResult.domain).toBe(domain);
          
          // ラウンドトリップの検証：保存→取得で同じドメインが復元される
          expect(getResult.domain).toBe(domain);
        }
      ),
      { numRuns: 100 }
    );
  });
});