/**
 * Service Worker関数のテスト用エクスポート
 * テスト環境でのみ使用
 */

/**
 * サイドパネルの開閉状態を取得
 * @returns {Promise<boolean>} サイドパネルが開いているかどうか
 */
async function getSidePanelState() {
  try {
    const result = await chrome.storage.local.get(['sidePanelIsOpen']);
    return result.sidePanelIsOpen === true;
  } catch (error) {
    console.error('サイドパネル状態の取得に失敗:', error);
    return false;
  }
}

/**
 * サイドパネルを閉じる
 * @param {number} windowId - ウィンドウID
 * @returns {Promise<void>}
 */
async function closeSidePanel(windowId) {
  try {
    console.log('サイドパネルにクローズメッセージを送信します');
    
    await chrome.runtime.sendMessage({ 
      action: 'closeSidePanel',
      windowId: windowId
    });
    
    await chrome.storage.local.set({ 
      sidePanelIsOpen: false,
      sidePanelClosedAt: Date.now()
    });
    
    console.log('サイドパネルのクローズ処理を完了しました');
  } catch (error) {
    console.error('サイドパネルのクローズに失敗:', error);
    try {
      await chrome.storage.local.set({ 
        sidePanelIsOpen: false,
        sidePanelClosedAt: Date.now()
      });
    } catch (storageError) {
      console.error('ストレージの更新にも失敗:', storageError);
    }
  }
}

/**
 * APIキーを暗号化して保存する
 * @param {string} apiKey - 保存するAPIキー
 * @param {string} domain - Backlogのドメイン
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function handleSaveApiKey(apiKey, domain) {
  try {
    if (!apiKey || !domain) {
      throw new Error('APIキーとドメインは必須です');
    }
    
    // 簡易的な暗号化
    const encryptedKey = btoa(apiKey + ':' + Date.now());
    
    const apiKeyData = {
      encryptedKey: encryptedKey,
      domain: domain,
      createdAt: new Date().toISOString()
    };
    
    await chrome.storage.local.set({ apiKeyData });
    
    return { success: true, message: 'APIキーが保存されました' };
    
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * 保存されたAPIキーを復号化して取得する
 * @returns {Promise<{success: boolean, apiKey?: string, domain?: string, message?: string}>}
 */
