# プロジェクト共通ルール

## プロジェクト概要
- Chrome拡張機能の開発プロジェクト
- 常に最新のChrome Extensions公式ドキュメントを参照すること

## 参照ドキュメント
実装時は必ず以下の公式ドキュメントを確認：
- Permissions: https://developer.chrome.com/docs/extensions/reference/permissions-list?hl=ja
- Manifest: https://developer.chrome.com/docs/extensions/reference/manifest?hl=ja
- API Reference: https://developer.chrome.com/docs/extensions/reference/api?hl=ja

## コーディング規約
- 関数名はキャメルケースを使用
- エラーハンドリングは必須
- コメントは日本語で記述
- Chrome Extensions APIの最新仕様に準拠

## アーキテクチャ
- Manifest V3を使用
- background service workerを適切に活用
- content scripts、popup、optionsページを適切に分離

## 実装方針
- 最小限のコードで要件を満たす
- 必要最小限のpermissionsのみ要求
- テストは明示的に要求された場合のみ追加
- 不要な依存関係は追加しない
