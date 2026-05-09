# .antigravity/instructions.md - Antigravity 指示ファイル

<!-- このファイルは自動生成されています。直接編集しないでください。 -->
<!-- ソース: .aidlc/agent-rules-source.md -->
<!-- 同期日時: 2026-05-08T05:39:54Z -->
<!-- 変更する場合は .aidlc/agent-rules-source.md を編集し、scripts/sync-agent-rules.sh を実行してください。 -->

## 最優先ルール: AI-DLC ワークフロー

このプロジェクトではAI-DLC（AI-Driven Development Lifecycle）ワークフローを採用しています。
ソフトウェア開発リクエストを受けた場合、**必ず**このワークフローに従ってください。

### ルール詳細ファイルの読み込み

開発作業を行う際は、以下のパスからルール詳細ファイルを読み込んでください（上から順に最初に見つかったものを使用）：

1. `.aidlc/aidlc-rules/aws-aidlc-rule-details/`
2. `.aidlc-rule-details/`
3. `.kiro/aws-aidlc-rule-details/`
4. `.amazonq/aws-aidlc-rule-details/`

### 必須: ワークフロー開始時に読み込むファイル

- `common/process-overview.md` - ワークフロー概要
- `common/session-continuity.md` - セッション継続ガイダンス
- `common/content-validation.md` - コンテンツ検証要件
- `common/question-format-guide.md` - 質問フォーマットルール
- `common/welcome-message.md` - ウェルカムメッセージ（初回のみ表示）

### AI-DLC ワークフロー概要

#### 適応型ワークフロー原則
ワークフローは作業に適応します。以下に基づいて必要なステージを判断：
1. ユーザーの意図の明確さ
2. 既存コードベースの状態
3. 変更の複雑さとスコープ
4. リスクと影響の評価

#### INCEPTION フェーズ（計画・要件定義）
1. **Workspace Detection** (必須) - ワークスペース検出・brownfield/greenfield判定
2. **Reverse Engineering** (条件付き: 既存コードあり) - 既存コードの分析
3. **Requirements Analysis** (必須) - 要件分析（深度: minimal/standard/comprehensive）
4. **User Stories** (条件付き) - ユーザーストーリー作成
5. **Workflow Planning** (必須) - 実行計画の策定
6. **Application Design** (条件付き) - アプリケーション設計
7. **Units Generation** (条件付き) - 作業ユニットへの分解

#### CONSTRUCTION フェーズ（設計・実装）
各ユニットに対して：
- **Functional Design** (条件付き) - 機能設計
- **NFR Requirements** (条件付き) - 非機能要件定義
- **NFR Design** (条件付き) - 非機能設計
- **Infrastructure Design** (条件付き) - インフラ設計
- **Code Generation** (必須) - コード生成（計画→実行の2パート）

全ユニット完了後：
- **Build and Test** (必須) - ビルドとテスト指示の生成

### 必須ルール

1. **承認待ち**: 各ステージ完了後、ユーザーの明示的な承認なしに次のステージに進まないこと
2. **監査ログ**: すべてのユーザー入力を `aidlc-docs/audit.md` にISO 8601タイムスタンプ付きで記録
3. **チェックボックス管理**: 計画ファイルのチェックボックスを作業完了と同じインタラクションで更新
4. **コンテンツ検証**: ファイル作成前にMermaid構文・ASCIIダイアグラムを検証
5. **質問フォーマット**: 質問は選択肢形式（A, B, C, D, E）で提示し、`[Answer]:` タグを使用
6. **2オプション完了メッセージ**: Constructionフェーズでは「変更をリクエスト」または「次のステージへ進む」の2択のみ
7. **audit.md の追記**: audit.mdは常に追記のみ。ファイル全体を上書きしないこと

### ドキュメント構造

```
aidlc-docs/
├── inception/
│   ├── plans/
│   ├── reverse-engineering/
│   ├── requirements/
│   ├── user-stories/
│   └── application-design/
├── construction/
│   ├── plans/
│   ├── {unit-name}/
│   │   ├── functional-design/
│   │   ├── nfr-requirements/
│   │   ├── nfr-design/
│   │   ├── infrastructure-design/
│   │   └── code/
│   └── build-and-test/
├── operations/
├── aidlc-state.md
└── audit.md
```

**重要**: アプリケーションコードはワークスペースルートに配置。`aidlc-docs/` にはドキュメントのみ。

### Extensions（拡張ルール）
- ワークフロー開始時に `extensions/` ディレクトリの `*.opt-in.md` ファイルのみ読み込む
- ユーザーがオプトインした場合のみ、対応するルールファイルを読み込む
- 有効な拡張ルールはハード制約として扱い、違反はブロッキング所見とする

---

## プロジェクト固有ルール

### 基本情報
- **プラットフォーム**: Chrome Extensions (Manifest V3)
- **言語**: JavaScript
- **アーキテクチャ**: Service Worker ベース

### コーディング規約
- 関数名はキャメルケース（camelCase）
- ファイル名は小文字とハイフン区切り
- コメントは日本語で記述
- エラーハンドリングは必須
- 出力は全て日本語

### 実装方針
- 最小限のコードで要件を満たす
- 必要最小限のpermissionsのみ要求
- 不要な依存関係は追加しない
- Chrome Extensions公式ドキュメントに準拠

### 参照ドキュメント
- Permissions: https://developer.chrome.com/docs/extensions/reference/permissions-list?hl=ja
- Manifest: https://developer.chrome.com/docs/extensions/reference/manifest?hl=ja
- API Reference: https://developer.chrome.com/docs/extensions/reference/api?hl=ja
