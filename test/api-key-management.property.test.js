/**
 * APIキー管理機能の継続性のプロパティベーステスト
 * Feature: remove-popup-use-sidepanel-only
 * Property 5: APIキー管理機能の継続性
 * **Validates: Requirements 4.4**
 */

const fc = require('fast-check');
const {
  handleSaveApiKey,
  handleGetApiKey,
  handleDeleteApiKey,
  performStorageCleanup
} = require('../background/service-worker-test-exports');

describe('Property 5: APIキー管理機能の継続性', () => {
  let mockChrome;

  beforeEach(() => {
    // Chrome API のモック
    mockChrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn().mockResolvedValue(undefined),
          remove: jest.fn().mockResolvedValue(undefined)
        }
      }
    };

    global.chrome = mockChrome;
    global.btoa = (str) => Buffer.from(str).toString('base64');
    global.atob = (str) => Buffer.from(str, 'base64').toString('utf-8');

    // コンソールログをモック
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * APIキーのジェネレーター
   * 実際のBacklog APIキーの形式に近いランダムな文字列を生成
   */
  const apiKeyArbitrary = fc.string({ minLength: 20, maxLength: 64 }).map(s => 
    s.replace(/[^a-zA-Z0-9_-]/g, 'a')
  );

  /**
   * Backlogドメインのジェネレーター
   */
  const domainArbitrary = fc.oneof(
    fc.constant('example.backlog.jp'),
    fc.constant('test.backlog.com'),
    fc.constant('mycompany.backlog.jp'),
    fc.string({ minLength: 3, maxLength: 20 }).map(s => 
      s.toLowerCase().replace(/[^a-z0-9-]/g, 'a') + '.backlog.jp'
    )
  );

  /**
   * APIキーデータのジェネレーター
   */
  const apiKeyDataArbitrary = fc.record({
    apiKey: apiKeyArbitrary,
    domain: domainArbitrary
  });

  /**
   * Property 5.1: APIキーの登録が正常に動作する
   * **Validates: Requirements 4.4**
   * 
   * For any APIキーとドメインにおいて、APIキーの登録が
   * Popup削除後も正常に動作するべきである
   */
  test('Property 5.1: 任意のAPIキーを登録できる', async () => {
    await fc.assert(
      fc.asyncProperty(apiKeyDataArbitrary, async (data) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // APIキーを登録
        const result = await handleSaveApiKey(data.apiKey, data.domain);

        // 登録が成功することを検証
        expect(result.success).toBe(true);
        expect(result.message).toBeDefined();

        // Chrome Storage APIが呼ばれることを検証
        expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(1);
        
        // 保存されたデータの構造を検証
        const savedData = mockChrome.storage.local.set.mock.calls[0][0];
        expect(savedData).toHaveProperty('apiKeyData');
        expect(savedData.apiKeyData).toHaveProperty('encryptedKey');
        expect(savedData.apiKeyData).toHaveProperty('domain');
        expect(savedData.apiKeyData).toHaveProperty('createdAt');
        expect(savedData.apiKeyData.domain).toBe(data.domain);
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 5.2: APIキーの取得が正常に動作する
   * **Validates: Requirements 4.4**
   * 
   * For any 保存されたAPIキーにおいて、APIキーの取得が
   * Popup削除後も正常に動作するべきである
   */
  test('Property 5.2: 任意の保存されたAPIキーを取得できる', async () => {
    await fc.assert(
      fc.asyncProperty(apiKeyDataArbitrary, async (data) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // 暗号化されたAPIキーデータを準備
        const encryptedKey = Buffer.from(data.apiKey + ':' + Date.now()).toString('base64');
        const apiKeyData = {
          encryptedKey: encryptedKey,
          domain: data.domain,
          createdAt: new Date().toISOString()
        };

        // Chrome Storage APIのモックを設定
        mockChrome.storage.local.get.mockResolvedValue({ apiKeyData });

        // APIキーを取得
        const result = await handleGetApiKey();

        // 取得が成功することを検証
        expect(result.success).toBe(true);
        expect(result.apiKey).toBe(data.apiKey);
        expect(result.domain).toBe(data.domain);
        expect(result.createdAt).toBeDefined();

        // Chrome Storage APIが呼ばれることを検証
        expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['apiKeyData']);
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 5.3: APIキーの更新が正常に動作する
   * **Validates: Requirements 4.4**
   * 
   * For any 既存のAPIキーと新しいAPIキーにおいて、APIキーの更新が
   * Popup削除後も正常に動作するべきである
   */
  test('Property 5.3: 任意のAPIキーを更新できる', async () => {
    await fc.assert(
      fc.asyncProperty(
        apiKeyDataArbitrary,
        apiKeyDataArbitrary,
        async (oldData, newData) => {
          // テストごとにモックをリセット
          jest.clearAllMocks();

          // 古いAPIキーを登録
          const saveOldResult = await handleSaveApiKey(oldData.apiKey, oldData.domain);
          expect(saveOldResult.success).toBe(true);

          // モックをリセット
          jest.clearAllMocks();

          // 新しいAPIキーで更新
          const saveNewResult = await handleSaveApiKey(newData.apiKey, newData.domain);
          expect(saveNewResult.success).toBe(true);

          // Chrome Storage APIが呼ばれることを検証
          expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(1);

          // 新しいデータが保存されることを検証
          const savedData = mockChrome.storage.local.set.mock.calls[0][0];
          expect(savedData.apiKeyData.domain).toBe(newData.domain);
        }
      ),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 5.4: APIキーの削除が正常に動作する
   * **Validates: Requirements 4.4**
   * 
   * For any 保存されたAPIキーにおいて、APIキーの削除が
   * Popup削除後も正常に動作するべきである
   */
  test('Property 5.4: 任意のAPIキーを削除できる', async () => {
    await fc.assert(
      fc.asyncProperty(apiKeyDataArbitrary, async (data) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // APIキーを登録
        const saveResult = await handleSaveApiKey(data.apiKey, data.domain);
        expect(saveResult.success).toBe(true);

        // モックをリセット
        jest.clearAllMocks();

        // 削除時に取得されるデータをモック
        mockChrome.storage.local.get.mockResolvedValue({
          apiKeyData: {
            encryptedKey: Buffer.from(data.apiKey + ':' + Date.now()).toString('base64'),
            domain: data.domain,
            createdAt: new Date().toISOString()
          }
        });

        // APIキーを削除
        const deleteResult = await handleDeleteApiKey();

        // 削除が成功することを検証
        expect(deleteResult.success).toBe(true);
        expect(deleteResult.message).toBeDefined();

        // Chrome Storage APIが呼ばれることを検証
        expect(mockChrome.storage.local.get).toHaveBeenCalled();
        expect(mockChrome.storage.local.remove).toHaveBeenCalled();
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 5.5: 登録・取得・削除のサイクルが正常に動作する
   * **Validates: Requirements 4.4**
   * 
   * For any APIキーデータにおいて、登録→取得→削除のサイクルが
   * Popup削除後も正常に動作するべきである
   */
  test('Property 5.5: 登録・取得・削除のサイクルが正常に動作する', async () => {
    await fc.assert(
      fc.asyncProperty(apiKeyDataArbitrary, async (data) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // 1. APIキーを登録
        const saveResult = await handleSaveApiKey(data.apiKey, data.domain);
        expect(saveResult.success).toBe(true);

        // 保存されたデータを取得
        const savedData = mockChrome.storage.local.set.mock.calls[0][0];

        // 2. APIキーを取得
        mockChrome.storage.local.get.mockResolvedValue(savedData);
        const getResult = await handleGetApiKey();
        expect(getResult.success).toBe(true);
        expect(getResult.apiKey).toBe(data.apiKey);
        expect(getResult.domain).toBe(data.domain);

        // 3. APIキーを削除
        const deleteResult = await handleDeleteApiKey();
        expect(deleteResult.success).toBe(true);

        // 4. 削除後に取得を試みる
        mockChrome.storage.local.get.mockResolvedValue({});
        const getAfterDeleteResult = await handleGetApiKey();
        expect(getAfterDeleteResult.success).toBe(false);
        expect(getAfterDeleteResult.message).toContain('登録されていません');
      }),
      { 
        numRuns: 50, // サイクルテストなので反復回数を減らす
        verbose: true
      }
    );
  }, 60000);

  /**
   * Property 5.6: 無効なAPIキーデータの処理が正常に動作する
   * **Validates: Requirements 4.4**
   * 
   * For any 無効なAPIキーデータにおいて、適切なエラーが返されるべきである
   */
  test('Property 5.6: 無効なAPIキーデータに対してエラーが返される', async () => {
    // 無効なAPIキーデータのジェネレーター
    const invalidApiKeyDataArbitrary = fc.oneof(
      fc.record({ apiKey: fc.constant(''), domain: domainArbitrary }),
      fc.record({ apiKey: apiKeyArbitrary, domain: fc.constant('') }),
      fc.record({ apiKey: fc.constant(null), domain: domainArbitrary }),
      fc.record({ apiKey: apiKeyArbitrary, domain: fc.constant(null) })
    );

    await fc.assert(
      fc.asyncProperty(invalidApiKeyDataArbitrary, async (data) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // 無効なAPIキーを登録しようとする
        const result = await handleSaveApiKey(data.apiKey, data.domain);

        // エラーが返されることを検証
        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();

        // Chrome Storage APIが呼ばれないことを検証
        expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 5.7: APIキーの暗号化と復号化が正常に動作する
   * **Validates: Requirements 4.4**
   * 
   * For any APIキーにおいて、暗号化と復号化により
   * 元のAPIキーが正しく復元されるべきである
   */
  test('Property 5.7: APIキーの暗号化と復号化が正常に動作する', async () => {
    await fc.assert(
      fc.asyncProperty(apiKeyDataArbitrary, async (data) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // APIキーを登録（暗号化）
        const saveResult = await handleSaveApiKey(data.apiKey, data.domain);
        expect(saveResult.success).toBe(true);

        // 保存されたデータを取得
        const savedData = mockChrome.storage.local.set.mock.calls[0][0];
        const encryptedKey = savedData.apiKeyData.encryptedKey;

        // 暗号化されていることを確認（元のAPIキーと異なる）
        expect(encryptedKey).not.toBe(data.apiKey);

        // 復号化して取得
        mockChrome.storage.local.get.mockResolvedValue(savedData);
        const getResult = await handleGetApiKey();

        // 復号化により元のAPIキーが復元されることを検証
        expect(getResult.success).toBe(true);
        expect(getResult.apiKey).toBe(data.apiKey);
        expect(getResult.domain).toBe(data.domain);
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 5.8: ストレージクリーンアップが正常に動作する
   * **Validates: Requirements 4.4**
   * 
   * For any ストレージ状態において、クリーンアップ処理が
   * 正常に動作し、不要なデータが削除されるべきである
   */
  test('Property 5.8: ストレージクリーンアップが正常に動作する', async () => {
    // ストレージデータのジェネレーター
    const storageDataArbitrary = fc.record({
      apiKeyData: fc.record({
        encryptedKey: fc.string({ minLength: 20, maxLength: 64 }),
        domain: domainArbitrary,
        createdAt: fc.date().map(d => d.toISOString())
      }),
      // 古いバージョンのデータ形式
      apiKey: fc.option(apiKeyArbitrary, { nil: undefined }),
      backlogDomain: fc.option(domainArbitrary, { nil: undefined }),
      // 期限切れのキャッシュデータ
      projectsCache: fc.option(
        fc.record({
          data: fc.array(fc.anything()),
          expiredAt: fc.date({ max: new Date(Date.now() - 1000) }).map(d => d.toISOString())
        }),
        { nil: undefined }
      ),
      // 古い一時データ
      temp_data: fc.option(
        fc.record({
          value: fc.anything(),
          createdAt: fc.date({ max: new Date(Date.now() - 25 * 60 * 60 * 1000) }).map(d => d.toISOString())
        }),
        { nil: undefined }
      )
    });

    await fc.assert(
      fc.asyncProperty(storageDataArbitrary, async (storageData) => {
        // テストごとにモックをリセット
        jest.clearAllMocks();

        // ストレージデータをモック
        mockChrome.storage.local.get.mockResolvedValue(storageData);

        // クリーンアップを実行
        await performStorageCleanup();

        // 不要なデータが削除されることを検証
        if (storageData.apiKey || storageData.backlogDomain || 
            storageData.projectsCache || storageData.temp_data) {
          expect(mockChrome.storage.local.remove).toHaveBeenCalled();
          
          // 削除されたキーを確認
          const removedKeys = mockChrome.storage.local.remove.mock.calls[0][0];
          expect(Array.isArray(removedKeys)).toBe(true);
          
          // 古いバージョンのキーが削除されることを確認
          if (storageData.apiKey) {
            expect(removedKeys).toContain('apiKey');
          }
          if (storageData.backlogDomain) {
            expect(removedKeys).toContain('backlogDomain');
          }
        }
      }),
      { 
        numRuns: 50,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 5.9: 複数のAPIキー操作が並行して正常に動作する
   * **Validates: Requirements 4.4**
   * 
   * For any 複数のAPIキー操作において、並行処理が
   * 正常に動作するべきである
   */
  test('Property 5.9: 複数のAPIキー操作が並行して正常に動作する', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(apiKeyDataArbitrary, { minLength: 2, maxLength: 5 }),
        async (dataArray) => {
          // テストごとにモックをリセット
          jest.clearAllMocks();

          // 最後のデータのみが保存されることを期待
          const lastData = dataArray[dataArray.length - 1];

          // 複数のAPIキーを並行して登録
          const savePromises = dataArray.map(data => 
            handleSaveApiKey(data.apiKey, data.domain)
          );

          const results = await Promise.all(savePromises);

          // すべての操作が成功することを検証
          results.forEach(result => {
            expect(result.success).toBe(true);
          });

          // Chrome Storage APIが呼ばれることを検証
          expect(mockChrome.storage.local.set).toHaveBeenCalled();

          // 最後に保存されたデータを検証
          const lastSavedData = mockChrome.storage.local.set.mock.calls[
            mockChrome.storage.local.set.mock.calls.length - 1
          ][0];
          expect(lastSavedData.apiKeyData.domain).toBe(lastData.domain);
        }
      ),
      { 
        numRuns: 30,
        verbose: true
      }
    );
  }, 30000);

  /**
   * Property 5.10: APIキーが存在しない場合の取得処理が正常に動作する
   * **Validates: Requirements 4.4**
   * 
   * APIキーが登録されていない状態で取得を試みた場合、
   * 適切なエラーメッセージが返されるべきである
   */
  test('Property 5.10: APIキーが存在しない場合に適切なエラーが返される', async () => {
    // テストごとにモックをリセット
    jest.clearAllMocks();

    // 空のストレージをモック
    mockChrome.storage.local.get.mockResolvedValue({});

    // APIキーを取得しようとする
    const result = await handleGetApiKey();

    // エラーが返されることを検証
    expect(result.success).toBe(false);
    expect(result.message).toContain('登録されていません');

    // Chrome Storage APIが呼ばれることを検証
    expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['apiKeyData']);
  }, 5000);
});
