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
// ms 是文件上的表定長度, 一律照它硬停: 手錶不一定讓場景自己收尾, 不硬停就會一直震
const LEN = [
  { mode: VIBRATOR_SCENE_DURATION, ms: 600 }, // 短
  { mode: VIBRATOR_SCENE_DURATION_LONG, ms: 1000 }, // 中
  { mode: VIBRATOR_SCENE_STRONG_REMINDER, ms: 1200 }, // 長
]
// 休息與最後 3 秒用固定場景: 短到不會和前後一下連起來, 所以刻意不受 VIB LEN 影響
// tick 文件寫 20ms, 但手錶實際會拖尾, 所以到 60ms 就切電, 三下才分得開
const FIXED = {
  rest: { mode: VIBRATOR_SCENE_NOTIFICATION, ms: 800 },
  tick: { mode: VIBRATOR_SCENE_SHORT_LIGHT, ms: 60 },
}
const SND = { work: 'ALARM', rest: 'MESSAGE', tick: 'CAMERA', done: 'ACHIEVE' }

const vib = new Vibrator()
let sounds = null
// 每次震動一個號: 舊的停止排程只停得到自己那一次, 不會把下一次震動提早切掉
let gen = 0

// 階段切換 / 完成用 ALERT, 最後 3 秒的每秒提示用 tickAlert, 兩者互不影響
export function notify(kind, cfg = load()) {
  const mode = (kind === 'tick' ? cfg.tickAlert : cfg.alert) || 'off'
  if (mode === 'off') return
  cancel()
  if (mode !== 'sound') buzz(FIXED[kind] || LEN[(Number(cfg.vibLen) || 1) - 1])
  if (mode !== 'vib') playSound(SND[kind])
}

// setMode 和 start 都帶同一個 mode: 有的韌體只認其中一條路; 之後無論如何都硬停
function buzz({ mode, ms }) {
  const g = ++gen
  try {
    vib.setMode({ mode })
  } catch (e) {}
  try {
    vib.start({ mode })
  } catch (e) {
    console.log('vibrate failed', e)
    return
  }
  setTimeout(() => {
    if (g === gen) stopVib()
  }, ms)
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
