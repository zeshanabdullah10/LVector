// lib/conversion/svg-to-emf.ts

/**
 * EMF writer that replicates Windows GDI CreateEnhMetaFileW output.
 * Parses SVG with full fidelity: subpaths, cubic/quadratic Béziers with
 * adaptive flattening, all basic SVG shape elements, viewBox, transforms,
 * style attributes, and property inheritance from groups.
 *
 * Record type values sourced from Windows SDK wingdi.h.
 */

const EMR_HEADER = 1
const EMR_POLYGON = 3
const EMR_POLYLINE = 4
const EMR_SETWINDOWEXTEX = 9
const EMR_SETWINDOWORGEX = 10
const EMR_SETVIEWPORTEXTEX = 11
const EMR_SETVIEWPORTORGEX = 12
const EMR_EOF = 14
const EMR_SETMAPMODE = 17
const EMR_SETBKMODE = 18
const EMR_SETPOLYFILLMODE = 19
const EMR_SETROP2 = 20
const EMR_MOVETOEX = 27
const EMR_SELECTOBJECT = 37
const EMR_CREATEPEN = 38
const EMR_CREATEBRUSHINDIRECT = 39
const EMR_DELETEOBJECT = 40
const EMR_LINETO = 54

const MM_TEXT = 1
const OPAQUE = 2
const WINDING = 2
const R2_COPYPEN = 13
const BS_SOLID = 0
const PS_SOLID = 0

// --- Binary helpers ---

function w32(buf: Uint8Array, o: number, v: number) {
  buf[o] = v & 0xff; buf[o + 1] = (v >> 8) & 0xff
  buf[o + 2] = (v >> 16) & 0xff; buf[o + 3] = (v >> 24) & 0xff
}
function wi32(buf: Uint8Array, o: number, v: number) {
  // Write a signed 32-bit integer (two's complement) in little-endian.
  const u = v >>> 0   // reinterpret as unsigned so bit-shifts are safe
  buf[o] = u & 0xff; buf[o + 1] = (u >> 8) & 0xff
  buf[o + 2] = (u >> 16) & 0xff; buf[o + 3] = (u >> 24) & 0xff
}
function w16(buf: Uint8Array, o: number, v: number) {
  buf[o] = v & 0xff; buf[o + 1] = (v >> 8) & 0xff
}

// --- Color ---

function rgbToCR(r: number, g: number, b: number): number {
  return (r & 0xff) | ((g & 0xff) << 8) | ((b & 0xff) << 16)
}

function parseColor(c: string): [number, number, number] {
  if (!c || c === 'none') return [0, 0, 0]
  const namedColors: Record<string, string> = {
    black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000',
    blue: '#0000ff', yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff',
    silver: '#c0c0c0', gray: '#808080', grey: '#808080', maroon: '#800000',
    olive: '#808000', purple: '#800080', teal: '#008080', navy: '#000080',
    aqua: '#00ffff', fuchsia: '#ff00ff', lime: '#00ff00', orange: '#ffa500',
    pink: '#ffc0cb', brown: '#a52a2a', coral: '#ff7f50', gold: '#ffd700',
    indigo: '#4b0082', violet: '#ee82ee', salmon: '#fa8072', crimson: '#dc143c',
    darkblue: '#00008b', darkgreen: '#006400', darkred: '#8b0000',
    darkgray: '#a9a9a9', darkgrey: '#a9a9a9', lightblue: '#add8e6',
    lightgreen: '#90ee90', lightgray: '#d3d3d3', lightgrey: '#d3d3d3',
    transparent: '#000000',
  }
  const lc = c.trim().toLowerCase()
  if (namedColors[lc]) c = namedColors[lc]
  if (c.startsWith('rgb(')) {
    const n = c.replace('rgb(', '').replace(')', '').split(/[\s,]+/).map(s => {
      if (s.endsWith('%')) return Math.round(parseFloat(s) * 2.55)
      return parseInt(s, 10)
    })
    return [n[0] || 0, n[1] || 0, n[2] || 0]
  }
  const h = c.replace('#', '')
  if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
  if (h.length >= 6) return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  return [0, 0, 0]
}

// --- EMF record builders ---

function recHdr(type: number, size: number): Uint8Array {
  const b = new Uint8Array(size); w32(b, 0, type); w32(b, 4, size); return b
}

function recSetMapMode(m: number) { const b = recHdr(EMR_SETMAPMODE, 12); w32(b, 8, m); return b }
function recSetBkMode(m: number) { const b = recHdr(EMR_SETBKMODE, 12); w32(b, 8, m); return b }
function recSetPolyFillMode(m: number) { const b = recHdr(EMR_SETPOLYFILLMODE, 12); w32(b, 8, m); return b }
function recSetRop2(m: number) { const b = recHdr(EMR_SETROP2, 12); w32(b, 8, m); return b }
function recSetWindowOrgEx(x: number, y: number) { const b = recHdr(EMR_SETWINDOWORGEX, 16); wi32(b, 8, x); wi32(b, 12, y); return b }
function recSetWindowExtEx(cx: number, cy: number) { const b = recHdr(EMR_SETWINDOWEXTEX, 16); wi32(b, 8, cx); wi32(b, 12, cy); return b }
function recSetViewportOrgEx(x: number, y: number) { const b = recHdr(EMR_SETVIEWPORTORGEX, 16); wi32(b, 8, x); wi32(b, 12, y); return b }
function recSetViewportExtEx(cx: number, cy: number) { const b = recHdr(EMR_SETVIEWPORTEXTEX, 16); wi32(b, 8, cx); wi32(b, 12, cy); return b }

// FIX #4: EMR_CREATEBRUSHINDIRECT layout:
//   +8  ihBrush  (DWORD)  – handle index
//   +12 lbStyle  (DWORD)
//   +16 lbColor  (COLORREF)
//   +20 lbHatch  (ULONG_PTR, 32-bit in 32-bit EMF) → 4 bytes
// Total = 24 bytes. The hatch field was missing; write it explicitly.
function recCreateBrush(idx: number, cr: number) {
  const b = recHdr(EMR_CREATEBRUSHINDIRECT, 24)
  w32(b, 8, idx); w32(b, 12, BS_SOLID); w32(b, 16, cr); w32(b, 20, 0); return b
}

