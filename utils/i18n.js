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

export function summary(cfg) {
  const p = cfg.presets[cfg.preset]
  const head = `${cfg.preset + 1} · `
  return lang(cfg) === 'zh'
    ? `${head}${p.work}秒/${p.rest}秒 · ${p.sets}組×${p.rounds}輪`
    : `${head}${p.work}s/${p.rest}s · ${p.sets}×${p.rounds}`
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
    vibLen: '震動長度',
    tick: '最後 3 秒',
    vib: '震動',
    sound: '音效',
    both: '兩者',
    off: '關',
    len1: '短 .6秒',
    len2: '中 1秒',
    len3: '長 1.2秒',
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
    len1: 'Short .6s',
    len2: 'Med 1s',
    len3: 'Long 1.2s',
    hintAlign: 'On phase change and finish',
    hintLen: 'Only work start/finish',
    hintTick: 'One pulse per second',
    soundOn: 'Sound = watch ringtone',
    soundOff: 'Watch ringtone is off',
  },
}
