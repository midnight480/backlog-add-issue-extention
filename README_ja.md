# Add Issue for Backlog

[English](README.md)

Chrome拡張機能として、BacklogのAPIキー管理と課題追加機能を提供するシステムです。サイドパネルを使用して、ブラウザを離れることなく効率的にBacklogに課題を追加できます。

## 機能概要

### 主要機能
- **サイドパネルUI**: ブラウザのサイドパネルで快適に操作
- **トグル操作**: 拡張機能アイコンをクリックしてサイドパネルを開閉
- **APIキー管理**: BacklogのAPIキーを安全に暗号化して保存・管理
- **ドメイン設定**: 任意のBacklogドメイン（xxx.backlog.jp、yyy.backlog.com）に対応
- **プロジェクト選択**: 利用可能なBacklogプロジェクトの一覧表示と検索機能
- **課題作成**: 最小限の入力でBacklog課題を素早く作成
- **テンプレート機能**: 説明文のテンプレートをカスタマイズ可能
- **URL自動埋め込み**: 現在のブラウザタブのURLとタイトルを課題説明に自動設定
- **自動設定**: 担当者と期限日の自動設定機能
- **動的設定**: プロジェクトごとの課題タイプと優先度を自動取得

### 対応環境
- Google Chrome 114以降（Manifest V3、Side Panel API対応）
- Microsoft Edge（Chromiumベース）
- Backlog.jp および Backlog.com の任意のドメイン
- Zendesk / Intercom / Amazon Connect / ServiceDesk Plus / HubSpot / Salesforce / Kintone 等（URL自動埋め込み対応）

### 許可するホスト（ドメイン）の設定

Chrome拡張機能の仕様上、現在開いているタブのURLやタイトルを自動取得するためには、対象のドメインを事前に許可しておく必要があります。
本拡張機能の `manifest.json` では、デフォルトで以下のホストが許可されています：

- **Backlog**: `https://*.backlog.jp/*`, `https://*.backlog.com/*`, `https://*.backlogtools.com/*`
- **Zendesk**: `https://*.zendesk.com/*`
- **Intercom**: `https://*.intercom.com/*`, `https://*.intercom.io/*`
- **Amazon Connect**: `https://*.my.connect.aws/*`, `https://*.awsapps.com/*`
- **ServiceDesk Plus**: `https://*.manageengine.com/*`, `https://*.manageengine.jp/*`
- **HubSpot**: `https://*.hubspot.com/*`
- **Salesforce**: `https://*.salesforce.com/*`, `https://*.force.com/*`
- **Kintone**: `https://*.cybozu.com/*`, `https://*.kintone.com/*`

**他のサービスや独自ドメインを利用する場合**
SaaSツールや独自の社内システム等で「URLの自動埋め込み機能」を利用したい場合は、Chromeに拡張機能を読み込む前に `manifest.json` の `host_permissions` へ該当のドメインを追加してください。

```json
  "host_permissions": [
    ...
    "https://*.your-custom-domain.com/*"
  ]
```

## インストール手順

### 開発者向けインストール

1. **リポジトリのクローン**
   ```bash
   git clone <repository-url>
   cd backlog-add-issue-extention
   ```

2. **依存関係のインストール**
   ```bash
   npm install
   ```

3. **Chrome拡張機能として読み込み**
   - Chromeブラウザを開く
   - アドレスバーに `chrome://extensions/` を入力
   - 右上の「デベロッパーモード」を有効にする
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - プロジェクトのルートディレクトリを選択

4. **拡張機能の確認**
   - ブラウザのツールバーに拡張機能アイコンが表示されることを確認
   - アイコンをクリックしてサイドパネルが表示されることを確認

## 使用方法

### 1. サイドパネルの開閉

- **開く**: ブラウザのツールバーの拡張機能アイコンをクリック
- **閉じる**: もう一度アイコンをクリック、またはサイドパネル内の×ボタンをクリック

### 2. APIキーの設定

1. **サイドパネルを開く**
   - ブラウザのツールバーの拡張機能アイコンをクリック

2. **Settings タブを選択**
   - サイドパネル上部の「Settings」タブをクリック

3. **APIキーとドメインを入力**
   - BacklogのAPIキーを入力フィールドに貼り付け
   - Backlogドメインを入力（例：mycompany.backlog.jp）
   - 「APIキーを登録」ボタンをクリック

4. **APIキーの取得方法**
   - Backlogにログイン
   - 個人設定 → API → 新しいAPIキーを登録
   - 生成されたAPIキーをコピー

### 3. 課題の作成

1. **Add Issue タブを開く**
   - サイドパネル上部の「Add Issue」タブをクリック