function recCreatePen(idx: number, penWidth: number, cr: number) {
  const b = recHdr(EMR_CREATEPEN, 28)
  w32(b, 8, idx)
  w32(b, 12, PS_SOLID)
  wi32(b, 16, penWidth)   // lopnWidth.x  (actual width)
  wi32(b, 20, 0)          // lopnWidth.y  (ignored, must be 0)
  w32(b, 24, cr)          // lopnColor  ← was at offset 20, now correct at 24
  return b
}

function recSelectObj(idx: number) { const b = recHdr(EMR_SELECTOBJECT, 12); w32(b, 8, idx); return b }
function recDeleteObj(idx: number) { const b = recHdr(EMR_DELETEOBJECT, 12); w32(b, 8, idx); return b }

// FIX #2: EMR_MOVETOEX and EMR_LINETO are 16 bytes, not 12.
// Layout: type(4) + size(4) + x(4) + y(4) = 16 bytes.
function recMoveToEx(x: number, y: number) {
  const b = recHdr(EMR_MOVETOEX, 16); wi32(b, 8, Math.round(x)); wi32(b, 12, Math.round(y)); return b
}
function recLineTo(x: number, y: number) {
  const b = recHdr(EMR_LINETO, 16); wi32(b, 8, Math.round(x)); wi32(b, 12, Math.round(y)); return b
}

// FIX #9: EMR_EOF layout:
//   +8  nPalEntries (DWORD) = 0
//   +12 offDescription (DWORD) = 0  (no description in the body)
//   +16 nSizeLast (DWORD) = record size (20)
// Previously nSizeLast was written at +16 which is correct, but
// nPalEntries and offDescription at +8/+12 were uninitialised (zero by
// default from new Uint8Array, so this was harmless – kept explicit for clarity).
function recEof() {
  const b = recHdr(EMR_EOF, 20)
  w32(b, 8, 0)   // nPalEntries
  w32(b, 12, 0)  // offDescription
  w32(b, 16, 20) // nSizeLast = total size of EMR_EOF record
  return b
}

function recPolygon(pts: Pt[], bl: number, bt: number, br: number, bb: number) {
  const n = pts.length; const sz = 28 + n * 8
  const b = new Uint8Array(sz)
  w32(b, 0, EMR_POLYGON); w32(b, 4, sz)
  wi32(b, 8, Math.round(bl)); wi32(b, 12, Math.round(bt))
  wi32(b, 16, Math.round(br)); wi32(b, 20, Math.round(bb))
  w32(b, 24, n)
  for (let i = 0; i < n; i++) { wi32(b, 28 + i * 8, Math.round(pts[i][0])); wi32(b, 32 + i * 8, Math.round(pts[i][1])) }
  return b
}

function recPolyline(pts: Pt[], bl: number, bt: number, br: number, bb: number) {
  const n = pts.length; const sz = 28 + n * 8
  const b = new Uint8Array(sz)
  w32(b, 0, EMR_POLYLINE); w32(b, 4, sz)
  wi32(b, 8, Math.round(bl)); wi32(b, 12, Math.round(bt))
  wi32(b, 16, Math.round(br)); wi32(b, 20, Math.round(bb))
  w32(b, 24, n)
  for (let i = 0; i < n; i++) { wi32(b, 28 + i * 8, Math.round(pts[i][0])); wi32(b, 32 + i * 8, Math.round(pts[i][1])) }
  return b
}

// --- SVG Path Parser (high-fidelity) ---

type Pt = [number, number]

interface Subpath {
  points: Pt[]
  closed: boolean
}

function tokenize(d: string): string[] {
  const tokens: string[] = []
  let cur = ''
  for (let i = 0; i < d.length; i++) {
    const ch = d[i]
    if ((ch >= 'A' && ch <= 'Z' && ch !== 'E') || (ch >= 'a' && ch <= 'z' && ch !== 'e')) {
      if (cur.length) tokens.push(cur)
      cur = ''
      tokens.push(ch)
    } else if (ch === ',' || ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      if (cur.length) tokens.push(cur)
      cur = ''
    } else if (ch === '-' && cur.length > 0 && cur[cur.length - 1] !== 'e' && cur[cur.length - 1] !== 'E') {
      if (cur.length) tokens.push(cur)
      cur = ch
    } else if (ch === '.' && cur.includes('.')) {
      if (cur.length) tokens.push(cur)
      cur = ch
    } else {
      cur += ch
    }
  }
  if (cur.length) tokens.push(cur)
  return tokens
}

function nums(tokens: string[], start: number, count: number): number[] {
  const out: number[] = []
  for (let i = start; i < tokens.length && out.length < count; i++) {
    const n = parseFloat(tokens[i])
    if (!isNaN(n)) out.push(n)
  }
  return out
}

// FIX #7: Correct Bézier flatness metric.
// The proper measure of deviation for a cubic is the maximum distance of the
// control points from the chord, computed at the correct parametric positions
// (t=1/3 for c1, t=2/3 for c2) rather than normalising against the full
// chord vector.  Using the chord vector directly (the original code) produces
// incorrect step counts for curves where the chord is long relative to the
// bulge, leading to faceted output on large arcs.
function flattenCubic(
  p0x: number, p0y: number,
  c1x: number, c1y: number,
  c2x: number, c2y: number,
  p1x: number, p1y: number,
  flatness: number,
): Pt[] {
  // Deviation of c1 from the point on the chord at t=1/3
  const d1x = c1x - (2 * p0x + p1x) / 3
  const d1y = c1y - (2 * p0y + p1y) / 3
  // Deviation of c2 from the point on the chord at t=2/3
  const d2x = c2x - (p0x + 2 * p1x) / 3
  const d2y = c2y - (p0y + 2 * p1y) / 3
  const maxErr = Math.max(d1x * d1x + d1y * d1y, d2x * d2x + d2y * d2y)
  const steps = Math.max(2, Math.min(512, Math.ceil(Math.sqrt(Math.sqrt(maxErr / flatness)))))
  const pts: Pt[] = []
  for (let s = 1; s <= steps; s++) {
    const t = s / steps, mt = 1 - t
    const mt2 = mt * mt, t2 = t * t
    const mt3 = mt2 * mt, t3 = t2 * t
    pts.push([
      mt3 * p0x + 3 * mt2 * t * c1x + 3 * mt * t2 * c2x + t3 * p1x,
      mt3 * p0y + 3 * mt2 * t * c1y + 3 * mt * t2 * c2y + t3 * p1y,
    ])
  }
  return pts
}

