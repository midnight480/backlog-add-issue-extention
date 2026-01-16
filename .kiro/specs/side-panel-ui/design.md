# 設計書

## 概要

Chrome拡張機能のUIをポップアップ形式からサイドパネル形式に拡張する機能の設計。Chrome Extensions Side Panel APIを使用して、ブラウザウィンドウの横に固定表示されるUIを実装する。サイドパネルは入力状態を保持し、ユーザーがページ内の情報をコピー&ペーストしながら課題を作成できるようにする。

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Browser                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Popup UI   │  │ Side Panel   │  │  Background  │  │
│  │              │  │      UI      │  │Service Worker│  │
│  │  - Settings  │  │  - Settings  │  │              │  │
│  │  - Add Issue │  │  - Add Issue │  │  - API Calls │  │
│  │  - Open Side │  │  - State Mgmt│  │  - Storage   │  │
│  │    Panel Btn │  │              │  │  - Side Panel│  │
│  │              │  │              │  │    Control   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
│         └─────────────────┴──────────────────┘          │
│                           │                             │
│                  ┌────────▼────────┐                    │
│                  │ Chrome Storage  │                    │
│                  │  - API Key      │                    │
│                  │  - Panel State  │                    │
│                  │  - User Input   │                    │
│                  └─────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### コンポーネント構成

1. **Popup UI** (既存)
   - 拡張機能アイコンクリック時に表示
   - サイドパネルを開くボタンを追加
   - 既存の機能を維持

2. **Side Panel UI** (新規)
   - ブラウザウィンドウの横に表示
   - Popup UIと同じ機能を提供
   - 入力状態を自動保存・復元

3. **Background Service Worker** (拡張)
   - サイドパネルの開閉制御
   - 状態の保存・復元
   - Popup UIとSide Panel UIの状態同期

4. **State Manager** (新規)
   - 入力状態の管理
   - Chrome Storageへの保存
   - デバウンス処理

## コンポーネントと インターフェース

### 1. Side Panel UI (`sidepanel/sidepanel.html`, `sidepanel/sidepanel.js`)

**責務:**
- サイドパネルのUIを表示
- ユーザー入力を受け付け
- 入力状態を自動保存

**主要メソッド:**
```javascript
class SidePanelUI {
  constructor()
  init()
  loadState()
  saveState()
  setupAutoSave()
  syncWithPopup()
}
```

### 2. State Manager (`shared/state-manager.js`)

**責務:**
- 入力状態の管理
- Chrome Storageへの保存・読み込み
- デバウンス処理

**主要メソッド:**
```javascript
class StateManager {
  constructor(storageKey, debounceMs = 500)
  async saveState(state)
  async loadState()
  async clearState()
  debounce(func, wait)
}
```

**データ構造:**
```javascript
{
  selectedProject: {
    id: string,
    name: string,
    projectKey: string
  },
  issueType: string,
  summary: string,
  description: string,
  timestamp: number
}
```

### 3. Background Service Worker (拡張)

**追加メソッド:**
```javascript
// サイドパネルの初期化
async function initializeSidePanel()

// サイドパネルを開く
async function openSidePanel(windowId)

// サイドパネルの状態を取得
async function getSidePanelState()

// サイドパネルの状態を保存
async function saveSidePanelState(state)
```

**メッセージハンドラー:**
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'openSidePanel':
      // サイドパネルを開く
      break;
    case 'savePanelState':
      // 状態を保存
      break;
    case 'loadPanelState':
      // 状態を読み込み
      break;
    case 'clearPanelState':
      // 状態をクリア
      break;
  }
});
```

### 4. Popup UI (拡張)

**追加要素:**
- サイドパネルを開くボタン

**追加メソッド:**
```javascript
class PopupUI {
  // 既存のメソッド...
  
  // サイドパネルを開く
  async openSidePanel()
  
