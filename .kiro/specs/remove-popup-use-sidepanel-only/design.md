# Design Document

## Overview

この設計は、Chrome拡張機能からPopup機能を完全に削除し、拡張機能アイコンをクリックした際にサイドパネルのみが開くように変更します。現在、拡張機能はPopupとSidepanelの両方をサポートしていますが、ユーザーエクスペリエンスを統一し、コードベースをシンプルにするため、Sidepanelのみを使用する構成に変更します。

この変更により、以下の利点が得られます：
- コードベースの簡素化とメンテナンス性の向上
- 一貫したユーザーエクスペリエンスの提供
- 不要なファイルとテストコードの削除によるプロジェクトサイズの削減

## Architecture

### 現在のアーキテクチャ

```
Chrome Extension
├── Background Service Worker
│   ├── APIキー管理
│   ├── Backlog API通信
│   └── サイドパネル制御
├── Popup UI (削除対象)
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── Sidepanel UI (継続使用)
│   ├── sidepanel.html
│   ├── sidepanel.js
│   └── sidepanel.css
└── Content Scripts
    └── url-extractor.js
```

### 変更後のアーキテクチャ

```
Chrome Extension
├── Background Service Worker
│   ├── APIキー管理
│   ├── Backlog API通信
│   ├── サイドパネル制御
│   └── アクションクリックハンドラー (新規)
├── Sidepanel UI (継続使用)
│   ├── sidepanel.html
│   ├── sidepanel.js
│   └── sidepanel.css
└── Content Scripts
    └── url-extractor.js
```

## Components and Interfaces

### 1. Manifest Configuration

**変更内容:**
- `action.default_popup`プロパティを削除
- `side_panel`設定を維持
- 必要な権限（`sidePanel`, `storage`, `activeTab`など）を維持

**変更前:**
```json
{
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": { ... }
  },
  "side_panel": {
    "default_path": "sidepanel/sidepanel.html"
  }
}
```

**変更後:**
```json
{
  "action": {
    "default_icon": { ... }
  },
  "side_panel": {
    "default_path": "sidepanel/sidepanel.html"
  }
}
```

### 2. Background Service Worker

**新規機能:**
- `chrome.action.onClicked`イベントリスナーの追加
- サイドパネルを開く処理の実装

**インターフェース:**
```javascript
// アクションクリックイベントハンドラー
chrome.action.onClicked.addListener(async (tab) => {
  // サイドパネルを開く
  await chrome.sidePanel.open({ windowId: tab.windowId });
});
```

**既存機能の維持:**
- APIキー管理機能
- Backlog API通信機能
- サイドパネル状態管理機能
- エラー回復機能

### 3. Sidepanel UI

**変更なし:**
- 既存のすべての機能を維持
- APIキー管理UI
- 課題作成UI
- プロジェクト選択UI
- 状態管理機能

### 4. ファイル削除

**削除対象:**
- `popup/popup.html`
- `popup/popup.js`
- `popup/popup.css`
- `test/popup-ui.test.js`

## Data Models

### Manifest Configuration Model

```javascript
{
  manifest_version: 3,
  name: string,
  version: string,
  description: string,
  permissions: string[],
  background: {
    service_worker: string
  },
  action: {
    default_icon: {
      "16": string,
      "48": string,
      "128": string
    }
    // default_popup は削除
  },
  side_panel: {
    default_path: string
  },
  icons: {
    "16": string,
    "48": string,
    "128": string
  }
}
```

### Action Click Event Model

```javascript
{
  tab: {
    id: number,
    windowId: number,
    url: string,
    title: string
  }
}
```

## Correctness Properties

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*

### Acceptance Criteria Testing Prework

1.1 THE Extension SHALL remove all popup-related files from the project
  Thoughts: これはファイルシステムの状態に関する要件です。プロジェクトディレクトリ内にpopup関連のファイルが存在しないことを確認できます。
  Testable: yes - example

1.2 THE Extension SHALL remove popup configuration from the Manifest
  Thoughts: manifest.jsonの構造に関する要件です。`action.default_popup`プロパティが存在しないことを確認できます。
  Testable: yes - example

1.3 WHEN the Extension is loaded, THEN THE Extension SHALL not register any popup functionality
  Thoughts: これは拡張機能の動作に関する要件です。拡張機能がロードされた際にpopup機能が登録されていないことを確認できます。
  Testable: yes - example