function flattenQuad(p0x: number, p0y: number, cx: number, cy: number, p1x: number, p1y: number, flatness: number): Pt[] {
  // Deviation of the control point from the chord midpoint
  const dmx = cx - (p0x + p1x) / 2
  const dmy = cy - (p0y + p1y) / 2
  const d = dmx * dmx + dmy * dmy
  const steps = Math.max(2, Math.min(512, Math.ceil(Math.sqrt(Math.sqrt(d / flatness)))))
  const pts: Pt[] = []
  for (let s = 1; s <= steps; s++) {
    const t = s / steps, mt = 1 - t
    pts.push([
      mt * mt * p0x + 2 * mt * t * cx + t * t * p1x,
      mt * mt * p0y + 2 * mt * t * cy + t * t * p1y,
    ])
  }
  return pts
}

function parseSubpaths(d: string): Subpath[] {
  const FLATNESS = 0.15
  const tokens = tokenize(d)
  const subpaths: Subpath[] = []
  let pts: Pt[] = []
  let cx = 0, cy = 0, sx = 0, sy = 0
  let closed = false
  let lastCubicCp: Pt | null = null
  let lastQuadCp: Pt | null = null
  let i = 0

  function flushSubpath() {
    if (pts.length > 0) subpaths.push({ points: pts, closed })
    pts = []; closed = false
  }

  while (i < tokens.length) {
    const tok = tokens[i]
    if (tok.length === 1 && ((tok >= 'A' && tok <= 'Z') || (tok >= 'a' && tok <= 'z'))) {
      const cmd = tok; i++
      switch (cmd) {
        case 'M': case 'm': {
          if (pts.length > 0) flushSubpath()
          closed = false; lastCubicCp = null; lastQuadCp = null
          const n = nums(tokens, i, 2)
          if (n.length >= 2) {
            if (cmd === 'M') { cx = n[0]; cy = n[1] } else { cx += n[0]; cy += n[1] }
            sx = cx; sy = cy
            pts.push([cx, cy])
            i += 2
            // Subsequent coordinate pairs after M are implicit L commands
            while (i < tokens.length) {
              const nn = nums(tokens, i, 2)
              if (nn.length < 2) break
              // Check that the next tokens are actually numbers, not a new command
              if (isNaN(parseFloat(tokens[i]))) break
              if (cmd === 'M') { cx = nn[0]; cy = nn[1] } else { cx += nn[0]; cy += nn[1] }
              pts.push([cx, cy])
              i += 2
            }
          }
          break
        }
        case 'L': case 'l': {
          lastCubicCp = null; lastQuadCp = null
          while (true) {
            if (i >= tokens.length || isNaN(parseFloat(tokens[i]))) break
            const n = nums(tokens, i, 2); if (n.length < 2) break
            if (cmd === 'L') { cx = n[0]; cy = n[1] } else { cx += n[0]; cy += n[1] }
            pts.push([cx, cy]); i += 2
          }
          break
        }
        case 'H': case 'h': {
          lastCubicCp = null; lastQuadCp = null
          while (true) {
            if (i >= tokens.length || isNaN(parseFloat(tokens[i]))) break
            const n = nums(tokens, i, 1); if (n.length < 1) break
            if (cmd === 'H') cx = n[0]; else cx += n[0]
            pts.push([cx, cy]); i++
          }
          break
        }
        case 'V': case 'v': {
          lastCubicCp = null; lastQuadCp = null
          while (true) {
            if (i >= tokens.length || isNaN(parseFloat(tokens[i]))) break
            const n = nums(tokens, i, 1); if (n.length < 1) break
            if (cmd === 'V') cy = n[0]; else cy += n[0]
            pts.push([cx, cy]); i++
          }
          break
        }
        case 'C': case 'c': {
          lastQuadCp = null
          while (true) {
            if (i >= tokens.length || isNaN(parseFloat(tokens[i]))) break
            const n = nums(tokens, i, 6); if (n.length < 6) break
            let c1x = n[0], c1y = n[1], c2x = n[2], c2y = n[3], ex = n[4], ey = n[5]
            if (cmd === 'c') { c1x += cx; c1y += cy; c2x += cx; c2y += cy; ex += cx; ey += cy }
            const flat = flattenCubic(cx, cy, c1x, c1y, c2x, c2y, ex, ey, FLATNESS)
            pts.push(...flat); lastCubicCp = [c2x, c2y]; cx = ex; cy = ey; i += 6
          }
          break
        }
        case 'S': case 's': {
          lastQuadCp = null
          while (true) {
            if (i >= tokens.length || isNaN(parseFloat(tokens[i]))) break
            const n = nums(tokens, i, 4); if (n.length < 4) break
            let c2x = n[0], c2y = n[1], ex = n[2], ey = n[3]
            if (cmd === 's') { c2x += cx; c2y += cy; ex += cx; ey += cy }
            let c1x: number, c1y: number
            if (lastCubicCp) {
              c1x = 2 * cx - lastCubicCp[0]
              c1y = 2 * cy - lastCubicCp[1]
            } else {
              c1x = cx; c1y = cy
            }
            const flat = flattenCubic(cx, cy, c1x, c1y, c2x, c2y, ex, ey, FLATNESS)
            pts.push(...flat); lastCubicCp = [c2x, c2y]; cx = ex; cy = ey; i += 4
          }
          break
        }
        case 'Q': case 'q': {
          lastCubicCp = null
          while (true) {
            if (i >= tokens.length || isNaN(parseFloat(tokens[i]))) break
            const n = nums(tokens, i, 4); if (n.length < 4) break
            let qcx = n[0], qcy = n[1], ex = n[2], ey = n[3]
            if (cmd === 'q') { qcx += cx; qcy += cy; ex += cx; ey += cy }
            const flat = flattenQuad(cx, cy, qcx, qcy, ex, ey, FLATNESS)
            pts.push(...flat); lastQuadCp = [qcx, qcy]; cx = ex; cy = ey; i += 4
          }
          break
        }
        case 'T': case 't': {
          lastCubicCp = null
          while (true) {
            if (i >= tokens.length || isNaN(parseFloat(tokens[i]))) break
            const n = nums(tokens, i, 2); if (n.length < 2) break
            let ex = n[0], ey = n[1]
            if (cmd === 't') { ex += cx; ey += cy }
            let qcx: number, qcy: number
            if (lastQuadCp) {
              qcx = 2 * cx - lastQuadCp[0]
              qcy = 2 * cy - lastQuadCp[1]
            } else {
              qcx = cx; qcy = cy
            }
            const flat = flattenQuad(cx, cy, qcx, qcy, ex, ey, FLATNESS)
            pts.push(...flat); lastQuadCp = [qcx, qcy]; cx = ex; cy = ey; i += 2
          }
          break
        }
        case 'A': case 'a': {
          lastCubicCp = null; lastQuadCp = null
          while (true) {
            if (i >= tokens.length || isNaN(parseFloat(tokens[i]))) break
            const n = nums(tokens, i, 7); if (n.length < 7) break
            const rx = Math.abs(n[0]), ry = Math.abs(n[1])
            const rotation = n[2], largeArc = n[3] !== 0, sweep = n[4] !== 0
            let ex = n[5], ey = n[6]
            if (cmd === 'a') { ex += cx; ey += cy }
            const arcPts = flattenArc(cx, cy, rx, ry, rotation, largeArc, sweep, ex, ey, FLATNESS)
            pts.push(...arcPts); cx = ex; cy = ey; i += 7
          }
          break
        }
        case 'Z': case 'z': {
          lastCubicCp = null; lastQuadCp = null
          if (pts.length > 0) {
            const last = pts[pts.length - 1]
            if (last[0] !== sx || last[1] !== sy) pts.push([sx, sy])
          }
          closed = true; cx = sx; cy = sy
          flushSubpath()
          break
        }
        default: break
      }
    } else {
      i++
    }
  }
  flushSubpath()
  return subpaths
}

