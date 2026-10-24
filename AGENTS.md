# 給 AI agent 的工作守則

## 每次改完一律 commit + push

改完程式、跑過檢查與 `zeus build` 之後，直接推上去（不必先問）：

```bash
bash scripts/land.sh "fix: 一句話說明"
```

- 這支腳本會 `git add -A` → commit → `git push origin HEAD:main`
- remote：https://github.com/isaacrundev/interval-timer（`origin`），branch `main`
- **不要手打 `git commit` / `git push`**：bigpowers 的 pre-tool-use hook 會擋「直接對 main 提交/推送」以及非 Conventional Commits 的訊息，`scripts/land.sh` 是它的合法出口（`GIT_BIGPOWERS_LAND=1`）
- commit message 用 Conventional Commits：`feat:` / `fix:` / `refactor:` / `docs:` / `chore:`，標題 ≤ 72 字元，不加 `Co-authored-by`
- `dist/` 與 `node_modules/` 已被 `.gitignore` 排除，zab 檔不進版控

## 改完要跑的檢查

```bash
zeus build                                                  # 必須 exit 0
cd /tmp/zos-stub && for t in store-test test i18n-test pages-test; do node --import ./register.mjs $t.mjs; done
node /tmp/i18n-check.mjs                                    # 字典 key 對稱 + 值必須是字串
```

## 每次 commit 後要給 QR code

只要有新的 commit，回應的最後一定要跑一次 preview 並把 QR code 貼給使用者（他要掃進手錶實測）：

```bash
zeus preview --target "Amazfit Balance 2"
```

## 不要用管線餵互動式 CLI

`zeus bridge` 是 vorpal REPL（需要真 TTY）。用 `printf ... | zeus bridge`、`script -q /dev/null` 或背景 `sleep` 餵指令會直接卡死整個工具呼叫（macOS 也沒有 `timeout`）。互動式指令只給使用者自己在終端機跑，agent 不要代跑；非互動需求用 `zeus status` / `zeus preview` 這類一次性指令。

## 這個專案的使用者偏好

- 使用者用中文溝通；App 本身是雙語（`utils/i18n.js`，預設跟隨錶面語言）
- 不要連續長震動（使用者覺得「一直震」很煩）；最後 3 秒的每秒提示固定短震，不可調
- 版面寧可縱向捲動（`utils/screen.js`）也不要為了塞進 480×480 而縮字
- 圓形螢幕上下兩端很窄：任何控件都必須存在某個捲動位置能完整落在圓內（`pages-test` 會驗）
