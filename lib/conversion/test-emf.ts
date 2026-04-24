/**
 * Test harness for SVG-to-EMF conversion.
 * Run:  npx tsx lib/conversion/test-emf.ts
 */
import { JSDOM } from 'jsdom'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Polyfill DOMParser for Node
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
globalThis.DOMParser = dom.window.DOMParser as any

// Inline the module — we can't import .ts directly with dynamic import easily,
// so we use eval-based approach with tsx's transpile.
// Actually, tsx handles .ts imports natively. Let's just restructure.

// We need to import buildEmfFromSvg from svg-to-emf.ts
// tsx supports this natively via its loader.

// ---- Instead, let's inline the core logic ----
// Read the TS file and strip only the export keyword, then eval in context.

// Simpler approach: just duplicate the test + use the functions directly.
// But tsx can import .ts files! Let's use that.

import { buildEmfFromSvg } from './svg-to-emf'

// ======================================================================
// EMF Binary Parser
// ======================================================================

function read32(buf: Uint8Array, o: number) { return buf[o] | (buf[o+1]<<8) | (buf[o+2]<<16) | (buf[o+3]<<24) }
function readi32(buf: Uint8Array, o: number) { return (buf[o] | (buf[o+1]<<8) | (buf[o+2]<<16) | (buf[o+3]<<24)) | 0 }

function crToRgb(cr: number): [number, number, number] {
  return [ cr & 0xff, (cr >> 8) & 0xff, (cr >> 16) & 0xff ]
}

interface EmfRecord {
  type: number
  size: number
  offset: number
  kind?: string
  count?: number
  points?: number[][]
  bounds?: { l: number; t: number; r: number; b: number }
  idx?: number
  color?: number[]
  width?: number
  style?: number
  deviceSize?: { w: number; h: number }
  nHandles?: number
  nRecords?: number
}

function parseEmf(buf: Uint8Array): EmfRecord[] {
  const records: EmfRecord[] = []
  let off = 0
  while (off < buf.length) {
    if (off + 8 > buf.length) break
    const type = read32(buf, off)
    const size = read32(buf, off + 4)
    if (size < 8 || off + size > buf.length) break

    const rec: EmfRecord = { type, size, offset: off }

    if (type === 3) { // EMR_POLYGON
      const n = read32(buf, off + 24)
      const pts: number[][] = []
      for (let i = 0; i < n; i++) {
        pts.push([readi32(buf, off + 28 + i*8), readi32(buf, off + 32 + i*8)])
      }
      rec.kind = 'POLYGON'
      rec.count = n
      rec.points = pts
      rec.bounds = { l: readi32(buf, off+8), t: readi32(buf, off+12), r: readi32(buf, off+16), b: readi32(buf, off+20) }
    }
    if (type === 4) { // EMR_POLYLINE
      const n = read32(buf, off + 24)
      const pts: number[][] = []
      for (let i = 0; i < n; i++) {
        pts.push([readi32(buf, off + 28 + i*8), readi32(buf, off + 32 + i*8)])
      }
      rec.kind = 'POLYLINE'
      rec.count = n
      rec.points = pts
    }
    if (type === 38) { // EMR_CREATEPEN
      rec.kind = 'CREATEPEN'
      rec.idx = read32(buf, off + 8)
      rec.style = read32(buf, off + 12)
      rec.width = readi32(buf, off + 16)
      rec.color = crToRgb(read32(buf, off + 24))
    }
    if (type === 39) { // EMR_CREATEBRUSHINDIRECT
      rec.kind = 'CREATEBRUSH'
      rec.idx = read32(buf, off + 8)
      rec.style = read32(buf, off + 12)
      rec.color = crToRgb(read32(buf, off + 16))
    }
    if (type === 37) { // EMR_SELECTOBJECT
      rec.kind = 'SELECT'
      rec.idx = read32(buf, off + 8)
    }
    if (type === 1) { // EMR_HEADER
      rec.kind = 'HEADER'
      rec.deviceSize = { w: read32(buf, off+72), h: read32(buf, off+76) }
      rec.bounds = { l: readi32(buf, off+8), t: readi32(buf, off+12), r: readi32(buf, off+16), b: readi32(buf, off+20) }
      rec.nHandles = buf[off+56] | (buf[off+57]<<8)
      rec.nRecords = read32(buf, off+52)
    }

    records.push(rec)
    off += size
  }
  return records
}