function flattenArc(x1: number, y1: number, rx: number, ry: number, angle: number, large: boolean, sweep: boolean, x2: number, y2: number, flatness: number): Pt[] {
  if (rx === 0 || ry === 0) return [[x2, y2]]
  if (x1 === x2 && y1 === y2) return []
  const phi = angle * Math.PI / 180
  const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi)
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2
  const x1p = cosPhi * dx + sinPhi * dy, y1p = -sinPhi * dx + cosPhi * dy
  const x1p2 = x1p * x1p, y1p2 = y1p * y1p
  const lambda = x1p2 / (rx * rx) + y1p2 / (ry * ry)
  let rx2 = rx * rx, ry2 = ry * ry
  if (lambda > 1) { const s = Math.sqrt(lambda); rx *= s; ry *= s; rx2 = rx * rx; ry2 = ry * ry }
  let sq = Math.max(0, (rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2) / (rx2 * y1p2 + ry2 * x1p2))
  sq = Math.sqrt(sq) * (large === sweep ? -1 : 1)
  const cxp = sq * rx * y1p / ry, cyp = -sq * ry * x1p / rx
  const ccx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2
  const ccy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2
  function angleVec(ux: number, uy: number, vx: number, vy: number) {
    const d = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy)
    if (d === 0) return 0
    let a = (ux * vx + uy * vy) / d
    a = Math.max(-1, Math.min(1, a))
    let ang = Math.acos(a)
    if (ux * vy - uy * vx < 0) ang = -ang
    return ang
  }
  const theta1 = angleVec(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
  let dTheta = angleVec((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
  if (!sweep && dTheta > 0) dTheta -= 2 * Math.PI
  if (sweep && dTheta < 0) dTheta += 2 * Math.PI
  const steps = Math.max(4, Math.min(512, Math.ceil(Math.abs(dTheta) * Math.max(rx, ry) / flatness)))
  const pts: Pt[] = []
  for (let s = 1; s <= steps; s++) {
    const t = s / steps
    const a = theta1 + t * dTheta
    const px = cosPhi * rx * Math.cos(a) - sinPhi * ry * Math.sin(a) + ccx
    const py = sinPhi * rx * Math.cos(a) + cosPhi * ry * Math.sin(a) + ccy
    pts.push([px, py])
  }
  return pts
}

// --- Transform handling ---

interface Matrix { a: number; b: number; c: number; d: number; e: number; f: number }

const identityMatrix: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

function multiplyMatrix(m1: Matrix, m2: Matrix): Matrix {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  }
}

function applyMatrix(m: Matrix): (p: Pt) => Pt {
  return (p) => [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f]
}

function parseTransform(t: string): Matrix {
  if (!t) return identityMatrix
  let result = identityMatrix
  const re = /(\w+)\s*\(\s*([^)]+)\s*\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(t)) !== null) {
    const fn = match[1].toLowerCase()
    const args = match[2].split(/[\s,]+/).map(Number)
    let m: Matrix
    switch (fn) {
      case 'matrix':
        if (args.length >= 6) m = { a: args[0], b: args[1], c: args[2], d: args[3], e: args[4], f: args[5] }
        else m = identityMatrix
        break
      case 'translate':
        m = { a: 1, b: 0, c: 0, d: 1, e: args[0] || 0, f: args.length > 1 ? args[1] : 0 }
        break
      case 'scale': {
        const sx = args[0] ?? 1, sy = args.length > 1 ? args[1] : sx
        m = { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 }
        break
      }
      case 'rotate': {
        const angle = (args[0] || 0) * Math.PI / 180
        const cosA = Math.cos(angle), sinA = Math.sin(angle)
        if (args.length >= 3) {
          const rCx = args[1], rCy = args[2]
          const t1: Matrix = { a: 1, b: 0, c: 0, d: 1, e: -rCx, f: -rCy }
          const rot: Matrix = { a: cosA, b: sinA, c: -sinA, d: cosA, e: 0, f: 0 }
          const t2: Matrix = { a: 1, b: 0, c: 0, d: 1, e: rCx, f: rCy }
          m = multiplyMatrix(multiplyMatrix(t1, rot), t2)
        } else {
          m = { a: cosA, b: sinA, c: -sinA, d: cosA, e: 0, f: 0 }
        }
        break
      }
      case 'skewx': {
        const angle = (args[0] || 0) * Math.PI / 180
        m = { a: 1, b: 0, c: Math.tan(angle), d: 1, e: 0, f: 0 }
        break
      }
      case 'skewy': {
        const angle = (args[0] || 0) * Math.PI / 180
        m = { a: 1, b: Math.tan(angle), c: 0, d: 1, e: 0, f: 0 }
        break
      }
      default:
        m = identityMatrix
    }
    result = multiplyMatrix(result, m)
  }
  return result
}

