import * as hmUI from '@zos/ui'
import { back } from '@zos/router'
import {
  setPageBrightTime,
  resetPageBrightTime,
  pauseDropWristScreenOff,
  resetDropWristScreenOff,
  pausePalmScreenOff,
  resetPalmScreenOff,
} from '@zos/display'
import { load } from '../utils/store'
import { t, fmtTime } from '../utils/i18n'
import { notify, cancel } from '../utils/alert'
import { screen } from '../utils/screen'

const BG = { lead: 0xd68910, work: 0xc0392b, rest: 0x1e8449, done: 0x1f618d }

// 一次 session 最長 2 小時: 亮屏與「不准熄屏」都在這個窗內有效
const SESSION = 2 * 60 * 60 * 1000

// 數數時一定看得見也算得下去: 螢幕常亮, 而且放下手(落腕)或蓋掌都不熄屏.
// 光設亮屏時間沒用: 這兩個手勢照樣熄屏, 而系統在息屏 10 秒後就退出小程式, 倒數和提示全斷.
function keepAwake() {
  try {
    setPageBrightTime({ brightTime: SESSION })
    pauseDropWristScreenOff({ duration: SESSION })
    pausePalmScreenOff({ duration: SESSION })
  } catch (e) {
    console.log('keep screen on failed', e)
  }
}

// 停止/完成/離開頁面就交還系統, 否則手錶接下來不會再自動熄屏
function letSleep() {
  try {
    resetDropWristScreenOff()
    resetPalmScreenOff()
    resetPageBrightTime()
  } catch (e) {}
}