// ======================================================================
// Test SVGs
// ======================================================================

// Test 1: Right arrow (imagetracerjs-style: fill=stroke same color)
const svgArrow = `<svg width="100" height="100" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <path fill="rgb(0,0,255)" stroke="rgb(0,0,255)" stroke-width="1" opacity="1"
        d="M 10 10 L 90 50 L 10 90 Z " />
</svg>`

// Test 2: Outer shape + inner icon (two paths)
const svgCircleIcon = `<svg width="100" height="100" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <path fill="rgb(200,200,200)" stroke="rgb(200,200,200)" stroke-width="1" opacity="1"
        d="M 50 5 L 95 50 L 50 95 L 5 50 Z " />
  <path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="1"
        d="M 40 30 L 70 50 L 40 70 Z " />
</svg>`

// Test 3: viewBox scaling (coords should be scaled 2x)
const svgViewBox = `<svg width="200" height="200" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <path fill="rgb(255,0,0)" stroke="rgb(255,0,0)" stroke-width="1" opacity="1"
        d="M 10 10 L 90 10 L 90 90 L 10 90 Z " />
</svg>`

// Test 4: Quadratic Bézier curve (imagetracerjs uses Q)
const svgBezier = `<svg width="100" height="100" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <path fill="rgb(0,128,0)" stroke="rgb(0,128,0)" stroke-width="1" opacity="1"
        d="M 10 80 Q 50 10 90 80 Z " />
</svg>`

// ======================================================================
// Test runner
// ======================================================================

let pass = 0, fail = 0
function assert(cond: boolean, msg: string) {
  if (cond) { pass++ }
  else { fail++; console.log(`  FAIL: ${msg}`) }
}

type RunTestFn = (records: EmfRecord[], polygons: EmfRecord[], pens: EmfRecord[], brushes: EmfRecord[], header: EmfRecord | undefined) => void

function runTest(name: string, svgStr: string, expectations?: RunTestFn) {
  console.log(`\n=== ${name} ===`)
  try {
    const emfBuf = buildEmfFromSvg(svgStr)
    const records = parseEmf(emfBuf)

    const outPath = resolve(__dirname, `_test_${name.replace(/\s+/g, '_')}.emf`)
    writeFileSync(outPath, emfBuf)
    console.log(`  EMF: ${emfBuf.length} bytes → ${outPath}`)

    const polygons = records.filter(r => r.kind === 'POLYGON')
    const pens = records.filter(r => r.kind === 'CREATEPEN')
    const brushes = records.filter(r => r.kind === 'CREATEBRUSH')
    const header = records.find(r => r.kind === 'HEADER')

    console.log(`  Records: ${records.length}, Polygons: ${polygons.length}, Pens: ${pens.length}, Brushes: ${brushes.length}`)
    if (header) {
      console.log(`  Header: dev ${header.deviceSize!.w}x${header.deviceSize!.h}, bounds [${header.bounds!.l},${header.bounds!.t}-${header.bounds!.r},${header.bounds!.b}], nHandles=${header.nHandles}`)
    }
    for (const p of polygons) {
      console.log(`  POLYGON: ${p.count} pts [${p.bounds!.l},${p.bounds!.t}-${p.bounds!.r},${p.bounds!.b}] → ${JSON.stringify(p.points)}`)
    }
    for (const p of pens) {
      console.log(`  PEN idx=${p.idx}: w=${p.width} rgb(${p.color!.join(',')})`)
    }
    for (const b of brushes) {
      console.log(`  BRUSH idx=${b.idx}: rgb(${b.color!.join(',')})`)
    }

    if (expectations) expectations(records, polygons, pens, brushes, header)

  } catch (err: any) {
    fail++
    console.log(`  ERROR: ${err.message}`)
    console.log(err.stack)
  }
}

// ======================================================================
// Tests
// ======================================================================

