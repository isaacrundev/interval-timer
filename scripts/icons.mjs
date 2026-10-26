// 產生計時頁的圖示按鈕, 輸出 assets/default.r/images/*.png
// 三顆按鈕拼成一個橫放的膠囊 (tiling 在一起): 左右兩端圓角, 中間兩道細分隔線
// 用繪圖軟體改 icon 太囉唆: 形狀就這四個, 用程式畫還順便留著怎麼畫。
// 執行: node scripts/icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const H = 160
const CY = H / 2
const K = H / 84 // 圖示尺寸都照原本 84 高的比例放大
const SS = 4 // 4×4 超取樣, 邊緣才不會有鋸齒
const BG = [0x00, 0x00, 0x00]
const PRESS_BG = [0x33, 0x33, 0x38]
const LINE = [0x3a, 0x3a, 0x3f] // 段與段之間的分隔線
const INK = [0xff, 0xff, 0xff]

const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1

// 膠囊的一段: cap = 'l' / 'r' / '' (兩端圓角, 中間是方角, 拼起來就是一個膠囊)
function inSeg(x, y, w, cap) {
  if (!inRect(x, y, 0, 0, w, H)) return false
  if (cap === 'l' && x < CY) return Math.hypot(x - CY, y - CY) <= CY
  if (cap === 'r' && x > w - CY) return Math.hypot(x - (w - CY), y - CY) <= CY
  return true
}

// 點在三角形內: 三個邊的同側測試
function inTri(x, y, a, b, c) {
  const side = (p, q) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0])
  const s1 = side(a, b)
  const s2 = side(b, c)
  const s3 = side(c, a)
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)
}

// 圖示都以該段的中心為原點畫 (半高 I 跟著膠囊高度走, 膠囊拉高圖示也一起大)
const I = 19 * K
const icons = {
  // 播放: 向右的三角形
  play: (x, y, cx) => inTri(x, y, [cx - 11 * K, CY - I], [cx - 11 * K, CY + I], [cx + 14 * K, CY]),
  // 暫停: 兩根直條
  pause: (x, y, cx) =>
    inRect(x, y, cx - 14 * K, CY - I, cx - 6 * K, CY + I) ||
    inRect(x, y, cx + 6 * K, CY - I, cx + 14 * K, CY + I),
  // 停止: 方形
  stop: (x, y, cx) =>
    inRect(x, y, cx - I, CY - I, cx + I, CY + I),
  // 跳過: 三角形 + 尾端直條
  skip: (x, y, cx) =>
    inTri(x, y, [cx - 15 * K, CY - I], [cx - 15 * K, CY + I], [cx + 9 * K, CY]) ||
    inRect(x, y, cx + 12 * K, CY - I, cx + 18 * K, CY + I),
}

// 三顆按鈕的畫布寬度 (116 × 3 = 348 = 膠囊總寬, 高度 160 = 螢幕下方 1/3)
const SLOTS = [
  { name: 'skip', w: 116, cap: 'l', line: true },
  { name: 'pause', w: 116, cap: '', line: true },
  { name: 'play', w: 116, cap: '', line: true },
  { name: 'stop', w: 116, cap: 'r', line: false },
]

function render(slot, bg) {
  const icon = icons[slot.name]
  const px = Buffer.alloc(slot.w * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < slot.w; x++) {
      const sum = [0, 0, 0]
      let bgCov = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px_ = x + (sx + 0.5) / SS
          const py = y + (sy + 0.5) / SS
          if (!inSeg(px_, py, slot.w, slot.cap)) continue
          bgCov++
          // 分隔線只畫在段內, 高度比膠囊短一截看起來才不會太硬
          const divider = slot.line && px_ >= slot.w - 1 && py >= CY - 22 * K && py <= CY + 22 * K
          const c = icon(px_, py, slot.w / 2) ? INK : divider ? LINE : bg
          for (let i = 0; i < 3; i++) sum[i] += c[i]
        }
      }
      const o = (y * slot.w + x) * 4
      for (let i = 0; i < 3; i++) px[o + i] = Math.round(sum[i] / (SS * SS))
      px[o + 3] = Math.round((bgCov / (SS * SS)) * 255) // 圓角外面透明, 才看得出來是膠囊
    }
  }
  return png(px, slot.w, H)
}

const CRC = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(rgba, w, h) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  // 每條掃描線前面補 filter byte 0
  const raw = Buffer.alloc(h * (w * 4 + 1))
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const dir = new URL('../assets/default.r/images/', import.meta.url)
mkdirSync(dir, { recursive: true })
for (const slot of SLOTS) {
  writeFileSync(new URL(`${slot.name}_n.png`, dir), render(slot, BG))
  writeFileSync(new URL(`${slot.name}_p.png`, dir), render(slot, PRESS_BG))
}
console.log(`wrote ${SLOTS.length * 2} icons to ${dir.pathname}`)
