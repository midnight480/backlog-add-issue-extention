# 実行計画

## 詳細分析サマリー

### 変更スコープ（Brownfield）
- **変更タイプ**: 単一コンポーネント群の機能拡張
- **主要変更**: Settingsパネルへのお気に入りプロジェクト選択UI追加、Add IssueパネルのプロジェクトUIをお気に入りに限定
- **影響コンポーネント**: sidepanel.html、sidepanel.js、sidepanel.css、service-worker.js

### 変更影響評価
- **ユーザー向け変更**: Yes — Settings/Add Issue両パネルのUI変更
- **構造的変更**: No — 既存アーキテクチャ内での変更
- **データモデル変更**: Yes — `favoriteProjects` ストレージキーの追加
- **API変更**: Yes — Service Workerに `saveFavoriteProjects`、`getFavoriteProjects` アクション追加
- **NFR影響**: 軽微 — 既存のローディング・エラーハンドリングパターンを踏襲

### リスク評価
- **リスクレベル**: Low
- **ロールバック複雑度**: Easy（ストレージキーの削除とUI変更の差し戻し）
- **テスト複雑度**: Simple（既存テストパターンに準拠）

---

## ワークフロー可視化

```
INCEPTION PHASE
+---------------------------+
| Workspace Detection  DONE |
| Reverse Engineering  SKIP |
| Requirements Analysis DONE|
| User Stories         SKIP |
| Workflow Planning    DONE |
| Application Design   SKIP |
| Units Generation     SKIP |
+---------------------------+
            |
            v
CONSTRUCTION PHASE
+---------------------------+
| Functional Design    SKIP |
| NFR Requirements     SKIP |
| NFR Design           SKIP |
| Infrastructure Design SKIP|
| Code Generation    EXECUTE|
| Build and Test     EXECUTE|
+---------------------------+
            |
            v
         Complete
```

---

## 実行するフェーズ

### 🔵 INCEPTION PHASE
- [x] Workspace Detection（完了）
- [x] Reverse Engineering（スキップ - 小規模機能追加のため）
- [x] Requirements Analysis（完了）
- [x] User Stories（スキップ - シンプルな機能追加のため）
- [x] Workflow Planning（完了）
- [ ] Application Design — **SKIP**
  - **理由**: 既存コンポーネント境界内の変更。新規コンポーネントや新規サービスレイヤーは不要
- [ ] Units Generation — **SKIP**
  - **理由**: 変更は単一ユニット（サイドパネル + Service Worker）に収まる。分解不要

### 🟢 CONSTRUCTION PHASE
- [ ] Functional Design — **SKIP**
  - **理由**: 新規ビジネスロジックなし。UIとストレージ操作のみ
- [ ] NFR Requirements — **SKIP**
  - **理由**: 既存のNFR設定（エラーハンドリング、リトライ、デバウンス）で十分
- [ ] NFR Design — **SKIP**
  - **理由**: NFR Requirementsをスキップするため
- [ ] Infrastructure Design — **SKIP**
  - **理由**: インフラ変更なし（Chrome Extension内の変更のみ）
- [ ] Code Generation — **EXECUTE**（必須）
  - **理由**: 実装計画とコード生成が必要
- [x] Build and Test — **EXECUTE**（必須）
  - **理由**: ビルド・テスト・検証が必要。テスト失敗の修正を含め完了。

### 🟡 OPERATIONS PHASE
- [ ] Operations — PLACEHOLDER

---

## 実装対象ファイル

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `sidepanel/sidepanel.html` | 変更 | お気に入りプロジェクトセクションのHTML追加 |
| `sidepanel/sidepanel.js` | 変更 | お気に入り管理ロジック、Add Issue UIの変更 |
| `sidepanel/sidepanel.css` | 変更 | お気に入りセクションのスタイル追加 |
| `background/service-worker.js` | 変更 | `saveFavoriteProjects`、`getFavoriteProjects` アクション追加 |

---

## 成功基準
- **主要目標**: Settingsでお気に入りプロジェクトを複数選択でき、Add Issueでその中から選択できる
- **主要成果物**: 変更済みの4ファイル
- **品質ゲート**: 既存テストが通過すること、新機能が正常動作すること