1.4 THE Extension SHALL remove all popup-related test files
  Thoughts: テストファイルの存在に関する要件です。popup関連のテストファイルが存在しないことを確認できます。
  Testable: yes - example

2.1 WHEN a user clicks the extension icon, THEN THE Extension SHALL open the Sidepanel
  Thoughts: これはユーザーインタラクションに関する要件です。拡張機能アイコンをクリックした際にサイドパネルが開くことを確認できます。
  Testable: yes - property

2.2 THE Service_Worker SHALL handle the action click event to open the Sidepanel
  Thoughts: Service Workerのイベントハンドラーに関する要件です。`chrome.action.onClicked`リスナーが登録されていることを確認できます。
  Testable: yes - example

2.3 THE Manifest SHALL configure the action to trigger Sidepanel opening
  Thoughts: manifest.jsonの設定に関する要件です。`action`設定が適切に構成されていることを確認できます。
  Testable: yes - example

2.4 WHEN the Sidepanel is already open, THEN THE Extension SHALL focus on the existing Sidepanel
  Thoughts: これはサイドパネルの状態管理に関する要件です。既に開いているサイドパネルにフォーカスが移動することを確認できます。
  Testable: yes - property

3.1 THE Manifest SHALL remove the default_popup property from the action configuration
  Thoughts: manifest.jsonの構造に関する要件です。`action.default_popup`が存在しないことを確認できます。
  Testable: yes - example

3.2 THE Manifest SHALL retain the side_panel configuration
  Thoughts: manifest.jsonの構造に関する要件です。`side_panel`設定が存在することを確認できます。
  Testable: yes - example

3.3 THE Manifest SHALL retain all necessary permissions for Sidepanel functionality
  Thoughts: manifest.jsonのpermissions配列に関する要件です。必要な権限（`sidePanel`, `storage`, `activeTab`など）が含まれていることを確認できます。
  Testable: yes - example

3.4 THE Manifest SHALL maintain valid Manifest V3 format
  Thoughts: manifest.jsonの全体的な構造に関する要件です。Manifest V3の仕様に準拠していることを確認できます。
  Testable: yes - example

4.1 WHEN Popup is removed, THEN THE Sidepanel SHALL continue to function with all existing features
  Thoughts: これはSidepanelの機能に関する要件です。既存のすべての機能が正常に動作することを確認できます。
  Testable: yes - property

4.2 THE Extension SHALL maintain all Backlog-related functionality in the Sidepanel
  Thoughts: Backlog機能に関する要件です。APIキー管理、プロジェクト選択、課題作成などの機能が正常に動作することを確認できます。
  Testable: yes - property

4.3 THE Extension SHALL maintain state management functionality
  Thoughts: 状態管理機能に関する要件です。状態の保存、読み込み、同期が正常に動作することを確認できます。
  Testable: yes - property

4.4 THE Extension SHALL maintain API key management functionality
  Thoughts: APIキー管理機能に関する要件です。APIキーの登録、更新、削除が正常に動作することを確認できます。
  Testable: yes - property

### Property Reflection

プロパティの冗長性を確認します：

- **Property 2.1** (アイコンクリックでサイドパネルが開く) と **Property 2.4** (既に開いている場合はフォーカス) は、両方とも必要です。異なる状態での動作を検証しています。
- **Property 4.1, 4.2, 4.3, 4.4** は、すべて異なる側面の機能を検証しているため、統合できません。

すべてのプロパティは独自の検証価値を提供しているため、冗長性はありません。

### Correctness Properties

Property 1: アイコンクリックでサイドパネルが開く
*For any* 拡張機能の状態において、ユーザーが拡張機能アイコンをクリックした場合、サイドパネルが開くべきである
**Validates: Requirements 2.1**

Property 2: 既に開いているサイドパネルへのフォーカス
*For any* サイドパネルが既に開いている状態で、ユーザーが拡張機能アイコンをクリックした場合、既存のサイドパネルにフォーカスが移動するべきである
**Validates: Requirements 2.4**

Property 3: Sidepanel機能の継続性
*For any* Sidepanelの機能（APIキー管理、プロジェクト選択、課題作成など）において、Popup削除後も正常に動作するべきである
**Validates: Requirements 4.1, 4.2**

Property 4: 状態管理機能の継続性
*For any* 状態管理操作（保存、読み込み、同期）において、Popup削除後も正常に動作するべきである
**Validates: Requirements 4.3**

