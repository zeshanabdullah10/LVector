/**
 * Test: Hard Drive icon through SVG→EMF pipeline
 * Run:  npx tsx lib/conversion/test-harddrive.ts
 */
import { JSDOM } from 'jsdom'
import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { buildEmfFromSvg } from './svg-to-emf'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
globalThis.DOMParser = dom.window.DOMParser as any

// Imagetracerjs-style hard-drive icon with Q curves and small details
const svgHardDrive = `<svg width="100" height="100" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="1" d="M 41.667 66.667 L 41.667 66.667 Z "/>
  <path fill="rgb(50,50,50)" stroke="rgb(50,50,50)" stroke-width="1" opacity="1" d="M 9.217 48.154 Q 8.375 48.875 8.333 49.854 L 8.333 75 Q 8.333 83.333 16.667 83.333 L 83.333 83.333 Q 91.667 83.333 91.667 75 L 91.667 52.038 Q 91.667 51.25 91.613 48.154 L 77.292 21.321 Q 75 16.667 69.833 16.667 L 30.167 16.667 Q 25 16.667 22.708 21.321 Z "/>
  <path fill="rgb(30,30,30)" stroke="rgb(30,30,30)" stroke-width="1" opacity="1" d="M 91.444 50.021 L 8.556 50.021 Z "/>
  <path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="1" d="M 25 66.667 L 25 66.667 Z "/>
</svg>`

// Small detail stress test: background + 3 small shapes including 1px
const svgSmallDetails = `<svg width="100" height="100" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <path fill="rgb(100,100,100)" stroke="rgb(100,100,100)" stroke-width="1" opacity="1" d="M 0 0 L 100 0 L 100 100 L 0 100 Z " />
  <path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="1" d="M 10 80 L 20 80 L 20 90 L 10 90 Z " />
  <path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="1" d="M 50 20 L 51 20 L 51 21 L 50 21 Z " />
  <path fill="rgb(200,0,0)" stroke="rgb(200,0,0)" stroke-width="1" opacity="1" d="M 70 30 L 80 30 L 80 40 L 70 40 Z " />
</svg>`

// EMF parser
function r32(b: Uint8Array, o: number) { return b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24) }
function ri32(b: Uint8Array, o: number) { return (b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))|0 }
function cr2rgb(c: number) { return [c&0xff,(c>>8)&0xff,(c>>16)&0xff] }

interface R { type:number; size:number; kind?:string; count?:number; points?:number[][]; bounds?:{l:number;t:number;r:number;b:number}; idx?:number; color?:number[]; width?:number }

function parse(buf: Uint8Array): R[] {
  const rs: R[] = []; let o = 0
  while (o < buf.length && o+8 <= buf.length) {
    const t = r32(buf,o), s = r32(buf,o+4)
    if (s < 8 || o+s > buf.length) break
    const rec: R = { type:t, size:s }
    if (t===3) { const n=r32(buf,o+24); const p:number[][]=[]; for(let i=0;i<n;i++)p.push([ri32(buf,o+28+i*8),ri32(buf,o+32+i*8)]); rec.kind='POLYGON';rec.count=n;rec.points=p;rec.bounds={l:ri32(buf,o+8),t:ri32(buf,o+12),r:ri32(buf,o+16),b:ri32(buf,o+20)} }
    if (t===4) { const n=r32(buf,o+24); const p:number[][]=[]; for(let i=0;i<n;i++)p.push([ri32(buf,o+28+i*8),ri32(buf,o+32+i*8)]); rec.kind='POLYLINE';rec.count=n;rec.points=p }
    if (t===38) { rec.kind='PEN'; rec.idx=r32(buf,o+8); rec.width=ri32(buf,o+16); rec.color=cr2rgb(r32(buf,o+24)) }
    if (t===39) { rec.kind='BRUSH'; rec.idx=r32(buf,o+8); rec.color=cr2rgb(r32(buf,o+16)) }
    if (t===27) rec.kind='MOVETO'
    if (t===54) rec.kind='LINETO'
    rs.push(rec); o+=s
  }
  return rs
}

let P=0, F=0
function ok(c:boolean,m:string) { if(c)P++;else{F++;console.log(`  FAIL: ${m}`)} }

function test(name:string, svg:string, fn:(polys:R[],pens:R[],brushes:R[])=>void) {
  console.log(`\n=== ${name} ===`)
  try {
    const emf = buildEmfFromSvg(svg)
    const rs = parse(emf)
    const polys = rs.filter(r=>r.kind==='POLYGON')
    const pens = rs.filter(r=>r.kind==='PEN')
    const brushes = rs.filter(r=>r.kind==='BRUSH')
    const p = `lib/conversion/_test_${name}.emf`
    writeFileSync(resolve(p), emf)
    console.log(`  ${emf.length} bytes | ${polys.length} polys | ${pens.length} pens | ${brushes.length} brushes`)
    for (let i=0;i<polys.length;i++) {
      const q=polys[i]
      console.log(`  POLY[${i}]: ${q.count}pts [${q.bounds!.l},${q.bounds!.t}-${q.bounds!.r},${q.bounds!.b}] ${q.count!<=8?JSON.stringify(q.points):''}`)
    }
    fn(polys, pens, brushes)
  } catch(e:any) { F++; console.log(`  ERROR: ${e.message}`) }
}

// ===== TESTS =====

test('small_details', svgSmallDetails, (polys, pens, brushes) => {
  // Must have all 4 shapes
  ok(polys.length === 4, `Expected 4 polygons, got ${polys.length}`)

  // Shape 1: 10x10 rect at (10,80)-(20,90) → EMF coords (10,80)-(20,90)
  if (polys.length >= 2) {
    const b = polys[1].bounds!
    ok(b.l <= 10 && b.t <= 80 && b.r >= 20 && b.b >= 90,
      `10x10 rect bounds wrong: [${b.l},${b.t}-${b.r},${b.b}] expected ~(10,80)-(20,90)`)
  }

  // Shape 2: 1x1 rect at (50,20)-(51,21) — the critical small detail test
  if (polys.length >= 3) {
    const b = polys[2].bounds!
    ok(b.r > b.l && b.b > b.t,
      `1x1 rect has zero area! [${b.l},${b.t}-${b.r},${b.b}]`)
  }

  // Shape 3: 10x10 red rect at (70,30)-(80,40)
  if (polys.length >= 4) {
    const redBrush = brushes.find(b => b.color![0] > 100)
    ok(!!redBrush, `Missing red brush (R>100), got: ${brushes.map(b=>b.color!.join(',')).join(' | ')}`)
  }
})

test('harddrive_imagetracer', svgHardDrive, (polys, pens, brushes) => {
  // Body with Q curve should have >4 points (flattened curve)
  const bodyPoly = polys.find(p => (p.count ?? 0) > 5)
  ok(!!bodyPoly, `Body polygon should have >5 points from Q flattening, max was ${Math.max(...polys.map(p=>p.count??0))}`)

  // Should have multiple shapes (dots + body + line)
  ok(polys.length >= 2, `Expected >=2 polygons, got ${polys.length}`)

  // Dark brushes
  ok(brushes.filter(b=>b.color![0]<=100).length >= 1, `Should have dark brushes`)
})

console.log(`\n${'='.repeat(50)}`)
console.log(`${P} passed, ${F} failed`)
if (F>0) { console.log('SOME TESTS FAILED'); process.exit(1) }
else console.log('ALL TESTS PASSED')
