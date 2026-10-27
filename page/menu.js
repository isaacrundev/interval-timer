import * as hmUI from '@zos/ui'
import { push } from '@zos/router'
import { load } from '../utils/store'
import { t, summary } from '../utils/i18n'
import { screen } from '../utils/screen'

const BTN = {
  x: 92,
  w: 296,
  h: 72,
  radius: 36,
  color: 0xffffff,
  text_size: 32,
}

Page({
  build() {
    const c = load()
    const root = screen()

    root.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 56,
      w: 480,
      h: 64,
      text: t('title', c),
      color: 0xffffff,
      text_size: 36,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    })

    root.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 128,
      w: 480,
      h: 40,
      text: summary(c),
      color: 0x8e9196,
      text_size: 26,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    })

    // 快速開始: 直接用最後一次用的模組, 不進設定
    this.btn(root, 176, t('start', c), 0xd94a3d, 0xa8342a, () => push({ url: 'page/timer' }))
    this.btn(root, 262, t('presets', c), 0x2c2c30, 0x50505a, () => push({ url: 'page/index' }))
    this.btn(root, 348, t('settings', c), 0x2c2c30, 0x50505a, () => push({ url: 'page/settings' }))
  },

  btn(root, y, text, normal, press, fn) {
    return root.createWidget(hmUI.widget.BUTTON, {
      ...BTN,
      y,
      text,
      normal_color: normal,
      press_color: press,
      click_func: fn,
    })
  },
})
