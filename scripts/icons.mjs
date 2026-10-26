// 產生計時頁的圖示按鈕, 輸出 assets/default.r/images/*.png
// 按鈕列是佔滿螢幕下方 1/3 的圓弧面板: 上緣是水平切弦, 下緣沿著錶面圓弧走
// 三顆按鈕各是面板的一欄, 欄與欄之間是細分隔線, 圓弧以外全透明
// (BUTTON 的框是矩形, 弧形面板只能靠圖檔的透明區做出來)
// 用繪圖軟體改 icon 太囉唆: 形狀就這四個, 用程式畫還順便留著怎麼畫。
// 執行: node scripts/icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const C = 240 // 錶面圓心
const R = 240 // 弧的半徑 = 螢幕半徑, 面板才會貼死錶面邊緣不留白
const TOP = 320 // 下方 1/3 的切弦
const W = 160 // 一欄的寬 (三欄等分 480)
const H = C + R - TOP // 面板高度 (320..472)
const SS = 4 // 4×4 超取樣, 邊緣才不會有鋸齒
const BG = [0x00, 0x00, 0x00]
const PRESS_BG = [0x33, 0x33, 0x38]
const LINE = [0x3a, 0x3a, 0x3f] // 段與段之間的分隔線
const INK = [0xff, 0xff, 0xff]

const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1

// 面板的一欄: 弦以下、圓弧以內, 而且落在這一欄 (用全域座標判斷)
function inSeg(gx, gy, slot) {
  return gx >= slot.x && gx <= slot.x + W && gy >= TOP && Math.hypot(gx - C, gy - C) <= R
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
const I = 26 // 圖示半高 (弧形面板邊緣窄, 小一點才不會貼到圓弧)
const K = I / 19 // 圖示都以原本 19 半高時的座標畫, 這裡照比例縮放
const icons = {
  // 播放: 向右的三角形
  play: (x, y, cx, cy) => inTri(x, y, [cx - 11 * K, cy - I], [cx - 11 * K, cy + I], [cx + 14 * K, cy]),
  // 暫停: 兩根直條
  pause: (x, y, cx, cy) =>
    inRect(x, y, cx - 14 * K, cy - I, cx - 6 * K, cy + I) ||
    inRect(x, y, cx + 6 * K, cy - I, cx + 14 * K, cy + I),
  // 停止: 方形
  stop: (x, y, cx, cy) =>
    inRect(x, y, cx - I, cy - I, cx + I, cy + I),
  // 跳過: 三角形 + 尾端直條
  skip: (x, y, cx, cy) =>
    inTri(x, y, [cx - 15 * K, cy - I], [cx - 15 * K, cy + I], [cx + 9 * K, cy]) ||
    inRect(x, y, cx + 12 * K, cy - I, cx + 18 * K, cy + I),
}

// 圖示擺在這一欄的形心: 左右兩欄被圓弧切掉一塊, 擺正中央會看起來偏掉
function center(slot) {
  let sx = 0
  let sy = 0
  let n = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const gx = slot.x + x + 0.5
      const gy = TOP + y + 0.5
      if (!inSeg(gx, gy, slot)) continue
      sx += gx
      sy += gy
      n++
    }
  }
  return [sx / n, sy / n]
}

// 三欄的形心 y 不同 (中間那欄最深, 左右被圓弧切掉一角), 但圖示要水平對齊,
// 所以三欄共用最淺那一欄的形心 y — 再低下去左右兩顆就會被圓弧切到
const ICON_Y = Math.min(...[0, W, W * 2].map((x) => center({ x })[1]))

// 三欄等分: 左右兩欄的墨跡被圓弧切掉, 中間那欄整片都在
const SLOTS = [
  { name: 'skip', x: 0, line: true },
  { name: 'pause', x: W, line: true },
  { name: 'play', x: W, line: true },
  { name: 'stop', x: W * 2, line: false },
]

function render(slot, bg) {
  const icon = icons[slot.name]
  const [cx] = center(slot)
  const px = Buffer.alloc(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sum = [0, 0, 0]
      let bgCov = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const gx = slot.x + x + (sx + 0.5) / SS
          const gy = TOP + y + (sy + 0.5) / SS
          if (!inSeg(gx, gy, slot)) continue
          bgCov++
          // 分隔線畫在兩欄之間, 上下各留一截才不會黏到邊
          const divider =
            slot.line && gx >= slot.x + W - 1 && gy >= TOP + 12 && Math.hypot(gx - C, gy - C) <= R - 12
          const c = icon(gx, gy, cx, ICON_Y) ? INK : divider ? LINE : bg
          for (let i = 0; i < 3; i++) sum[i] += c[i]
        }
      }
      const o = (y * W + x) * 4
      for (let i = 0; i < 3; i++) px[o + i] = Math.round(sum[i] / (SS * SS))
      px[o + 3] = Math.round((bgCov / (SS * SS)) * 255) // 圓弧外面透明, 面板才是弧形
    }
  }
  return png(px, W, H)
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