async function handleGetApiKey() {
  try {
    const result = await chrome.storage.local.get(['apiKeyData']);
    
    if (!result.apiKeyData) {
      return { success: false, message: 'APIキーが登録されていません' };
    }
    
    const { encryptedKey, domain, createdAt } = result.apiKeyData;
    
    // 復号化
    const decryptedData = atob(encryptedKey);
    const apiKey = decryptedData.split(':')[0];
    
    return { 
      success: true, 
      apiKey: apiKey, 
      domain: domain,
      createdAt: createdAt
    };
    
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * 保存されたAPIキーと関連データを完全に削除する
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function handleDeleteApiKey() {
  try {
    // 現在保存されているすべてのキーを取得
    const allData = await chrome.storage.local.get(null);
    const keysToDelete = [];
    
    // APIキー関連のデータを特定
    if (allData.apiKeyData) {
      keysToDelete.push('apiKeyData');
    }
    
    // プロジェクト関連のキャッシュデータを特定
    if (allData.projectsCache) {
      keysToDelete.push('projectsCache');
    }
    
    // ユーザ情報のキャッシュデータを特定
    if (allData.userCache) {
      keysToDelete.push('userCache');
    }
    
    // 選択されたプロジェクト情報を特定
    if (allData.selectedProject) {
      keysToDelete.push('selectedProject');
    }
    
    // 設定関連のデータを特定
    if (allData.extensionSettings) {
      keysToDelete.push('extensionSettings');
    }
    
    // 一時的なセッションデータを特定
    if (allData.sessionData) {
      keysToDelete.push('sessionData');
    }
    
    // 特定されたキーを削除
    if (keysToDelete.length > 0) {
      await chrome.storage.local.remove(keysToDelete);
      console.log('削除されたデータキー:', keysToDelete);
    }
    
    // ストレージクリーンアップ - 残存する不要なデータをチェック
    await performStorageCleanup();
    
    return { success: true, message: 'APIキーと関連データが削除されました' };
    
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * ストレージクリーンアップ機能
 * 不要なデータや古いデータを削除する
 * @returns {Promise<void>}
 */
async function performStorageCleanup() {
  try {
    // 現在保存されているすべてのデータを取得
    const allData = await chrome.storage.local.get(null);
    const keysToCleanup = [];
    
    // 古いバージョンのデータ形式をチェック
    Object.keys(allData).forEach(key => {
      // 古いAPIキー形式（v1.0以前）
      if (key === 'apiKey' || key === 'backlogDomain') {
        keysToCleanup.push(key);
      }
      
      // 期限切れのキャッシュデータをチェック
      if (key.endsWith('Cache') && allData[key] && allData[key].expiredAt) {
        const expiredAt = new Date(allData[key].expiredAt);
        if (expiredAt < new Date()) {
          keysToCleanup.push(key);
        }
      }
      
      // 一時的なデータで24時間以上経過したものをチェック
      if (key.startsWith('temp_') && allData[key] && allData[key].createdAt) {
        const createdAt = new Date(allData[key].createdAt);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (createdAt < oneDayAgo) {
          keysToCleanup.push(key);
        }
      }
    });
    
    // 不要なデータを削除
    if (keysToCleanup.length > 0) {
      await chrome.storage.local.remove(keysToCleanup);
      console.log('クリーンアップで削除されたキー:', keysToCleanup);
    }
    
    console.log('ストレージクリーンアップが完了しました');
    
  } catch (error) {
    console.error('ストレージクリーンアップエラー:', error);
    // クリーンアップエラーは致命的ではないため、エラーを投げない
  }
}

/**
 * デフォルトテンプレートを取得
 * @returns {string} デフォルトテンプレート
 */
function getDefaultTemplate() {
  return `参照元:
{{title}}
{{url}}`;
}

/**
 * テンプレートを読み込む
 * @returns {Promise<string>} テンプレート文字列
 */
async function loadTemplate() {
  try {
    console.log('テンプレートの読み込みを開始');
    
    const result = await chrome.storage.local.get(['descriptionTemplate']);
    
    if (!result.descriptionTemplate) {
      console.log('保存されたテンプレートが見つかりません。デフォルトテンプレートを使用します。');
      return getDefaultTemplate();
    }
    
    console.log('テンプレートを読み込みました');
    return result.descriptionTemplate;
    
  } catch (error) {
    console.error('テンプレート読み込みエラー:', error);
    console.log('エラーが発生したため、デフォルトテンプレートを使用します。');
    return getDefaultTemplate();
  }
}

/**
 * テンプレートを保存
 * @param {string} template - テンプレート文字列
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function saveTemplate(template) {
  try {
    console.log('テンプレートの保存を開始');
    
    const templateData = {
      descriptionTemplate: template,
      templateUpdatedAt: Date.now()
    };
    
    await chrome.storage.local.set(templateData);
    
    console.log('テンプレートを保存しました');
    return { success: true, message: 'テンプレートを保存しました' };
    
  } catch (error) {
    console.error('テンプレート保存エラー:', error);
    
    return { 
      success: false, 
      message: 'テンプレートの保存に失敗しました。もう一度お試しください。'
    };
  }
}

/**
 * テンプレート変数を置換
 * @param {string} template - テンプレート文字列
 * @param {Object} variables - 置換する変数のマップ
 * @returns {string} 置換後の文字列
 */
function replaceTemplateVariables(template, variables) {
  try {
    console.log('テンプレート変数の置換を開始');
    
    let result = template;
    
    // {{url}}を置換
    if (variables.url) {
      // $記号をエスケープするため、置換関数を使用
      result = result.replace(/\{\{url\}\}/g, () => variables.url);
    }
    
    // {{title}}を置換
    if (variables.title) {
      // $記号をエスケープするため、置換関数を使用
      result = result.replace(/\{\{title\}\}/g, () => variables.title);
    }
    
    console.log('テンプレート変数の置換が完了しました');
    return result;
    
  } catch (error) {
    console.error('テンプレート変数置換エラー:', error);
    return template;
  }
}

module.exports = {
  getSidePanelState,
  closeSidePanel,
  handleSaveApiKey,
  handleGetApiKey,
  handleDeleteApiKey,
  performStorageCleanup,
  getDefaultTemplate,
  loadTemplate,
  saveTemplate,
  replaceTemplateVariables
};

/**
 * Backlog API通信機能
 */

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
  try {
    // APIキーを取得
    const apiKeyResult = await handleGetApiKey();
    if (!apiKeyResult.success) {
      return { success: false, message: 'APIキーが設定されていません' };
    }
    
    const { apiKey, domain } = apiKeyResult;
    const baseUrl = buildBacklogApiUrl(domain);
    
    const response = await fetch(`${baseUrl}/projects?apiKey=${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`API呼び出しエラー: ${response.status} ${response.statusText}`);
    }
    
    const projects = await response.json();
    
    console.log('プロジェクト一覧を取得しました:', projects.length + '件');
    return { success: true, projects: projects };
    
  } catch (error) {
    console.error('プロジェクト取得エラー:', error);
    return { success: false, message: error.message };
  }
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
    
    // 課題作成のパラメータをクエリパラメータとして構築
    const params = new URLSearchParams({
      apiKey: apiKey,
      projectId: projectId,
      summary: summary,
      issueTypeId: '1', // デフォルトの課題タイプ
      priorityId: '3'   // 中優先度
    });
    
    // 説明を追加（空でない場合のみ）
    if (description && description.trim()) {
      params.append('description', description.trim());
    }
    
    // 担当者を設定（APIキー登録ユーザ）
    if (assigneeId) {
      params.append('assigneeId', assigneeId);
    }
    
    // 期限日を今日に設定
    const today = new Date().toISOString().split('T')[0];
    params.append('dueDate', today);
    
    // クエリパラメータとしてURLに追加
    const urlWithParams = `${baseUrl}/issues?${params.toString()}`;
    const response = await fetch(urlWithParams, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });
    
    if (!response.ok) {
      throw new Error(`課題作成エラー: ${response.status} ${response.statusText}`);
    }
    
    const issue = await response.json();
    
    console.log('課題を作成しました:', issue.issueKey);
    return { success: true, issue: issue };
    
  } catch (error) {
    console.error('課題作成エラー:', error);
    return { success: false, message: error.message };
  }
}

/**
 * 現在のユーザ情報を取得する
 * @returns {Promise<{success: boolean, user?: Object, message?: string}>}
 */
async function handleGetCurrentUser() {
  try {
    // APIキーを取得
    const apiKeyResult = await handleGetApiKey();
    if (!apiKeyResult.success) {
      return { success: false, message: 'APIキーが設定されていません' };
    }
    
    const { apiKey, domain } = apiKeyResult;
    const baseUrl = buildBacklogApiUrl(domain);
    
    const response = await fetch(`${baseUrl}/users/myself?apiKey=${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`ユーザ情報取得エラー: ${response.status} ${response.statusText}`);
    }
    
    const user = await response.json();
    
    console.log('ユーザ情報を取得しました:', user.name);
    return { success: true, user: user };
    
  } catch (error) {
    console.error('ユーザ情報取得エラー:', error);
    return { success: false, message: error.message };
  }
}