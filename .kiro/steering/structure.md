# プロジェクト構造

## 基本構成
Chrome拡張機能の標準的なディレクトリ構造に従います：

```
/
├── .kiro/                    # Kiro設定ファイル
│   ├── instructions.md       # プロジェクト共通ルール
│   └── steering/            # ステアリングドキュメント
├── manifest.json            # 拡張機能のマニフェストファイル
├── background/              # Service Worker関連
├── content/                 # Content Scripts
├── popup/                   # ポップアップUI
├── options/                 # 設定画面
└── assets/                  # アイコンや画像ファイル
```

## ファイル命名規則
- **関数名**: キャメルケース（camelCase）
- **ファイル名**: 小文字とハイフン区切り
- **コメント**: 日本語で記述

## コード組織
- **背景処理**: `background/` ディレクトリ
- **ページ操作**: `content/` ディレクトリ  
- **UI関連**: `popup/`, `options/` ディレクトリ
- **共通処理**: 各ディレクトリ内で適切に分離

## 設定ファイル
- `manifest.json`: 拡張機能の基本設定
- `.kiro/instructions.md`: 開発ルールと規約

## アーキテクチャ原則
- 各コンポーネント（background, content, popup, options）を適切に分離
- Manifest V3の仕様に準拠
- 最小限のpermissionsで動作するよう設計