  // サイドパネルの状態と同期
  async syncWithSidePanel()
}
```

## データモデル

### Panel State

```javascript
{
  // 選択されたプロジェクト
  selectedProject: {
    id: string,
    name: string,
    projectKey: string
  } | null,
  
  // 選択された課題種別
  issueType: string | null,
  
  // 件名
  summary: string,
  
  // 説明
  description: string,
  
  // 現在のタブ情報
  currentTab: {
    url: string,
    title: string
  } | null,
  
  // タイムスタンプ
  timestamp: number,
  
  // サイドパネルの開閉状態
  isOpen: boolean,
  
  // サイドパネルの幅
  panelWidth: number
}
```

### Storage Keys

```javascript
const STORAGE_KEYS = {
  PANEL_STATE: 'sidePanelState',
  PANEL_WIDTH: 'sidePanelWidth',
  PANEL_IS_OPEN: 'sidePanelIsOpen',
  API_KEY: 'backlogApiKey',
  API_DOMAIN: 'backlogDomain'
};
```

## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械が検証可能な正確性保証の橋渡しとなります。*

### Property 1: 状態の永続化（ラウンドトリップ）

*任意の*入力状態について、サイドパネルを閉じてから再度開いた場合、保存された状態が正しく復元されるべきである

**検証: 要件 2.2, 2.3**

### Property 2: 自動保存

*任意の*フォーム入力について、入力後に自動的にストレージに保存されるべきである

**検証: 要件 2.1**

### Property 3: 状態のクリア（課題作成後）

*任意の*保存された状態について、課題作成が成功した場合、状態がクリアされるべきである

**検証: 要件 2.4**

### Property 4: 状態のクリア（手動クリア）

*任意の*保存された状態について、ユーザーがクリア操作を実行した場合、状態がクリアされるべきである

**検証: 要件 2.5**

### Property 5: ポップアップとの状態同期

*任意の*入力状態について、ポップアップとサイドパネルの両方が開いている場合、一方での変更が他方に反映されるべきである

**検証: 要件 3.5**

### Property 6: タブ切り替え時の状態保持

*任意の*入力内容について、タブを切り替えた後も入力内容が保持されているべきである

**検証: 要件 4.2**

### Property 7: 新しいタブでの状態引き継ぎ

*任意の*入力内容について、新しいタブでサイドパネルを開いた場合、前のタブの入力内容が引き継がれるべきである

**検証: 要件 4.3**

### Property 8: タブURL情報の反映

*任意の*タブについて、タブが変更された場合、新しいタブのURL情報が説明欄に反映されるべきである

**検証: 要件 4.4**

### Property 9: サイドパネル幅の記憶

*任意の*幅調整について、ユーザーが調整した幅が保存され、次回開いた時に復元されるべきである

**検証: 要件 1.5**

### Property 10: 開閉状態の記録

*任意の*開閉操作について、サイドパネルの開閉状態が記録されるべきである

**検証: 要件 6.1**

### Property 11: 再起動後の状態復元

*任意の*開閉状態について、ブラウザ再起動後にサイドパネルの開閉状態が復元されるべきである

**検証: 要件 6.3**

### Property 12: デバウンス処理

*任意の*連続した入力について、デバウンス期間内の複数の保存リクエストは、最後の1回のみ実行されるべきである

**検証: 要件 7.3**

## エラーハンドリング

### 1. Side Panel API利用不可

**シナリオ:** ブラウザがSide Panel APIをサポートしていない

**対応:**
```javascript
async function checkSidePanelSupport() {
  if (!chrome.sidePanel) {
    console.warn('Side Panel API is not supported');
    return false;
  }
  return true;
}

