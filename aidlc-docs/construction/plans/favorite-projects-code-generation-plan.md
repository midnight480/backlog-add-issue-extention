# コード生成計画: お気に入りプロジェクト機能

## ユニット概要
- **ユニット名**: favorite-projects
- **対象要件**: FR-1（Settingsパネル）、FR-2（Add Issueパネル）、FR-3（データ管理）
- **変更対象ファイル**: 4ファイル（すべて既存ファイルの変更）

## 実装ステップ

---

### Step 1: service-worker.js — お気に入りプロジェクト管理アクションの追加
- [x] `saveFavoriteProjects(projects)` 関数を追加
- [x] `getFavoriteProjects()` 関数を追加
- [x] `chrome.runtime.onMessage` のswitch文に `saveFavoriteProjects`、`getFavoriteProjects` を追加
- [x] `handleDeleteApiKey` 関数内でAPIキー削除時に `favoriteProjects` もクリアする処理を追加

---

### Step 2: sidepanel.html — Settingsパネルにお気に入りプロジェクトセクションを追加
- [x] 「説明文テンプレート設定」セクションの前に「お気に入りプロジェクト」セクションを追加
- [x] Add Issueパネルのプロジェクト選択セクションをプルダウンUIに変更

---

### Step 3: sidepanel.css — お気に入りプロジェクト関連スタイルの追加
- [x] お気に入りプロジェクトセクションのスタイル追加
- [x] Add Issueパネルのプロジェクト選択スタイル調整

---

### Step 4: sidepanel.js — お気に入りプロジェクト管理ロジックの追加（Settingsパネル側）
- [x] `init()` メソッドにDOM要素参照を追加
- [x] `init()` に `favoriteProjectsData`、`favoriteProjectIds` を追加
- [x] `setupEventListeners()` にお気に入り関連イベントを追加
- [x] `loadAllProjectsForFavorites()` メソッドを追加
- [x] `renderFavoriteProjectsList()` メソッドを追加
- [x] `saveFavoriteProjects()` メソッドを追加
- [x] `loadFavoriteProjectsFromStorage()` メソッドを追加
- [x] `init()` 内で `loadFavoriteProjectsFromStorage()` を呼び出す

---

### Step 5: sidepanel.js — Add Issueパネルのプロジェクト選択UIを変更
- [x] `initializeAddIssuePanel()` を変更
- [x] `renderFavoriteProjectsInAddIssue()` メソッドを追加
- [x] `favoriteProjectSelect` の `change` イベントハンドラーを追加
- [x] `loadState()` の `selectedProject` 復元ロジックを `favoriteProjectSelect` に対応させる

---

### Step 6: 動作確認用チェックリスト（Build and Testフェーズで実施）
- [ ] Settingsパネルで「プロジェクトを読み込む」→ チェックボックス一覧が表示される
- [ ] チェックボックスで複数選択 → 「保存」で保存される
- [ ] Add Issueパネルを開く → お気に入りプロジェクトのプルダウンが表示される
- [ ] お気に入り未設定時 → エラーメッセージ + Settings誘導が表示される
- [ ] APIキー削除時 → お気に入りプロジェクトもクリアされる

---

## 依存関係
- 既存の `sendMessageToBackground()` メソッドを再利用
- 既存の `showMessage()` メソッドを再利用
- 既存の `getProjects` Service Workerアクションを再利用
- 既存の `selectProject()` メソッドを再利用（Add Issue側）
