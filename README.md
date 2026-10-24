# Interval

Amazfit Balance 2（Zepp OS 5 / API_LEVEL 4.2）用的自訂間歇計時器。純手錶端小程式，不需要手機端。

## 執行

```bash
npm i -g @zeppos/zeus-cli   # 已裝可略過
zeus login                  # 用 Zepp 帳號登入
zeus dev                    # 模擬器
zeus preview                # 產生 QR code，裝到真錶
```

裝到真錶：Zepp App →「我的 → 設定 → 關於」連點 Zepp 圖示 7 次 → 開發者模式 → 「掃一掃」掃 terminal 的 QR。

`zeus preview` 會用 `app.json` 的 `appId`。第一次請先到 <https://developer.zepp.com> 登記一個 app，把拿到的 appId 填回去；否則 preview 可能被拒。

## 檔案

- `page/menu.js` — 主選單（開始 = 快速開始、間歇模組、設定；副標顯示最後一次用的那組）
- `page/index.js` — 5 組間歇模組編輯頁（上方 1–5 切換，下方準備時間/工作/休息/組數/輪數，點數值開轉盤，存到 `interval-cfg.json`）
- `page/settings.js` — 設定頁（語言 + 提示方式 / 震動長度 / 最後 3 秒）
- `page/timer.js` — 倒數頁（階段背景色、每秒更新、階段切換提示、暫停/跳過/停止）
- `utils/i18n.js` — 中／英字典、語言判定、`fmtTime()`（秒 → `分:秒`）
- `utils/alert.js` — 提示實作（震動重覆、系統鈴聲播放、取消）
- `utils/store.js` — 設定讀寫（5 組模組 + 提醒/語言設定，含舊版單組設定升級）

## 快速開始與模組

存檔長這樣：

```json
{
  "presets": [{ "lead": 5, "work": 45, "rest": 20, "sets": 8, "rounds": 1 }, "...共 5 組"],
  "preset": 0,
  "alert": "vib", "vibLen": 2, "tickAlert": "off", "lang": "auto"
}
```

- `preset` 既是「最後一次按開始用的那一組」，也是模組頁正在編輯的那一組，所以主選單的「開始」不進設定頁、直接倒數。
- 存檔的 `lead`/`work`/`rest` 都是**秒**（例如 90），畫面與轉盤一律用分+秒顯示／設定（`90` → `1:30`）。
- 模組頁的數值不再用 ± 連按：點數字會開系統轉盤（`hmUI.widget.WIDGET_PICKER`），時間欄位是「分」「秒」兩輪，上下撥動，按完成才寫回（存檔前只改暫存）。
- `lead` 是按「開始」後的準備倒數（秒，0 = 不倒數，預設 5）：倒數期間畫面顯示「準備」，不出聲也不震動，倒數結束接第一個工作階段。
- 第一次開啟（沒有存檔）就用 `utils/store.js` 的 `PRESETS`：準備 5 秒，之後 45/20×8、30/15×10、60/30×5×2、20/40×8、120/60×4。
- 舊版存檔（`work`/`rest`/`sets`/`rounds` 在最上層）會自動搬進第 1 組，其餘 4 組補預設值；舊欄位不再寫回。

## 調色

`page/timer.js` 開頭：

```js
const BG = { lead: 0xd68910, work: 0xc0392b, rest: 0x1e8449, done: 0x1f618d }
```

## 語言

界面文字全部走 `utils/i18n.js` 的 `t('key', cfg)`，字典裡有 `zh`（繁中）與 `en` 兩份，key 必須一一對應。

預設 `cfg.lang = 'auto'`：用 `@zos/settings` 的 `getLanguage()` 判定，回傳 `0`（zh-CN）或 `1`（zh-TW）用中文，其他（含 `2` = en-US）用英文。
設定頁的「介面語言」可改成 `中文` / `English` 固定住；改完用 `@zos/router` 的 `replace()` 重建頁面，讓畫面上所有文字立刻換語言。

沒有用 Zepp OS 的 `.po` 多語系檔（`page/i18n/*.po` + `getText()`），因為它只能跟隨系統語言，沒辦法在 App 內切換。

## 提示

`Vibrator.start()` 只吃 `{ mode }` 物件，傳裸常數會被忽略、退成預設 20ms 短震，所以一律走 `utils/alert.js` 的 `notify()`。

震動只在**階段開始**（WORK / REST 切換）與**全部完成**時發，一次提示就是一次震動，**不重覆、不排隊、最長 1.2 秒**。
`VIB LEN` 選的是那一下的長度：SHORT 0.6 秒、MED 1 秒、LONG 1.2 秒（四連震），**只套用在階段開始與完成**。

REST 與最後 3 秒的讀秒是**固定短震，不可調**（`utils/alert.js` 的 `FIXED`）：這兩個提示密集，套上 0.6–1.2 秒會前後黏成連續震動，所以刻意不給使用者選長度。

最後 3 秒要不要提示另外用 `LAST 3s` 設定，預設 **OFF**；可選 VIBRATE（20ms 輕震）、SOUND、BOTH。

聲音用 `SystemSounds`（API_LEVEL 3.6 的系統鈴聲，不用自帶音檔）。手錶關掉系統鈴聲時 `getEnabled()` 回 false，會靜音但不會出錯。

## 螢幕常亮

倒數頁一 build 就 `keepAwake()`：`setPageBrightTime`（2 小時）＋ `pauseDropWristScreenOff` / `pausePalmScreenOff`（`@zos/display`，API_LEVEL 2.1，duration = 2 小時），`tick()` 再每 10 秒補一次（系統可能中途把暫停熄屏清掉）。

只設亮屏時間不夠：放下手（落腕）與蓋掌是系統手勢，照樣會熄屏，而小程式息屏後 **10 秒系統就退出小程式**，倒數和提示會整個斷掉——這就是連這兩個手勢一起暫停的原因。

停止、全部完成、頁面被收掉時 `letSleep()` 會把三者還原，否則手錶之後不會再自動熄屏。
若要撐過「被別的原因熄屏」（例如中途按鍵熄屏很久），才需要把計時搬到 `app-service` 並改用 `createSysTimer`（`@zos/timer`，API_LEVEL 4.0）。
