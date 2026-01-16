/**
 * Service Worker のモック
 * テスト用にService Workerの機能をモック化
 */

/**
 * APIキーを暗号化して保存する
 * @param {string} apiKey - 保存するAPIキー
 * @param {string} domain - Backlogのドメイン
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function handleSaveApiKey(apiKey, domain) {
  if (!apiKey || !domain) {
    return { success: false, message: 'APIキーとドメインは必須です' };
  }
  
  const encryptedKey = btoa(apiKey + ':' + Date.now());
  
  const apiKeyData = {
    encryptedKey: encryptedKey,
    domain: domain,
    createdAt: new Date().toISOString()
  };
  
  // モック用のストレージ
  global.mockStorage = global.mockStorage || {};
  global.mockStorage.apiKeyData = apiKeyData;
  
  return { success: true, message: 'APIキーが保存されました' };
}

/**
 * 保存されたAPIキーを復号化して取得する
 * @returns {Promise<{success: boolean, apiKey?: string, domain?: string, message?: string}>}
 */
async function handleGetApiKey() {
  const apiKeyData = global.mockStorage?.apiKeyData;
  
  if (!apiKeyData) {
    return { success: false, message: 'APIキーが登録されていません' };
  }
  
  const { encryptedKey, domain, createdAt } = apiKeyData;
  
  // 復号化
  const decryptedData = atob(encryptedKey);
  const apiKey = decryptedData.split(':')[0];
  
  return { 
    success: true, 
    apiKey: apiKey, 
    domain: domain,
    createdAt: createdAt
  };
}

/**
 * 保存されたAPIキーを削除する
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function handleDeleteApiKey() {
  if (global.mockStorage) {
    delete global.mockStorage.apiKeyData;
  }
  
  return { success: true, message: 'APIキーが削除されました' };
}

/**
 * Backlog APIのベースURLを構築する
 * @param {string} domain - Backlogのドメイン
 * @returns {string} ベースURL
 */
function buildBacklogApiUrl(domain) {
  return `https://${domain}/api/v2`;
}

/**
 * プロジェクト一覧を取得する
 * @returns {Promise<{success: boolean, projects?: Array, message?: string}>}
 */
async function handleGetProjects() {
  const apiKeyResult = await handleGetApiKey();
  if (!apiKeyResult.success) {
    return { success: false, message: 'APIキーが設定されていません' };
  }
  
  // モック用のプロジェクトデータ
  const projects = [
    { id: '1', name: 'Test Project 1', projectKey: 'TEST1' },
    { id: '2', name: 'Test Project 2', projectKey: 'TEST2' },
    { id: '3', name: 'Sample Project', projectKey: 'SAMPLE' }
  ];
  
  return { success: true, projects: projects };
}

/**
 * 課題を作成する
 * @param {string} projectId - プロジェクトID
 * @param {string} summary - 課題の件名
 * @param {string} description - 課題の説明
 * @returns {Promise<{success: boolean, issue?: Object, message?: string}>}
 */
async function handleCreateIssue(projectId, summary, description) {
  try {
    // 入力データの検証
    if (!projectId || !summary) {
      return { success: false, message: '必須フィールドが入力されていません' };
    }

    if (summary.length > 255) {
      return { success: false, message: '件名は255文字以内で入力してください' };
    }

    // APIキーを取得
    const apiKeyResult = await handleGetApiKey();
    if (!apiKeyResult.success) {
      return { success: false, message: 'APIキーが設定されていません' };
    }
    
    const { apiKey, domain } = apiKeyResult;
    const baseUrl = buildBacklogApiUrl(domain);
    
    // 現在のユーザ情報を取得（担当者設定用）
    const userResult = await handleGetCurrentUser();
    let assigneeId = null;
    if (userResult.success) {
      assigneeId = userResult.user.id;
    }
    
    // 課題作成のパラメータ
    const params = new URLSearchParams({
      apiKey: apiKey,
      projectId: projectId,
      summary: summary,
      description: description || '',
      issueTypeId: '1', // デフォルトの課題タイプ
      priorityId: '3'   // 中優先度
    });
    
    // 担当者を設定（APIキー登録ユーザ）
    if (assigneeId) {
      params.append('assigneeId', assigneeId);
    }
    
    // 期限日を今日に設定
    const today = new Date().toISOString().split('T')[0];
    params.append('dueDate', today);
    
    const response = await fetch(`${baseUrl}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });
    
    if (!response.ok) {
      // HTTPステータスコードに応じた詳細なエラーメッセージ
      let errorMessage = '課題の作成に失敗しました';
      
      if (response.status === 401) {
        errorMessage = 'APIキーが無効です。設定を確認してください';
      } else if (response.status === 403) {
        errorMessage = 'このプロジェクトに課題を作成する権限がありません';
      } else if (response.status === 404) {
        errorMessage = '指定されたプロジェクトが見つかりません';
      } else if (response.status === 400) {
        // レスポンスボディからエラー詳細を取得
        try {
          const errorData = await response.json();
          if (errorData.errors && errorData.errors.length > 0) {
            errorMessage = errorData.errors[0].message || errorMessage;
          }
        } catch (e) {
          // JSONパースエラーの場合はデフォルトメッセージを使用
        }
      } else if (response.status >= 500) {
        errorMessage = 'Backlogサーバーでエラーが発生しました。しばらく時間をおいて再試行してください';
      }
      
      throw new Error(errorMessage);
    }
    
    const issue = await response.json();
    
    return { success: true, issue: issue };
    
  } catch (error) {
    // ネットワークエラーの場合
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { success: false, message: 'ネットワークエラーが発生しました。インターネット接続を確認してください' };
    }
    
    return { success: false, message: error.message };
  }
}

/**
 * 現在のユーザ情報を取得する
 * @returns {Promise<{success: boolean, user?: Object, message?: string}>}
 */
async function handleGetCurrentUser() {
  const apiKeyResult = await handleGetApiKey();
  if (!apiKeyResult.success) {
    return { success: false, message: 'APIキーが設定されていません' };
  }
  
  // モック用のユーザデータ
  const user = {
    id: 12345,
    name: 'Test User',
    mailAddress: 'test@example.com'
  };
  
  return { success: true, user: user };
}

module.exports = {
  handleSaveApiKey,
  handleGetApiKey,
  handleDeleteApiKey,
  buildBacklogApiUrl,
  handleGetProjects,
  handleCreateIssue,
  handleGetCurrentUser
};