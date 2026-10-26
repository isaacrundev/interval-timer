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

## 每次 commit 後要裝到錶上

只要有新的 commit，回應的最後一定要跑一次安裝，把新版直接推到使用者的錶（不必再叫他掃 QR code）：

```bash
bash scripts/watch-install.sh                     # 預設 Amazfit Balance 2
bash scripts/watch-install.sh "其他裝置名稱"       # 換錶才要帶參數
```

- 這支腳本 = `zeus bridge` 的 `connect` + `install`，用 `expect` 開 pty 餵指令，約 15 秒，exit 0 = 手錶回報安裝成功（輸出 `PUSHED: ...`）
- **exit 3 / `NO_BRIDGE`**：手機端的 Zepp app 沒開 Bridge。這時**一定要在回應裡提示使用者**：「手機上的 Zepp app 開發者模式裡把 Bridge 打開，我再重跑一次」，然後停下等他確認，不要自己重試到逾時
- 其他失敗碼：4 = 逾時、5 = bridge 斷線、6 = 建置或安裝失敗；把最後幾行輸出貼給使用者
- 沒帶參數時的目標寫死在腳本裡（`Amazfit Balance 2`），換錶改那一行

## 不要用管線餵互動式 CLI

`zeus bridge` 是 vorpal REPL（需要真 TTY）。用 `printf ... | zeus bridge`、`script -q /dev/null` 或背景 `sleep` 餵指令會直接卡死整個工具呼叫（macOS 也沒有 `timeout`）。互動式指令只給使用者自己在終端機跑，agent 不要代跑。

唯一例外是 `bash scripts/watch-install.sh`：它自己用 `/usr/bin/expect` 開真 pty、每個 `expect` 都有 timeout、跑完一定 `exit` 斷線，所以不會卡住工具呼叫。要動 bridge 就改那支腳本，不要直接跑 `zeus bridge`。

## 這個專案的使用者偏好

- 使用者用中文溝通；App 本身是雙語（`utils/i18n.js`，預設跟隨錶面語言）
- 不要連續長震動（使用者覺得「一直震」很煩）；最後 3 秒的每秒提示固定短震，不可調
- 版面寧可縱向捲動（`utils/screen.js`）也不要為了塞進 480×480 而縮字
- 圓形螢幕上下兩端很窄：任何控件都必須存在某個捲動位置能完整落在圓內（`pages-test` 會驗）
