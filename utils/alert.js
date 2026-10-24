import {
  Vibrator,
  SystemSounds,
  VIBRATOR_SCENE_DURATION,
  VIBRATOR_SCENE_DURATION_LONG,
  VIBRATOR_SCENE_STRONG_REMINDER,
  VIBRATOR_SCENE_NOTIFICATION,
  VIBRATOR_SCENE_SHORT_LIGHT,
} from '@zos/sensor'
import { load } from './store'

// 一次提示 = 一次震動, 不重覆也不排隊, 最長 1.2 秒
const LEN = [VIBRATOR_SCENE_DURATION, VIBRATOR_SCENE_DURATION_LONG, VIBRATOR_SCENE_STRONG_REMINDER]
// 休息與最後 3 秒用固定場景: 短到不會和前後一下連起來, 所以刻意不受 VIB LEN 影響
const FIXED = { rest: VIBRATOR_SCENE_NOTIFICATION, tick: VIBRATOR_SCENE_SHORT_LIGHT }
// 最後 3 秒每秒一下: 文件寫 20ms, 但手錶實際會拖尾, 所以到 60ms 就切電, 三下才分得開
const TICK_CUT = 60
const SND = { work: 'ALARM', rest: 'MESSAGE', tick: 'CAMERA', done: 'ACHIEVE' }

const vib = new Vibrator()
let sounds = null

// 階段切換 / 完成用 ALERT, 最後 3 秒的每秒提示用 tickAlert, 兩者互不影響
export function notify(kind, cfg = load()) {
  const mode = (kind === 'tick' ? cfg.tickAlert : cfg.alert) || 'off'
  if (mode === 'off') return
  cancel()
  if (mode !== 'sound') {
    vib.start({ mode: FIXED[kind] || LEN[(Number(cfg.vibLen) || 1) - 1] })
    if (kind === 'tick') setTimeout(stopVib, TICK_CUT)
  }
  if (mode !== 'vib') playSound(SND[kind])
}

function stopVib() {
  try {
    vib.stop()
  } catch (e) {}
}

export function cancel() {
  stopVib()
  try {
    sounds && sounds.stop()
  } catch (e) {}
}

function playSound(type) {
  try {
    if (!sounds) sounds = new SystemSounds()
    // shortcut: 手錶關掉系統鈴聲就沒聲音, 沒有自己的音檔可用
    if (!sounds.getEnabled()) return
    sounds.start(sounds.getSourceType()[type])
  } catch (e) {
    console.log('sound failed', e)
  }
}
