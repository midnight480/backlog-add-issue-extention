// Content Script
// 現在のタブのURL取得機能

/**
 * Content Script - URL取得機能
 * 現在のタブのURLとタイトルを取得し、Background Service Workerと通信する
 */

console.log('Backlog Issue Creator Content Script loaded');

/**
 * 現在のページの情報を取得する
 * @returns {Object} ページ情報 {url: string, title: string}
 */
function getCurrentPageInfo() {
  return {
    url: window.location.href,
    title: document.title
  };
}

/**
 * Background Service Workerからのメッセージを処理する
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content Script: メッセージを受信:', message);
  
  switch (message.action) {
    case 'getCurrentPageInfo':
      try {
        const pageInfo = getCurrentPageInfo();
        console.log('Content Script: ページ情報を取得:', pageInfo);
        sendResponse({ success: true, pageInfo: pageInfo });
      } catch (error) {
        console.error('Content Script: ページ情報取得エラー:', error);
        sendResponse({ success: false, error: error.message });
      }
      break;
      
    case 'ping':
      sendResponse({ status: 'pong from content script' });
      break;
      
    default:
      console.log('Content Script: 未知のアクション:', message.action);
      sendResponse({ success: false, error: '未知のアクション' });
  }
  
  // 同期レスポンスのためfalseを返す
  return false;
});

/**
 * ページ読み込み完了時の処理
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('Content Script: DOMContentLoaded');
});

/**
 * ページが完全に読み込まれた時の処理
 */
window.addEventListener('load', () => {
  console.log('Content Script: Page loaded');
});

// Content Scriptが正常に読み込まれたことをBackground Service Workerに通知
chrome.runtime.sendMessage({ 
  action: 'contentScriptLoaded', 
  url: window.location.href,
  title: document.title 
}).catch(error => {
  // Service Workerが利用できない場合のエラーハンドリング
  console.log('Content Script: Service Workerとの通信に失敗（正常な場合があります）:', error.message);
});