// FIX #8: Accumulate parent transform into child transforms.
// getTransform now takes the accumulated ancestor matrix and composes it.
function getTransform(el: Element, parentMatrix: Matrix): Matrix {
  const own = parseTransform(el.getAttribute('transform') || '')
  return multiplyMatrix(parentMatrix, own)
}

function transformSubpaths(subs: Subpath[], fn: (p: Pt) => Pt): Subpath[] {
  return subs.map(s => ({ points: s.points.map(fn), closed: s.closed }))
}

// --- SVG Element Extraction ---

interface DrawCmd {
  subpaths: Subpath[]
  fill: string
  stroke: string
  strokeWidth: number
  fillOpacity: number
  strokeOpacity: number
}

function parseStyleAttr(el: Element): Record<string, string> {
  const style = el.getAttribute('style')
  if (!style) return {}
  const result: Record<string, string> = {}
  for (const part of style.split(';')) {
    const colonIdx = part.indexOf(':')
    if (colonIdx >= 0) {
      const key = part.slice(0, colonIdx).trim().toLowerCase()
      const val = part.slice(colonIdx + 1).trim()
      if (key) result[key] = val
    }
  }
  return result
}

function getAttrOrStyle(el: Element, attr: string, styles: Record<string, string>): string | null {
  // style attribute overrides presentation attributes per SVG spec
  if (styles[attr] !== undefined) return styles[attr]
  return el.getAttribute(attr)
}

interface InheritedProps {
  fill: string
  stroke: string
  strokeWidth: number
  fillOpacity: number
  strokeOpacity: number
}

function resolveProps(el: Element, inherited: InheritedProps): InheritedProps {
  const styles = parseStyleAttr(el)
  const fill = getAttrOrStyle(el, 'fill', styles)
  const stroke = getAttrOrStyle(el, 'stroke', styles)
  const sw = getAttrOrStyle(el, 'stroke-width', styles)
  const fo = getAttrOrStyle(el, 'fill-opacity', styles)
  const so = getAttrOrStyle(el, 'stroke-opacity', styles)
  const opacity = getAttrOrStyle(el, 'opacity', styles)
  const globalOpacity = opacity !== null ? parseFloat(opacity) : 1

  return {
    fill: fill !== null ? fill : inherited.fill,
    stroke: stroke !== null ? stroke : inherited.stroke,
    strokeWidth: sw !== null ? parseFloat(sw) : inherited.strokeWidth,
    fillOpacity: (fo !== null ? parseFloat(fo) : inherited.fillOpacity) * globalOpacity,
    strokeOpacity: (so !== null ? parseFloat(so) : inherited.strokeOpacity) * globalOpacity,
  }
}

// FIX #5: makeFullEllipsePath was identical to makeFullCirclePath — it used rx
// for both the start/end point x AND y offsets, ignoring ry entirely.
// Fixed: use the correct parametric point on the ellipse. For angle=0,
// the two arc endpoints are simply (cx+rx, cy) and (cx-rx, cy).
// For a rotated ellipse we properly rotate by phi.
function makeFullCirclePath(cx: number, cy: number, r: number): string {
  // Split into two 180° arcs to avoid the degenerate start==end case
  const sx = cx + r, sy = cy
  const ex = cx - r, ey = cy
  return `M${sx} ${sy} A${r} ${r} 0 0 1 ${ex} ${ey} A${r} ${r} 0 0 1 ${sx} ${sy} Z`
}

function makeFullEllipsePath(cx: number, cy: number, rx: number, ry: number, rot: number): string {
  const phi = rot * Math.PI / 180
  const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi)
  // Point at angle 0 on the pre-rotation ellipse is (rx, 0)
  const sx = cosPhi * rx + cx
  const sy = sinPhi * rx + cy
  // Point at angle π on the pre-rotation ellipse is (-rx, 0)
  const ex = -cosPhi * rx + cx
  const ey = -sinPhi * rx + cy
  return `M${sx} ${sy} A${rx} ${ry} ${rot} 0 1 ${ex} ${ey} A${rx} ${ry} ${rot} 0 1 ${sx} ${sy} Z`
}

