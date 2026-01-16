# 要件定義書

## 概要

Chrome拡張機能として、BacklogのAPIキー管理と課題追加機能を提供するシステム。ユーザがブラウザを離れることなく、効率的にBacklogに課題を追加できるようにする。

## 用語集

- **Extension**: Chrome拡張機能本体
- **Popup_Menu**: 拡張機能アイコンクリック時に表示されるメニュー
- **Settings_Panel**: APIキー管理を行う設定画面
- **Add_Issue_Panel**: 課題追加を行う画面
- **Backlog_API**: BacklogのREST API
- **API_Key**: BacklogのAPIアクセスキー
- **Project**: Backlogプロジェクト
- **Issue**: Backlog課題
- **Current_Tab**: 現在アクティブなブラウザタブ

## 要件

### 要件1: 拡張機能の基本操作

**ユーザストーリー:** ブラウザユーザとして、拡張機能を簡単に操作したい。そうすることで、Backlogの課題管理を効率化できる。

#### 受け入れ基準

1. WHEN ユーザが拡張機能アイコンをクリック THEN THE Extension SHALL ポップアップメニューを表示する
2. WHEN ポップアップメニューが表示される THEN THE Popup_Menu SHALL SettingsとAdd Issueの2つのオプションを提供する
3. THE Extension SHALL ChromiumベースのGoogle ChromeとMicrosoft Edgeで動作する

### 要件2: APIキー管理機能

**ユーザストーリー:** Backlogユーザとして、APIキーを安全に管理したい。そうすることで、Backlog APIにアクセスできる。

#### 受け入れ基準

1. WHEN ユーザがSettingsを選択 THEN THE Extension SHALL Settings_Panelを表示する
2. WHEN APIキーが未登録の状態 THEN THE Settings_Panel SHALL APIキー入力フィールドと登録ボタンを表示する
3. WHEN ユーザがAPIキーを入力して登録ボタンをクリック THEN THE Extension SHALL APIキーを安全に保存する
4. WHEN APIキーが登録済みの状態 THEN THE Settings_Panel SHALL 変更ボタンと削除ボタンを表示する
5. WHEN ユーザが変更ボタンをクリック THEN THE Extension SHALL APIキーの上書き更新を可能にする
6. WHEN ユーザが削除ボタンをクリック THEN THE Extension SHALL APIキーを削除する

### 要件3: プロジェクト選択機能

**ユーザストーリー:** Backlogユーザとして、登録可能なプロジェクトを簡単に選択したい。そうすることで、適切なプロジェクトに課題を追加できる。

#### 受け入れ基準

1. WHEN ユーザがAdd Issueを選択 THEN THE Extension SHALL Add_Issue_Panelを表示する
2. WHEN Add_Issue_Panelが表示される THEN THE Extension SHALL Backlog_APIを使用して利用可能なプロジェクト一覧を取得する
3. WHEN プロジェクト一覧が取得される THEN THE Add_Issue_Panel SHALL プロジェクト選択のプルダウンメニューを表示する
4. WHEN ユーザがプルダウンメニューに文字を入力 THEN THE Extension SHALL 入力文字でプロジェクトを絞り込み検索する
5. WHEN ユーザがプロジェクトを選択 THEN THE Extension SHALL 選択されたプロジェクトを記録する

### 要件4: 課題作成機能

**ユーザストーリー:** Backlogユーザとして、最小限の入力で課題を作成したい。そうすることで、作業を中断せずに課題管理ができる。

#### 受け入れ基準

1. WHEN プロジェクトが選択済み THEN THE Add_Issue_Panel SHALL 件名入力フィールドを表示する
2. WHEN ユーザが件名を入力 THEN THE Extension SHALL 255文字以内の制限を適用する
3. WHEN 件名が255文字を超える THEN THE Extension SHALL 入力を制限し警告を表示する
4. WHEN ユーザが長い件名を入力 THEN THE Add_Issue_Panel SHALL 入力テキスト全体を視認可能にする
5. WHEN 件名入力フィールドに長いテキストが入力される THEN THE Extension SHALL テキストを複数行で表示するか入力位置まで自動スクロールする
6. WHEN Add_Issue_Panelが表示される THEN THE Extension SHALL Current_TabのURLを取得して課題説明欄に初期設定する
7. WHEN ユーザが課題作成ボタンをクリック THEN THE Extension SHALL Backlog_APIを使用して課題を作成する
8. WHEN 課題を作成する THEN THE Extension SHALL 担当者をAPIキー登録ユーザに設定する
9. WHEN 課題を作成する THEN THE Extension SHALL 期限日を登録日当日に設定する
10. WHEN 課題作成が成功 THEN THE Extension SHALL 成功メッセージを表示する
11. WHEN 課題作成が失敗 THEN THE Extension SHALL エラーメッセージを表示する

### 要件5: データ永続化

**ユーザストーリー:** システム管理者として、ユーザデータを適切に管理したい。そうすることで、セキュリティと利便性を両立できる。

#### 受け入れ基準

1. WHEN APIキーが保存される THEN THE Extension SHALL Chrome拡張機能のストレージAPIを使用する
2. WHEN APIキーが保存される THEN THE Extension SHALL データを暗号化して保存する
3. WHEN ブラウザが再起動される THEN THE Extension SHALL 保存されたAPIキーを復元する
4. WHEN ユーザがAPIキーを削除 THEN THE Extension SHALL 関連するすべてのデータを削除する

### 要件6: エラーハンドリング

**ユーザストーリー:** システムユーザとして、エラーが発生した際に適切な情報を得たい。そうすることで、問題を理解し対処できる。

#### 受け入れ基準

1. WHEN Backlog_APIへの接続が失敗 THEN THE Extension SHALL 接続エラーメッセージを表示する
2. WHEN APIキーが無効 THEN THE Extension SHALL 認証エラーメッセージを表示する
3. WHEN 必須フィールドが未入力 THEN THE Extension SHALL 入力エラーメッセージを表示する
4. WHEN ネットワークエラーが発生 THEN THE Extension SHALL ネットワークエラーメッセージを表示する
5. IF エラーが発生 THEN THE Extension SHALL ユーザが操作を継続できるよう適切な状態を維持する
