import {
  Vibrator,
  SystemSounds,
  VIBRATOR_SCENE_DURATION,
  VIBRATOR_SCENE_NOTIFICATION,
  VIBRATOR_SCENE_SHORT_LIGHT,
} from '@zos/sensor'
import { load } from './store'

// 只用「一定會自己停」的短場景: 持續震動類 (CALL / TIMER) 與 STRONG_REMINDER 在部分韌體上停不下來, 所以不用
const PULSE = { mode: VIBRATOR_SCENE_DURATION, ms: 600 } // 高強度短震 600ms
const GAP = 200 // 兩下之間留白, 才數得出幾下
// 震動長度 = 幾下: 長度完全由 app 數出來, 不靠手錶認得哪個場景 (它常常不認)
const LEN = [1, 2, 3] // 短 .6秒 / 中 1.4秒 / 長 2.2秒
// 休息與最後 3 秒用固定場景, 刻意不受設定影響
// tick 文件寫 20ms, 但手錶實際會拖尾, 所以到 60ms 就切電, 三下才分得開
const FIXED = {
  rest: { mode: VIBRATOR_SCENE_NOTIFICATION, ms: 800 },
  tick: { mode: VIBRATOR_SCENE_SHORT_LIGHT, ms: 60 },
}
const SND = { work: 'ALARM', rest: 'MESSAGE', tick: 'CAMERA', done: 'ACHIEVE' }

const vib = new Vibrator()
let sounds = null
// 每一輪提示一個號: 舊的排程只停得到自己那一輪, 不會把下一輪切掉
let gen = 0

// 階段切換 / 完成用 ALERT, 最後 3 秒的每秒提示用 tickAlert, 兩者互不影響
export function notify(kind, cfg = load()) {
  const mode = (kind === 'tick' ? cfg.tickAlert : cfg.alert) || 'off'
  if (mode === 'off') return
  cancel()
  if (mode !== 'sound') vibrate(kind, cfg)
  if (mode !== 'vib') playSound(SND[kind])
}

// 設定頁按一下先試聽新的震動長度 (只震, 不出聲)
export function preview(cfg = load()) {
  cancel()
  vibrate('work', cfg)
}

function vibrate(kind, cfg) {
  const fixed = FIXED[kind]
  const spec = fixed || PULSE
  const count = fixed ? 1 : LEN[(Number(cfg.vibLen) || 1) - 1]
  const g = gen
  for (let i = 0; i < count; i++) setTimeout(() => pulse(g, spec), i * (spec.ms + GAP))
}

function pulse(g, { mode, ms }) {
  if (g !== gen) return
  try {
    vib.setMode({ mode })
    vib.start({ mode })
  } catch (e) {
    console.log('vibrate failed', e)
    return
  }
  // 場景自己會停, 但韌體不一定照文件走, 所以照表定長度再硬停一次
  setTimeout(() => g === gen && stopVib(), ms)
}

function stopVib() {
  try {
    vib.stop()
  } catch (e) {}
}

export function cancel() {
  gen++ // 還沒播的下幾下就不播了
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
