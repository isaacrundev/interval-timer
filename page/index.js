import * as hmUI from '@zos/ui'
import { push, replace } from '@zos/router'
import { load, save } from '../utils/store'
import { t } from '../utils/i18n'
import { screen, pad } from '../utils/screen'

const ROWS = [
  { key: 'lead', min: 0, max: 60, step: 5 },
  { key: 'work', min: 5, max: 600, step: 5 },
  { key: 'rest', min: 5, max: 600, step: 5 },
  { key: 'sets', min: 1, max: 30, step: 1 },
  { key: 'rounds', min: 1, max: 10, step: 1 },
]

const ROW_Y = [236, 324, 412, 500, 588]

Page({
  build() {
    const cfg = load()
    this.cfg = cfg
    this.cur = cfg.presets[cfg.preset]
    this.values = {}
    const root = screen()

    root.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 52,
      w: 480,
      h: 48,
      text: t('presets', cfg),
      color: 0xffffff,
      text_size: 36,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    })

    // 5 組模組: 點一下切過去編輯, 順便記住下次「開始」要用哪組
    cfg.presets.forEach((_, i) => {
      root.createWidget(hmUI.widget.BUTTON, {
        x: 36 + i * 84,
        y: 148,
        w: 72,
        h: 64,
        radius: 32,
        normal_color: i === cfg.preset ? 0xd94a3d : 0x2c2c30,
        press_color: 0xa8342a,
        text: String(i + 1),
        color: 0xffffff,
        text_size: 30,
        click_func: () => {
          if (i === cfg.preset) return
          cfg.preset = i
          save(cfg)
          replace({ url: 'page/index' })
        },
      })
    })

    ROWS.forEach((row, i) => {
      const y = ROW_Y[i]
      const h = 72

      root.createWidget(hmUI.widget.TEXT, {
        x: 44,
        y,
        w: 124,
        h,
        text: t(row.key, cfg),
        color: 0x8e9196,
        text_size: 28,
        align_h: hmUI.align.LEFT,
        align_v: hmUI.align.CENTER_V,
      })

      root.createWidget(hmUI.widget.BUTTON, {
        x: 172,
        y,
        w: h,
        h,
        radius: h / 2,
        normal_color: 0x2c2c30,
        press_color: 0x50505a,
        text: '-',
        color: 0xffffff,
        text_size: 34,
        click_func: () => this.bump(row, -row.step),
      })

      this.values[row.key] = root.createWidget(hmUI.widget.TEXT, {
        x: 252,
        y,
        w: 92,
        h,
        text: String(this.cur[row.key]),
        color: 0xffffff,
        text_size: 40,
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V,
      })

      root.createWidget(hmUI.widget.BUTTON, {
        x: 352,
        y,
        w: h,
        h,
        radius: h / 2,
        normal_color: 0x2c2c30,
        press_color: 0x50505a,
        text: '+',
        color: 0xffffff,
        text_size: 34,
        click_func: () => this.bump(row, row.step),
      })
    })

    pad(root, 756)

    root.createWidget(hmUI.widget.BUTTON, {
      x: 100,
      y: 676,
      w: 280,
      h: 80,
      radius: 40,
      normal_color: 0xd94a3d,
      press_color: 0xa8342a,
      text: t('start', cfg),
      color: 0xffffff,
      text_size: 34,
      click_func: () => push({ url: 'page/timer' }),
    })
  },

  bump(row, delta) {
    const next = Math.min(row.max, Math.max(row.min, this.cur[row.key] + delta))
    this.cur[row.key] = next
    this.values[row.key].setProperty(hmUI.prop.TEXT, String(next))
    save(this.cfg)
  },
})
