import { getLanguage } from '@zos/settings'
import { load } from './store'

// getLanguage(): 0 = zh-CN, 1 = zh-TW, 其他（2 = en-US 等）都當英文
function systemLang() {
  try {
    return getLanguage() <= 1 ? 'zh' : 'en'
  } catch (e) {
    return 'zh'
  }
}

export function lang(cfg = load()) {
  const pick = cfg.lang || 'auto'
  return pick === 'auto' ? systemLang() : pick
}

export function t(key, cfg) {
  const dict = T[lang(cfg)] || T.zh
  return dict[key] !== undefined ? dict[key] : T.zh[key] !== undefined ? T.zh[key] : key
}

// 秒數 → 分:秒, 例如 90 → "1:30". 準備/工作/休息一律用這個格式顯示
// shortcut: 只支援到 59:59, 超過一小時的間歇沒必要
const pad2 = (n) => (n < 10 ? `0${n}` : String(n))

export function fmtTime(sec) {
  const s = Math.max(0, Math.round(sec || 0))
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`
}

export function summary(cfg) {
  const p = cfg.presets[cfg.preset]
  const head = `${cfg.preset + 1} · `
  const time = `${fmtTime(p.work)}/${fmtTime(p.rest)}`
  return lang(cfg) === 'zh'
    ? `${head}${time} · ${p.sets}組×${p.rounds}輪`
    : `${head}${time} · ${p.sets}×${p.rounds}`
}

const T = {
  zh: {
    start: '開始',
    settings: '設定',
    presets: '間歇模組',
    prep: '準備',
    lead: '準備時間',
    work: '工作',
    rest: '休息',
    sets: '組數',
    rounds: '輪數',
    min: '分',
    sec: '秒',
    skip: '跳過',
    pause: '暫停',
    resume: '繼續',
    stop: '停止',
    done: '完成',
    allDone: '全部完成',
    language: '語言',
    lang: '介面語言',
    auto: '跟隨手錶',
    alerts: '提示',
    alert: '提示方式',
    vibLen: '震動強度',
    tick: '最後 3 秒',
    vib: '震動',
    sound: '音效',
    both: '兩者',
    off: '關',
    len1: '弱',
    len2: '中',
    len3: '強',
    hintAlign: '階段切換與全部完成時',
    hintLen: '只影響工作開始與完成',
    hintTick: '倒數 3 秒每秒一下',
    soundOn: '音效 = 手錶鈴聲',
    soundOff: '手錶鈴聲已關閉',
  },
  en: {
    start: 'START',
    settings: 'SETTINGS',
    presets: 'PRESETS',
    prep: 'READY',
    lead: 'Prep',
    work: 'Work',
    rest: 'Rest',
    sets: 'Sets',
    rounds: 'Rounds',
    min: 'm',
    sec: 's',
    skip: 'Skip',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',
    done: 'DONE',
    allDone: 'All done',
    language: 'LANGUAGE',
    lang: 'Language',
    auto: 'Follow watch',
    alerts: 'ALERTS',
    alert: 'Alert',
    vibLen: 'Vibration',
    tick: 'Last 3s',
    vib: 'Vibrate',
    sound: 'Sound',
    both: 'Both',
    off: 'Off',
    len1: 'Weak',
    len2: 'Med',
    len3: 'Strong',
    hintAlign: 'On phase change and finish',
    hintLen: 'Only work start/finish',
    hintTick: 'One pulse per second',
    soundOn: 'Sound = watch ringtone',
    soundOff: 'Watch ringtone is off',
  },
}
