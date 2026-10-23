import * as hmUI from '@zos/ui'
import { replace } from '@zos/router'
import { SystemSounds } from '@zos/sensor'
import { load, save } from '../utils/store'
import { t } from '../utils/i18n'
import { screen, pad } from '../utils/screen'

const ROW = { x: 48, w: 384, h: 72, radius: 36 }

Page({
  build() {
    const cfg = load()
    this.cfg = cfg

    const root = screen()
    this.root = root
    this.w = {}
    this.w.title = this.text(0, 40, 52, 36, t('settings', cfg))
    this.w.langSection = this.text(0, 108, 32, 24, t('language', cfg), 0x4f9de0)
    this.w.lang = this.row(150, 'lang', t('lang', cfg), [t('auto', cfg), '中文', 'English'], ['auto', 'zh', 'en'], () =>
      replace({ url: 'page/settings' }),
    )

    this.w.alertSection = this.text(0, 246, 32, 24, t('alerts', cfg), 0x4f9de0)
    this.w.alert = this.alertRow(
      288,
      'alert',
      t('alert', cfg),
      [t('vib', cfg), t('sound', cfg), t('both', cfg)],
      ['vib', 'sound', 'both'],
      t('hintAlign', cfg),
    )
    this.w.vibLen = this.alertRow(
      412,
      'vibLen',
      t('vibLen', cfg),
      [t('len1', cfg), t('len2', cfg), t('len3', cfg)],
      [1, 2, 3],
      t('hintLen', cfg),
    )
    this.w.tickAlert = this.alertRow(
      536,
      'tickAlert',
      t('tick', cfg),
      [t('off', cfg), t('vib', cfg), t('sound', cfg), t('both', cfg)],
      ['off', 'vib', 'sound', 'both'],
      t('hintTick', cfg),
    )

    pad(root, 692)
    this.text(0, 660, 32, 20, soundEnabled() ? t('soundOn', cfg) : t('soundOff', cfg), 0x6f7276)
  },

  text(x, y, h, size, str, color = 0xffffff) {
    return this.root.createWidget(hmUI.widget.TEXT, {
      x,
      y,
      w: 480,
      h,
      text: str,
      color,
      text_size: size,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    })
  },

  // 一般設定列: [標題: 值] 一顆按鈕, 點一下就換下一個值
  row(y, key, title, labels, values, onPick) {
    const cfg = this.cfg
    const label = () => labels[Math.max(0, values.indexOf(cfg[key]))]

    return this.root.createWidget(hmUI.widget.BUTTON, {
      ...ROW,
      y,
      normal_color: 0x2c2c30,
      press_color: 0x50505a,
      text: `${title}: ${label()}`,
      color: 0xffffff,
      text_size: 26,
      click_func: () => {
        cfg[key] = values[(values.indexOf(cfg[key]) + 1) % values.length]
        save(cfg)
        if (onPick) return onPick()
        this.w[key].setProperty(hmUI.prop.TEXT, `${title}: ${label()}`)
      },
    })
  },

  // 提示區的列: 下面多一行說明它什麼時候生效
  alertRow(y, key, title, labels, values, hint) {
    const btn = this.row(y, key, title, labels, values)
    this.text(0, y + 84, 32, 20, hint, 0x777b80)
    return btn
  },
})

function soundEnabled() {
  try {
    return new SystemSounds().getEnabled()
  } catch (e) {
    return false
  }
}
