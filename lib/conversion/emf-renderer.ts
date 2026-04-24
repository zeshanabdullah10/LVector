// lib/conversion/emf-renderer.ts
// Renders EMF binary to an HTML Canvas — used for preview

const EMR_POLYGON = 3
const EMR_POLYLINE = 4
const EMR_MOVETOEX = 27
const EMR_SELECTOBJECT = 37
const EMR_CREATEPEN = 38
const EMR_CREATEBRUSHINDIRECT = 39
const EMR_DELETEOBJECT = 40
const EMR_LINETO = 54

function r32(b: Uint8Array, o: number) {
  return b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)
}
function ri32(b: Uint8Array, o: number) {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) | 0
}
function crToCSS(cr: number): string {
  const r = cr & 0xff, g = (cr >> 8) & 0xff, bl = (cr >> 16) & 0xff
  return `rgb(${r},${g},${bl})`
}

interface GdiPen { color: string; width: number; active: boolean }
interface GdiBrush { color: string; active: boolean }

export function renderEmfToCanvas(emf: Uint8Array, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // First pass: find device dimensions from header
  let devW = 100, devH = 100
  if (emf.length >= 80) {
    devW = r32(emf, 72)
    devH = r32(emf, 76)
  }

  canvas.width = devW
  canvas.height = devH

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, devW, devH)

  const pens = new Map<number, GdiPen>()
  const brushes = new Map<number, GdiBrush>()
  let currentPen: GdiPen | null = null
  let currentBrush: GdiBrush | null = null
  let moveX = 0, moveY = 0

  let off = 0
  while (off < emf.length && off + 8 <= emf.length) {
    const type = r32(emf, off)
    const size = r32(emf, off + 4)
    if (size < 8 || off + size > emf.length) break

    switch (type) {
      case EMR_CREATEPEN: {
        const idx = r32(emf, off + 8)
        const w = ri32(emf, off + 16)
        const cr = r32(emf, off + 24)
        pens.set(idx, { color: crToCSS(cr), width: w, active: false })
        break
      }
      case EMR_CREATEBRUSHINDIRECT: {
        const idx = r32(emf, off + 8)
        const cr = r32(emf, off + 16)
        brushes.set(idx, { color: crToCSS(cr), active: false })
        break
      }
      case EMR_SELECTOBJECT: {
        const idx = r32(emf, off + 8)
        if (pens.has(idx)) {
          if (currentPen) currentPen.active = false
          currentPen = pens.get(idx)!
          currentPen.active = true
        }
        if (brushes.has(idx)) {
          if (currentBrush) currentBrush.active = false
          currentBrush = brushes.get(idx)!
          currentBrush.active = true
        }
        break
      }
      case EMR_DELETEOBJECT: {
        const idx = r32(emf, off + 8)
        const pen = pens.get(idx)
        if (pen) {
          if (pen === currentPen) currentPen = null
          pens.delete(idx)
        }
        const brush = brushes.get(idx)
        if (brush) {
          if (brush === currentBrush) currentBrush = null
          brushes.delete(idx)
        }
        break
      }
      case EMR_POLYGON: {
        const n = r32(emf, off + 24)
        if (n < 3) break
        ctx.beginPath()
        ctx.moveTo(ri32(emf, off + 28), ri32(emf, off + 32))
        for (let i = 1; i < n; i++) {
          ctx.lineTo(ri32(emf, off + 28 + i * 8), ri32(emf, off + 32 + i * 8))
        }
        ctx.closePath()
        if (currentBrush) {
          ctx.fillStyle = currentBrush.color
          ctx.fill()
        }
        if (currentPen) {
          ctx.strokeStyle = currentPen.color
          ctx.lineWidth = currentPen.width
          ctx.lineJoin = 'round'
          ctx.stroke()
        }
        break
      }
      case EMR_POLYLINE: {
        const n = r32(emf, off + 24)
        if (n < 2) break
        if (!currentPen) break
        ctx.beginPath()
        ctx.moveTo(ri32(emf, off + 28), ri32(emf, off + 32))
        for (let i = 1; i < n; i++) {
          ctx.lineTo(ri32(emf, off + 28 + i * 8), ri32(emf, off + 32 + i * 8))
        }
        ctx.strokeStyle = currentPen.color
        ctx.lineWidth = currentPen.width
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.stroke()
        break
      }
      case EMR_MOVETOEX: {
        moveX = ri32(emf, off + 8)
        moveY = ri32(emf, off + 12)
        break
      }
      case EMR_LINETO: {
        const lx = ri32(emf, off + 8), ly = ri32(emf, off + 12)
        if (currentPen) {
          ctx.beginPath()
          ctx.moveTo(moveX, moveY)
          ctx.lineTo(lx, ly)
          ctx.strokeStyle = currentPen.color
          ctx.lineWidth = currentPen.width
          ctx.lineCap = 'round'
          ctx.stroke()
        }
        moveX = lx; moveY = ly
        break
      }
    }

    off += size
  }
}