function collectElements(svg: SVGSVGElement): DrawCmd[] {
  const cmds: DrawCmd[] = []
  const defaultInherited: InheritedProps = {
    fill: 'black',
    stroke: 'none',
    strokeWidth: 1,
    fillOpacity: 1,
    strokeOpacity: 1,
  }

  // FIX #8: Pass accumulated CTM (current transform matrix) through the walk.
  const walk = (parent: Element, inherited: InheritedProps, parentMatrix: Matrix) => {
    for (const el of Array.from(parent.children)) {
      const tag = el.tagName.toLowerCase()
      if (tag === 'defs' || tag === 'clippath' || tag === 'style' || tag === 'metadata' || tag === 'title' || tag === 'desc') continue

      const props = resolveProps(el, inherited)
      // Compose this element's own transform onto the accumulated parent matrix
      const ctm = getTransform(el, parentMatrix)

      if (tag === 'g') {
        walk(el, props, ctm)
        continue
      }

      if (tag === 'svg') {
        walk(el, props, ctm)
        continue
      }

      const trFn = applyMatrix(ctm)

      if (tag === 'path') {
        const d = el.getAttribute('d') || ''
        if (!d) continue
        let subs = parseSubpaths(d)
        subs = transformSubpaths(subs, trFn)
        if (subs.length > 0 && (props.fill !== 'none' || props.stroke !== 'none')) {
          cmds.push({
            subpaths: subs,
            fill: props.fill,
            stroke: props.stroke,
            strokeWidth: props.strokeWidth,
            fillOpacity: props.fillOpacity,
            strokeOpacity: props.strokeOpacity,
          })
        }
      } else if (tag === 'polygon' || tag === 'polyline') {
        const pa = el.getAttribute('points') || ''
        const coords = pa.trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n))
        const pts: Pt[] = []
        for (let j = 0; j + 1 < coords.length; j += 2) pts.push(trFn([coords[j], coords[j + 1]]))
        if (pts.length >= 2) {
          cmds.push({
            subpaths: [{ points: pts, closed: tag === 'polygon' }],
            fill: props.fill,
            stroke: props.stroke,
            strokeWidth: props.strokeWidth,
            fillOpacity: props.fillOpacity,
            strokeOpacity: props.strokeOpacity,
          })
        }
      } else if (tag === 'rect') {
        const x = parseFloat(el.getAttribute('x') || '0')
        const y = parseFloat(el.getAttribute('y') || '0')
        const rw = parseFloat(el.getAttribute('width') || '0')
        const rh = parseFloat(el.getAttribute('height') || '0')
        const rxAttr = el.getAttribute('rx'), ryAttr = el.getAttribute('ry')
        let rx = rxAttr !== null ? parseFloat(rxAttr) : NaN
        let ry = ryAttr !== null ? parseFloat(ryAttr) : NaN
        // Per SVG spec: if one radius is missing, it copies the other
        if (isNaN(rx) && isNaN(ry)) { rx = 0; ry = 0 }
        else if (isNaN(rx)) { rx = ry }
        else if (isNaN(ry)) { ry = rx }
        // Clamp radii to half dimension
        rx = Math.min(rx, rw / 2); ry = Math.min(ry, rh / 2)

        if (rw > 0 && rh > 0) {
          if (rx > 0 || ry > 0) {
            const d = `M${x + rx} ${y} L${x + rw - rx} ${y} A${rx} ${ry} 0 0 1 ${x + rw} ${y + ry} L${x + rw} ${y + rh - ry} A${rx} ${ry} 0 0 1 ${x + rw - rx} ${y + rh} L${x + rx} ${y + rh} A${rx} ${ry} 0 0 1 ${x} ${y + rh - ry} L${x} ${y + ry} A${rx} ${ry} 0 0 1 ${x + rx} ${y} Z`
            let subs = parseSubpaths(d); subs = transformSubpaths(subs, trFn)
            cmds.push({ subpaths: subs, fill: props.fill, stroke: props.stroke, strokeWidth: props.strokeWidth, fillOpacity: props.fillOpacity, strokeOpacity: props.strokeOpacity })
          } else {
            const pts = ([[x, y], [x + rw, y], [x + rw, y + rh], [x, y + rh], [x, y]] as Pt[]).map(trFn)
            cmds.push({ subpaths: [{ points: pts, closed: true }], fill: props.fill, stroke: props.stroke, strokeWidth: props.strokeWidth, fillOpacity: props.fillOpacity, strokeOpacity: props.strokeOpacity })
          }
        }
      } else if (tag === 'circle') {
        const elcx = parseFloat(el.getAttribute('cx') || '0')
        const elcy = parseFloat(el.getAttribute('cy') || '0')
        const r = parseFloat(el.getAttribute('r') || '0')
        if (r > 0) {
          // FIX #5 applied: use corrected helper
          const d = makeFullCirclePath(elcx, elcy, r)
          let subs = parseSubpaths(d)
          subs = transformSubpaths(subs, trFn)
          cmds.push({ subpaths: subs, fill: props.fill, stroke: props.stroke, strokeWidth: props.strokeWidth, fillOpacity: props.fillOpacity, strokeOpacity: props.strokeOpacity })
        }
      } else if (tag === 'ellipse') {
        const elcx = parseFloat(el.getAttribute('cx') || '0')
        const elcy = parseFloat(el.getAttribute('cy') || '0')
        const erx = parseFloat(el.getAttribute('rx') || '0')
        const ery = parseFloat(el.getAttribute('ry') || '0')
        if (erx > 0 && ery > 0) {
          // FIX #5 applied: makeFullEllipsePath now correctly uses both rx and ry
          const d = makeFullEllipsePath(elcx, elcy, erx, ery, 0)
          let subs = parseSubpaths(d)
          subs = transformSubpaths(subs, trFn)
          cmds.push({ subpaths: subs, fill: props.fill, stroke: props.stroke, strokeWidth: props.strokeWidth, fillOpacity: props.fillOpacity, strokeOpacity: props.strokeOpacity })
        }
      } else if (tag === 'line') {
        const x1 = parseFloat(el.getAttribute('x1') || '0'), y1 = parseFloat(el.getAttribute('y1') || '0')
        const x2 = parseFloat(el.getAttribute('x2') || '0'), y2 = parseFloat(el.getAttribute('y2') || '0')
        cmds.push({
          subpaths: [{ points: [trFn([x1, y1]), trFn([x2, y2])], closed: false }],
          fill: 'none',
          // A <line> has no fill; use stroke (fall back to fill colour only if
          // stroke is not explicitly set, which matches common SVG authoring convention)
          stroke: props.stroke !== 'none' ? props.stroke : props.fill,
          strokeWidth: props.strokeWidth,
          fillOpacity: props.fillOpacity,
          strokeOpacity: props.strokeOpacity,
        })
      }
    }
  }
  walk(svg, defaultInherited, identityMatrix)
  return cmds
}

// --- Bounding box helpers ---

function boundsPts(pts: Pt[]): { l: number, t: number, r: number, b: number } {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity
  for (const p of pts) { if (p[0] < l) l = p[0]; if (p[1] < t) t = p[1]; if (p[0] > r) r = p[0]; if (p[1] > b) b = p[1] }
  return { l, t, r, b }
}

function boundsSubs(subs: Subpath[]): { l: number, t: number, r: number, b: number } {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity
  for (const s of subs) { const bb = boundsPts(s.points); if (bb.l < l) l = bb.l; if (bb.t < t) t = bb.t; if (bb.r > r) r = bb.r; if (bb.b > b) b = bb.b }
  return { l, t, r, b }
}

// --- Main encoder ---

function encodeDescription(app: string, title: string): { bytes: Uint8Array, charCount: number } {
  const full = app + '\0' + title + '\0'
  const cc = full.length
  const bytes = new Uint8Array(cc * 2)
  for (let i = 0; i < cc; i++) { const c = full.charCodeAt(i); bytes[i * 2] = c & 0xff; bytes[i * 2 + 1] = (c >> 8) & 0xff }
  return { bytes, charCount: cc }
}

