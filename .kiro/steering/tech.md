# 技術スタック

## 基本技術
- **プラットフォーム**: Chrome Extensions (Manifest V3)
- **言語**: JavaScript
- **アーキテクチャ**: Service Worker ベース

## Chrome Extensions 構成要素
- **Background Service Worker**: バックグラウンド処理
- **Content Scripts**: ページ内での動作
- **Popup**: 拡張機能のポップアップUI
- **Options Page**: 設定画面

## 必須参照ドキュメント
実装時は必ず以下の公式ドキュメントを確認：
- [Permissions](https://developer.chrome.com/docs/extensions/reference/permissions-list?hl=ja)
- [Manifest](https://developer.chrome.com/docs/extensions/reference/manifest?hl=ja)
- [API Reference](https://developer.chrome.com/docs/extensions/reference/api?hl=ja)

## 開発コマンド
現在、ビルドシステムは設定されていません。基本的な開発フローは：
1. コードの実装
2. Chrome拡張機能として読み込み
3. 動作確認とデバッグ

## 依存関係管理
- 不要な依存関係は追加しない
- 必要最小限のライブラリのみ使用