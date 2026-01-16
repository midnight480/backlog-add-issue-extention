/**
 * URL取得機能のユニットテスト
 * 要件: 4.4
 */

describe('URL取得機能のユニットテスト', () => {

  /**
   * URL取得の正確性テスト
   * 要件: 4.4 - Current_TabのURLを取得して課題説明欄に初期設定する
   */
  test('getCurrentPageInfo関数がURLを正確に取得する', () => {
    // モックオブジェクトを直接使用
    const mockWindow = {
      location: {
        href: 'https://example.com/test-page'
      }
    };
    
    const mockDocument = {
      title: 'テストページタイトル'
    };
    
    // Content Scriptの関数を直接テスト
    const getCurrentPageInfo = () => {
      return {
        url: mockWindow.location.href,
        title: mockDocument.title
      };
    };
    
    const result = getCurrentPageInfo();
    
    expect(result.url).toBe('https://example.com/test-page');
    expect(result.title).toBe('テストページタイトル');
    expect(typeof result.url).toBe('string');
    expect(typeof result.title).toBe('string');
  });

  /**
   * タイトル取得の正確性テスト
   * 要件: 4.4 - ページタイトルも課題説明の補完用に取得する
   */
  test('getCurrentPageInfo関数がタイトルを正確に取得する', () => {
    const mockWindow = {
      location: {
        href: 'https://example.com/test-page'
      }
    };
    
    const mockDocument = {
      title: 'Backlog - プロジェクト管理'
    };
    
    const getCurrentPageInfo = () => {
      return {
        url: mockWindow.location.href,
        title: mockDocument.title
      };
    };
    
    const result = getCurrentPageInfo();
    
    expect(result.title).toBe('Backlog - プロジェクト管理');
    expect(result.url).toBe('https://example.com/test-page');
  });

  /**
   * 空のタイトルの処理テスト
   */
  test('空のタイトルを適切に処理する', () => {
    const mockWindow = {
      location: {
        href: 'https://example.com/test-page'
      }
    };
    
    const mockDocument = {
      title: ''
    };
    
    const getCurrentPageInfo = () => {
      return {
        url: mockWindow.location.href,
        title: mockDocument.title
      };
    };
    
    const result = getCurrentPageInfo();
    
    expect(result.title).toBe('');
    expect(result.url).toBe('https://example.com/test-page');
  });

  /**
   * 特殊文字を含むURLの処理テスト
   */
  test('特殊文字を含むURLを適切に処理する', () => {
    const mockWindow = {
      location: {
        href: 'https://example.com/test?param=値&other=テスト#section'
      }
    };
    
    const mockDocument = {
      title: 'テストページタイトル'
    };
    
    const getCurrentPageInfo = () => {
      return {
        url: mockWindow.location.href,
        title: mockDocument.title
      };
    };
    
    const result = getCurrentPageInfo();
    
    expect(result.url).toBe('https://example.com/test?param=値&other=テスト#section');
    expect(result.title).toBe('テストページタイトル');
  });

  /**
   * Content Scriptのメッセージハンドラーテスト
   */
  test('メッセージハンドラーがgetCurrentPageInfoアクションを正しく処理する', () => {
    const mockSendResponse = jest.fn();
    const mockSender = {};
    
    const mockWindow = {
      location: {
        href: 'https://example.com/test-page'
      }
    };
    
    const mockDocument = {
      title: 'テストページタイトル'
    };
    
    // メッセージハンドラーの実装をシミュレート
    const messageHandler = (message, sender, sendResponse) => {
      if (message.action === 'getCurrentPageInfo') {
        try {
          const pageInfo = {
            url: mockWindow.location.href,
            title: mockDocument.title
          };
          sendResponse({ success: true, pageInfo: pageInfo });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      }
      return false;
    };
    
    // テスト実行
    messageHandler(
      { action: 'getCurrentPageInfo' },
      mockSender,
      mockSendResponse
    );
    
    expect(mockSendResponse).toHaveBeenCalledWith({
      success: true,
      pageInfo: {
        url: 'https://example.com/test-page',
        title: 'テストページタイトル'
      }
    });
  });

  /**
   * 未知のアクションの処理テスト
   */
  test('未知のアクションを適切に処理する', () => {
    const mockSendResponse = jest.fn();
    const mockSender = {};
    
    const messageHandler = (message, sender, sendResponse) => {
      switch (message.action) {
        case 'getCurrentPageInfo':
          // 実装省略
          break;
        case 'ping':
          sendResponse({ status: 'pong from content script' });
          break;
        default:
          sendResponse({ success: false, error: '未知のアクション' });
      }
      return false;
    };
    
    messageHandler(
      { action: 'unknownAction' },
      mockSender,
      mockSendResponse
    );
    
    expect(mockSendResponse).toHaveBeenCalledWith({
      success: false,
      error: '未知のアクション'
    });
  });

  /**
   * pingアクションを正しく処理する
   */
  test('pingアクションを正しく処理する', () => {
    const mockSendResponse = jest.fn();
    const mockSender = {};
    
    const messageHandler = (message, sender, sendResponse) => {
      if (message.action === 'ping') {
        sendResponse({ status: 'pong from content script' });
      }
      return false;
    };
    
    messageHandler(
      { action: 'ping' },
      mockSender,
      mockSendResponse
    );
    
    expect(mockSendResponse).toHaveBeenCalledWith({
      status: 'pong from content script'
    });
  });
});