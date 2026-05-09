#!/bin/bash
# =============================================================================
# sync-agent-rules.sh
# AI-DLC エージェント定義ファイル同期スクリプト
#
# ソースファイル (.aidlc/agent-rules-source.md) から各エージェント向けの
# 定義ファイルを生成します。
#
# 使い方:
#   ./scripts/sync-agent-rules.sh
#
# ソースを編集した後に実行してください。
# =============================================================================

set -euo pipefail

# プロジェクトルートに移動
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

SOURCE_FILE=".aidlc/agent-rules-source.md"

# ソースファイルの存在確認
if [ ! -f "$SOURCE_FILE" ]; then
  echo "エラー: ソースファイルが見つかりません: $SOURCE_FILE"
  exit 1
fi

# 共通コンテンツ（ソースファイルの先頭コメント行を除去）
# 最初の「## 最優先ルール」から始まる行以降を取得
COMMON_CONTENT=$(sed -n '/^## 最優先ルール/,$p' "$SOURCE_FILE")

# タイムスタンプ
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ヘッダー生成関数
generate_header() {
  local agent_name="$1"
  local file_path="$2"
  echo "# ${file_path} - ${agent_name} 指示ファイル"
  echo ""
  echo "<!-- このファイルは自動生成されています。直接編集しないでください。 -->"
  echo "<!-- ソース: .aidlc/agent-rules-source.md -->"
  echo "<!-- 同期日時: ${TIMESTAMP} -->"
  echo "<!-- 変更する場合は .aidlc/agent-rules-source.md を編集し、scripts/sync-agent-rules.sh を実行してください。 -->"
  echo ""
}

# 1. GitHub Copilot
echo "生成中: .github/copilot-instructions.md"
mkdir -p .github
{
  generate_header "GitHub Copilot" ".github/copilot-instructions.md"
  echo "$COMMON_CONTENT"
} > .github/copilot-instructions.md

# 2. Codex (OpenAI)
echo "生成中: AGENTS.md"
{
  generate_header "OpenAI Codex" "AGENTS.md"
  echo "$COMMON_CONTENT"
} > AGENTS.md

# 3. Claude Code
echo "生成中: CLAUDE.md"
{
  generate_header "Claude Code" "CLAUDE.md"
  echo "$COMMON_CONTENT"
} > CLAUDE.md

# 4. Gemini CLI
echo "生成中: GEMINI.md"
{
  generate_header "Gemini CLI" "GEMINI.md"
  echo "$COMMON_CONTENT"
} > GEMINI.md

# 5. Antigravity
echo "生成中: .antigravity/instructions.md"
mkdir -p .antigravity
{
  generate_header "Antigravity" ".antigravity/instructions.md"
  echo "$COMMON_CONTENT"
} > .antigravity/instructions.md

# シンボリックリンクの確認
if [ ! -L ".aidlc-rule-details" ]; then
  echo "シンボリックリンク作成: .aidlc-rule-details -> .kiro/aws-aidlc-rule-details"
  ln -sf .kiro/aws-aidlc-rule-details .aidlc-rule-details
fi

echo ""
echo "====================================="
echo "同期完了 (${TIMESTAMP})"
echo "====================================="
echo ""
echo "更新されたファイル:"
echo "  - .github/copilot-instructions.md  (GitHub Copilot)"
echo "  - AGENTS.md                        (OpenAI Codex)"
echo "  - CLAUDE.md                        (Claude Code)"
echo "  - GEMINI.md                        (Gemini CLI)"
echo "  - .antigravity/instructions.md     (Antigravity)"
echo ""
echo "ソース: .aidlc/agent-rules-source.md"
