# コード生成計画: お気に入りプロジェクト検索 + テンプレート読み込み不具合修正

## ユニット概要
- **ユニット名**: favorite-projects-search-and-bugfix
- **対象要件**: FR-1（検索機能）、FR-2（テンプレートプルダウン不具合修正）
- **変更対象ファイル**: 4ファイル（すべて既存ファイルの変更）

## 実装ステップ

---

### Step 1: i18nメッセージの追加（日英両方）
- [x] `_locales/ja/messages.json` に `favoriteProjectsSearchPlaceholder`、`favoriteProjectsSearchNoMatch` を追加
- [x] `_locales/en/messages.json` に同じキーで英語版を追加

---

### Step 2: sidepanel.html に検索入力欄を追加
- [x] 「お気に入りプロジェクト」セクションの `favoriteProjectsList` の**直前**に `<input type="search" id="favoriteProjectsSearch">` を追加
- [x] 検索欄は初期状態では `hidden` クラスを付け非表示
- [x] 検索結果0件時のメッセージ用 `<div id="favoriteProjectsNoMatch">` を追加（初期は `hidden`）

---

### Step 3: sidepanel.css に検索入力欄のスタイルを追加
- [x] `.favorite-projects-search` のスタイル（width 100%, padding, border, margin-bottom 8px, フォーカス時緑ハイライト）
- [x] `.favorite-projects-no-match` のスタイル（padding, テキスト色、センタリング）

---

### Step 4: sidepanel.js — 検索入力欄のDOM参照追加
- [x] `init()` 内で `this.favoriteProjectsSearch` と `this.favoriteProjectsNoMatch` のDOM参照を追加

---

### Step 5: sidepanel.js — 検索入力欄のイベントハンドラ追加
- [x] `setupEventListeners()` に `favoriteProjectsSearch` の `input` イベントを追加
- [x] 入力値で部分一致フィルタ（名前・プロジェクトキーの双方、大小文字非区別）し、一覧を再描画

---

### Step 6: sidepanel.js — renderFavoriteProjectsList にフィルタ対応を追加
- [x] `renderFavoriteProjectsList(filterText = '')` にフィルタ引数を追加
- [x] フィルタ文字列が空の場合は全件、そうでない場合はプロジェクト名/キーの部分一致のみ描画
- [x] フィルタ結果が0件の場合は `favoriteProjectsNoMatch` を表示
- [x] チェック状態は `this.favoriteProjectIds`（Set）から引き続き参照

---

### Step 7: sidepanel.js — loadAllProjectsForFavorites で検索欄を表示
- [x] プロジェクト一覧読み込み成功後、`favoriteProjectsSearch` から `hidden` を外す
- [x] 読み込み失敗時は検索欄を非表示のまま維持

---

### Step 8: sidepanel.js — チェックボックス変更時に `favoriteProjectIds` を追従
- [x] `renderFavoriteProjectsList()` 内で生成するチェックボックスに `change` イベントを追加
- [x] チェックON時は `favoriteProjectIds` に追加、OFF時は削除
- [x] これにより検索でフィルタしてもチェック状態が保持される（FR-1.6）

---

### Step 9: sidepanel.js — 不具合修正: 初期化順序の見直し
- [x] `init()` で `loadFavoriteProjectsFromStorage()` を `initializeTemplateEditor()` より**前に**呼び出す
- [x] これにより初回起動時にお気に入りプロジェクト情報が揃った状態で課題種別プルダウンが構築される

---

### Step 10: sidepanel.js — 不具合修正: 保存後の再構築
- [x] `saveFavoriteProjects()` の成功時（`response.success` ブランチ）に `await this.loadIssueTypesForTemplateEditor()` を呼び出し
- [x] これによりお気に入り更新が「課題種別ごとのテンプレート」プルダウンに即時反映される

---

### Step 11: saveFavoriteProjects 保存処理の収集ロジック調整
- [x] 現在の実装はDOM上の `checkbox:checked` を基にしているが、フィルタ中は非表示の選択済みチェックボックスが除外されてしまう
- [x] `favoriteProjectIds`（Set）を一次情報として、そのIDに対応する `favoriteProjectsData` からプロジェクト情報を取得して保存する方式に変更
- [x] これによりフィルタ状態に関わらず、全選択済みプロジェクトが正しく保存される

---

### Step 12: 動作確認（Build and Testフェーズで実施）
- [x] 既存テスト（settings-panel.test.js 他全47スイート・483件）が全合格

---

## 依存関係
- 既存の `sendMessageToBackground()` メソッドを再利用
- 既存の `showMessage()` / `showFavoriteProjectsMessage()` メソッドを再利用
- 既存の `loadIssueTypesForTemplateEditor()` を再利用
- 既存の i18n システム（`data-i18n`, `data-i18n-placeholder`）を再利用
