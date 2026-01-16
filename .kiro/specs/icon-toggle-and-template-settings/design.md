# Design Document

## Overview

本設計書は、Chrome拡張機能「AnyBacklog」に2つの新機能を追加するための技術設計を定義します。

**機能1: アイコンクリックによるサイドパネルのトグル**
- 現在の実装では、アイコンをクリックすると常にサイドパネルを開く動作になっています
- 新しい実装では、サイドパネルが既に開いている場合は閉じる動作を追加します
- Chrome Side Panel APIには直接的な「閉じる」メソッドが存在しないため、回避策を実装します

**機能2: 説明文テンプレートの編集・保存機能**
- Settings画面に新しいセクションを追加し、テンプレート編集UIを提供します
- テンプレートは変数（`{{url}}`、`{{title}}`）をサポートし、課題作成時に動的に置換されます
- Chrome Storage APIを使用してテンプレートを永続化します

## Architecture

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Browser                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Extension Icon (Action)                  │  │
│  │                      ↓ click                          │  │
│  │              Service Worker                           │  │
│  │         (background/service-worker.js)                │  │
│  │                      ↓                                │  │
│  │         ┌────────────┴────────────┐                   │  │
│  │         ↓                         ↓                   │  │
│  │   Toggle Logic            Template Manager            │  │
│  │   - Query state           - Load template             │  │
│  │   - Open/Close            - Save template             │  │
│  │                           - Replace variables         │  │
│  │         ↓                         ↓                   │  │
│  │   Chrome Storage API      Chrome Storage API          │  │
│  │   (sidePanelIsOpen)       (descriptionTemplate)       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Side Panel UI                        │  │
│  │            (sidepanel/sidepanel.html)                 │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │  Settings Panel                              │    │  │
│  │  │  - API Key Settings (existing)               │    │  │
│  │  │  - Template Editor (new)                     │    │  │
│  │  │    * Textarea for editing                    │    │  │
│  │  │    * Save button                             │    │  │
│  │  │    * Reset button                            │    │  │
│  │  │    * Character counter                       │    │  │
│  │  │    * Variable help text                      │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │  Add Issue Panel                             │    │  │
│  │  │  - Description field uses template (updated) │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### データフロー

**機能1: トグル処理のフロー**
```
1. User clicks Extension Icon
   ↓
2. Service Worker receives chrome.action.onClicked event
   ↓
3. Query current state from Chrome Storage API
   ↓
4. If sidePanelIsOpen === true:
     - Send message to Side Panel to close itself
     - Side Panel calls window.close()
     - Update sidePanelIsOpen = false
   Else:
     - Call chrome.sidePanel.open()
     - Update sidePanelIsOpen = true
```

**機能2: テンプレート処理のフロー**
```
1. User opens Settings Panel
   ↓
2. Load template from Chrome Storage API
   ↓
3. Display in Template Editor
   ↓
4. User edits template
   ↓
5. User clicks Save button
   ↓
6. Validate template
   ↓
7. Save to Chrome Storage API
   ↓
8. Show success message

---

When creating issue:
1. Load template from Chrome Storage API
   ↓
2. Get current page info (URL, title)
   ↓
3. Replace {{url}} with actual URL
   ↓
4. Replace {{title}} with actual title
   ↓
5. Set as description field value
```

## Components and Interfaces

### Component 1: Toggle Manager (Service Worker)

**責務:**
- アイコンクリックイベントを処理
- サイドパネルの現在の状態を判定
- 状態に応じて開閉処理を実行

**インターフェース:**
```javascript
/**
 * サイドパネルの開閉状態を取得
 * @returns {Promise<boolean>} サイドパネルが開いているかどうか
 */
async function getSidePanelState()

/**
 * サイドパネルを開く
 * @param {number} windowId - ウィンドウID
 * @returns {Promise<void>}
 */
async function openSidePanel(windowId)

/**
 * サイドパネルを閉じる
 * @param {number} windowId - ウィンドウID
 * @returns {Promise<void>}
 */
async function closeSidePanel(windowId)

/**
 * サイドパネルの状態を保存
 * @param {boolean} isOpen - 開いているかどうか
 * @returns {Promise<void>}
 */
async function saveSidePanelState(isOpen)
```

**実装の詳細:**
- Chrome Side Panel APIには`close()`メソッドが存在しないため、サイドパネル側で`window.close()`を呼び出す必要があります
- Service Workerからサイドパネルにメッセージングでクローズ指示を送信します
- メッセージング失敗時のフォールバック処理を実装します

