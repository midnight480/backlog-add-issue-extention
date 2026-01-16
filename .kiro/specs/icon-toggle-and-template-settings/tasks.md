# Implementation Plan: icon-toggle-and-template-settings

## Overview

本実装計画は、Chrome拡張機能「AnyBacklog」に2つの新機能を追加するための段階的な実装手順を定義します。各タスクは、設計書に基づいて実装可能な単位に分割されており、テストを含めた完全な実装を目指します。

## Tasks

- [x] 1. サイドパネルトグル機能の実装
  - [x] 1.1 Service Workerにトグルロジックを実装
    - `getSidePanelState()`関数を実装し、Chrome Storage APIから現在の状態を取得
    - `closeSidePanel()`関数を実装し、サイドパネルにクローズメッセージを送信
    - `chrome.action.onClicked`イベントハンドラーを更新し、状態に応じて開閉を切り替え
    - エラーハンドリング: 状態クエリ失敗時はデフォルトで開く動作にフォールバック
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 1.2 プロパティテスト: サイドパネルのトグル動作の正確性
    - **Property 1: サイドパネルのトグル動作の正確性**
    - **Validates: Requirements 1.1, 1.2**

  - [x] 1.3 プロパティテスト: 状態変更の永続化
    - **Property 2: 状態変更の永続化**
    - **Validates: Requirements 1.3**

  - [x] 1.4 プロパティテスト: トグル操作前の状態クエリ
    - **Property 3: トグル操作前の状態クエリ**
    - **Validates: Requirements 1.4**

  - [x] 1.5 ユニットテスト: 状態クエリ失敗時のフォールバック
    - 状態クエリが失敗した場合、デフォルトで開く動作になることを確認
    - _Requirements: 1.5_

- [x] 2. サイドパネル側のクローズ処理実装
  - [x] 2.1 サイドパネルにメッセージリスナーを追加
    - `closeSidePanel`メッセージを受信した時に`window.close()`を呼び出す処理を実装
    - メッセージ受信後、`sidePanelIsOpen`を`false`に更新
    - _Requirements: 1.2, 1.3_

  - [x] 2.2 ユニットテスト: クローズメッセージの処理
    - クローズメッセージを受信した時に`window.close()`が呼ばれることを確認
    - 状態が正しく更新されることを確認
    - _Requirements: 1.2, 1.3_

- [x] 3. Checkpoint - トグル機能の動作確認
  - すべてのテストが通ることを確認し、ユーザーに質問があれば尋ねる

- [x] 4. テンプレート管理機能の実装（Service Worker側）
  - [x] 4.1 Template Managerの実装
    - `getDefaultTemplate()`関数を実装し、デフォルトテンプレートを返す
    - `loadTemplate()`関数を実装し、Chrome Storage APIからテンプレートを読み込む
    - `saveTemplate()`関数を実装し、Chrome Storage APIにテンプレートを保存
    - `replaceTemplateVariables()`関数を実装し、`{{url}}`と`{{title}}`を置換
    - エラーハンドリング: 読み込み失敗時はデフォルトテンプレートを使用
    - _Requirements: 2.3, 2.6, 2.8, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.2 プロパティテスト: テンプレートの保存
    - **Property 5: テンプレートの保存**
    - **Validates: Requirements 2.3**

  - [x] 4.3 プロパティテスト: テンプレート変数の置換
    - **Property 8: テンプレート変数の置換**
    - **Validates: Requirements 2.8, 4.3, 4.4**

  - [x] 4.4 プロパティテスト: 未知の変数の保持
    - **Property 11: 未知の変数の保持**
    - **Validates: Requirements 4.5**

  - [x] 4.5 ユニットテスト: デフォルトテンプレートの内容
    - デフォルトテンプレートに`{{url}}`と`{{title}}`が含まれることを確認
    - _Requirements: 3.2_

  - [x] 4.6 ユニットテスト: 特定の変数の置換
    - `{{url}}`が正しく置換されることを確認
    - `{{title}}`が正しく置換されることを確認
    - _Requirements: 4.1, 4.2_

