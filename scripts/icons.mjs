// 產生計時頁的圖示按鈕 (112×68 圓角矩形 + 白色圖示), 輸出 assets/default.r/images/*.png
// 用繪圖軟體改 icon 太囉唆: 形狀就這四個, 用程式畫還順便留著怎麼畫。
// 執行: node scripts/icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const W = 112
const H = 68
const CX = W / 2
const CY = H / 2
const SS = 4 // 4×4 超取樣, 邊緣才不會有鋸齒
const BG = [0x00, 0x00, 0x00]
const PRESS_BG = [0x33, 0x33, 0x38]
const INK = [0xff, 0xff, 0xff]

const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1

// 按鈕外框 = 半徑 H/2 的膠囊 (跟原本 radius: 34 的黑底按鈕一樣)
function inRoundRect(x, y) {
  const r = H / 2
  return Math.hypot(x - Math.min(Math.max(x, r), W - r), y - CY) <= r
}

// 點在三角形內: 三個邊的同側測試
function inTri(x, y, a, b, c) {
  const side = (p, q) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0])
  const s1 = side(a, b)
  const s2 = side(b, c)
  const s3 = side(c, a)
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)
}

const shapes = {
  // 播放: 向右的三角形 (播放器裡的 play)
  play: (x, y) => inTri(x, y, [CX - 10, CY - 16], [CX - 10, CY + 16], [CX + 13, CY]),
  // 暫停: 兩根直條
  pause: (x, y) => inRect(x, y, CX - 13, CY - 16, CX - 5, CY + 16) || inRect(x, y, CX + 5, CY - 16, CX + 13, CY + 16),
  // 停止: 方形
  stop: (x, y) => inRect(x, y, CX - 14, CY - 14, CX + 14, CY + 14),
  // 跳過: 三角形 + 尾端直條
  skip: (x, y) =>
    inTri(x, y, [CX - 14, CY - 16], [CX - 14, CY + 16], [CX + 8, CY]) || inRect(x, y, CX + 11, CY - 16, CX + 16, CY + 16),
}

function render(shape, bg) {
  const px = Buffer.alloc(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // 按鈕底 (圓角矩形) 與圖示各自算覆蓋率, 再把圖示疊上去
      let bgCov = 0
      let inkCov = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px_ = x + (sx + 0.5) / SS
          const py = y + (sy + 0.5) / SS
          if (inRoundRect(px_, py)) bgCov++
          if (inRoundRect(px_, py) && shape(px_, py)) inkCov++
        }
      }
      const n = SS * SS
      const rgb = [0, 1, 2].map((i) => Math.round((bg[i] * (bgCov - inkCov) + INK[i] * inkCov) / (bgCov || 1)))
      const o = (y * W + x) * 4
      px[o] = rgb[0]
      px[o + 1] = rgb[1]
      px[o + 2] = rgb[2]
      px[o + 3] = Math.round((bgCov / n) * 255) // 圓角外面透明, 才看得出是圓角
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
for (const [name, shape] of Object.entries(shapes)) {
  writeFileSync(new URL(`${name}_n.png`, dir), render(shape, BG))
  writeFileSync(new URL(`${name}_p.png`, dir), render(shape, PRESS_BG))
}
console.log(`wrote ${Object.keys(shapes).length * 2} icons to ${dir.pathname}`)
