import * as hmUI from '@zos/ui'
import { exit } from '@zos/router'
import { setPageBrightTime, resetPageBrightTime } from '@zos/display'
import { load } from '../utils/store'
import { t, fmtTime } from '../utils/i18n'
import { notify, cancel } from '../utils/alert'
import { screen } from '../utils/screen'

const BG = { lead: 0xd68910, work: 0xc0392b, rest: 0x1e8449, done: 0x1f618d }

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
    // shortcut: 螢幕熄滅後頁面計時會停. 要撐過熄屏得改寫成 app-service + createSysTimer
    setPageBrightTime({ brightTime: 2 * 60 * 60 * 1000 })

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

    const btn = (x, text, fn) =>
      root.createWidget(hmUI.widget.BUTTON, {
        x,
        y: 306,
        w: 112,
        h: 68,
        radius: 34,
        normal_color: 0x000000,
        press_color: 0x333338,
        text,
        color: 0xffffff,
        text_size: 26,
        click_func: fn,
      })

    btn(56, t('skip', this.cfg), () => this.skip())
    this.pauseBtn = btn(184, t('pause', this.cfg), () => this.togglePause())
    btn(312, t('stop', this.cfg), () => this.stop())

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

  togglePause() {
    if (this.finished) return
    if (this.paused) {
      this.endsAt = Date.now() + this.pausedLeft
      this.paused = false
      this.pauseBtn.setProperty(hmUI.prop.TEXT, t('pause', this.cfg))
    } else {
      this.pausedLeft = this.endsAt - Date.now()
      this.paused = true
      this.pauseBtn.setProperty(hmUI.prop.TEXT, t('resume', this.cfg))
    }
  },

  skip() {
    if (this.finished) return
    if (this.paused) {
      this.paused = false
      this.pauseBtn.setProperty(hmUI.prop.TEXT, t('pause', this.cfg))
    }
    if (this.idx + 1 >= this.q.length) return this.finish()
    this.startPhase(this.idx + 1)
  },

  finish() {
    this.finished = true
    this.bg.setProperty(hmUI.prop.MORE, { color: BG.done })
    this.label.setProperty(hmUI.prop.TEXT, t('allDone', this.cfg))
    this.clock.setProperty(hmUI.prop.TEXT, t('done', this.cfg))
    notify('done', this.cfg)
  },

  stop() {
    cancel()
    resetPageBrightTime()
    exit()
  },

  onDestroy() {
    clearInterval(this.timer)
    cancel()
  },
})
