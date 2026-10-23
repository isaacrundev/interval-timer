import * as hmUI from '@zos/ui'
import { push, replace } from '@zos/router'
import { load, save } from '../utils/store'
import { t, fmtTime } from '../utils/i18n'
import { screen, pad, W, H } from '../utils/screen'

// 數值點一下就開系統轉盤 (WIDGET_PICKER) 上下撥; secs = 時間欄位, 轉盤分「分」「秒」兩輪
const ROWS = [
  { key: 'lead', min: 0, max: 300, secs: true },
  { key: 'work', min: 5, max: 1200, secs: true },
  { key: 'rest', min: 5, max: 1200, secs: true },
  { key: 'sets', min: 1, max: 30 },
  { key: 'rounds', min: 1, max: 10 },
]

const ROW_Y = [236, 324, 412, 500, 588]

const seq = (n, from = 0) => Array.from({ length: n }, (_, i) => from + i)

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

      root.createWidget(hmUI.widget.TEXT, {
        x: 44,
        y,
        w: 124,
        h: 72,
        text: t(row.key, cfg),
        color: 0x8e9196,
        text_size: 26,
        align_h: hmUI.align.LEFT,
        align_v: hmUI.align.CENTER_V,
      })

      // 數值本身就是按鈕: 點一下開轉盤, 不再用 ± 連按
      this.values[row.key] = root.createWidget(hmUI.widget.BUTTON, {
        x: 168,
        y: y + 4,
        w: 264,
        h: 64,
        radius: 32,
        normal_color: 0x2c2c30,
        press_color: 0x50505a,
        text: this.show(row),
        color: 0xffffff,
        text_size: 34,
        click_func: () => this.pick(row),
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

  show(row) {
    return row.secs ? fmtTime(this.cur[row.key]) : String(this.cur[row.key])
  },

  // 轉盤: 撥動只改暫存值, 按完成 (event 2) 才寫回存檔
  pick(row) {
    const cfg = this.cfg
    const cur = this.cur[row.key]
    this.mins = Math.min(Math.floor(row.max / 60), Math.floor(cur / 60))
    this.secs = cur % 60
    this.picked = cur

    const col = (data_array, index, unit) => ({
      data_array,
      support_loop: true,
      init_val_index: index,
      unit,
      font_size: 28,
      select_font_size: 44,
      col_width: 110,
    })

    const cols = row.secs
      ? [col(seq(Math.floor(row.max / 60) + 1), this.mins, t('min', cfg)), col(seq(60), this.secs, t('sec', cfg))]
      : [col(seq(row.max - row.min + 1, row.min), cur - row.min, '')]

    // 系統轉盤要自己掛在一個全螢幕容器上, 完成後再刪掉容器
    const vc = hmUI.createWidget(hmUI.widget.VIEW_CONTAINER, { x: 0, y: 0, w: W, h: H, scroll_enable: 0 })
    vc.createWidget(hmUI.widget.WIDGET_PICKER, {
      title: t(row.key, cfg),
      nb_of_columns: cols.length,
      data_config: cols,
      picker_cb: (picker, event, column, index) => {
        // event 1 = 撥動中 (官方範例如此), 2 = 按完成; 有給欄位就記下來
        if (column >= 0 && index >= 0) {
          if (!row.secs) this.picked = index + row.min
          else if (column === 0) this.mins = index
          else this.secs = index
        }
        if (event !== 2) return
        this.commit(row)
        hmUI.deleteWidget(vc)
        hmUI.redraw()
      },
    })
  },

  commit(row) {
    const v = row.secs ? this.mins * 60 + this.secs : this.picked
    this.cur[row.key] = Math.min(row.max, Math.max(row.min, v))
    this.values[row.key].setProperty(hmUI.prop.TEXT, this.show(row))
    save(this.cfg)
  },
})