Property 5: APIキー管理機能の継続性
*For any* APIキー管理操作（登録、更新、削除）において、Popup削除後も正常に動作するべきである
**Validates: Requirements 4.4**

## Error Handling

### エラーケース

1. **サイドパネルAPIが利用できない場合**
   - 検出: `chrome.sidePanel`が未定義
   - 処理: エラーメッセージをコンソールに出力し、ユーザーに通知
   - 回復: なし（Chrome 114以降が必要）

2. **サイドパネルを開く際のエラー**
   - 検出: `chrome.sidePanel.open()`が例外をスロー
   - 処理: エラーをキャッチし、ログに記録
   - 回復: エラーメッセージをユーザーに表示

3. **ウィンドウIDの取得失敗**
   - 検出: アクティブなタブまたはウィンドウが見つからない
   - 処理: フォールバック処理で最後にフォーカスされたウィンドウを使用
   - 回復: `chrome.windows.getLastFocused()`を使用

### エラーメッセージ

```javascript
const ERROR_MESSAGES = {
  SIDE_PANEL_NOT_SUPPORTED: 'このブラウザではサイドパネル機能がサポートされていません',
  SIDE_PANEL_OPEN_FAILED: 'サイドパネルを開けませんでした',
  WINDOW_NOT_FOUND: 'アクティブなウィンドウが見つかりません'
};
```

## Testing Strategy

### Unit Tests

**ファイル構造の検証:**
- Popup関連ファイルが削除されていることを確認
- Popup関連テストファイルが削除されていることを確認

**Manifest設定の検証:**
- `action.default_popup`が存在しないことを確認
- `side_panel`設定が存在することを確認
- 必要な権限が維持されていることを確認
- Manifest V3形式が有効であることを確認

**Service Workerの検証:**
- `chrome.action.onClicked`リスナーが登録されていることを確認
- サイドパネルを開く処理が実装されていることを確認

**Sidepanel機能の検証:**
- APIキー管理機能が正常に動作することを確認
- プロジェクト選択機能が正常に動作することを確認
- 課題作成機能が正常に動作することを確認
- 状態管理機能が正常に動作することを確認

### Property-Based Tests

各プロパティテストは最低100回の反復で実行し、ランダムな入力に対して普遍的な正確性を検証します。

**Property 1: アイコンクリックでサイドパネルが開く**
- テスト: ランダムなタブ状態でアイコンクリックをシミュレート
- 検証: サイドパネルが開くことを確認
- タグ: **Feature: remove-popup-use-sidepanel-only, Property 1: アイコンクリックでサイドパネルが開く**

**Property 2: 既に開いているサイドパネルへのフォーカス**
- テスト: サイドパネルが既に開いている状態でアイコンクリックをシミュレート
- 検証: 既存のサイドパネルにフォーカスが移動することを確認
- タグ: **Feature: remove-popup-use-sidepanel-only, Property 2: 既に開いているサイドパネルへのフォーカス**

**Property 3: Sidepanel機能の継続性**
- テスト: ランダムなSidepanel操作（APIキー管理、プロジェクト選択、課題作成）を実行
- 検証: すべての操作が正常に完了することを確認
- タグ: **Feature: remove-popup-use-sidepanel-only, Property 3: Sidepanel機能の継続性**

**Property 4: 状態管理機能の継続性**
- テスト: ランダムな状態管理操作（保存、読み込み、同期）を実行
- 検証: すべての操作が正常に完了することを確認
- タグ: **Feature: remove-popup-use-sidepanel-only, Property 4: 状態管理機能の継続性**

**Property 5: APIキー管理機能の継続性**
- テスト: ランダムなAPIキー管理操作（登録、更新、削除）を実行
- 検証: すべての操作が正常に完了することを確認
- タグ: **Feature: remove-popup-use-sidepanel-only, Property 5: APIキー管理機能の継続性**

### Integration Tests

**エンドツーエンドフロー:**
1. 拡張機能をロード
2. アイコンをクリック
3. サイドパネルが開くことを確認
4. Sidepanelで各種操作を実行
5. すべての機能が正常に動作することを確認

### Test Configuration

**Property-Based Testing Library:**
- JavaScript: `fast-check`ライブラリを使用
- 各プロパティテストは最低100回の反復で実行
- ランダムシードを記録して再現可能なテストを実現

**Test Environment:**
- Jest + jsdom環境
- Chrome Extension APIのモック
- 既存のテストセットアップ（`test/setup.js`）を活用
