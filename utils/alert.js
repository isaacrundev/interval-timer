import { hmSensor, Vibrator, SystemSounds } from '@zos/sensor'
import { load } from './store'

// 震動一律用「數字場景」: 具名常數 (VIBRATOR_SCENE_*) 在部分韌體上拿不到值,
// 傳進去等於沒傳, 手錶就只用預設的 20ms 弱弱震一下 — 這就是要什麼都無感的原因
// 23 = 輕 20ms, 25 = 強 20ms, 28 = 強 600ms, 0 = 兩下短震 (同訊息通知)
const SCENE = { light: 23, notif: 0, strong600: 28 }
const PULSE = { scene: SCENE.strong600, dur: 600, cut: 750 } // 一下 = 600ms 高強度; 750ms 才硬停, 留點尾巴
const GAP = 200 // 兩下之間留白, 才數得出幾下
// 震動長度 = 幾下: 長度完全由 app 數出來, 不靠手錶認得哪個場景
const LEN = [1, 2, 3] // 短 .6秒 / 中 1.4秒 / 長 2.2秒
// 休息與最後 3 秒用固定場景, 刻意不受設定影響
// tick 文件寫 20ms, 但手錶實際會拖尾, 所以到 60ms 就切電, 三下才分得開
const FIXED = {
  rest: { scene: SCENE.notif, dur: 0, cut: 800 },
  tick: { scene: SCENE.light, dur: 0, cut: 60 },
}
const SND = { work: 'ALARM', rest: 'MESSAGE', tick: 'CAMERA', done: 'ACHIEVE' }

// 手錶自己的震動馬達 (設定 scene 再 start), 力道最實在; 舊韌體沒有就用 Vibrator 吃同樣的數字
let sensor = null
function vibSensor() {
  if (!sensor) {
    try {
      sensor = hmSensor.createSensor(hmSensor.id.VIBRATE)
    } catch (e) {
      sensor = null
    }
  }
  return sensor
}
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
  for (let i = 0; i < count; i++) setTimeout(() => pulse(g, spec), i * (spec.dur + GAP))
}

function pulse(g, { scene, cut }) {
  if (g !== gen) return
  const s = vibSensor()
  try {
    if (s) {
      s.stop()
      s.scene = scene
      s.start()
    } else {
      vib.setMode({ mode: scene })
      vib.start({ mode: scene })
    }
  } catch (e) {
    console.log('vibrate failed', e)
    return
  }
  // 場景自己會停, 但韌體不一定照文件走, 所以時間到再硬停一次
  setTimeout(() => g === gen && stopVib(), cut)
}

function stopVib() {
  try {
    if (sensor) sensor.stop()
    else vib.stop()
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