function buildHeader(
  bounds: { l: number, t: number, r: number, b: number },
  devW: number, devH: number,
  recCount: number, totalSize: number,
  handles: number,
  descCC: number,
): Uint8Array {
  const hs = 88 + descCC * 2
  const h = new Uint8Array(hs)
  w32(h, 0, EMR_HEADER); w32(h, 4, hs)
  // Bounds in device units (pixels at 96 dpi)
  wi32(h, 8, Math.round(bounds.l)); wi32(h, 12, Math.round(bounds.t))
  wi32(h, 16, Math.round(bounds.r)); wi32(h, 20, Math.round(bounds.b))
  // Frame in 0.01 mm units
  const mmW = devW * 25.4 / 96, mmH = devH * 25.4 / 96
  wi32(h, 24, Math.round(bounds.l * 25.4 / 96 * 100))
  wi32(h, 28, Math.round(bounds.t * 25.4 / 96 * 100))
  wi32(h, 32, Math.round(bounds.r * 25.4 / 96 * 100))
  wi32(h, 36, Math.round(bounds.b * 25.4 / 96 * 100))
  // Signature "EMF " + version
  w32(h, 40, 0x464D4520); w32(h, 44, 0x00010000)
  w32(h, 48, totalSize)
  w32(h, 52, recCount + 1)  // +1 for EMR_HEADER itself
  w16(h, 56, handles); w16(h, 58, 0)  // nHandles, nReserved
  w32(h, 60, descCC || 0)
  w32(h, 64, descCC ? 88 : 0)  // offDescription (immediately after fixed header)
  w32(h, 68, 0)                // nPalEntries
  w32(h, 72, Math.round(devW)); w32(h, 76, Math.round(devH))  // szlDevice (pixels)
  w32(h, 80, Math.round(mmW)); w32(h, 84, Math.round(mmH))    // szlMillimeters
  return h
}

function applyOpacity(color: [number, number, number], opacity: number): [number, number, number] {
  if (opacity >= 1) return color
  // Blend with white background (EMF has no alpha channel)
  return [
    Math.round(color[0] * opacity + 255 * (1 - opacity)),
    Math.round(color[1] * opacity + 255 * (1 - opacity)),
    Math.round(color[2] * opacity + 255 * (1 - opacity)),
  ]
}