### Component 2: Template Manager (Service Worker)

**責務:**
- テンプレートの読み込み・保存
- テンプレート変数の置換処理
- デフォルトテンプレートの管理

**インターフェース:**
```javascript
/**
 * テンプレートを読み込む
 * @returns {Promise<string>} テンプレート文字列
 */
async function loadTemplate()

/**
 * テンプレートを保存
 * @param {string} template - テンプレート文字列
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function saveTemplate(template)

/**
 * デフォルトテンプレートを取得
 * @returns {string} デフォルトテンプレート
 */
function getDefaultTemplate()

/**
 * テンプレート変数を置換
 * @param {string} template - テンプレート文字列
 * @param {Object} variables - 置換する変数のマップ
 * @returns {string} 置換後の文字列
 */
function replaceTemplateVariables(template, variables)
```

**デフォルトテンプレート:**
```
参照元:
{{title}}
{{url}}
```

### Component 3: Template Editor UI (Side Panel)

**責務:**
- テンプレート編集UIの表示
- リアルタイム文字数カウント
- 保存・リセット操作の処理
- バリデーションとエラー表示

**インターフェース:**
```javascript
/**
 * テンプレートエディタを初期化
 * @returns {Promise<void>}
 */
async function initializeTemplateEditor()

/**
 * テンプレートを読み込んでUIに表示
 * @returns {Promise<void>}
 */
async function loadTemplateToUI()

/**
 * テンプレートを保存
 * @returns {Promise<void>}
 */
async function saveTemplateFromUI()

/**
 * テンプレートをデフォルトにリセット
 * @returns {Promise<void>}
 */
async function resetTemplateToDefault()

/**
 * 文字数カウンターを更新
 * @param {string} text - カウント対象のテキスト
 */
function updateCharacterCounter(text)
```

### Component 4: Description Field Handler (Side Panel)

**責務:**
- 課題作成時にテンプレートを適用
- 現在のページ情報を取得
- テンプレート変数を実際の値に置換

**インターフェース:**
```javascript
/**
 * 説明欄にテンプレートを適用
 * @returns {Promise<void>}
 */
async function applyTemplateToDescription()

/**
 * 現在のページ情報を取得
 * @returns {Promise<{url: string, title: string}>}
 */
async function getCurrentPageInfo()
```

## Data Models

### Storage Schema

**1. サイドパネル開閉状態**
```javascript
{
  sidePanelIsOpen: boolean,           // サイドパネルが開いているかどうか
  sidePanelOpenedAt: number,          // 開いた時刻（タイムスタンプ）
  sidePanelClosedAt: number           // 閉じた時刻（タイムスタンプ）
}
```

**2. 説明文テンプレート**
```javascript
{
  descriptionTemplate: string,        // テンプレート文字列
  templateUpdatedAt: number           // 更新時刻（タイムスタンプ）
}
```

### Template Variables

サポートする変数:
- `{{url}}`: 現在のページのURL
- `{{title}}`: 現在のページのタイトル

変数の置換ルール:
- 変数は大文字小文字を区別します
- 認識できない変数はそのまま残します
- 変数の前後の空白は保持されます

## Correctness Properties

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械が検証可能な正確性の保証との橋渡しとなります。*

### Property 1: サイドパネルのトグル動作の正確性

*For any* ウィンドウIDとサイドパネルの初期状態（開いている/閉じている）に対して、アイコンをクリックした時、サイドパネルの状態は反転する（開いている→閉じる、閉じている→開く）べきです。

**Validates: Requirements 1.1, 1.2**

### Property 2: 状態変更の永続化

*For any* サイドパネルの状態変更（開く→閉じる、閉じる→開く）に対して、変更後の状態はChrome Storage APIに正しく保存されるべきです。

**Validates: Requirements 1.3**

### Property 3: トグル操作前の状態クエリ

*For any* アイコンクリックイベントに対して、トグル操作を実行する前に、システムは現在のサイドパネル状態をChrome Storage APIから取得するべきです。

**Validates: Requirements 1.4**

### Property 4: テンプレートの読み込みと表示

*For any* 保存されたテンプレート内容に対して、Settings画面を開いた時、Template Editorにはそのテンプレート内容が正しく表示されるべきです。

**Validates: Requirements 2.1**

### Property 5: テンプレートの保存

*For any* テンプレート文字列に対して、保存ボタンをクリックした時、そのテンプレートはChrome Storage APIに正しく保存されるべきです。

**Validates: Requirements 2.3**

### Property 6: 保存成功時のメッセージ表示