runTest('right_arrow', svgArrow, (_records, polygons, pens, brushes, header) => {
  assert(polygons.length === 1, `Expected 1 polygon, got ${polygons.length}`)
  if (polygons.length >= 1) {
    const p = polygons[0]
    assert(p.count! === 4, `Expected 4 points (closed triangle), got ${p.count}`)
    assert(p.points![0][0] === 10 && p.points![0][1] === 10,
      `Pt[0] should be (10,10) got (${p.points![0]})`)
    assert(p.points![1][0] === 90 && p.points![1][1] === 50,
      `Pt[1] should be (90,50) got (${p.points![1]})`)
    assert(p.points![2][0] === 10 && p.points![2][1] === 90,
      `Pt[2] should be (10,90) got (${p.points![2]})`)
    assert(p.points![3][0] === 10 && p.points![3][1] === 10,
      `Pt[3] should be (10,10) closing got (${p.points![3]})`)
  }
  assert(pens.length >= 1, `Expected >=1 pen, got ${pens.length}`)
  if (pens.length >= 1) {
    assert(pens[0].color![2] === 255, `Pen blue should be 255, got ${pens[0].color![2]}`)
    assert(pens[0].width === 1, `Pen width should be 1, got ${pens[0].width}`)
  }
  assert(brushes.length >= 1, `Expected >=1 brush, got ${brushes.length}`)
  if (brushes.length >= 1) {
    assert(brushes[0].color![2] === 255, `Brush blue should be 255, got ${brushes[0].color![2]}`)
  }
  if (header) {
    assert(header.deviceSize!.w === 100, `Dev width 100, got ${header.deviceSize!.w}`)
    assert(header.deviceSize!.h === 100, `Dev height 100, got ${header.deviceSize!.h}`)
  }
})

runTest('circle_plus_icon', svgCircleIcon, (_records, polygons, pens, brushes, _header) => {
  assert(polygons.length === 2, `Expected 2 polygons, got ${polygons.length}`)
  if (polygons.length >= 2) {
    assert(polygons[0].count! === 5, `Outer polygon should have 5 pts, got ${polygons[0].count}`)
    assert(polygons[1].count! === 4, `Inner polygon should have 4 pts, got ${polygons[1].count}`)
    const ip = polygons[1].points![0]
    assert(ip[0] === 40 && ip[1] === 30, `Inner pt[0] should be (40,30), got (${ip})`)
  }
  if (brushes.length >= 2) {
    assert(brushes[0].color![0] === 200, `Brush0 R=200, got ${brushes[0].color![0]}`)
    assert(brushes[1].color![0] === 0, `Brush1 R=0, got ${brushes[1].color![0]}`)
  }
})

runTest('viewbox_scaling', svgViewBox, (_records, polygons, _pens, _brushes, header) => {
  assert(polygons.length === 1, `Expected 1 polygon, got ${polygons.length}`)
  if (polygons.length >= 1) {
    const p = polygons[0]
    // SVG 100x100 with viewBox → EMF 200x200, so all coords ×2
    assert(p.points![0][0] === 20 && p.points![0][1] === 20,
      `Pt[0] should be (20,20) got (${p.points![0]})`)
    assert(p.points![1][0] === 180 && p.points![1][1] === 20,
      `Pt[1] should be (180,20) got (${p.points![1]})`)
    assert(p.points![2][0] === 180 && p.points![2][1] === 180,
      `Pt[2] should be (180,180) got (${p.points![2]})`)
  }
  if (header) {
    assert(header.deviceSize!.w === 200, `Dev width 200, got ${header.deviceSize!.w}`)
  }
})

runTest('quadratic_bezier', svgBezier, (_records, polygons, pens, brushes, _header) => {
  assert(polygons.length === 1, `Expected 1 polygon, got ${polygons.length}`)
  if (polygons.length >= 1) {
    const p = polygons[0]
    assert(p.count! > 4, `Bézier polygon should have many points, got ${p.count}`)
    // First point should be the M command (10,80)
    assert(p.points![0][0] === 10 && p.points![0][1] === 80,
      `Pt[0] should be (10,80) got (${p.points![0]})`)
    // Last point should close back to start (10,80)
    const last = p.points![p.points!.length - 1]
    assert(last[0] === 10 && last[1] === 80,
      `Last pt should be (10,80) closing, got (${last})`)
  }
  if (brushes.length >= 1) {
    assert(brushes[0].color![1] === 128, `Brush green=128, got ${brushes[0].color![1]}`)
  }
})

// ======================================================================
console.log(`\n${'='.repeat(50)}`)
console.log(`Results: ${pass} passed, ${fail} failed`)
if (fail > 0) {
  console.log('SOME TESTS FAILED')
  process.exit(1)
} else {
  console.log('ALL TESTS PASSED')
}
