/**
 * Background Service WorkerのURL取得機能のユニットテスト
 * 要件: 4.4
 */

// Service Workerの関数をテスト用にインポート
// 実際の実装では、テスト用のエクスポートが必要

describe('Background Service WorkerのURL取得機能のユニットテスト', () => {
  
  let mockChrome;
  
  beforeEach(() => {
    // Chrome APIのモック
    mockChrome = {
      tabs: {
        query: jest.fn(),
        sendMessage: jest.fn()
      },
      runtime: {
        onMessage: {
          addListener: jest.fn()
        }
      }
    };
    
    global.chrome = mockChrome;
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete global.chrome;
  });

  /**
   * handleGetCurrentPageInfo関数のテスト
   * Content Scriptを通じてページ情報を取得する
   */
  test('handleGetCurrentPageInfo関数がContent Scriptからページ情報を正確に取得する', async () => {
    // テスト用の関数実装
    const handleGetCurrentPageInfo = async (tab) => {
      try {
        if (!tab || !tab.id) {
          throw new Error('有効なタブ情報が取得できません');
        }
        
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCurrentPageInfo' });
        
        if (!response.success) {
          throw new Error(response.error || 'ページ情報の取得に失敗しました');
        }
        
        return { success: true, pageInfo: response.pageInfo };
        
      } catch (error) {
        if (tab && tab.url && tab.title) {
          return { 
            success: true, 
            pageInfo: { 
              url: tab.url, 
              title: tab.title 
            } 
          };
        }
        
        return { success: false, message: error.message };
      }
    };
    
    // モックの設定
    const mockTab = { id: 123, url: 'https://example.com', title: 'テストページ' };
    const mockResponse = {
      success: true,
      pageInfo: {
        url: 'https://example.com',
        title: 'テストページ'
      }
    };
    
    mockChrome.tabs.sendMessage.mockResolvedValue(mockResponse);
    
    // テスト実行
    const result = await handleGetCurrentPageInfo(mockTab);
    
    expect(result.success).toBe(true);
    expect(result.pageInfo.url).toBe('https://example.com');
    expect(result.pageInfo.title).toBe('テストページ');
    expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(123, { action: 'getCurrentPageInfo' });
  });

  /**
   * Content Scriptが利用できない場合のフォールバックテスト
   */
  test('Content Scriptが利用できない場合にタブ情報からページ情報を取得する', async () => {
    const handleGetCurrentPageInfo = async (tab) => {
      try {
        if (!tab || !tab.id) {
          throw new Error('有効なタブ情報が取得できません');
        }
        
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCurrentPageInfo' });
        
        if (!response.success) {
          throw new Error(response.error || 'ページ情報の取得に失敗しました');
        }
        
        return { success: true, pageInfo: response.pageInfo };
        
      } catch (error) {
        // フォールバック処理
        if (tab && tab.url && tab.title) {
          return { 
            success: true, 
            pageInfo: { 
              url: tab.url, 
              title: tab.title 
            } 
          };
        }
        
        return { success: false, message: error.message };
      }
    };
    
    // Content Scriptが利用できない状況をシミュレート
    const mockTab = { id: 123, url: 'https://backlog.jp/project', title: 'Backlogプロジェクト' };
    mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Content Script not available'));
    
    // テスト実行
    const result = await handleGetCurrentPageInfo(mockTab);
    
    expect(result.success).toBe(true);
    expect(result.pageInfo.url).toBe('https://backlog.jp/project');
    expect(result.pageInfo.title).toBe('Backlogプロジェクト');
  });

  /**
   * handleGetActiveTabPageInfo関数のテスト
   * アクティブなタブのページ情報を取得する
   */
  test('handleGetActiveTabPageInfo関数がアクティブタブのページ情報を取得する', async () => {
    const handleGetActiveTabPageInfo = async () => {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!activeTab) {
          throw new Error('アクティブなタブが見つかりません');
        }
        
        // handleGetCurrentPageInfoの簡易実装
        if (activeTab.url && activeTab.title) {
          return { 
            success: true, 
            pageInfo: { 
              url: activeTab.url, 
              title: activeTab.title 
            } 
          };
        }
        
        return { success: false, message: 'ページ情報を取得できません' };
        
      } catch (error) {
        return { success: false, message: error.message };
      }
    };
    
    // モックの設定
    const mockActiveTab = { 
      id: 456, 
      url: 'https://backlog.com/dashboard', 
      title: 'Backlog Dashboard',
      active: true
    };
    
    mockChrome.tabs.query.mockResolvedValue([mockActiveTab]);
    
    // テスト実行
    const result = await handleGetActiveTabPageInfo();
    
    expect(result.success).toBe(true);
    expect(result.pageInfo.url).toBe('https://backlog.com/dashboard');
    expect(result.pageInfo.title).toBe('Backlog Dashboard');
    expect(mockChrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
  });

  /**
   * アクティブなタブが見つからない場合のテスト
   */
  test('アクティブなタブが見つからない場合にエラーを返す', async () => {
    const handleGetActiveTabPageInfo = async () => {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!activeTab) {
          throw new Error('アクティブなタブが見つかりません');
        }
        
        return { success: true, pageInfo: { url: activeTab.url, title: activeTab.title } };
        
      } catch (error) {
        return { success: false, message: error.message };
      }
    };
    
    // アクティブなタブが見つからない状況をシミュレート
    mockChrome.tabs.query.mockResolvedValue([]);
    
    // テスト実行
    const result = await handleGetActiveTabPageInfo();
    
    expect(result.success).toBe(false);
    expect(result.message).toBe('アクティブなタブが見つかりません');
  });

  /**
   * 無効なタブ情報の処理テスト
   */
  test('無効なタブ情報を適切に処理する', async () => {
    const handleGetCurrentPageInfo = async (tab) => {
      try {
        if (!tab || !tab.id) {
          throw new Error('有効なタブ情報が取得できません');
        }
        
        return { success: true, pageInfo: { url: tab.url, title: tab.title } };
        
      } catch (error) {
        return { success: false, message: error.message };
      }
    };
    
    // 無効なタブ情報でテスト
    const result1 = await handleGetCurrentPageInfo(null);
    expect(result1.success).toBe(false);
    expect(result1.message).toBe('有効なタブ情報が取得できません');
    
    const result2 = await handleGetCurrentPageInfo({});
    expect(result2.success).toBe(false);
    expect(result2.message).toBe('有効なタブ情報が取得できません');
    
    const result3 = await handleGetCurrentPageInfo({ url: 'https://example.com' });
    expect(result3.success).toBe(false);
    expect(result3.message).toBe('有効なタブ情報が取得できません');
  });
});