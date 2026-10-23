import { createWidget, widget } from '@zos/ui'

export const W = 480
export const H = 480
// 圓形螢幕上下兩端很窄: 底部留白讓最後一行能滑進可視圈內, 否則字會被切掉
export const BOTTOM_PAD = 80

// 整頁的縱向捲動容器. 內容照順序往下排, 排不進 480 高就滑, 不必為了塞畫面把字縮小
export function screen() {
  const c = createWidget(widget.VIEW_CONTAINER, { x: 0, y: 0, w: W, h: H, scroll_enable: 1 })
  try {
    // 右側捲動指示條: 讓使用者知道下面還有東西
    createWidget(widget.PAGE_SCROLLBAR, { target: c })
  } catch (e) {}
  return c
}

// 接在內容最下方, 撐出可滑範圍
export function pad(root, bottom) {
  root.createWidget(widget.FILL_RECT, { x: 0, y: bottom, w: 1, h: BOTTOM_PAD, color: 0x000000 })
}
