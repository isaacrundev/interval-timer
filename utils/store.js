import { statSync, readFileSync, writeFileSync } from '@zos/fs'

const FILE = 'interval-cfg.json'

// 5 組間歇模組, 每組 { lead, work, rest, sets, rounds }。lead = 開始前的準備倒數(秒), 0 = 不倒數
export const PRESETS = [
  { lead: 5, work: 45, rest: 20, sets: 8, rounds: 1 },
  { lead: 5, work: 30, rest: 15, sets: 10, rounds: 1 },
  { lead: 5, work: 60, rest: 30, sets: 5, rounds: 2 },
  { lead: 5, work: 20, rest: 40, sets: 8, rounds: 1 },
  { lead: 5, work: 120, rest: 60, sets: 4, rounds: 1 },
]

export const DEFAULTS = {
  presets: PRESETS,
  preset: 0, // 最後一次開始用的是哪一組（也是編輯中的那一組）
  alert: 'vib',
  tickAlert: 'off',
  lang: 'auto',
}

export function load() {
  let cfg = { ...DEFAULTS }
  try {
    if (statSync({ path: FILE })) {
      cfg = { ...cfg, ...JSON.parse(readFileSync({ path: FILE, options: { encoding: 'utf8' } })) }
    }
  } catch (e) {
    cfg = { ...DEFAULTS }
  }

  // 一定長成 5 組完整物件: 存檔壞掉/舊版只有一組 work/rest/sets/rounds 都能開起來
  const saved = Array.isArray(cfg.presets) ? cfg.presets : []
  const legacy = cfg.work ? { work: cfg.work, rest: cfg.rest, sets: cfg.sets, rounds: cfg.rounds } : {}
  for (const k of ['work', 'rest', 'sets', 'rounds']) delete cfg[k] // 舊版欄位, 已搬進 presets
  cfg.presets = PRESETS.map((d, i) => ({ ...d, ...(saved[i] || {}), ...(i === 0 ? legacy : {}) }))
  cfg.preset = Math.min(PRESETS.length - 1, Math.max(0, cfg.preset | 0))
  return cfg
}

export function save(cfg) {
  try {
    writeFileSync({ path: FILE, data: JSON.stringify(cfg), options: { encoding: 'utf8' } })
  } catch (e) {
    console.log('save failed', e)
  }
}