*For any* テンプレート保存操作が成功した場合、システムは成功メッセージを表示するべきです。

**Validates: Requirements 2.4**

### Property 7: 課題作成時のテンプレート適用

*For any* 保存されたテンプレートに対して、課題作成画面を開いた時、説明欄にはそのテンプレートが適用されているべきです。

**Validates: Requirements 2.6**

### Property 8: テンプレート変数の置換

*For any* テンプレート文字列と現在のページ情報（URL、タイトル）に対して、課題作成時にテンプレート内の`{{url}}`と`{{title}}`は実際のURLとタイトルに置換されるべきです。

**Validates: Requirements 2.8, 4.3, 4.4**

### Property 9: テンプレートのリセット動作

*For any* 現在のテンプレート内容に対して、リセットボタンをクリックした時、テンプレートはデフォルト値に復元されるべきです。

**Validates: Requirements 3.3**

### Property 10: リセット後のUI更新

*For any* リセット操作に対して、リセット完了後、Template Editorの内容はデフォルトテンプレートに更新されるべきです。

**Validates: Requirements 3.5**

### Property 11: 未知の変数の保持

*For any* 認識できない変数（`{{url}}`、`{{title}}`以外）を含むテンプレートに対して、変数置換処理後も、その未知の変数はそのまま残るべきです。

**Validates: Requirements 4.5**

### Property 12: 文字数カウンターのリアルタイム更新

*For any* Template Editorへのテキスト入力に対して、文字数カウンターは入力されたテキストの文字数を正しく表示するべきです。

**Validates: Requirements 5.2**

### Property 13: 保存操作中のボタン状態管理

*For any* 保存操作に対して、保存ボタンは操作開始時に無効化され、操作完了時に再度有効化されるべきです。

**Validates: Requirements 5.3, 5.4**

### Property 14: メッセージの自動非表示

*For any* 成功またはエラーメッセージの表示に対して、メッセージは表示から3秒後に自動的に非表示になるべきです。

**Validates: Requirements 5.5**

## Error Handling

### エラーシナリオと対応

**1. サイドパネル状態クエリの失敗**
- **発生条件**: Chrome Storage APIへのアクセスが失敗した場合
- **対応**: デフォルトでサイドパネルを開く動作にフォールバック
- **ユーザーへの通知**: コンソールログにエラーを記録（ユーザーには通知しない）
- **Validates: Requirements 1.5**

**2. サイドパネルのクローズ失敗**
- **発生条件**: サイドパネルへのメッセージング失敗、またはwindow.close()が機能しない場合
- **対応**: エラーをログに記録し、次回のアイコンクリック時に再試行
- **ユーザーへの通知**: サイドパネルが閉じない場合、ユーザーは手動で閉じることができる

**3. テンプレート保存の失敗**
- **発生条件**: Chrome Storage APIへの書き込みが失敗した場合
- **対応**: エラーメッセージを表示し、ユーザーの入力内容を保持
- **ユーザーへの通知**: 「テンプレートの保存に失敗しました。もう一度お試しください。」
- **リトライ**: ユーザーが再度保存ボタンをクリックすることで再試行可能
- **Validates: Requirements 2.5**

**4. テンプレート読み込みの失敗**
- **発生条件**: Chrome Storage APIからの読み込みが失敗した場合
- **対応**: デフォルトテンプレートを使用
- **ユーザーへの通知**: 「テンプレートの読み込みに失敗しました。デフォルトテンプレートを使用します。」

**5. 変数置換時のエラー**
- **発生条件**: ページ情報の取得に失敗した場合
- **対応**: 変数をそのまま残す（例: `{{url}}`が`{{url}}`のまま）
- **ユーザーへの通知**: なし（変数が置換されないことで暗黙的に通知）

### エラーログ

すべてのエラーは以下の形式でコンソールログに記録されます:
```javascript
console.error('[AnyBacklog] エラー内容:', error);
```

## Testing Strategy

### テスト方針

本機能のテストは、**ユニットテスト**と**プロパティベーステスト**の2つのアプローチを組み合わせて実施します。

**ユニットテスト**:
- 特定の例やエッジケースを検証
- エラーハンドリングの動作確認
- UI要素の存在確認

**プロパティベーステスト**:
- 普遍的なプロパティを多数の入力で検証
- ランダムな入力に対する動作の正確性を保証
- 最小100回の反復実行で網羅的にテスト

### テストライブラリ

- **テストフレームワーク**: Jest
- **プロパティベーステストライブラリ**: fast-check
- **モック**: jest.mock()を使用してChrome APIをモック

