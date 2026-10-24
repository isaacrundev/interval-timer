import { hmSensor, Vibrator, SystemSounds } from '@zos/sensor'
import { load } from './store'

// 震動一律用「數字場景」: 具名常數 (VIBRATOR_SCENE_*) 在部分韌體上拿不到值,
// 傳進去等於沒傳, 手錶就只用預設的 20ms 弱弱震一下 — 這就是要什麼都無感的原因
// 23 = 輕 20ms, 5 = 高強度「連續驅動」(手錶鬧鐘/倒數那個)
// 注意: 場景 0 (訊息通知) 本身就是兩下短震, 用下去每次提示都會多一下 — 不要用
const SCENE = { light: 23, drive: 5 }
// 實測結論: 這台錶只有「連續驅動」場景 (5) 真的有感, 20ms (23/25) 和 600ms 單發 (28) 聽起來一樣小
// (28 大概沒被韌體認得, 掉回預設 20ms)。而場景 5 是 ~500ms 一下就自己重複的循環:
// 切電時間一超過一輪就會變「震－停－震」, 聽起來就是多了一下。
// 所以: 每次提示都只佔一輪以內, 兩級用「一輪內震多久」分 (力道是手錶給的, 不能調):
//   短 250ms / 長 480ms (剛好一整下, 還不跨到下一輪)
const DRIVE = [250, 480]
// 休息與最後 3 秒用固定場景, 刻意不受設定影響
// 休息比「短」更短的一下 (150ms): 單下、聽得出「這是休息」, 又不會多一聲
// tick 文件寫 20ms, 但手錶實際會拖尾, 所以到 60ms 就切電, 三下才分得開
const FIXED = {
  rest: { scene: SCENE.drive, cut: 150 },
  tick: { scene: SCENE.light, cut: 60 },
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

// 設定頁按一下先試聽新的震動強度 (只震, 不出聲)
export function preview(cfg = load()) {
  cancel()
  vibrate('work', cfg)
}

function vibrate(kind, cfg) {
  const lv = Math.min(2, Math.max(1, Number(cfg.vibLen) || 2))
  pulse(gen, FIXED[kind] || { scene: SCENE.drive, cut: DRIVE[lv - 1] })
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
  // 連續震動場景必須自己停, 所以多停一次 (120ms 後), 第一次被韌體吞掉也斷得了電
  for (const t of [cut, cut + 120]) setTimeout(() => g === gen && stopVib(), t)
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