- [x] 5. Service Workerにメッセージハンドラーを追加
  - [x] 5.1 テンプレート関連のメッセージハンドラーを実装
    - `loadTemplate`アクション: テンプレートを読み込んで返す
    - `saveTemplate`アクション: テンプレートを保存し、成功/失敗を返す
    - `resetTemplate`アクション: デフォルトテンプレートを保存し、成功/失敗を返す
    - `replaceVariables`アクション: テンプレート変数を置換して返す
    - _Requirements: 2.1, 2.3, 3.3_

  - [x] 5.2 ユニットテスト: メッセージハンドラーの動作
    - 各アクションが正しく処理されることを確認
    - _Requirements: 2.1, 2.3, 3.3_

- [x] 6. Settings画面にテンプレートエディタUIを追加
  - [x] 6.1 HTMLにテンプレートエディタセクションを追加
    - Settings Panelに新しいセクション「説明文テンプレート」を追加
    - テンプレート編集用のtextareaを追加（id: `templateEditor`）
    - 文字数カウンター表示用の要素を追加（id: `templateCharCounter`）
    - 保存ボタンを追加（id: `saveTemplateBtn`）
    - リセットボタンを追加（id: `resetTemplateBtn`）
    - 変数の説明テキストを追加（`{{url}}`と`{{title}}`が使用可能であることを説明）
    - メッセージ表示エリアを追加（id: `templateMessage`）
    - _Requirements: 2.1, 5.1_

  - [x] 6.2 CSSスタイルを追加
    - テンプレートエディタセクションのスタイルを定義
    - 文字数カウンターのスタイルを定義
    - ボタンのスタイルを定義（既存のボタンスタイルを再利用）
    - メッセージ表示エリアのスタイルを定義（成功/エラー）
    - _Requirements: 5.1_

  - [x] 6.3 ユニットテスト: UI要素の存在確認
    - テンプレートエディタが表示されることを確認
    - 文字数カウンターが表示されることを確認
    - _Requirements: 5.1_

- [x] 7. テンプレートエディタのJavaScript実装
  - [x] 7.1 Template Editor UIクラスを実装
    - `initializeTemplateEditor()`関数を実装し、初期化処理を行う
    - `loadTemplateToUI()`関数を実装し、Service Workerからテンプレートを読み込んでUIに表示
    - `saveTemplateFromUI()`関数を実装し、UIの内容をService Workerに送信して保存
    - `resetTemplateToDefault()`関数を実装し、デフォルトテンプレートに戻す
    - `updateCharacterCounter()`関数を実装し、文字数カウンターをリアルタイム更新
    - イベントリスナーを設定（textarea入力、保存ボタンクリック、リセットボタンクリック）
    - _Requirements: 2.1, 2.2, 2.3, 3.3, 5.2_

  - [x] 7.2 保存処理の実装
    - 保存ボタンクリック時にボタンを無効化し、ローディング状態を表示
    - Service Workerに保存メッセージを送信
    - 成功時: 成功メッセージを表示し、3秒後に自動非表示
    - 失敗時: エラーメッセージを表示し、入力内容を保持
    - 保存完了後にボタンを再度有効化
    - _Requirements: 2.3, 2.4, 2.5, 5.3, 5.4, 5.5_

  - [x] 7.3 リセット処理の実装
    - リセットボタンクリック時に確認ダイアログを表示
    - 確認後、Service Workerにリセットメッセージを送信
    - 成功時: デフォルトテンプレートをUIに表示し、確認メッセージを表示
    - _Requirements: 3.3, 3.4, 3.5_

  - [x] 7.4 プロパティテスト: テンプレートの読み込みと表示
    - **Property 4: テンプレートの読み込みと表示**
    - **Validates: Requirements 2.1**

  - [x] 7.5 プロパティテスト: 保存成功時のメッセージ表示
    - **Property 6: 保存成功時のメッセージ表示**
    - **Validates: Requirements 2.4**

  - [x] 7.6 プロパティテスト: テンプレートのリセット動作
    - **Property 9: テンプレートのリセット動作**
    - **Validates: Requirements 3.3**

  - [x] 7.7 プロパティテスト: リセット後のUI更新
    - **Property 10: リセット後のUI更新**
    - **Validates: Requirements 3.5**

  - [x] 7.8 プロパティテスト: 文字数カウンターのリアルタイム更新
    - **Property 12: 文字数カウンターのリアルタイム更新**
    - **Validates: Requirements 5.2**

  - [x] 7.9 プロパティテスト: 保存操作中のボタン状態管理
    - **Property 13: 保存操作中のボタン状態管理**
    - **Validates: Requirements 5.3, 5.4**

  - [x] 7.10 プロパティテスト: メッセージの自動非表示
    - **Property 14: メッセージの自動非表示**
    - **Validates: Requirements 5.5**

  - [x] 7.11 ユニットテスト: 保存失敗時のエラーハンドリング
    - 保存失敗時にエラーメッセージが表示されることを確認
    - 入力内容が保持されることを確認
    - _Requirements: 2.5_

