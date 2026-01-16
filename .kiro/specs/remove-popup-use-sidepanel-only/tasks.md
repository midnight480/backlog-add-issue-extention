# 実装計画: Popup削除とSidepanelのみの使用

## 概要

この実装計画は、Chrome拡張機能からPopup機能を完全に削除し、拡張機能アイコンをクリックした際にサイドパネルのみが開くように変更するためのタスクを定義します。各タスクは段階的に実装され、既存のSidepanel機能を維持しながら、不要なPopupコードを削除します。

## タスク

- [x] 1. manifest.jsonの更新
  - `action.default_popup`プロパティを削除
  - `side_panel`設定が正しく維持されていることを確認
  - 必要な権限（`sidePanel`, `storage`, `activeTab`など）が維持されていることを確認
  - Manifest V3形式の妥当性を確認
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2. Background Service Workerにアクションクリックハンドラーを追加
  - [x] 2.1 `chrome.action.onClicked`イベントリスナーを実装
    - アイコンクリック時にサイドパネルを開く処理を追加
    - エラーハンドリングを実装
    - _Requirements: 2.1, 2.2_
  
  - [x] 2.2 アクションクリックハンドラーのプロパティテストを作成
    - **Property 1: アイコンクリックでサイドパネルが開く**
    - **Validates: Requirements 2.1**
  
  - [x] 2.3 既存サイドパネルへのフォーカスのプロパティテストを作成
    - **Property 2: 既に開いているサイドパネルへのフォーカス**
    - **Validates: Requirements 2.4**

- [x] 3. Popup関連ファイルの削除
  - `popup/popup.html`を削除
  - `popup/popup.js`を削除
  - `popup/popup.css`を削除
  - `popup/`ディレクトリを削除
  - _Requirements: 1.1_

- [x] 4. Popup関連テストファイルの削除
  - `test/popup-ui.test.js`を削除
  - 他のテストファイルにpopup関連のテストが含まれていないか確認
  - _Requirements: 1.4_

- [x] 5. チェックポイント - 基本機能の動作確認
  - すべてのテストが通ることを確認
  - 拡張機能をChromeに読み込んで動作確認
  - アイコンクリックでサイドパネルが開くことを確認
  - ユーザーに質問があれば確認

- [x] 6. Sidepanel機能の継続性テスト
  - [x] 6.1 Sidepanel機能のプロパティテストを作成
    - **Property 3: Sidepanel機能の継続性**
    - **Validates: Requirements 4.1, 4.2**
  
  - [x] 6.2 状態管理機能のプロパティテストを作成
    - **Property 4: 状態管理機能の継続性**
    - **Validates: Requirements 4.3**
  
  - [x] 6.3 APIキー管理機能のプロパティテストを作成
    - **Property 5: APIキー管理機能の継続性**
    - **Validates: Requirements 4.4**

- [x] 7. 統合テストの実行
  - [x] 7.1 エンドツーエンドフローの統合テストを作成
    - 拡張機能のロード
    - アイコンクリック
    - サイドパネルの開閉
    - 各種機能の動作確認
    - _Requirements: 2.1, 4.1, 4.2, 4.3, 4.4_

- [x] 8. 最終チェックポイント - すべてのテストが通ることを確認
  - すべてのテストが通ることを確認
  - 拡張機能の動作を最終確認
  - ユーザーに質問があれば確認

## 注意事項

- 各タスクは特定の要件を参照しており、トレーサビリティを確保しています
- チェックポイントは段階的な検証を保証します
- プロパティテストは普遍的な正確性プロパティを検証します
- ユニットテストは特定の例とエッジケースを検証します
