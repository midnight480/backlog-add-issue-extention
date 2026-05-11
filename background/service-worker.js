// Background Service Worker
// Chrome拡張機能のバックグラウンド処理を管理

/**
 * Service Worker の基本構造
 * - Chrome拡張機能のライフサイクル管理
 * - APIキー管理機能
 * - Backlog API通信機能
 */

// Service Worker のインストール時の処理
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Add Issue Service Worker installed:', details.reason);
  
  // 初回インストール時の初期化処理
  if (details.reason === 'install') {
    console.log('初回インストール - 初期化処理を実行');
    initializeExtension();
  }
  
  // アップデート時の処理
  if (details.reason === 'update') {
    console.log('拡張機能がアップデートされました');
  }
  
  // サイドパネルの初期化
  initializeSidePanel();
});

// Service Worker の起動時の処理
chrome.runtime.onStartup.addListener(() => {
  console.log('Add Issue Service Worker started');
});

// 他のコンポーネントからのメッセージ処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('メッセージを受信:', message);
  
  // 非同期処理のためのフラグ
  let willRespondAsync = false;
  
  switch (message.action) {
    case 'ping':
      sendResponse({ status: 'pong' });
      break;
      
    case 'contentScriptLoaded':
      console.log('Content Scriptが読み込まれました:', message.url, message.title);
      sendResponse({ status: 'acknowledged' });
      break;
      
    case 'getCurrentPageInfo':
      willRespondAsync = true;
      handleGetCurrentPageInfo(sender.tab)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;
      
    case 'saveApiKey':
      console.log('saveApiKey リクエスト受信:', { apiKey: message.apiKey ? message.apiKey.substring(0, 10) + '...' : 'なし', domain: message.domain });
      willRespondAsync = true;
      handleSaveApiKey(message.apiKey, message.domain)
        .then(result => {
          console.log('saveApiKey 処理結果:', result);
          sendResponse(result);
        })
        .catch(error => {
          console.error('saveApiKey 処理エラー:', error);
          sendResponse({ success: false, error: error.message });
        });
      break;
      
    case 'getApiKey':
      willRespondAsync = true;
      handleGetApiKey()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ error: error.message }));
      break;
      
    case 'deleteApiKey':
      willRespondAsync = true;
      handleDeleteApiKey()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ error: error.message }));
      break;
      
    case 'getProjects':
      willRespondAsync = true;
      handleGetProjects()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ error: error.message }));
      break;
      
    case 'getIssueTypes':
      willRespondAsync = true;
      handleGetIssueTypes(message.projectId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;
      
    case 'createIssue':
      willRespondAsync = true;
      handleCreateIssue(message.projectId, message.summary, message.description, message.issueTypeId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ error: error.message }));
      break;
      
    case 'getCurrentUser':
      willRespondAsync = true;
      handleGetCurrentUser()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ error: error.message }));
      break;
      
    case 'getActiveTabPageInfo':
      willRespondAsync = true;
      handleGetActiveTabPageInfo()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ error: error.message }));
      break;
      
    case 'debugApiKey':
      willRespondAsync = true;
      handleDebugApiKey()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;
      
    case 'resetFeatures':
      gracefulDegradation.resetAllFeatures();
      sendResponse({ success: true, message: '機能状態をリセットしました' });
      break;
      
    case 'openSidePanel':
      willRespondAsync = true;
      handleOpenSidePanel(message.windowId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;
      
    case 'savePanelState':
      willRespondAsync = true;
      handleSavePanelState(message.state)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;
      
    case 'loadPanelState':
      willRespondAsync = true;
      handleLoadPanelState()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;
      
    case 'clearPanelState':
      willRespondAsync = true;
      handleClearPanelState()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;
      
    case 'loadTemplate':
      willRespondAsync = true;
      loadTemplate()
        .then(template => sendResponse({ success: true, template: template }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;
      
    case 'saveTemplate':
      willRespondAsync = true;
      saveTemplate(message.template)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;
      
    case 'resetTemplate':
      willRespondAsync = true;
      (async () => {
        try {
          const defaultTemplate = getDefaultTemplate();
          const result = await saveTemplate(defaultTemplate);
          sendResponse({ ...result, template: defaultTemplate });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      break;
      
    case 'replaceVariables':
      willRespondAsync = true;
      (async () => {
        try {
          const replacedText = replaceTemplateVariables(message.template, message.variables);
          sendResponse({ success: true, text: replacedText });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      break;

    case 'saveFavoriteProjects':
      // お気に入りプロジェクトを保存（スペースID付き）
      willRespondAsync = true;
      handleSaveFavoriteProjects(message.projects, message.spaceId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;

    case 'getFavoriteProjects':
      // お気に入りプロジェクトを取得（スペースID付き）
      willRespondAsync = true;
      handleGetFavoriteProjects(message.spaceId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;

    case 'getSpaces':
      // 登録済みスペース一覧を取得
      willRespondAsync = true;
      handleGetSpaces()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;

    case 'saveSpace':
      // スペースを登録
      willRespondAsync = true;
      handleSaveSpace(message.space)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;

    case 'deleteSpace':
      // スペースを削除
      willRespondAsync = true;
      handleDeleteSpace(message.spaceId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;

    case 'getProjectsForSpace':
      // 指定スペースのプロジェクト一覧を取得
      willRespondAsync = true;
      handleGetProjectsForSpace(message.spaceId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;

    case 'getIssueTypesForSpace':
      // 指定スペースのプロジェクトの課題種別を取得
      willRespondAsync = true;
      handleGetIssueTypesForSpace(message.spaceId, message.projectId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;

    case 'createIssueForSpace':
      // 指定スペースで課題を作成
      willRespondAsync = true;
      handleCreateIssueForSpace(message.spaceId, message.projectId, message.summary, message.description, message.issueTypeId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;

    case 'loadTemplateForIssueType':
      // 種別ごとのテンプレートを読み込み
      willRespondAsync = true;
      loadTemplateForIssueType(message.issueTypeId)
        .then(template => sendResponse({ success: true, template: template }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;

    case 'saveTemplateForIssueType':
      // 種別ごとのテンプレートを保存
      willRespondAsync = true;
      saveTemplateForIssueType(message.template, message.issueTypeId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;

    case 'getIssueTypeTemplate':
      // Backlog APIから課題種別のテンプレートを取得
      willRespondAsync = true;
      handleGetIssueTypeTemplate(message.issueTypeId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      break;

    default:
      console.log('未知のアクション:', message.action);
      sendResponse({ error: '未知のアクション' });
  }
  
  // 非同期レスポンスの場合はtrueを返す
  return willRespondAsync;
});

/**
 * 拡張機能の初期化処理
 * 要件3.1: 初回インストール時にデフォルトテンプレートを初期化
 */
async function initializeExtension() {
  try {
    console.log('拡張機能の初期化を開始');
    
    // デフォルトテンプレートを保存
    const defaultTemplate = getDefaultTemplate();
    await saveTemplate(defaultTemplate);
    console.log('デフォルトテンプレートを初期化しました');
    
    // 初期化完了のログ
    console.log('拡張機能の初期化が完了しました');
  } catch (error) {
    console.error('初期化中にエラーが発生しました:', error);
  }
}

/**
 * サイドパネルの初期化処理
 * Side Panel APIのサポート確認とフォールバック処理
 * 要件8.2, 8.4: サイドパネル初期化失敗時のエラーメッセージ表示
 */
async function initializeSidePanel() {
  try {
    console.log('サイドパネルの初期化を開始');
    
    // Side Panel APIのサポート確認
    if (!chrome.sidePanel) {
      const message = 'Side Panel APIがサポートされていません。ポップアップモードで動作します。';
      console.warn(message);
      
      // ユーザーに通知を表示
      showErrorNotification('サイドパネル機能について', message);
      
      return { 
        success: false, 
        fallbackToPopup: true,
        message: message
      };
    }
    
    // サイドパネルの設定
    await chrome.sidePanel.setPanelBehavior({ 
      openPanelOnActionClick: false 
    });
    
    await chrome.sidePanel.setOptions({
      path: 'sidepanel/sidepanel.html',
      enabled: true
    });
    
    // ブラウザ再起動後の状態復元処理
    await restoreSidePanelState();
    
    console.log('サイドパネルの初期化が完了しました');
    return { success: true };
    
  } catch (error) {
    console.error('サイドパネル初期化エラー:', error);
    
    const message = 'サイドパネルの初期化に失敗しました。ポップアップモードで動作します。';
    
    // ユーザーに通知を表示
    showErrorNotification('サイドパネル初期化エラー', message);
    
    return { 
      success: false, 
      fallbackToPopup: true,
      message: message,
      error: error.message
    };
  }
}

/**
 * エラー通知を表示
 * @param {string} title - 通知のタイトル
 * @param {string} message - 通知のメッセージ
 */
function showErrorNotification(title, message) {
  try {
    // Chrome通知APIを使用してエラーメッセージを表示
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon-128.png',
        title: title,
        message: message,
        priority: 1
      });
    }
  } catch (error) {
    console.error('通知の表示に失敗:', error);
  }
}

/**
 * サイドパネルを開く処理
 * @param {number} windowId - ウィンドウID（オプション）
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function handleOpenSidePanel(windowId) {
  try {
    console.log('サイドパネルを開く処理を開始');
    
    // Side Panel APIのサポート確認
    if (!chrome.sidePanel) {
      throw new Error('Side Panel APIがサポートされていません');
    }
    
    // ウィンドウIDが指定されていない場合は現在のアクティブなタブのウィンドウを取得
    let targetWindowId = windowId;
    if (!targetWindowId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.windowId) {
        targetWindowId = activeTab.windowId;
      } else {
        // フォールバック: 最後にフォーカスされたウィンドウを取得
        const windows = await chrome.windows.getLastFocused();
        targetWindowId = windows.id;
      }
    }
    
    console.log('サイドパネルを開くウィンドウID:', targetWindowId);
    
    // サイドパネルを開く
    await chrome.sidePanel.open({ windowId: targetWindowId });
    
    // サイドパネルの開閉状態を記録
    await chrome.storage.local.set({ 
      sidePanelIsOpen: true,
      sidePanelOpenedAt: Date.now()
    });
    
    console.log('サイドパネルを開きました');
    return { success: true, message: 'サイドパネルを開きました' };
    
  } catch (error) {
    console.error('サイドパネルを開く処理でエラー:', error);
    
    // エラー回復処理
    const recoveryResult = await handleErrorWithRecovery(error, 'open_side_panel');
    
    return { 
      success: false, 
      message: recoveryResult.guidance,
      errorType: recoveryResult.errorType,
      recovered: recoveryResult.recovered
    };
  }
}

/**
 * ブラウザ再起動後のサイドパネル状態復元処理
 * 要件6.3: ブラウザが再起動される時、サイドパネルの開閉状態を復元する
 */
async function restoreSidePanelState() {
  try {
    console.log('サイドパネル状態の復元を開始');
    
    // 保存された開閉状態を取得
    const result = await chrome.storage.local.get(['sidePanelIsOpen']);
    
    // 状態のみ確認し、自動で開かない（ユーザージェスチャーが必要なため）
    if (result.sidePanelIsOpen === true) {
      console.log('前回サイドパネルが開いていました（次回クリック時に開きます）');
    } else {
      console.log('前回サイドパネルは閉じていました');
    }
    
  } catch (error) {
    console.error('サイドパネル状態復元エラー:', error);
  }
}

/**
 * サイドパネルの開閉状態を取得
 * 要件1.4: トグル操作前に現在のサイドパネル状態をChrome Storage APIから取得
 * @returns {Promise<boolean>} サイドパネルが開いているかどうか
 */
async function getSidePanelState() {
  try {
    const result = await chrome.storage.local.get(['sidePanelIsOpen']);
    return result.sidePanelIsOpen === true;
  } catch (error) {
    console.error('サイドパネル状態の取得に失敗:', error);
    // 要件1.5: 状態クエリ失敗時はデフォルトで開く動作にフォールバック
    return false;
  }
}

/**
 * サイドパネルを閉じる
 * 要件1.2: サイドパネルにクローズメッセージを送信
 * @param {number} windowId - ウィンドウID
 * @returns {Promise<void>}
 */
async function closeSidePanel(windowId) {
  try {
    console.log('サイドパネルにクローズメッセージを送信します');
    
    // サイドパネルにメッセージを送信してクローズを指示
    try {
      await chrome.runtime.sendMessage({ 
        action: 'closeSidePanel',
        windowId: windowId
      });
    } catch (messageError) {
      // サイドパネルが開いていない場合はメッセージ送信が失敗するが、問題ない
      console.log('メッセージ送信スキップ（サイドパネルが開いていない可能性）');
    }
    
    // サイドパネルの開閉状態を記録
    // 要件1.3: 状態変更をStorage APIに永続化
    await chrome.storage.local.set({ 
      sidePanelIsOpen: false,
      sidePanelClosedAt: Date.now()
    });
    
    console.log('サイドパネルのクローズ処理を完了しました');
  } catch (error) {
    console.error('サイドパネルのクローズに失敗:', error);
    // メッセージング失敗時もストレージの状態は更新しておく
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
 * 拡張機能アイコンクリック時の処理（トグル機能）
 */
chrome.action.onClicked.addListener((tab) => {
  if (!chrome.sidePanel) {
    showErrorNotification('サイドパネル機能について', 'このブラウザではサイドパネル機能がサポートされていません');
    return;
  }
  
  const windowId = tab.windowId;
  
  // 状態を同期的に取得してトグル処理
  chrome.storage.local.get(['sidePanelIsOpen'], (result) => {
    const isOpen = result.sidePanelIsOpen === true;
    
    if (isOpen) {
      // 開いている場合は閉じる
      closeSidePanel(windowId);
    } else {
      // 閉じている場合は開く（ユーザージェスチャーコンテキスト内で実行）
      chrome.sidePanel.open({ windowId }).then(() => {
        chrome.storage.local.set({ 
          sidePanelIsOpen: true,
          sidePanelOpenedAt: Date.now()
        });
      }).catch((error) => {
        console.error('サイドパネルを開けませんでした:', error);
      });
    }
  });
});

/**
 * サイドパネルの状態を保存
 * 要件8.2: 状態の保存失敗時のリトライ処理
 * @param {Object} state - 保存する状態
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function handleSavePanelState(state) {
  const transactionId = `save_panel_state_${Date.now()}`;
  
  try {
    console.log('サイドパネルの状態を保存開始');
    
    // トランザクション開始
    stateManager.beginTransaction(transactionId, async () => {
      // ロールバック処理：以前の状態を復元
      const previousData = gracefulDegradation.getFallbackData('previous_panel_state');
      if (previousData) {
        await chrome.storage.local.set({ sidePanelState: previousData });
      }
    });
    
    // ストレージ機能の確認
    if (!gracefulDegradation.isFeatureAvailable('storage')) {
      throw new Error('ストレージ機能が利用できません');
    }
    
    // 現在の状態をバックアップ
    try {
      const currentData = await chrome.storage.local.get(['sidePanelState']);
      if (currentData.sidePanelState) {
        gracefulDegradation.setFallbackData('previous_panel_state', currentData.sidePanelState);
      }
    } catch (backupError) {
      console.warn('状態のバックアップに失敗:', backupError);
    }
    
    // リトライ機能付きで状態を保存
    const result = await saveStateWithRetry(state, 3);
    
    if (!result.success) {
      throw new Error(result.message || '状態の保存に失敗しました');
    }
    
    // トランザクション完了
    stateManager.commitTransaction(transactionId);
    
    console.log('サイドパネルの状態を保存しました');
    return { 
      success: true, 
      message: '状態を保存しました',
      retries: result.retries 
    };
    
  } catch (error) {
    console.error('サイドパネル状態保存エラー:', error);
    
    // エラー回復処理
    const recoveryResult = await handleErrorWithRecovery(error, 'save_panel_state');
    
    // トランザクションロールバック
    await stateManager.rollbackTransaction(transactionId);
    
    // ストレージエラーの場合は機能状態を更新
    if (error.message.includes('storage') || error.message.includes('Storage')) {
      gracefulDegradation.updateFeatureStatus('storage', false);
    }
    
    return { 
      success: false, 
      message: recoveryResult.guidance,
      errorType: recoveryResult.errorType,
      recovered: recoveryResult.recovered
    };
  }
}

/**
 * リトライ機能付きで状態を保存
 * 要件8.2: 状態の保存失敗時のリトライ処理
 * @param {Object} state - 保存する状態
 * @param {number} maxRetries - 最大リトライ回数
 * @returns {Promise<{success: boolean, message?: string, retries?: number}>}
 */
async function saveStateWithRetry(state, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const stateWithTimestamp = {
        ...state,
        timestamp: Date.now()
      };
      
      await chrome.storage.local.set({ sidePanelState: stateWithTimestamp });
      
      if (i > 0) {
        console.log(`状態の保存に成功しました（リトライ ${i} 回目）`);
      }
      
      return { success: true, retries: i };
    } catch (error) {
      console.error(`保存試行 ${i + 1} 回目が失敗:`, error);
      
      if (i === maxRetries - 1) {
        // 最後のリトライも失敗した場合
        return {
          success: false,
          message: '状態の保存に失敗しました。ブラウザの設定を確認してください。',
          retries: i + 1
        };
      }
      
      // 次のリトライまで待機（指数バックオフ）
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

/**
 * サイドパネルの状態を読み込み
 * 要件8.3: 状態の復元失敗時のデフォルト状態処理
 * @returns {Promise<{success: boolean, state?: Object, message?: string}>}
 */
async function handleLoadPanelState() {
  try {
    console.log('サイドパネルの状態を読み込み開始');
    
    // ストレージ機能の確認
    if (!gracefulDegradation.isFeatureAvailable('storage')) {
      // フォールバックデータを試行
      const fallbackData = gracefulDegradation.getFallbackData('panel_state_cache');
      if (fallbackData) {
        console.log('フォールバックデータから状態を取得');
        return { success: true, state: fallbackData, fromCache: true };
      }
      console.warn('ストレージ機能が利用できません。デフォルト状態を使用します。');
      const defaultState = getDefaultPanelState();
      return { success: true, state: defaultState, warning: 'ストレージ機能が利用できないため、デフォルト状態で起動しました。' };
    }
    
    const result = await chrome.storage.local.get(['sidePanelState']);
    
    if (!result.sidePanelState) {
      // デフォルト状態を返す
      console.log('保存された状態が見つかりません。デフォルト状態を使用します。');
      const defaultState = getDefaultPanelState();
      return { success: true, state: defaultState };
    }
    
    // 状態のバリデーション
    if (!validatePanelState(result.sidePanelState)) {
      console.warn('無効な状態データが検出されました。デフォルト状態を使用します。');
      
      // 破損した状態をクリア
      try {
        await chrome.storage.local.remove(['sidePanelState']);
        console.log('破損した状態データをクリアしました');
      } catch (clearError) {
        console.error('破損した状態のクリアに失敗:', clearError);
      }
      
      const defaultState = getDefaultPanelState();
      return { 
        success: true, 
        state: defaultState,
        warning: '保存された状態が破損していたため、デフォルト状態で起動しました。'
      };
    }
    
    // 成功した場合はキャッシュに保存
    gracefulDegradation.setFallbackData('panel_state_cache', result.sidePanelState);
    
    console.log('サイドパネルの状態を読み込みました');
    return { success: true, state: result.sidePanelState };
    
  } catch (error) {
    console.error('サイドパネル状態読み込みエラー:', error);
    
    // エラー回復処理
    const recoveryResult = await handleErrorWithRecovery(error, 'load_panel_state');
    
    // ストレージエラーの場合は機能状態を更新
    if (error.message.includes('storage') || error.message.includes('Storage')) {
      gracefulDegradation.updateFeatureStatus('storage', false);
    }
    
    // デフォルト状態を返す
    console.log('エラーが発生したため、デフォルト状態で起動します。');
    const defaultState = getDefaultPanelState();
    
    return { 
      success: true, 
      state: defaultState,
      warning: recoveryResult.guidance
    };
  }
}

/**
 * デフォルトのパネル状態を取得
 * @returns {Object} デフォルト状態
 */
function getDefaultPanelState() {
  return {
    selectedProject: null,
    issueType: null,
    summary: '',
    description: '',
    currentTab: null,
    timestamp: Date.now()
  };
}

/**
 * サイドパネルの状態をクリア
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function handleClearPanelState() {
  try {
    console.log('サイドパネルの状態をクリア開始');
    
    // ストレージ機能の確認
    if (!gracefulDegradation.isFeatureAvailable('storage')) {
      throw new Error('ストレージ機能が利用できません');
    }
    
    await chrome.storage.local.remove(['sidePanelState']);
    
    // キャッシュもクリア
    gracefulDegradation.setFallbackData('panel_state_cache', null);
    
    console.log('サイドパネルの状態をクリアしました');
    return { success: true, message: '状態をクリアしました' };
    
  } catch (error) {
    console.error('サイドパネル状態クリアエラー:', error);
    
    // エラー回復処理
    const recoveryResult = await handleErrorWithRecovery(error, 'clear_panel_state');
    
    // ストレージエラーの場合は機能状態を更新
    if (error.message.includes('storage') || error.message.includes('Storage')) {
      gracefulDegradation.updateFeatureStatus('storage', false);
    }
    
    return { 
      success: false, 
      message: recoveryResult.guidance,
      errorType: recoveryResult.errorType,
      recovered: recoveryResult.recovered
    };
  }
}

/**
 * パネル状態のバリデーション
 * @param {Object} state - バリデーションする状態
 * @returns {boolean} バリデーション結果
 */
function validatePanelState(state) {
  if (!state || typeof state !== 'object') {
    return false;
  }
  
  // 必須フィールドの確認
  if (typeof state.summary !== 'string' || typeof state.description !== 'string') {
    return false;
  }
  
  // selectedProjectが存在する場合は構造を確認
  if (state.selectedProject !== null && state.selectedProject !== undefined) {
    if (typeof state.selectedProject !== 'object' ||
        !state.selectedProject.id ||
        !state.selectedProject.name ||
        !state.selectedProject.projectKey) {
      return false;
    }
  }
  
  return true;
}

/**
 * 現在のページ情報を取得する（Content Scriptを通じて）
 * @param {Object} tab - タブ情報
 * @returns {Promise<{success: boolean, pageInfo?: Object, message?: string}>}
 */
async function handleGetCurrentPageInfo(tab) {
  try {
    if (!tab || !tab.id) {
      throw new Error('有効なタブ情報が取得できません');
    }
    
    // Content Scriptにメッセージを送信してページ情報を取得
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCurrentPageInfo' });
    
    if (!response.success) {
      throw new Error(response.error || 'ページ情報の取得に失敗しました');
    }
    
    console.log('ページ情報を取得しました:', response.pageInfo);
    return { success: true, pageInfo: response.pageInfo };
    
  } catch (error) {
    console.error('ページ情報取得エラー:', error);
    
    // Content Scriptが利用できない場合のフォールバック
    if (tab && tab.url && tab.title) {
      console.log('タブ情報からページ情報を取得します');
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
}

/**
 * アクティブなタブのページ情報を取得する
 * @returns {Promise<{success: boolean, pageInfo?: Object, message?: string}>}
 */
async function handleGetActiveTabPageInfo() {
  try {
    // アクティブなタブを取得
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!activeTab) {
      throw new Error('アクティブなタブが見つかりません');
    }
    
    return await handleGetCurrentPageInfo(activeTab);
    
  } catch (error) {
    console.error('アクティブタブのページ情報取得エラー:', error);
    return { success: false, message: error.message };
  }
}

console.log('Add Issue Service Worker loaded');

/**
 * エラー回復とシステム安定性機能
 */

/**
 * グレースフルデグラデーション機能
 * 一部機能が利用できない場合でも、利用可能な機能は継続提供
 */
class GracefulDegradation {
  constructor() {
    this.featureStatus = {
      storage: true,
      network: true,
      contentScript: true,
      tabs: true
    };
    this.fallbackData = new Map();
  }

  /**
   * 機能の利用可能性をチェック
   * @param {string} feature - チェックする機能名
   * @returns {boolean} 利用可能かどうか
   */
  isFeatureAvailable(feature) {
    return this.featureStatus[feature] || false;
  }

  /**
   * 機能の状態を更新
   * @param {string} feature - 機能名
   * @param {boolean} status - 利用可能かどうか
   */
  updateFeatureStatus(feature, status) {
    this.featureStatus[feature] = status;
    console.log(`機能状態更新: ${feature} = ${status}`);
  }

  /**
   * 機能の状態をリセット（すべて有効に戻す）
   */
  resetAllFeatures() {
    this.featureStatus = {
      storage: true,
      network: true,
      contentScript: true,
      tabs: true
    };
    console.log('すべての機能状態をリセットしました');
  }

  /**
   * フォールバックデータを設定
   * @param {string} key - データキー
   * @param {any} data - フォールバックデータ
   */
  setFallbackData(key, data) {
    this.fallbackData.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  /**
   * フォールバックデータを取得
   * @param {string} key - データキー
   * @param {number} maxAge - 最大有効期間（ミリ秒）
   * @returns {any} フォールバックデータ
   */
  getFallbackData(key, maxAge = 300000) { // デフォルト5分
    const entry = this.fallbackData.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > maxAge) {
      this.fallbackData.delete(key);
      return null;
    }
    
    return entry.data;
  }
}

/**
 * 状態の一貫性維持機能
 */
class StateConsistencyManager {
  constructor() {
    this.transactionLog = [];
    this.rollbackHandlers = new Map();
  }

  /**
   * トランザクションを開始
   * @param {string} transactionId - トランザクションID
   * @param {Function} rollbackHandler - ロールバック処理
   */
  beginTransaction(transactionId, rollbackHandler) {
    this.transactionLog.push({
      id: transactionId,
      timestamp: Date.now(),
      status: 'started'
    });
    
    if (rollbackHandler) {
      this.rollbackHandlers.set(transactionId, rollbackHandler);
    }
  }

  /**
   * トランザクションを完了
   * @param {string} transactionId - トランザクションID
   */
  commitTransaction(transactionId) {
    const transaction = this.transactionLog.find(t => t.id === transactionId);
    if (transaction) {
      transaction.status = 'committed';
      transaction.completedAt = Date.now();
    }
    
    // ロールバックハンドラーを削除
    this.rollbackHandlers.delete(transactionId);
  }

  /**
   * トランザクションをロールバック
   * @param {string} transactionId - トランザクションID
   */
  async rollbackTransaction(transactionId) {
    const transaction = this.transactionLog.find(t => t.id === transactionId);
    if (!transaction) return;

    const rollbackHandler = this.rollbackHandlers.get(transactionId);
    if (rollbackHandler) {
      try {
        await rollbackHandler();
        transaction.status = 'rolled_back';
        console.log(`トランザクション ${transactionId} をロールバックしました`);
      } catch (error) {
        console.error(`トランザクション ${transactionId} のロールバックに失敗:`, error);
        transaction.status = 'rollback_failed';
      }
    }
    
    this.rollbackHandlers.delete(transactionId);
  }

  /**
   * 未完了のトランザクションをクリーンアップ
   * @param {number} maxAge - 最大有効期間（ミリ秒）
   */
  async cleanupStaleTransactions(maxAge = 600000) { // デフォルト10分
    const now = Date.now();
    const staleTransactions = this.transactionLog.filter(
      t => t.status === 'started' && (now - t.timestamp) > maxAge
    );

    for (const transaction of staleTransactions) {
      console.log(`古いトランザクションをロールバック: ${transaction.id}`);
      await this.rollbackTransaction(transaction.id);
    }
  }
}

/**
 * ユーザガイダンス機能
 */
class UserGuidanceManager {
  constructor() {
    this.guidanceMessages = new Map();
    this.recoveryActions = new Map();
  }

  /**
   * ガイダンスメッセージを登録
   * @param {string} errorType - エラータイプ
   * @param {string} message - ガイダンスメッセージ
   * @param {Array} actions - 推奨アクション
   */
  registerGuidance(errorType, message, actions = []) {
    this.guidanceMessages.set(errorType, message);
    this.recoveryActions.set(errorType, actions);
  }

  /**
   * エラーに対するガイダンスを取得
   * @param {string} errorType - エラータイプ
   * @returns {Object} ガイダンス情報
   */
  getGuidance(errorType) {
    return {
      message: this.guidanceMessages.get(errorType) || 'エラーが発生しました',
      actions: this.recoveryActions.get(errorType) || []
    };
  }

  /**
   * 自動回復アクションを実行
   * @param {string} errorType - エラータイプ
   * @returns {Promise<boolean>} 回復成功かどうか
   */
  async executeRecoveryActions(errorType) {
    const actions = this.recoveryActions.get(errorType);
    if (!actions || actions.length === 0) return false;

    for (const action of actions) {
      try {
        const result = await action();
        if (result) {
          console.log(`自動回復アクション成功: ${errorType}`);
          return true;
        }
      } catch (error) {
        console.error(`自動回復アクション失敗: ${errorType}`, error);
      }
    }

    return false;
  }
}

// グローバルインスタンス
const gracefulDegradation = new GracefulDegradation();
const stateManager = new StateConsistencyManager();
const guidanceManager = new UserGuidanceManager();

/**
 * エラー回復機能の初期化
 */
function initializeErrorRecovery() {
  // ガイダンスメッセージの登録
  guidanceManager.registerGuidance('network_error', 
    'ネットワークエラーが発生しました。インターネット接続を確認してください', 
    [
      async () => {
        // ネットワーク接続テスト
        try {
          const response = await fetch('https://www.google.com', { method: 'HEAD', mode: 'no-cors' });
          gracefulDegradation.updateFeatureStatus('network', true);
          return true;
        } catch {
          gracefulDegradation.updateFeatureStatus('network', false);
          return false;
        }
      }
    ]
  );

  guidanceManager.registerGuidance('storage_error',
    'データの保存に失敗しました。ブラウザの設定を確認してください',
    [
      async () => {
        // ストレージアクセステスト
        try {
          await chrome.storage.local.set({ test: 'test' });
          await chrome.storage.local.remove(['test']);
          gracefulDegradation.updateFeatureStatus('storage', true);
          return true;
        } catch {
          gracefulDegradation.updateFeatureStatus('storage', false);
          return false;
        }
      }
    ]
  );

  guidanceManager.registerGuidance('api_error',
    'APIキーが無効です。設定画面でAPIキーを確認してください',
    [
      async () => {
        // APIキーの再検証
        try {
          const result = await handleGetApiKey();
          return result.success;
        } catch {
          return false;
        }
      }
    ]
  );

  guidanceManager.registerGuidance('side_panel_error',
    'サイドパネルの操作に失敗しました。ブラウザを再起動してください',
    [
      async () => {
        // サイドパネルの再初期化を試行
        try {
          const result = await initializeSidePanel();
          return result.success;
        } catch {
          return false;
        }
      }
    ]
  );

  // 定期的なクリーンアップ
  setInterval(() => {
    stateManager.cleanupStaleTransactions();
  }, 300000); // 5分ごと
}

/**
 * エラーハンドリングの強化
 * @param {Error} error - エラーオブジェクト
 * @param {string} context - エラーが発生したコンテキスト
 * @returns {Promise<Object>} 処理結果
 */
async function handleErrorWithRecovery(error, context) {
  console.error(`エラー発生 [${context}]:`, error);

  // エラータイプの判定
  let errorType = 'unknown_error';
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    errorType = 'network_error';
  } else if (error.message.includes('storage') || error.message.includes('Storage')) {
    errorType = 'storage_error';
  } else if (error.message.includes('APIキー') || error.message.includes('認証')) {
    errorType = 'api_error';
  } else if (error.message.includes('Side Panel') || error.message.includes('sidePanel')) {
    errorType = 'side_panel_error';
  }

  // 自動回復を試行
  const recovered = await guidanceManager.executeRecoveryActions(errorType);
  
  // ガイダンス情報を取得
  const guidance = guidanceManager.getGuidance(errorType);

  return {
    success: false,
    error: error.message,
    errorType: errorType,
    recovered: recovered,
    guidance: guidance.message,
    actions: guidance.actions.map(() => 'retry') // アクション名のみ返す
  };
}

// エラー回復機能を初期化
initializeErrorRecovery();

/**
 * APIキー管理機能
 */

/**
 * APIキーを暗号化して保存する（エラー回復機能付き）
 * @param {string} apiKey - 保存するAPIキー
 * @param {string} domain - Backlogのドメイン (backlog.jp or backlog.com)
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function handleSaveApiKey(apiKey, domain) {
  const transactionId = `save_api_key_${Date.now()}`;
  
  try {
    console.log('handleSaveApiKey 開始:', { domain: domain, apiKeyLength: apiKey ? apiKey.length : 0 });
    
    // トランザクション開始
    stateManager.beginTransaction(transactionId, async () => {
      // ロールバック処理：以前の状態を復元
      const previousData = gracefulDegradation.getFallbackData('previous_api_key');
      if (previousData) {
        await chrome.storage.local.set({ apiKeyData: previousData });
      }
    });

    if (!apiKey || !domain) {
      throw new Error('APIキーとドメインは必須です');
    }
    
    console.log('バリデーション通過');
    
    // 現在のAPIキーデータをバックアップ
    try {
      const currentData = await chrome.storage.local.get(['apiKeyData']);
      if (currentData.apiKeyData) {
        gracefulDegradation.setFallbackData('previous_api_key', currentData.apiKeyData);
      }
    } catch (backupError) {
      console.warn('APIキーバックアップに失敗:', backupError);
    }

    // ストレージ機能の確認
    if (!gracefulDegradation.isFeatureAvailable('storage')) {
      throw new Error('ストレージ機能が利用できません');
    }
    
    // 簡易的な暗号化（実際の実装では、より強固な暗号化を使用）
    const encryptedKey = btoa(apiKey + ':' + Date.now());
    console.log('APIキー暗号化（最初の10文字）:', apiKey.substring(0, 10) + '...');
    
    const apiKeyData = {
      encryptedKey: encryptedKey,
      domain: domain,
      createdAt: new Date().toISOString()
    };
    
    console.log('ストレージに保存開始:', { domain: apiKeyData.domain });
    await chrome.storage.local.set({ apiKeyData });
    console.log('ストレージ保存完了');
    
    // トランザクション完了
    stateManager.commitTransaction(transactionId);
    
    console.log('APIキーが正常に保存されました');
    return { success: true, message: 'APIキーが保存されました' };
    
  } catch (error) {
    console.error('APIキー保存エラー:', error);
    
    // エラー回復処理
    const recoveryResult = await handleErrorWithRecovery(error, 'save_api_key');
    
    // トランザクションロールバック
    await stateManager.rollbackTransaction(transactionId);
    
    // ストレージエラーの場合は機能状態を更新
    if (error.message.includes('storage') || error.message.includes('Storage')) {
      gracefulDegradation.updateFeatureStatus('storage', false);
    }
    
    return { 
      success: false, 
      message: recoveryResult.guidance,
      errorType: recoveryResult.errorType,
      recovered: recoveryResult.recovered
    };
  }
}

/**
 * 保存されたAPIキーを復号化して取得する（エラー回復機能付き）
 * @returns {Promise<{success: boolean, apiKey?: string, domain?: string, message?: string}>}
 */
async function handleGetApiKey() {
  try {
    // ストレージ機能の確認
    if (!gracefulDegradation.isFeatureAvailable('storage')) {
      // フォールバックデータを試行
      const fallbackData = gracefulDegradation.getFallbackData('api_key_cache');
      if (fallbackData) {
        console.log('フォールバックデータからAPIキーを取得');
        return fallbackData;
      }
      throw new Error('ストレージ機能が利用できません');
    }

    const result = await chrome.storage.local.get(['apiKeyData']);
    
    if (!result.apiKeyData) {
      return { success: false, message: 'APIキーが登録されていません' };
    }
    
    const { encryptedKey, domain, createdAt } = result.apiKeyData;
    
    // 復号化
    let apiKey;
    try {
      const decryptedData = atob(encryptedKey);
      apiKey = decryptedData.split(':')[0];
      console.log('APIキー復号化成功（最初の10文字）:', apiKey.substring(0, 10) + '...');
    } catch (decryptError) {
      console.error('APIキー復号化エラー:', decryptError);
      throw new Error('保存されたAPIキーの復号化に失敗しました');
    }
    
    // 成功した場合はキャッシュに保存
    const cacheData = { 
      success: true, 
      apiKey: apiKey, 
      domain: domain,
      createdAt: createdAt
    };
    gracefulDegradation.setFallbackData('api_key_cache', cacheData);
    
    console.log('APIキーが正常に取得されました');
    return cacheData;
    
  } catch (error) {
    console.error('APIキー取得エラー:', error);
    
    // エラー回復処理
    const recoveryResult = await handleErrorWithRecovery(error, 'get_api_key');
    
    // ストレージエラーの場合は機能状態を更新
    if (error.message.includes('storage') || error.message.includes('Storage')) {
      gracefulDegradation.updateFeatureStatus('storage', false);
    }
    
    return { 
      success: false, 
      message: recoveryResult.guidance,
      errorType: recoveryResult.errorType,
      recovered: recoveryResult.recovered
    };
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
    
    // お気に入りプロジェクトデータを特定
    if (allData.favoriteProjects) {
      keysToDelete.push('favoriteProjects');
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
    
    console.log('APIキーと関連データが正常に削除されました');
    return { success: true, message: 'APIキーと関連データが削除されました' };
    
  } catch (error) {
    console.error('APIキー削除エラー:', error);
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
 * プロジェクト一覧を取得する（エラー回復機能付き）
 * @returns {Promise<{success: boolean, projects?: Array, message?: string}>}
 */
async function handleGetProjects() {
  try {
    console.log('プロジェクト一覧取得処理を開始');
    
    // ネットワーク機能をリセット（前回のエラーの影響を除去）
    gracefulDegradation.updateFeatureStatus('network', true);
    
    // APIキーを取得
    const apiKeyResult = await handleGetApiKey();
    if (!apiKeyResult.success) {
      return { success: false, message: 'APIキーが設定されていません' };
    }
    
    const { apiKey, domain } = apiKeyResult;
    
    // ネットワーク機能の確認
    if (!gracefulDegradation.isFeatureAvailable('network')) {
      // キャッシュされたプロジェクトデータを試行
      const cachedProjects = gracefulDegradation.getFallbackData('projects_cache');
      if (cachedProjects) {
        console.log('キャッシュからプロジェクト一覧を取得');
        return { success: true, projects: cachedProjects, fromCache: true };
      }
      throw new Error('ネットワーク機能が利用できません');
    }

    const baseUrl = buildBacklogApiUrl(domain);
    
    const response = await fetch(`${baseUrl}/projects?apiKey=${apiKey}`);
    
    if (!response.ok) {
      // HTTPステータスコードに応じた詳細なエラーメッセージ
      let errorMessage = 'プロジェクト一覧の取得に失敗しました';
      
      if (response.status === 401) {
        errorMessage = 'APIキーが無効です。設定を確認してください';
        // 401エラーはAPIキーの問題であり、ネットワーク機能は正常
        // gracefulDegradation.updateFeatureStatus('network', false); を削除
      } else if (response.status === 403) {
        errorMessage = 'プロジェクト一覧を取得する権限がありません';
      } else if (response.status >= 500) {
        errorMessage = 'Backlogサーバーでエラーが発生しました。しばらく時間をおいて再試行してください';
        gracefulDegradation.updateFeatureStatus('network', false);
      }
      
      throw new Error(errorMessage);
    }
    
    const projects = await response.json();
    
    // 成功した場合はキャッシュに保存
    gracefulDegradation.setFallbackData('projects_cache', projects);
    gracefulDegradation.updateFeatureStatus('network', true);
    
    console.log('プロジェクト一覧を取得しました:', projects.length + '件');
    return { success: true, projects: projects };
    
  } catch (error) {
    console.error('プロジェクト取得エラー:', error);
    
    // エラー回復処理
    const recoveryResult = await handleErrorWithRecovery(error, 'get_projects');
    
    // ネットワークエラーの場合
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      gracefulDegradation.updateFeatureStatus('network', false);
      
      // キャッシュされたデータを試行
      const cachedProjects = gracefulDegradation.getFallbackData('projects_cache');
      if (cachedProjects) {
        console.log('ネットワークエラー時にキャッシュからプロジェクト一覧を取得');
        return { 
          success: true, 
          projects: cachedProjects, 
          fromCache: true,
          warning: 'ネットワークエラーのため、キャッシュされたデータを表示しています'
        };
      }
    }
    
    return { 
      success: false, 
      message: recoveryResult.guidance,
      errorType: recoveryResult.errorType,
      recovered: recoveryResult.recovered
    };
  }
}

/**
 * 課題を作成する（エラー回復機能付き）
 * @param {string} projectId - プロジェクトID
 * @param {string} summary - 課題の件名
 * @param {string} description - 課題の説明
 * @returns {Promise<{success: boolean, issue?: Object, message?: string}>}
 */
async function handleCreateIssue(projectId, summary, description, issueTypeId) {
  const transactionId = `create_issue_${Date.now()}`;
  
  try {
    console.log('課題作成処理を開始:', { projectId, summary: summary.substring(0, 20) + '...', issueTypeId });
    
    // ネットワーク機能をリセット（前回のエラーの影響を除去）
    gracefulDegradation.updateFeatureStatus('network', true);
    
    // トランザクション開始（課題作成は取り消せないため、ログのみ）
    stateManager.beginTransaction(transactionId, async () => {
      console.log(`課題作成トランザクション ${transactionId} のロールバック（ログのみ）`);
    });

    // 入力データの検証
    if (!projectId || !summary) {
      throw new Error('必須フィールドが入力されていません');
    }

    if (!issueTypeId) {
      throw new Error('課題種別は必須です');
    }

    if (summary.length > 255) {
      throw new Error('件名は255文字以内で入力してください');
    }

    // APIキーを取得
    const apiKeyResult = await handleGetApiKey();
    if (!apiKeyResult.success) {
      throw new Error('APIキーが設定されていません');
    }
    
    const { apiKey, domain } = apiKeyResult;
    console.log('使用するAPIキー（最初の10文字）:', apiKey.substring(0, 10) + '...');
    
    // ネットワーク機能の確認
    if (!gracefulDegradation.isFeatureAvailable('network')) {
      throw new Error('ネットワーク機能が利用できません');
    }

    const baseUrl = buildBacklogApiUrl(domain);
    
    // 現在のユーザ情報を取得（担当者設定用）- 既に取得したAPIキーを使用
    let assigneeId = null;
    try {
      const response = await fetch(`${baseUrl}/users/myself?apiKey=${apiKey}`);
      if (response.ok) {
        const user = await response.json();
        assigneeId = user.id;
        console.log('ユーザ情報を取得しました:', user.name);
      }
    } catch (error) {
      console.warn('ユーザ情報の取得に失敗:', error);
    }
    
    // 優先度を取得 - 既に取得したAPIキーを使用
    let priorityId = '3'; // デフォルト値（中）
    try {
      const response = await fetch(`${baseUrl}/priorities?apiKey=${apiKey}`);
      if (response.ok) {
        const priorities = await response.json();
        if (priorities.length > 0) {
          const middleIndex = Math.floor(priorities.length / 2);
          priorityId = priorities[middleIndex].id.toString();
          console.log('使用する優先度:', priorities[middleIndex].name, `(ID: ${priorityId})`);
        }
      }
    } catch (error) {
      console.warn('優先度の取得に失敗:', error);
    }

    // 課題作成のパラメータをクエリパラメータとして構築
    const params = new URLSearchParams({
      apiKey: apiKey,
      projectId: projectId,
      summary: summary,
      issueTypeId: issueTypeId,
      priorityId: priorityId
    });
    
    // 説明を追加（空でない場合のみ）
    if (description && description.trim()) {
      params.append('description', description.trim());
    }
    
    // 担当者を設定（APIキー登録ユーザ）
    if (assigneeId) {
      params.append('assigneeId', assigneeId);
    }
    
    // 期限日を今日に設定（yyyy-MM-dd形式）
    const today = new Date().toISOString().split('T')[0];
    params.append('dueDate', today);
    
    console.log('課題作成パラメータ:', {
      projectId: projectId,
      summary: summary.substring(0, 30) + '...',
      issueTypeId: issueTypeId,
      priorityId: priorityId,
      assigneeId: assigneeId,
      dueDate: today
    });
    
    // クエリパラメータとしてURLに追加
    const urlWithParams = `${baseUrl}/issues?${params.toString()}`;
    console.log('送信するURL:', urlWithParams);
    
    const response = await fetch(urlWithParams, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });
    
    console.log('課題作成レスポンス:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      // HTTPステータスコードに応じた詳細なエラーメッセージ
      let errorMessage = '課題の作成に失敗しました';
      
      // レスポンスボディを取得してエラー詳細を確認
      let responseText = '';
      try {
        responseText = await response.text();
        console.log('エラーレスポンスボディ:', responseText);
      } catch (e) {
        console.log('レスポンスボディの取得に失敗:', e);
      }
      
      if (response.status === 401) {
        errorMessage = 'APIキーが無効です。設定を確認してください';
        // 401エラーはAPIキーの問題であり、ネットワーク機能は正常
        // gracefulDegradation.updateFeatureStatus('network', false); を削除
      } else if (response.status === 403) {
        errorMessage = 'このプロジェクトに課題を作成する権限がありません';
      } else if (response.status === 404) {
        errorMessage = '指定されたプロジェクトが見つかりません';
      } else if (response.status === 400) {
        // レスポンスボディからエラー詳細を取得
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.errors && errorData.errors.length > 0) {
            errorMessage = errorData.errors[0].message || errorMessage;
          }
        } catch (e) {
          // JSONパースエラーの場合はデフォルトメッセージを使用
          console.log('JSONパースエラー:', e);
        }
      } else if (response.status >= 500) {
        errorMessage = 'Backlogサーバーでエラーが発生しました。しばらく時間をおいて再試行してください';
        gracefulDegradation.updateFeatureStatus('network', false);
      }
      
      console.log('課題作成エラー詳細:', {
        status: response.status,
        statusText: response.statusText,
        errorMessage: errorMessage,
        responseBody: responseText
      });
      
      throw new Error(errorMessage);
    }
    
    const issue = await response.json();
    
    // トランザクション完了
    stateManager.commitTransaction(transactionId);
    gracefulDegradation.updateFeatureStatus('network', true);
    
    console.log('課題を作成しました:', issue.issueKey);
    return { success: true, issue: issue };
    
  } catch (error) {
    console.error('課題作成エラー:', error);
    
    // エラー回復処理
    const recoveryResult = await handleErrorWithRecovery(error, 'create_issue');
    
    // トランザクションロールバック
    await stateManager.rollbackTransaction(transactionId);
    
    // ネットワークエラーの場合
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      gracefulDegradation.updateFeatureStatus('network', false);
    }
    
    return { 
      success: false, 
      message: recoveryResult.guidance,
      errorType: recoveryResult.errorType,
      recovered: recoveryResult.recovered
    };
  }
}

/**
 * プロジェクトの課題種別一覧を取得する
 * @param {string} projectId - プロジェクトID
 * @returns {Promise<{success: boolean, issueTypes?: Array, message?: string}>}
 */
async function handleGetIssueTypes(projectId) {
  try {
    // APIキーを取得
    const apiKeyResult = await handleGetApiKey();
    if (!apiKeyResult.success) {
      return { success: false, message: 'APIキーが設定されていません' };
    }
    
    const { apiKey, domain } = apiKeyResult;
    const baseUrl = buildBacklogApiUrl(domain);
    
    const response = await fetch(`${baseUrl}/projects/${projectId}/issueTypes?apiKey=${apiKey}`);
    
    if (!response.ok) {
      let errorMessage = '課題種別の取得に失敗しました';
      
      if (response.status === 401) {
        errorMessage = 'APIキーが無効です';
      } else if (response.status === 404) {
        errorMessage = 'プロジェクトが見つかりません';
      } else if (response.status === 403) {
        errorMessage = 'このプロジェクトの課題種別を取得する権限がありません';
      }
      
      throw new Error(errorMessage);
    }
    
    const issueTypes = await response.json();
    console.log('課題種別を取得しました:', issueTypes.length + '件');
    return { success: true, issueTypes: issueTypes };
    
  } catch (error) {
    console.error('課題種別取得エラー:', error);
    return { success: false, message: error.message };
  }
}

/**
 * プロジェクトの優先度一覧を取得する
 * @returns {Promise<{success: boolean, priorities?: Array, message?: string}>}
 */
async function handleGetPriorities() {
  try {
    // APIキーを取得
    const apiKeyResult = await handleGetApiKey();
    if (!apiKeyResult.success) {
      return { success: false, message: 'APIキーが設定されていません' };
    }
    
    const { apiKey, domain } = apiKeyResult;
    const baseUrl = buildBacklogApiUrl(domain);
    
    const response = await fetch(`${baseUrl}/priorities?apiKey=${apiKey}`);
    
    if (!response.ok) {
      let errorMessage = '優先度の取得に失敗しました';
      
      if (response.status === 401) {
        errorMessage = 'APIキーが無効です';
      }
      
      throw new Error(errorMessage);
    }
    
    const priorities = await response.json();
    console.log('優先度を取得しました:', priorities.length + '件');
    return { success: true, priorities: priorities };
    
  } catch (error) {
    console.error('優先度取得エラー:', error);
    return { success: false, message: error.message };
  }
}
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
      // HTTPステータスコードに応じた詳細なエラーメッセージ
      let errorMessage = 'ユーザ情報の取得に失敗しました';
      
      if (response.status === 401) {
        errorMessage = 'APIキーが無効です。設定を確認してください';
      } else if (response.status === 403) {
        errorMessage = 'ユーザ情報を取得する権限がありません';
      } else if (response.status >= 500) {
        errorMessage = 'Backlogサーバーでエラーが発生しました。しばらく時間をおいて再試行してください';
      }
      
      throw new Error(errorMessage);
    }
    
    const user = await response.json();
    
    console.log('ユーザ情報を取得しました:', user.name);
    return { success: true, user: user };
    
  } catch (error) {
    console.error('ユーザ情報取得エラー:', error);
    
    // ネットワークエラーの場合
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { success: false, message: 'ネットワークエラーが発生しました。インターネット接続を確認してください' };
    }
    
    return { success: false, message: error.message };
  }
}

/**
 * テンプレート管理機能
 * 要件2.3, 2.6, 2.8, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5
 */

/**
 * デフォルトテンプレートを取得
 * 要件3.2: デフォルトテンプレートにはページURLとタイトルのプレースホルダーを含む
 * @returns {string} デフォルトテンプレート
 */
function getDefaultTemplate() {
  return `参照元:
{{title}}
{{url}}`;
}

/**
 * テンプレートを読み込む
 * 要件2.6: 課題作成時に保存されたテンプレートを使用
 * @returns {Promise<string>} テンプレート文字列
 */
async function loadTemplate() {
  try {
    console.log('テンプレートの読み込みを開始');
    
    // ストレージ機能の確認
    if (!gracefulDegradation.isFeatureAvailable('storage')) {
      console.warn('ストレージ機能が利用できません。デフォルトテンプレートを使用します。');
      return getDefaultTemplate();
    }
    
    const result = await chrome.storage.local.get(['descriptionTemplate']);
    
    if (!result.descriptionTemplate) {
      console.log('保存されたテンプレートが見つかりません。デフォルトテンプレートを使用します。');
      return getDefaultTemplate();
    }
    
    console.log('テンプレートを読み込みました');
    return result.descriptionTemplate;
    
  } catch (error) {
    console.error('テンプレート読み込みエラー:', error);
    // エラー時はデフォルトテンプレートを返す
    console.log('エラーが発生したため、デフォルトテンプレートを使用します。');
    return getDefaultTemplate();
  }
}

/**
 * テンプレートを保存
 * 要件2.3: ユーザーが保存ボタンをクリックした時、テンプレートをStorage APIに永続化
 * @param {string} template - テンプレート文字列
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function saveTemplate(template) {
  try {
    console.log('テンプレートの保存を開始');
    
    // ストレージ機能の確認
    if (!gracefulDegradation.isFeatureAvailable('storage')) {
      throw new Error('ストレージ機能が利用できません');
    }
    
    // テンプレートデータを保存
    const templateData = {
      descriptionTemplate: template,
      templateUpdatedAt: Date.now()
    };
    
    await chrome.storage.local.set(templateData);
    
    console.log('テンプレートを保存しました');
    return { success: true, message: 'テンプレートを保存しました' };
    
  } catch (error) {
    console.error('テンプレート保存エラー:', error);
    
    // ストレージエラーの場合は機能状態を更新
    if (error.message.includes('storage') || error.message.includes('Storage')) {
      gracefulDegradation.updateFeatureStatus('storage', false);
    }
    
    return { 
      success: false, 
      message: 'テンプレートの保存に失敗しました。もう一度お試しください。'
    };
  }
}

/**
 * テンプレート変数を置換
 * 要件4.3: テンプレートに{{url}}が含まれる場合、実際のページURLに置換
 * 要件4.4: テンプレートに{{title}}が含まれる場合、実際のページタイトルに置換
 * 要件4.5: 認識できない変数はそのまま残す
 * @param {string} template - テンプレート文字列
 * @param {Object} variables - 置換する変数のマップ（例: {url: 'https://...', title: 'ページタイトル'}）
 * @returns {string} 置換後の文字列
 */
function replaceTemplateVariables(template, variables) {
  try {
    console.log('テンプレート変数の置換を開始');
    
    let result = template;
    
    // {{url}}を置換
    // $記号をエスケープするため、置換関数を使用
    if (variables.url) {
      result = result.replace(/\{\{url\}\}/g, () => variables.url);
    }
    
    // {{title}}を置換
    // $記号をエスケープするため、置換関数を使用
    if (variables.title) {
      result = result.replace(/\{\{title\}\}/g, () => variables.title);
    }
    
    // 認識できない変数はそのまま残す（要件4.5）
    console.log('テンプレート変数の置換が完了しました');
    return result;
    
  } catch (error) {
    console.error('テンプレート変数置換エラー:', error);
    // エラー時は元のテンプレートを返す
    return template;
  }
}

/**
 * 種別ごとのテンプレートを読み込む
 * @param {string} issueTypeId - 課題種別ID（'__default__'はデフォルト）
 * @returns {Promise<string|null>} テンプレート文字列（未設定の場合はnull）
 */
async function loadTemplateForIssueType(issueTypeId) {
  try {
    console.log('種別テンプレートの読み込みを開始:', issueTypeId);
    
    if (issueTypeId === '__default__') {
      return await loadTemplate();
    }
    
    const result = await chrome.storage.local.get(['issueTypeTemplates']);
    const templates = result.issueTypeTemplates || {};
    
    if (templates[issueTypeId]) {
      console.log('種別テンプレートを読み込みました:', issueTypeId);
      return templates[issueTypeId];
    }
    
    // 種別テンプレートが未設定の場合はnullを返す（デフォルトにフォールバック）
    return null;
  } catch (error) {
    console.error('種別テンプレート読み込みエラー:', error);
    return null;
  }
}

/**
 * 種別ごとのテンプレートを保存する
 * @param {string} template - テンプレート文字列
 * @param {string} issueTypeId - 課題種別ID（'__default__'はデフォルト）
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function saveTemplateForIssueType(template, issueTypeId) {
  try {
    console.log('種別テンプレートの保存を開始:', issueTypeId);
    
    if (issueTypeId === '__default__') {
      // デフォルトテンプレートとして保存
      return await saveTemplate(template);
    }
    
    // 種別ごとのテンプレートを保存
    const result = await chrome.storage.local.get(['issueTypeTemplates']);
    const templates = result.issueTypeTemplates || {};
    
    templates[issueTypeId] = template;
    
    await chrome.storage.local.set({ 
      issueTypeTemplates: templates,
      issueTypeTemplatesUpdatedAt: Date.now()
    });
    
    console.log('種別テンプレートを保存しました:', issueTypeId);
    return { success: true, message: '種別テンプレートを保存しました' };
    
  } catch (error) {
    console.error('種別テンプレート保存エラー:', error);
    return { success: false, message: '種別テンプレートの保存に失敗しました' };
  }
}

/**
 * Backlog APIから課題種別に紐づくテンプレートを取得する
 * 参照: https://developer.nulab.com/ja/docs/backlog/api/2/get-issue-type-list/
 * 注: Backlog APIには課題種別ごとのテンプレート取得APIはないため、
 * プロジェクトのカスタムフィールドやWikiなどから取得する代わりに
 * 課題種別の情報（templateDescription）を返す
 * @param {string} issueTypeId - 課題種別ID
 * @returns {Promise<{success: boolean, template?: string}>}
 */
async function handleGetIssueTypeTemplate(issueTypeId) {
  try {
    const apiKeyResult = await handleGetApiKey();
    if (!apiKeyResult.success) {
      return { success: false, message: 'APIキーが設定されていません' };
    }
    
    const { apiKey, domain } = apiKeyResult;
    const baseUrl = buildBacklogApiUrl(domain);
    
    // お気に入りプロジェクトを取得して、該当する課題種別を探す
    const favResult = await handleGetFavoriteProjects();
    if (!favResult.success || favResult.projects.length === 0) {
      return { success: false, message: 'お気に入りプロジェクトが設定されていません' };
    }
    
    // 各プロジェクトの課題種別を確認
    for (const project of favResult.projects) {
      try {
        const response = await fetch(`${baseUrl}/projects/${project.id}/issueTypes?apiKey=${apiKey}`);
        if (response.ok) {
          const issueTypes = await response.json();
          const matchedType = issueTypes.find(t => t.id.toString() === issueTypeId.toString());
          if (matchedType && matchedType.templateDescription) {
            return { success: true, template: matchedType.templateDescription };
          }
        }
      } catch (e) {
        console.warn(`プロジェクト ${project.projectKey} の課題種別取得に失敗:`, e);
      }
    }
    
    return { success: false, message: 'テンプレートが見つかりません' };
  } catch (error) {
    console.error('課題種別テンプレート取得エラー:', error);
    return { success: false, message: error.message };
  }
}


/**
 * お気に入りプロジェクト管理機能
 */

/**
 * お気に入りプロジェクトを保存する（スペースID対応）
 * @param {Array} projects - 保存するプロジェクトの配列 [{id, projectKey, name}]
 * @param {string} spaceId - スペースID（省略時はデフォルトスペース）
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function handleSaveFavoriteProjects(projects, spaceId) {
  try {
    console.log('お気に入りプロジェクトの保存を開始:', projects.length + '件', 'スペース:', spaceId);

    // 入力バリデーション
    if (!Array.isArray(projects)) {
      throw new Error('プロジェクトデータが不正です');
    }

    // 必要なフィールドのみ保存（軽量化）
    const sanitizedProjects = projects.map(p => ({
      id: p.id,
      projectKey: p.projectKey,
      name: p.name
    }));

    if (spaceId) {
      // スペースIDが指定されている場合はスペースごとに保存
      const result = await chrome.storage.local.get(['spaceFavoriteProjects']);
      const spaceFavorites = result.spaceFavoriteProjects || {};
      spaceFavorites[spaceId] = sanitizedProjects;
      await chrome.storage.local.set({ spaceFavoriteProjects: spaceFavorites });
    } else {
      // 後方互換性: スペースIDなしの場合は従来通り保存
      await chrome.storage.local.set({ favoriteProjects: sanitizedProjects });
    }

    console.log('お気に入りプロジェクトを保存しました:', sanitizedProjects.length + '件');
    return { success: true, message: 'お気に入りプロジェクトを保存しました' };

  } catch (error) {
    console.error('お気に入りプロジェクト保存エラー:', error);
    return { success: false, message: error.message };
  }
}

/**
 * お気に入りプロジェクトを取得する（スペースID対応）
 * @param {string} spaceId - スペースID（省略時はデフォルトスペース）
 * @returns {Promise<{success: boolean, projects?: Array, message?: string}>}
 */
async function handleGetFavoriteProjects(spaceId) {
  try {
    console.log('お気に入りプロジェクトの取得を開始', 'スペース:', spaceId);

    if (spaceId) {
      // スペースIDが指定されている場合はスペースごとに取得
      const result = await chrome.storage.local.get(['spaceFavoriteProjects']);
      const spaceFavorites = result.spaceFavoriteProjects || {};
      const projects = spaceFavorites[spaceId] || [];
      console.log('お気に入りプロジェクトを取得しました:', projects.length + '件');
      return { success: true, projects: projects };
    } else {
      // 後方互換性: スペースIDなしの場合は従来通り取得
      const result = await chrome.storage.local.get(['favoriteProjects']);
      const projects = result.favoriteProjects || [];
      console.log('お気に入りプロジェクトを取得しました:', projects.length + '件');
      return { success: true, projects: projects };
    }

  } catch (error) {
    console.error('お気に入りプロジェクト取得エラー:', error);
    return { success: false, message: error.message, projects: [] };
  }
}

/**
 * スペース管理機能
 */

/**
 * 登録済みスペース一覧を取得する
 * @returns {Promise<{success: boolean, spaces?: Array, message?: string}>}
 */
async function handleGetSpaces() {
  try {
    console.log('スペース一覧の取得を開始');
    const result = await chrome.storage.local.get(['spaces', 'apiKeyData', 'spacesMigrated']);
    
    // マイグレーション: 旧形式のapiKeyDataが存在しスペースが未登録の場合
    // ただしマイグレーション済み（ユーザーが削除した）場合は再マイグレーションしない
    if ((!result.spaces || result.spaces.length === 0) && !result.spacesMigrated) {
      if (result.apiKeyData && result.apiKeyData.encryptedKey) {
        const { domain, createdAt, encryptedKey } = result.apiKeyData;
        const migratedSpace = {
          id: generateSpaceId(),
          name: domain.split('.')[0],
          domain: domain,
          encryptedKey: encryptedKey,
          createdAt: createdAt || new Date().toISOString()
        };
        await chrome.storage.local.set({ spaces: [migratedSpace], spacesMigrated: true });
        console.log('旧形式のAPIキーデータをスペースにマイグレーションしました:', migratedSpace.name);
        return { success: true, spaces: [migratedSpace] };
      }
      return { success: true, spaces: [] };
    }
    
    // 既存スペースデータの修復: encryptedKeyがないスペースを旧apiKeyDataから補完
    let needsSave = false;
    const spaces = (result.spaces || []).map(space => {
      if (!space.encryptedKey && result.apiKeyData && result.apiKeyData.encryptedKey) {
        // ドメインが一致する場合のみ補完
        if (space.domain === result.apiKeyData.domain) {
          console.log('スペースのencryptedKeyを旧データから補完:', space.name);
          needsSave = true;
          return { ...space, encryptedKey: result.apiKeyData.encryptedKey };
        }
      }
      return space;
    });
    
    // encryptedKeyがないスペースを除外（補完できなかったもの）
    const validSpaces = spaces.filter(s => s.encryptedKey);
    
    if (needsSave || validSpaces.length !== (result.spaces || []).length) {
      await chrome.storage.local.set({ spaces: validSpaces });
    }
    
    console.log('スペース一覧を取得しました:', validSpaces.length + '件');
    return { success: true, spaces: validSpaces };
  } catch (error) {
    console.error('スペース一覧取得エラー:', error);
    return { success: false, message: error.message, spaces: [] };
  }
}

/**
 * スペースを登録する
 * @param {Object} space - スペース情報 {name, domain, apiKey}
 * @returns {Promise<{success: boolean, space?: Object, message?: string}>}
 */
async function handleSaveSpace(space) {
  try {
    console.log('スペースの登録を開始:', space.name);
    
    if (!space.domain || !space.apiKey) {
      throw new Error('ドメインとAPIキーは必須です');
    }
    
    // APIキーの暗号化
    const encryptedKey = btoa(space.apiKey + ':' + Date.now());
    
    const newSpace = {
      id: space.id || generateSpaceId(),
      name: space.name || space.domain.split('.')[0],
      domain: space.domain,
      encryptedKey: encryptedKey,
      createdAt: space.createdAt || new Date().toISOString()
    };
    
    // 既存スペース一覧を取得
    const result = await chrome.storage.local.get(['spaces']);
    const spaces = result.spaces || [];
    
    // 同じIDのスペースがあれば更新、なければ追加
    const existingIndex = spaces.findIndex(s => s.id === newSpace.id);
    if (existingIndex >= 0) {
      spaces[existingIndex] = newSpace;
    } else {
      spaces.push(newSpace);
    }
    
    await chrome.storage.local.set({ spaces: spaces });
    
    // 後方互換性: 最初のスペースの場合はapiKeyDataも更新
    if (spaces.length === 1) {
      const apiKeyData = {
        encryptedKey: encryptedKey,
        domain: space.domain,
        createdAt: newSpace.createdAt
      };
      await chrome.storage.local.set({ apiKeyData: apiKeyData });
    }
    
    console.log('スペースを登録しました:', newSpace.name);
    return { success: true, space: { id: newSpace.id, name: newSpace.name, domain: newSpace.domain, createdAt: newSpace.createdAt } };
  } catch (error) {
    console.error('スペース登録エラー:', error);
    return { success: false, message: error.message };
  }
}

/**
 * スペースを削除する
 * @param {string} spaceId - 削除するスペースのID
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function handleDeleteSpace(spaceId) {
  try {
    console.log('スペースの削除を開始:', spaceId);
    
    const result = await chrome.storage.local.get(['spaces', 'spaceFavoriteProjects']);
    const spaces = result.spaces || [];
    const spaceFavorites = result.spaceFavoriteProjects || {};
    
    // 削除対象のスペースを取得（旧apiKeyDataのクリーンアップ判定用）
    const targetSpace = spaces.find(s => s.id === spaceId);
    
    // スペースを削除
    const filteredSpaces = spaces.filter(s => s.id !== spaceId);
    
    // お気に入りプロジェクトも削除
    delete spaceFavorites[spaceId];
    
    const updateData = { 
      spaces: filteredSpaces,
      spaceFavoriteProjects: spaceFavorites,
      spacesMigrated: true  // マイグレーション済みフラグ
    };
    
    // 削除されたスペースが旧apiKeyDataと同じドメインなら旧データも削除
    if (targetSpace) {
      const legacyResult = await chrome.storage.local.get(['apiKeyData']);
      if (legacyResult.apiKeyData && legacyResult.apiKeyData.domain === targetSpace.domain) {
        await chrome.storage.local.remove(['apiKeyData']);
        console.log('旧apiKeyDataも削除しました');
      }
    }
    
    await chrome.storage.local.set(updateData);
    
    console.log('スペースを削除しました:', spaceId);
    return { success: true, message: 'スペースを削除しました' };
  } catch (error) {
    console.error('スペース削除エラー:', error);
    return { success: false, message: error.message };
  }
}

/**
 * 指定スペースのAPIキーとドメインを取得する
 * @param {string} spaceId - スペースID
 * @returns {Promise<{success: boolean, apiKey?: string, domain?: string}>}
 */
async function getSpaceCredentials(spaceId) {
  try {
    const result = await chrome.storage.local.get(['spaces']);
    const spaces = result.spaces || [];
    const space = spaces.find(s => s.id === spaceId);
    
    if (!space) {
      return { success: false, message: 'スペースが見つかりません' };
    }
    
    if (!space.encryptedKey) {
      return { success: false, message: 'APIキーが設定されていません。スペースを再登録してください。' };
    }
    
    // APIキーの復号化
    let apiKey;
    try {
      const decryptedData = atob(space.encryptedKey);
      apiKey = decryptedData.split(':')[0];
    } catch (decryptError) {
      console.error('APIキー復号化エラー:', decryptError);
      return { success: false, message: 'APIキーの復号化に失敗しました。スペースを再登録してください。' };
    }
    
    if (!apiKey) {
      return { success: false, message: 'APIキーが空です。スペースを再登録してください。' };
    }
    
    return { success: true, apiKey: apiKey, domain: space.domain };
  } catch (error) {
    console.error('スペース認証情報取得エラー:', error);
    return { success: false, message: error.message || 'スペース認証情報の取得に失敗しました' };
  }
}

/**
 * 指定スペースのプロジェクト一覧を取得する
 * @param {string} spaceId - スペースID
 * @returns {Promise<{success: boolean, projects?: Array, message?: string}>}
 */
async function handleGetProjectsForSpace(spaceId) {
  try {
    console.log('スペースのプロジェクト一覧取得:', spaceId);
    
    const credentials = await getSpaceCredentials(spaceId);
    if (!credentials.success) {
      return { success: false, message: credentials.message };
    }
    
    const { apiKey, domain } = credentials;
    const baseUrl = buildBacklogApiUrl(domain);
    
    const response = await fetch(`${baseUrl}/projects?apiKey=${apiKey}`);
    
    if (!response.ok) {
      let errorMessage = 'プロジェクト一覧の取得に失敗しました';
      if (response.status === 401) {
        errorMessage = 'APIキーが無効です。設定を確認してください';
      } else if (response.status === 403) {
        errorMessage = 'プロジェクト一覧を取得する権限がありません';
      }
      throw new Error(errorMessage);
    }
    
    const projects = await response.json();
    console.log('スペースのプロジェクト一覧を取得しました:', projects.length + '件');
    return { success: true, projects: projects };
  } catch (error) {
    console.error('スペースプロジェクト取得エラー:', error);
    return { success: false, message: error.message };
  }
}

/**
 * 指定スペースのプロジェクトの課題種別を取得する
 * @param {string} spaceId - スペースID
 * @param {string} projectId - プロジェクトID
 * @returns {Promise<{success: boolean, issueTypes?: Array, message?: string}>}
 */
async function handleGetIssueTypesForSpace(spaceId, projectId) {
  try {
    const credentials = await getSpaceCredentials(spaceId);
    if (!credentials.success) {
      return { success: false, message: credentials.message };
    }
    
    const { apiKey, domain } = credentials;
    const baseUrl = buildBacklogApiUrl(domain);
    
    const response = await fetch(`${baseUrl}/projects/${projectId}/issueTypes?apiKey=${apiKey}`);
    
    if (!response.ok) {
      let errorMessage = '課題種別の取得に失敗しました';
      if (response.status === 401) errorMessage = 'APIキーが無効です';
      else if (response.status === 404) errorMessage = 'プロジェクトが見つかりません';
      throw new Error(errorMessage);
    }
    
    const issueTypes = await response.json();
    return { success: true, issueTypes: issueTypes };
  } catch (error) {
    console.error('スペース課題種別取得エラー:', error);
    return { success: false, message: error.message };
  }
}

/**
 * 指定スペースで課題を作成する
 * @param {string} spaceId - スペースID
 * @param {string} projectId - プロジェクトID
 * @param {string} summary - 件名
 * @param {string} description - 説明
 * @param {string} issueTypeId - 課題種別ID
 * @returns {Promise<{success: boolean, issue?: Object, message?: string}>}
 */
async function handleCreateIssueForSpace(spaceId, projectId, summary, description, issueTypeId) {
  try {
    console.log('スペースでの課題作成:', { spaceId, projectId, summary: summary.substring(0, 20) + '...' });
    
    if (!projectId || !summary || !issueTypeId) {
      throw new Error('必須フィールドが入力されていません');
    }
    
    if (summary.length > 255) {
      throw new Error('件名は255文字以内で入力してください');
    }
    
    const credentials = await getSpaceCredentials(spaceId);
    if (!credentials.success) {
      return { success: false, message: credentials.message };
    }
    
    const { apiKey, domain } = credentials;
    const baseUrl = buildBacklogApiUrl(domain);
    
    // 優先度を取得
    let priorityId = '3';
    try {
      const response = await fetch(`${baseUrl}/priorities?apiKey=${apiKey}`);
      if (response.ok) {
        const priorities = await response.json();
        if (priorities.length > 0) {
          const middleIndex = Math.floor(priorities.length / 2);
          priorityId = priorities[middleIndex].id.toString();
        }
      }
    } catch (e) {
      console.warn('優先度の取得に失敗:', e);
    }
    
    // 現在のユーザ情報を取得
    let assigneeId = null;
    try {
      const response = await fetch(`${baseUrl}/users/myself?apiKey=${apiKey}`);
      if (response.ok) {
        const user = await response.json();
        assigneeId = user.id;
      }
    } catch (e) {
      console.warn('ユーザ情報の取得に失敗:', e);
    }
    
    // 課題作成パラメータ
    const params = new URLSearchParams({
      apiKey: apiKey,
      projectId: projectId,
      summary: summary,
      issueTypeId: issueTypeId,
      priorityId: priorityId
    });
    
    if (description && description.trim()) {
      params.append('description', description.trim());
    }
    if (assigneeId) {
      params.append('assigneeId', assigneeId);
    }
    
    const today = new Date().toISOString().split('T')[0];
    params.append('dueDate', today);
    
    const response = await fetch(`${baseUrl}/issues?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    if (!response.ok) {
      let errorMessage = '課題の作成に失敗しました';
      if (response.status === 401) errorMessage = 'APIキーが無効です';
      else if (response.status === 403) errorMessage = '課題を作成する権限がありません';
      else if (response.status === 404) errorMessage = 'プロジェクトが見つかりません';
      throw new Error(errorMessage);
    }
    
    const issue = await response.json();
    console.log('課題を作成しました:', issue.issueKey);
    return { success: true, issue: issue };
  } catch (error) {
    console.error('スペース課題作成エラー:', error);
    return { success: false, message: error.message };
  }
}

/**
 * スペースIDを生成する
 * @returns {string} ユニークなスペースID
 */
function generateSpaceId() {
  return 'space_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}