- [x] 8. Checkpoint - テンプレート編集機能の動作確認
  - すべてのテストが通ることを確認し、ユーザーに質問があれば尋ねる

- [x] 9. 課題作成時のテンプレート適用機能を実装
  - [x] 9.1 Description Field Handlerを更新
    - 既存の`updateIssueDescription()`関数を更新し、テンプレートを使用
    - Service Workerから保存されたテンプレートを読み込む
    - 現在のページ情報（URL、タイトル）を取得
    - `replaceVariables`メッセージをService Workerに送信し、変数を置換
    - 置換後のテンプレートを説明欄に設定
    - _Requirements: 2.6, 2.8_

  - [x] 9.2 プロパティテスト: 課題作成時のテンプレート適用
    - **Property 7: 課題作成時のテンプレート適用**
    - **Validates: Requirements 2.6**

  - [x] 9.3 ユニットテスト: テンプレート適用の統合テスト
    - プロジェクト選択後、説明欄にテンプレートが適用されることを確認
    - _Requirements: 2.6_

- [x] 10. 初回インストール時の初期化処理を実装
  - [x] 10.1 Service Workerの初期化処理を更新
    - `chrome.runtime.onInstalled`イベントハンドラーを更新
    - 初回インストール時（`details.reason === 'install'`）にデフォルトテンプレートを保存
    - _Requirements: 3.1_

  - [x] 10.2 ユニットテスト: 初回インストール時の初期化
    - 初回インストール時にデフォルトテンプレートが保存されることを確認
    - _Requirements: 3.1_

- [x] 11. 統合テストと最終調整
  - [x] 11.1 E2Eテストシナリオの実装
    - シナリオ1: アイコンクリックでサイドパネルを開く→再度クリックで閉じる
    - シナリオ2: テンプレートを編集→保存→課題作成時に適用される
    - シナリオ3: テンプレートをリセット→デフォルト値に戻る
    - _Requirements: 1.1, 1.2, 2.3, 2.6, 3.3_

  - [x] 11.2 エラーハンドリングの統合テスト
    - ストレージエラー時の動作を確認
    - メッセージング失敗時の動作を確認
    - _Requirements: 1.5, 2.5_

  - [x] 11.3 既存機能との互換性確認
    - 既存のサイドパネル機能が正常に動作することを確認
    - 既存の課題作成機能が正常に動作することを確認

- [x] 12. Final Checkpoint - すべてのテストが通ることを確認
  - すべてのテストが通ることを確認し、ユーザーに質問があれば尋ねる

## Notes

- すべてのタスクは必須です（包括的なテストカバレッジを確保）
- 各タスクは具体的な要件を参照しており、トレーサビリティを確保しています
- Checkpointタスクで段階的に動作確認を行い、問題を早期に発見します
- プロパティテストは最小100回の反復実行で網羅的にテストします
- ユニットテストは特定の例やエッジケースを検証します