export function buildEmfFromSvg(svgString: string): Uint8Array {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, 'image/svg+xml')
  const svg = doc.documentElement as unknown as SVGSVGElement

  let vbX = 0, vbY = 0, vbW = 0, vbH = 0
  const vb = svg.getAttribute('viewBox')
  if (vb) {
    const p = vb.split(/[\s,]+/).map(Number)
    if (p.length >= 4) { vbX = p[0]; vbY = p[1]; vbW = p[2]; vbH = p[3] }
  }
  const w = parseFloat(svg.getAttribute('width') || String(vbW)) || vbW
  const h = parseFloat(svg.getAttribute('height') || String(vbH)) || vbH

  const scaleX = vbW > 0 ? w / vbW : 1
  const scaleY = vbH > 0 ? h / vbH : 1

  // FIX #1: Build the viewBox-to-device transform as a proper Matrix so it
  // composes correctly with element transforms via collectElements.
  const viewMatrix: Matrix = {
    a: scaleX, b: 0,
    c: 0,      d: scaleY,
    e: -vbX * scaleX,
    f: -vbY * scaleY,
  }

  // collectElements applies element transforms relative to the identity; we
  // then post-multiply by the viewBox matrix here so all coordinates come out
  // in device pixels.
  const rawCmds = collectElements(svg)

  // FIX #1 (continued): Apply viewTransform to each subpath's points AND
  // scale strokeWidth correctly. The original code computed `subs` but then
  // spread `...cmd` (which still held the untransformed subpaths from
  // collectElements), discarding the view-transformed points entirely.
  const viewFn = applyMatrix(viewMatrix)
  const strokeScale = Math.sqrt(Math.abs(scaleX * scaleY))  // geometric mean for uniform-ish scaling

  const allCmds: DrawCmd[] = rawCmds.map(cmd => ({
    ...cmd,
    subpaths: cmd.subpaths.map(s => ({
      points: s.points.map(viewFn),
      closed: s.closed,
    })),
    strokeWidth: cmd.strokeWidth * strokeScale,
  }))

  if (allCmds.length === 0) {
    allCmds.push({
      subpaths: [{ points: [[0, 0], [w, 0], [w, h], [0, h], [0, 0]], closed: true }],
      fill: 'black', stroke: 'none', strokeWidth: 1,
      fillOpacity: 1, strokeOpacity: 1,
    })
  }

  let gL = Infinity, gT = Infinity, gR = -Infinity, gB = -Infinity
  for (const c of allCmds) {
    const b = boundsSubs(c.subpaths)
    const halfSw = c.strokeWidth / 2
    if (b.l - halfSw < gL) gL = b.l - halfSw
    if (b.t - halfSw < gT) gT = b.t - halfSw
    if (b.r + halfSw > gR) gR = b.r + halfSw
    if (b.b + halfSw > gB) gB = b.b + halfSw
  }
  if (!isFinite(gL)) { gL = 0; gT = 0; gR = w; gB = h }

  const desc = encodeDescription('LVector', 'EMF Vector Export')
  const hdrSz = 88 + desc.charCount * 2

  const setup: Uint8Array[] = [
    recSetMapMode(MM_TEXT), recSetBkMode(OPAQUE), recSetPolyFillMode(WINDING), recSetRop2(R2_COPYPEN),
    recSetWindowOrgEx(0, 0), recSetWindowExtEx(Math.round(w), Math.round(h)),
    recSetViewportOrgEx(0, 0), recSetViewportExtEx(Math.round(w), Math.round(h)),
  ]

  const draw: Uint8Array[] = []
  let objIdx = 0

  for (const cmd of allCmds) {
    const hasFill = cmd.fill && cmd.fill !== 'none' && cmd.fillOpacity > 0
    const hasStroke = cmd.stroke && cmd.stroke !== 'none' && cmd.strokeOpacity > 0

    if (!hasFill && !hasStroke) continue

    if (hasFill) {
      const [fr, fg, fb] = applyOpacity(parseColor(cmd.fill), cmd.fillOpacity)
      const fcr = rgbToCR(fr, fg, fb)
      const [sr, sg, sb] = hasStroke
        ? applyOpacity(parseColor(cmd.stroke), cmd.strokeOpacity)
        : [fr, fg, fb]
      const scr = rgbToCR(sr, sg, sb)
      const sw = hasStroke ? Math.max(1, Math.round(cmd.strokeWidth || 1)) : 1

      // Merge all subpaths into a single polygon for correct hole handling.
      // With WINDING fill mode, opposite-winding subpaths create holes.
      const mergedPts: Pt[] = []
      let mergedL = Infinity, mergedT = Infinity, mergedR = -Infinity, mergedB = -Infinity
      for (const sub of cmd.subpaths) {
        let pts = sub.points
        const first = pts[0], last = pts[pts.length - 1]
        if (first[0] !== last[0] || first[1] !== last[1]) pts = [...pts, [first[0], first[1]]]
        if (pts.length < 3) continue
        // Connect to previous subpath with a degenerate edge
        if (mergedPts.length > 0) {
          mergedPts.push([pts[0][0], pts[0][1]])
        }
        mergedPts.push(...pts)
        const bb = boundsPts(pts)
        if (bb.l < mergedL) mergedL = bb.l
        if (bb.t < mergedT) mergedT = bb.t
        if (bb.r > mergedR) mergedR = bb.r
        if (bb.b > mergedB) mergedB = bb.b
      }

      if (mergedPts.length < 3) {
        // Degenerate — render as 1px dot
        const sub0 = cmd.subpaths[0]
        if (sub0) {
          const cx = Math.round(sub0.points[0][0]), cy = Math.round(sub0.points[0][1])
          const dotPts: Pt[] = [[cx, cy], [cx + 1, cy], [cx + 1, cy + 1], [cx, cy + 1], [cx, cy]]
          const penIdx = objIdx++
          const brushIdx = objIdx++
          draw.push(
            recCreatePen(penIdx, 1, fcr),
            recSelectObj(penIdx),
            recCreateBrush(brushIdx, fcr),
            recSelectObj(brushIdx),
            recPolygon(dotPts, cx, cy, cx + 1, cy + 1),
            recDeleteObj(brushIdx),
            recDeleteObj(penIdx),
          )
        }
      } else {
        const penIdx = objIdx++
        const brushIdx = objIdx++
        draw.push(
          recCreatePen(penIdx, sw, scr),
          recSelectObj(penIdx),
          recCreateBrush(brushIdx, fcr),
          recSelectObj(brushIdx),
          recPolygon(mergedPts, mergedL, mergedT, mergedR, mergedB),
          recDeleteObj(brushIdx),
          recDeleteObj(penIdx),
        )
      }
    } else if (hasStroke) {
      const [sr, sg, sb] = applyOpacity(parseColor(cmd.stroke), cmd.strokeOpacity)
      const scr = rgbToCR(sr, sg, sb)
      const sw = Math.max(1, Math.round(cmd.strokeWidth || 1))

      for (const sub of cmd.subpaths) {
        if (sub.points.length < 2) continue
        const bb = boundsPts(sub.points)

        const penIdx = objIdx++
        draw.push(recCreatePen(penIdx, sw, scr), recSelectObj(penIdx))

        if (sub.points.length === 2 && !sub.closed) {
          draw.push(
            recMoveToEx(sub.points[0][0], sub.points[0][1]),
            recLineTo(sub.points[1][0], sub.points[1][1]),
          )
        } else {
          let strokePts = sub.points
          if (sub.closed) {
            const first = strokePts[0], last = strokePts[strokePts.length - 1]
            if (first[0] !== last[0] || first[1] !== last[1]) {
              strokePts = [...strokePts, [first[0], first[1]]]
            }
          }
          draw.push(recPolyline(strokePts, bb.l, bb.t, bb.r, bb.b))
        }

        draw.push(recDeleteObj(penIdx))
      }
    } else {
      for (const sub of cmd.subpaths) {
        const bb = boundsPts(sub.points)
        let pts = sub.points
        const first = pts[0], last = pts[pts.length - 1]
        if (first[0] !== last[0] || first[1] !== last[1]) pts = [...pts, [first[0], first[1]]]

        if (pts.length < 3) {
          const cx = Math.round(first[0]), cy = Math.round(first[1])
          const dotPts: Pt[] = [[cx, cy], [cx + 1, cy], [cx + 1, cy + 1], [cx, cy + 1], [cx, cy]]
          const brushIdx = objIdx++
          draw.push(
            recCreateBrush(brushIdx, 0),
            recSelectObj(brushIdx),
            recPolygon(dotPts, cx, cy, cx + 1, cy + 1),
            recDeleteObj(brushIdx),
          )
          continue
        }

        const brushIdx = objIdx++
        draw.push(
          recCreateBrush(brushIdx, 0),
          recSelectObj(brushIdx),
          recPolygon(pts, bb.l, bb.t, bb.r, bb.b),
          recDeleteObj(brushIdx),
        )
      }
    }
  }

  const eof = recEof()
  const all = [...setup, ...draw, eof]
  const totalRecSz = all.reduce((s, r) => s + r.length, 0)
  const totalSz = hdrSz + totalRecSz

  const hdr = buildHeader(
    { l: gL, t: gT, r: gR, b: gB },
    w, h,
    all.length,
    totalSz,
    objIdx,
    desc.charCount,
  )
  const buf = new Uint8Array(totalSz)
  buf.set(hdr, 0)
  buf.set(desc.bytes, 88)
  let off = hdrSz
  for (const r of all) { buf.set(r, off); off += r.length }
  return buf
}

export function exportSvgAsEmf(svgString: string, filename: string): void {
  const emf = buildEmfFromSvg(svgString)
  const blob = new Blob([emf.buffer as ArrayBuffer], { type: 'application/x-emf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${filename}.emf`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function svgToEmfBlob(svgString: string): Blob {
  const emf = buildEmfFromSvg(svgString)
  return new Blob([emf.buffer as ArrayBuffer], { type: 'application/x-emf' })
}