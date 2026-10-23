#!/usr/bin/env bash
# 收尾: 提交目前的改動並推上 GitHub 的 main
# 用法: bash scripts/land.sh "fix: 一句話說明"
# 為什麼要有這支: bigpowers 的 git 防護 hook 會擋「直接 commit/push 到 main」,
# 它留的合法出口是 GIT_BIGPOWERS_LAND=1 (原設計給 scripts/land-branch.sh)。
set -euo pipefail

msg="${1:?用法: bash scripts/land.sh \"<type>: <說明>\"}"
cd "$(dirname "$0")/.."

export GIT_BIGPOWERS_LAND=1

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "$msg"
else
  echo "沒有改動, 只檢查是否還有沒推上去的 commit"
fi

git push origin HEAD:main
git log --oneline -1
