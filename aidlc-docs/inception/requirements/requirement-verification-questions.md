# 要件確認質問

以下の質問に回答してください。各質問の `[Answer]:` タグの後に選択肢の文字（A, B, C...）を記入してください。
選択肢に該当するものがない場合は最後の選択肢（Other）を選び、内容を記述してください。

---

## Question 1
Settingsでのプロジェクト選択方法について、どのような形式を想定していますか？

A) プルダウン（セレクトボックス）で全プロジェクトを一覧表示し、1つ選択する
B) 検索可能なプルダウン（現在のAdd Issueと同様のUI）で1つ選択する
C) チェックボックスで複数プロジェクトを選択し、Add Issueではその中から1つ選ぶ
D) Other (please describe after [Answer]: tag below)

[Answer]: C) チェックボックスで複数プロジェクトを選択し、Add Issueではその中から1つ選ぶ

---

## Question 2
Settingsで選択したプロジェクトはどのように保存・管理しますか？

A) 1つのプロジェクトのみ保存（新しく選択すると上書き）
B) 複数のプロジェクトを「お気に入り」として保存し、Add Issueではその中から選ぶ
C) Other (please describe after [Answer]: tag below)

[Answer]: B) 複数のプロジェクトを「お気に入り」として保存し、Add Issueではその中から選ぶ

---

## Question 3
Add Issueパネルでのプロジェクト選択UIはどう変わりますか？

A) Settingsで選択済みのプロジェクトが自動的にセットされ、変更不可にする
B) Settingsで選択したプロジェクト（複数可）の中からプルダウンで選択できる
C) Settingsで選択したプロジェクトをデフォルト値として表示するが、全プロジェクトから変更も可能
D) Other (please describe after [Answer]: tag below)

[Answer]: B) Settingsで選択したプロジェクト（複数可）の中からプルダウンで選択できる

---

## Question 4
Settingsでプロジェクトが未選択の場合、Add Issueパネルはどう動作しますか？

A) 現在と同じ動作（全プロジェクトから検索・選択できる）
B) エラーメッセージを表示し、Settingsへ誘導する
C) Add Issueタブを無効化する
D) Other (please describe after [Answer]: tag below)

[Answer]:  B) エラーメッセージを表示し、Settingsへ誘導する

---

## Question 5
Settingsでのプロジェクト一覧はどのように取得しますか？

A) Backlog APIから動的に取得する（現在のAdd Issueと同様）
B) APIキー登録後に自動取得してキャッシュする
C) Other (please describe after [Answer]: tag below)

[Answer]: A) Backlog APIから動的に取得する（現在のAdd Issueと同様）

---

## Question 6: セキュリティ拡張ルールについて
このプロジェクトにセキュリティ拡張ルールを適用しますか？

A) Yes — すべてのセキュリティルールをブロッキング制約として適用する（本番グレードのアプリケーションに推奨）
B) No — セキュリティルールをスキップする（PoC、プロトタイプ、実験的プロジェクトに適切）
C) Other (please describe after [Answer]: tag below)

[Answer]: B) No — セキュリティルールをスキップする（PoC、プロトタイプ、実験的プロジェクトに適切）

---

## Question 7: プロパティベーステスト拡張ルールについて
このプロジェクトにプロパティベーステスト（PBT）ルールを適用しますか？

A) Yes — すべてのPBTルールをブロッキング制約として適用する
B) Partial — 純粋関数とシリアライゼーションのラウンドトリップにのみPBTルールを適用する
C) No — PBTルールをスキップする（シンプルなCRUDアプリ、UIのみのプロジェクト、または薄い統合レイヤーに適切）
D) Other (please describe after [Answer]: tag below)

[Answer]: C) No — PBTルールをスキップする（シンプルなCRUDアプリ、UIのみのプロジェクト、または薄い統合レイヤーに適切）

---

回答が完了したら「完了」とお知らせください。