2. **プロジェクトを選択**
   - 検索フィールドでプロジェクト名またはキーを入力
   - 候補から対象プロジェクトを選択

3. **課題情報を入力**
   - 課題種別を選択
   - 件名を入力（255文字以内）
   - 説明欄には現在のページのURLとタイトルが自動設定される（テンプレートでカスタマイズ可能）

4. **課題を作成**
   - 「課題を作成」ボタンをクリック
   - 成功メッセージが表示されれば完了

### 4. テンプレートのカスタマイズ

1. **Settings タブを開く**
   - サイドパネル上部の「Settings」タブをクリック

2. **説明文テンプレートセクション**
   - テンプレートエディタで説明文のテンプレートを編集
   - 使用可能な変数：`{{url}}`（現在のページURL）、`{{title}}`（現在のページタイトル）

3. **テンプレートを保存**
   - 「保存」ボタンをクリック
   - デフォルトに戻す場合は「リセット」ボタンをクリック

### 5. APIキーの管理

- **変更**: Settings タブで「変更」ボタンをクリックして新しいAPIキーとドメインを入力
- **削除**: Settings タブで「削除」ボタンをクリックしてAPIキーと関連データを削除

## 技術仕様

### API呼び出し方式
- **認証**: APIキーをクエリパラメータとして送信
- **課題作成**: POSTメソッドでパラメータをクエリパラメータとして送信
- **動的設定**: プロジェクトごとの課題タイプと優先度を自動取得して適用

### 自動設定機能
- **担当者**: APIキー登録ユーザーを自動設定
- **期限日**: 課題作成日（今日）を自動設定
- **課題タイプ**: プロジェクトの最初の課題タイプを自動選択
- **優先度**: システムの中間優先度を自動選択

## 開発者向け情報

### プロジェクト構造
```
backlog-add-issue-extention/
├── manifest.json                 # 拡張機能マニフェスト
├── background/
│   └── service-worker.js        # バックグラウンド処理
├── content/
│   └── url-extractor.js         # URL取得スクリプト
├── sidepanel/
│   ├── sidepanel.html          # サイドパネルUI
│   ├── sidepanel.js            # サイドパネルロジック
│   └── sidepanel.css           # スタイルシート
├── assets/
│   ├── icon16.png              # 16x16アイコン
│   ├── icon48.png              # 48x48アイコン
│   └── icon128.png             # 128x128アイコン
├── test/                        # テストファイル
├── .gitignore                   # Git除外設定
├── README.md                    # このファイル
└── package.json                 # 依存関係管理
```

### 開発コマンド

```bash
# テストの実行
npm test

# テストの監視モード
npm run test:watch
```

### 技術スタック
- **プラットフォーム**: Chrome Extensions (Manifest V3)
- **言語**: JavaScript
- **アーキテクチャ**: Service Worker ベース
- **テストフレームワーク**: Jest + fast-check（プロパティベーステスト）

### 配布方法

#### 開発者向け配布
```bash
# リポジトリのクローン
git clone <repository-url>
cd backlog-add-issue-extention

# 依存関係のインストール
npm install

# テストの実行
npm test

# Chrome拡張機能として読み込み
# Chrome → 拡張機能 → デベロッパーモード → パッケージ化されていない拡張機能を読み込む
```

#### エンドユーザー向け配布
- Chrome Web Storeでの公開（将来的）
- .crxファイルでの直接配布

## トラブルシューティング

### よくある問題

**Q: APIキーが無効と表示される**
A: 以下を確認してください：
- APIキーが正しく入力されているか
- BacklogのAPIキーが有効期限内か
- 対象プロジェクトへのアクセス権限があるか

**Q: プロジェクト一覧が表示されない**
A: 以下を確認してください：
- インターネット接続が正常か
- BacklogのAPIサーバーが正常に動作しているか
- APIキーに適切な権限が設定されているか

**Q: 課題作成に失敗する**
A: 以下を確認してください：
- 件名が入力されているか（必須項目）
- 選択したプロジェクトに課題作成権限があるか
- ネットワーク接続が正常か

**Q: 拡張機能が動作しない**
A: 以下を確認してください：
- Chrome拡張機能が有効になっているか
- 拡張機能の権限が適切に設定されているか
- ブラウザを再起動してみる

### ログの確認方法

1. **Chrome DevToolsを開く**
   - F12キーまたは右クリック → 検証

2. **Service Workerのログ確認**
   - `chrome://extensions/` → 拡張機能の詳細 → Service Worker → 検証

3. **ポップアップのログ確認**
   - 拡張機能ポップアップを右クリック → 検証

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。

## サポート

問題が発生した場合は、GitHubのIssuesページで報告してください。