// manifest.jsonで最小バージョンを指定
{
  "minimum_chrome_version": "114"
}
```

### 2. 状態の保存失敗

**シナリオ:** Chrome Storageへの保存が失敗

**対応:**
```javascript
async function saveStateWithRetry(state, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await chrome.storage.local.set({ sidePanelState: state });
      return { success: true };
    } catch (error) {
      console.error(`Save attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) {
        return { 
          success: false, 
          message: '状態の保存に失敗しました' 
        };
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 3. 状態の復元失敗

**シナリオ:** 保存された状態が破損している

**対応:**
```javascript
async function loadStateWithValidation() {
  try {
    const result = await chrome.storage.local.get('sidePanelState');
    const state = result.sidePanelState;
    
    if (!state || !validateState(state)) {
      console.warn('Invalid state, using default');
      return getDefaultState();
    }
    
    return state;
  } catch (error) {
    console.error('Failed to load state:', error);
    return getDefaultState();
  }
}

function validateState(state) {
  return (
    typeof state === 'object' &&
    typeof state.summary === 'string' &&
    typeof state.description === 'string'
  );
}

function getDefaultState() {
  return {
    selectedProject: null,
    issueType: null,
    summary: '',
    description: '',
    currentTab: null,
    timestamp: Date.now()
  };
}
```

### 4. サイドパネルの初期化失敗

**シナリオ:** サイドパネルの初期化中にエラーが発生

**対応:**
```javascript
async function initializeSidePanelWithFallback() {
  try {
    const isSupported = await checkSidePanelSupport();
    if (!isSupported) {
      throw new Error('Side Panel not supported');
    }
    
    await chrome.sidePanel.setPanelBehavior({ 
      openPanelOnActionClick: false 
    });
    
    await chrome.sidePanel.setOptions({
      path: 'sidepanel/sidepanel.html',
      enabled: true
    });
    
    return { success: true };
  } catch (error) {
    console.error('Side panel initialization failed:', error);
    // ポップアップモードにフォールバック
    return { 
      success: false, 
      fallbackToPopup: true,
      message: 'サイドパネルが利用できません。ポップアップモードで動作します。'
    };
  }
}
```

## テスト戦略

### ユニットテスト

**対象:**
- State Managerの各メソッド
- デバウンス処理
- 状態のバリデーション
- エラーハンドリング

**テストケース例:**
```javascript
describe('StateManager', () => {
  test('should save state to storage', async () => {
    const manager = new StateManager('test');
    const state = { summary: 'Test', description: 'Test desc' };
    await manager.saveState(state);
    const loaded = await manager.loadState();
    expect(loaded).toEqual(state);
  });
  
  test('should debounce multiple save calls', async () => {
    const manager = new StateManager('test', 100);
    const saveSpy = jest.spyOn(chrome.storage.local, 'set');
    
    manager.saveState({ summary: '1' });
    manager.saveState({ summary: '2' });
    manager.saveState({ summary: '3' });
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledWith({
      test: { summary: '3' }
    });
  });
  
  test('should return default state when storage is empty', async () => {
    const manager = new StateManager('test');
    const state = await manager.loadState();
    expect(state).toEqual(manager.getDefaultState());
  });
});
```

### プロパティベーステスト

**Property 1: 状態の永続化**
```javascript
describe('Property 1: State Persistence', () => {
  test('for any input state, closing and reopening should restore state', async () => {
    // 100回のランダムな状態でテスト
    for (let i = 0; i < 100; i++) {
      const randomState = generateRandomState();
      
      // 状態を保存
      await stateManager.saveState(randomState);
      
      // 状態をクリア（サイドパネルを閉じる）
      stateManager.clearMemory();
      
      // 状態を復元（サイドパネルを開く）
      const restoredState = await stateManager.loadState();
      
      // 復元された状態が元の状態と一致することを確認
      expect(restoredState).toEqual(randomState);
    }
  });
});

function generateRandomState() {
  return {
    selectedProject: Math.random() > 0.5 ? {
      id: Math.floor(Math.random() * 1000).toString(),
      name: `Project ${Math.random()}`,
      projectKey: `PROJ${Math.floor(Math.random() * 100)}`
    } : null,
    issueType: Math.random() > 0.5 ? Math.floor(Math.random() * 10).toString() : null,
    summary: generateRandomString(Math.floor(Math.random() * 255)),
    description: generateRandomString(Math.floor(Math.random() * 1000)),
    timestamp: Date.now()
  };
}
```

**Property 2: 状態のクリア**
```javascript
describe('Property 2: State Clearing', () => {
  test('for any saved state, successful issue creation should clear state', async () => {
    for (let i = 0; i < 100; i++) {
      const randomState = generateRandomState();
      
      // 状態を保存
      await stateManager.saveState(randomState);
      
      // 課題作成成功をシミュレート
      await handleIssueCreationSuccess();
      
      // 状態がクリアされていることを確認
      const clearedState = await stateManager.loadState();
      expect(clearedState).toEqual(stateManager.getDefaultState());
    }
  });
});
```

**Property 5: デバウンス処理**
```javascript
describe('Property 5: Debounce Processing', () => {
  test('for any continuous inputs, only last save should execute within debounce period', async () => {
    const manager = new StateManager('test', 500);
    const saveSpy = jest.spyOn(chrome.storage.local, 'set');
    
    for (let i = 0; i < 100; i++) {
      // ランダムな回数の連続入力をシミュレート
      const inputCount = Math.floor(Math.random() * 10) + 1;
      const states = [];
      
      for (let j = 0; j < inputCount; j++) {
        const state = generateRandomState();
        states.push(state);
        manager.saveState(state);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // デバウンス期間を待つ
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // 最後の状態のみが保存されていることを確認
      const lastState = states[states.length - 1];
      expect(saveSpy).toHaveBeenLastCalledWith({
        test: lastState
      });
      
      saveSpy.mockClear();
    }
  });
});
```

### 統合テスト

**シナリオ1: ポップアップからサイドパネルを開く**
```javascript
test('should open side panel from popup', async () => {
  // ポップアップを開く
  const popup = await openPopup();
  
  // サイドパネルを開くボタンをクリック
  await popup.clickOpenSidePanelButton();
  
  // サイドパネルが開いていることを確認
  const sidePanel = await getSidePanel();
  expect(sidePanel.isOpen()).toBe(true);
});
```

**シナリオ2: 状態の同期**
```javascript
test('should sync state between popup and side panel', async () => {
  // ポップアップで入力
  const popup = await openPopup();
  await popup.enterSummary('Test summary');
  
  // サイドパネルを開く
  const sidePanel = await openSidePanel();
  
  // サイドパネルに入力が反映されていることを確認
  expect(sidePanel.getSummary()).toBe('Test summary');
  
  // サイドパネルで追加入力
  await sidePanel.enterDescription('Test description');
  
  // ポップアップに反映されていることを確認
  expect(popup.getDescription()).toBe('Test description');
});
```

### テスト実行

**テストフレームワーク:** Jest

**実行コマンド:**
```bash
npm test
```

**カバレッジ目標:**
- ユニットテスト: 80%以上
- プロパティベーステスト: 各プロパティ100回以上の実行
- 統合テスト: 主要シナリオをカバー

**継続的インテグレーション:**
- プルリクエスト時に自動実行
- すべてのテストが成功することを確認