Page({
  onInit() {
    this.cfg = load()
    const { work, rest, sets, rounds } = this.cfg.presets[this.cfg.preset]
    this.lead = this.cfg.presets[this.cfg.preset].lead
    const q = []
    for (let r = 1; r <= rounds; r++) {
      const tag = rounds > 1 ? ` · ${r}/${rounds}` : ''
      for (let i = 1; i <= sets; i++) {
        q.push({ kind: 'work', sec: work, label: `${t('work', this.cfg)} ${i}/${sets}${tag}` })
        // 組間與輪間的休息都用同一種 REST, 最後一個 WORK 後面不接
        if (i < sets) q.push({ kind: 'rest', sec: rest, label: `${t('rest', this.cfg)} ${i}/${sets}${tag}` })
        else if (r < rounds) q.push({ kind: 'rest', sec: rest, label: `${t('rest', this.cfg)} ${r}/${rounds}` })
      }
    }
    // 開始前的準備倒數: 手動按開始後還有幾秒可以站好, 讓使用者在原地準備
    if (this.lead > 0) q.unshift({ kind: 'lead', sec: this.lead, label: t('prep', this.cfg) })
    this.q = q
    this.idx = 0
    this.endsAt = 0
    this.pausedLeft = 0
    this.paused = false
    this.finished = false
    this.lastBeep = -1
  },

  build() {
    keepAwake()

    this.bg = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 480,
      h: 480,
      color: 0x101014,
    })
    const root = screen()

    this.label = root.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 60,
      w: 480,
      h: 44,
      text: '',
      color: 0xffffff,
      text_size: 32,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    })
    this.clock = root.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 112,
      w: 480,
      h: 180,
      text: '0:00',
      color: 0xffffff,
      text_size: 120,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    })

    // 三欄圖示按鈕拼成一片佔滿螢幕下方 1/3 的圓弧面板 (上緣切弦 y=320, 下緣跟著錶面圓弧)
    // 弧形是畫在圖檔的透明區裡的 (BUTTON 的框只能矩形), 圖檔來源 scripts/icons.mjs
    const pill = (x, name, fn) =>
      root.createWidget(hmUI.widget.BUTTON, {
        x,
        y: 320,
        w: 160,
        h: 160,
        normal_src: `images/${name}_n.png`,
        press_src: `images/${name}_p.png`,
        click_func: fn,
      })

    this.skipBtn = pill(0, 'skip', () => this.skip())
    // 跑完之後左邊換成「重新開始」: 同一個位置疊著兩顆, 一次只顯示一顆 (理由同暫停/播放)
    this.restartBtn = pill(0, 'restart', () => this.restart())
    this.restartBtn.setProperty(hmUI.prop.VISIBLE, false)
    // 中間欄的底色: 跑完只收圖示、面板不能缺一角, 所以底色墊在最下面 (沒有作用, 按下去也不變色)
    pill(160, 'blank', () => {})
    // BUTTON 的背景圖不能換, 所以暫停/播放是同位疊著的兩顆, 一次只顯示一顆
    this.pauseBtn = pill(160, 'pause', () => this.togglePause())
    this.playBtn = pill(160, 'play', () => this.togglePause())
    this.playBtn.setProperty(hmUI.prop.VISIBLE, false)
    pill(320, 'stop', () => this.stop())

    this.startPhase(0)
    this.timer = setInterval(() => this.tick(), 250)
  },

  startPhase(i) {
    this.idx = i
    const p = this.q[i]
    this.endsAt = Date.now() + p.sec * 1000
    this.lastBeep = -1
    this.bg.setProperty(hmUI.prop.MORE, { color: BG[p.kind] })
    this.label.setProperty(hmUI.prop.TEXT, p.label)
    // 準備倒數本身不出聲, 真正的提示在工作開始那一下
    if (p.kind !== 'lead') notify(p.kind, this.cfg)
  },

  tick() {
    if (this.finished || this.paused) return
    // 系統有可能把暫停熄屏清掉 (例如中途按鍵亮/熄屏), 每 10 秒補一次
    if (Date.now() >= (this.awakeAt || 0)) {
      this.awakeAt = Date.now() + 10000
      keepAwake()
    }
    let left = this.endsAt - Date.now()
    while (left <= 0 && this.idx + 1 < this.q.length) {
      this.startPhase(this.idx + 1)
      left = this.endsAt - Date.now()
    }
    if (left <= 0) return this.finish()
    this.render(left)
  },

  render(left) {
    const s = Math.ceil(left / 1000)
    this.clock.setProperty(hmUI.prop.TEXT, fmtTime(s))
    if (s <= 3 && s !== this.lastBeep) {
      this.lastBeep = s
      notify('tick', this.cfg)
    }
  },

  setPaused(on) {
    this.paused = on
    this.pauseBtn.setProperty(hmUI.prop.VISIBLE, !on)
    this.playBtn.setProperty(hmUI.prop.VISIBLE, on)
  },

  togglePause() {
    if (this.finished) return
    if (this.paused) this.endsAt = Date.now() + this.pausedLeft
    else this.pausedLeft = this.endsAt - Date.now()
    this.setPaused(!this.paused)
  },

  skip() {
    if (this.finished) return
    if (this.paused) this.setPaused(false)
    if (this.idx + 1 >= this.q.length) return this.finish()
    this.startPhase(this.idx + 1)
  },

  finish() {
    this.finished = true
    this.bg.setProperty(hmUI.prop.MORE, { color: BG.done })
    this.label.setProperty(hmUI.prop.TEXT, t('allDone', this.cfg))
    this.clock.setProperty(hmUI.prop.TEXT, t('done', this.cfg))
    notify('done', this.cfg)
    letSleep()
    // 跑完只剩「重新開始」和「退出」有用: 中間那顆和跳過都收掉, 不要留按了沒反應的按鈕
    this.skipBtn.setProperty(hmUI.prop.VISIBLE, false)
    this.restartBtn.setProperty(hmUI.prop.VISIBLE, true)
    this.pauseBtn.setProperty(hmUI.prop.VISIBLE, false)
    this.playBtn.setProperty(hmUI.prop.VISIBLE, false)
  },

  // 從頭再跑一次同一個模組 (不用退出再進來)
  restart() {
    if (!this.finished) return
    cancel()
    this.finished = false
    this.skipBtn.setProperty(hmUI.prop.VISIBLE, true)
    this.restartBtn.setProperty(hmUI.prop.VISIBLE, false)
    this.setPaused(false)
    keepAwake()
    this.startPhase(0)
  },

  stop() {
    cancel()
    letSleep()
    // back 是「回上一頁」: 用 replace 會在主畫面上再疊一層主畫面, 之後按實體鍵只會一直彈回主畫面
    back()
  },

  onDestroy() {
    clearInterval(this.timer)
    cancel()
    letSleep()
  },
})