### テストケース

#### ユニットテスト

**1. サイドパネルトグル機能**
- アイコンクリック時のイベントハンドラーが正しく登録されている
- 状態クエリ失敗時にデフォルトで開く動作になる（Requirements 1.5）
- サイドパネルクローズのメッセージングが正しく送信される

**2. テンプレート管理機能**
- デフォルトテンプレートが正しい内容である（Requirements 3.2）
- Template Editorが表示される（Requirements 5.1）
- 保存失敗時にエラーメッセージが表示され、入力が保持される（Requirements 2.5）

**3. 変数置換機能**
- `{{url}}`変数が正しく置換される（Requirements 4.1）
- `{{title}}`変数が正しく置換される（Requirements 4.2）
- 初回インストール時にデフォルトテンプレートが設定される（Requirements 3.1）

#### プロパティベーステスト

各プロパティテストは、設計書のCorrectness Propertiesセクションに記載されたプロパティに対応します。

**テストタグ形式**:
```javascript
// Feature: icon-toggle-and-template-settings, Property 1: サイドパネルのトグル動作の正確性
```

**プロパティテスト一覧**:

1. **Property 1: サイドパネルのトグル動作の正確性**
   - ランダムなウィンドウIDと初期状態を生成
   - アイコンクリックをシミュレート
   - 状態が反転することを検証
   - 最小100回実行

2. **Property 2: 状態変更の永続化**
   - ランダムな状態変更を生成
   - 状態変更を実行
   - Storage APIに正しく保存されることを検証
   - 最小100回実行

3. **Property 3: トグル操作前の状態クエリ**
   - ランダムなアイコンクリックイベントを生成
   - 状態クエリが実行されることを検証
   - 最小100回実行

4. **Property 4: テンプレートの読み込みと表示**
   - ランダムなテンプレート文字列を生成
   - Settings画面を開く
   - Template Editorに正しく表示されることを検証
   - 最小100回実行

5. **Property 5: テンプレートの保存**
   - ランダムなテンプレート文字列を生成
   - 保存操作を実行
   - Storage APIに正しく保存されることを検証
   - 最小100回実行

6. **Property 6: 保存成功時のメッセージ表示**
   - ランダムなテンプレートを保存
   - 成功メッセージが表示されることを検証
   - 最小100回実行

7. **Property 7: 課題作成時のテンプレート適用**
   - ランダムなテンプレートを保存
   - 課題作成画面を開く
   - 説明欄にテンプレートが適用されることを検証
   - 最小100回実行

8. **Property 8: テンプレート変数の置換**
   - ランダムなURL、タイトル、テンプレートを生成
   - 変数置換を実行
   - 正しく置換されることを検証
   - 最小100回実行

9. **Property 9: テンプレートのリセット動作**
   - ランダムなテンプレートを設定
   - リセット操作を実行
   - デフォルト値に復元されることを検証
   - 最小100回実行

10. **Property 10: リセット後のUI更新**
    - ランダムなテンプレートを設定
    - リセット操作を実行
    - Template Editorがデフォルトテンプレートに更新されることを検証
    - 最小100回実行

11. **Property 11: 未知の変数の保持**
    - ランダムな未知の変数を含むテンプレートを生成
    - 変数置換を実行
    - 未知の変数がそのまま残ることを検証
    - 最小100回実行

12. **Property 12: 文字数カウンターのリアルタイム更新**
    - ランダムなテキストを生成
    - Template Editorに入力
    - 文字数カウンターが正しく更新されることを検証
    - 最小100回実行

13. **Property 13: 保存操作中のボタン状態管理**
    - ランダムなテンプレートで保存操作を実行
    - 保存中にボタンが無効化されることを検証
    - 保存完了後にボタンが有効化されることを検証
    - 最小100回実行

14. **Property 14: メッセージの自動非表示**
    - ランダムなメッセージを表示
    - 3秒後に非表示になることを検証
    - 最小100回実行

### テスト実行

```bash
# すべてのテストを実行
npm test

# プロパティベーステストのみ実行
npm test -- --testNamePattern="Property"

# 特定の機能のテストのみ実行
npm test -- icon-toggle-and-template-settings
```

### カバレッジ目標

- **行カバレッジ**: 80%以上
- **分岐カバレッジ**: 75%以上
- **関数カバレッジ**: 85%以上

### 継続的インテグレーション

- すべてのプルリクエストでテストを自動実行
- テスト失敗時はマージをブロック
- カバレッジレポートを自動生成

