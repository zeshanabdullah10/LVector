// lib/conversion/svg-to-emf.ts

/**
 * Parses an SVG string and exports it as a downloadable EMF file.
 * EMF is a Windows vector graphics format that LabVIEW supports.
 *
 * EMF structure (per docs/EMF_FORMAT.md):
 * - Header (40 bytes)
 * - Records (variable)
 * - End Record (EMR_EOF)
 */

// EMF record types
const EMR_HEADER = 1
const EMR_POLYBEZIER = 2
const EMR_POLYGON = 3
const EMR_POLYLINE = 4
const EMR_EOF = 68

interface PointL {
  x: number
  y: number
}

interface RectL {
  left: number
  top: number
  right: number
  bottom: number
}

// Write a 32-bit little-endian integer to a buffer
function writeUInt32LE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff
  buf[offset + 1] = (value >> 8) & 0xff
  buf[offset + 2] = (value >> 16) & 0xff
  buf[offset + 3] = (value >> 24) & 0xff
}

// Write a 16-bit little-endian integer
function writeUInt16LE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff
  buf[offset + 1] = (value >> 8) & 0xff
}

function createUTF16LEString(str: string): Uint8Array {
  // Include null terminator
  const arr = new Uint8Array((str.length + 1) * 2)
  for (let i = 0; i < str.length; i++) {
    writeUInt16LE(arr, i * 2, str.charCodeAt(i))
  }
  return arr
}

function buildEMFHeader(
  bounds: RectL,
  frame: RectL,
  deviceSize: { cx: number; cy: number },
  millimeterSize: { cx: number; cy: number },
  recordCount: number,
  totalSize: number
): Uint8Array {
  const header = new Uint8Array(80) // 40 bytes = 80 halfwords for EMR header
  // iType = 1 (EMR_HEADER)
  writeUInt32LE(header, 0, EMR_HEADER)
  // nSize = 80 bytes
  writeUInt32LE(header, 4, 80)
  // rcBounds
  writeUInt32LE(header, 8, Math.round(bounds.left))
  writeUInt32LE(header, 12, Math.round(bounds.top))
  writeUInt32LE(header, 16, Math.round(bounds.right))
  writeUInt32LE(header, 20, Math.round(bounds.bottom))
  // rcFrame
  writeUInt32LE(header, 24, Math.round(frame.left))
  writeUInt32LE(header, 28, Math.round(frame.top))
  writeUInt32LE(header, 32, Math.round(frame.right))
  writeUInt32LE(header, 36, Math.round(frame.bottom))
  // dSignature = "EMF " (0x464D4520)
  writeUInt32LE(header, 40, 0x464D4520)
  // nVersion = 0x00010000
  writeUInt32LE(header, 44, 0x00010000)
  // nBytes
  writeUInt32LE(header, 48, totalSize)
  // nRecords
  writeUInt32LE(header, 52, recordCount)
  // nHandles = 0
  writeUInt16LE(header, 56, 0)
  // sReserved = 0
  writeUInt16LE(header, 58, 0)
  // nDescription = 0
  writeUInt32LE(header, 60, 0)
  // offDescription = 0
  writeUInt32LE(header, 64, 0)
  // nPalEntries = 0
  writeUInt32LE(header, 68, 0)
  // szlDevice
  writeUInt32LE(header, 72, deviceSize.cx)
  writeUInt32LE(header, 76, deviceSize.cy)
  // szlMillimeters
  writeUInt32LE(header, 80, millimeterSize.cx)
  writeUInt32LE(header, 84, millimeterSize.cy)

  return header
}

function buildPolylineRecord(points: PointL[], bounds: RectL, recordType: number): Uint8Array {
  const pointCount = points.length
  const recordSize = 20 + pointCount * 8 // header + points
  const buf = new Uint8Array(recordSize)

  writeUInt32LE(buf, 0, recordType)
  writeUInt32LE(buf, 4, recordSize)
  writeUInt32LE(buf, 8, Math.round(bounds.left))
  writeUInt32LE(buf, 12, Math.round(bounds.top))
  writeUInt32LE(buf, 16, Math.round(bounds.right))
  writeUInt32LE(buf, 20, Math.round(bounds.bottom))
  writeUInt32LE(buf, 24, pointCount)

  for (let i = 0; i < pointCount; i++) {
    writeUInt32LE(buf, 28 + i * 8, Math.round(points[i].x))
    writeUInt32LE(buf, 32 + i * 8, Math.round(points[i].y))
  }

  return buf
}

function buildEOFFRecord(totalSize: number): Uint8Array {
  const buf = new Uint8Array(20)
  writeUInt32LE(buf, 0, EMR_EOF)
  writeUInt32LE(buf, 4, 20)
  writeUInt32LE(buf, 8, 0) // nPalEntries
  writeUInt32LE(buf, 12, 0) // offPalEntries
  writeUInt32LE(buf, 16, totalSize) // nSizeLast
  return buf
}

interface ParsedElement {
  type: 'rect' | 'path' | 'polygon'
  points?: PointL[]
  bounds?: RectL
  fill?: string
  stroke?: string
  strokeWidth?: number
  x?: number
  y?: number
  width?: number
  height?: number
}

function parseSVGToElements(svgString: string): ParsedElement[] {
  const elements: ParsedElement[] = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, 'image/svg+xml')
  const svg = doc.documentElement

  // Get viewBox or width/height
  const viewBox = svg.getAttribute('viewBox')
  let width = 64
  let height = 64
  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(Number)
    if (parts.length >= 4) {
      width = parts[2]
      height = parts[3]
    }
  }

  // Parse rects
  const rects = svg.querySelectorAll('rect')
  for (const rect of rects) {
    const x = parseFloat(rect.getAttribute('x') || '0')
    const y = parseFloat(rect.getAttribute('y') || '0')
    const w = parseFloat(rect.getAttribute('width') || '0')
    const h = parseFloat(rect.getAttribute('height') || '0')
    if (w > 0 && h > 0) {
      elements.push({
        type: 'rect',
        x, y,
        width: w,
        height: h,
        fill: rect.getAttribute('fill') || 'black',
        stroke: rect.getAttribute('stroke') || 'none',
        strokeWidth: parseFloat(rect.getAttribute('stroke-width') || '1'),
      })
    }
  }

  // Parse polygons
  const polygons = svg.querySelectorAll('polygon')
  for (const polygon of polygons) {
    const pointsAttr = polygon.getAttribute('points') || ''
    const coords = pointsAttr.trim().split(/[\s,]+/).map(Number)
    const points: PointL[] = []
    for (let i = 0; i < coords.length - 1; i += 2) {
      if (!isNaN(coords[i]) && !isNaN(coords[i + 1])) {
        points.push({ x: coords[i], y: coords[i + 1] })
      }
    }
    if (points.length >= 3) {
      const bounds = getPointBounds(points)
      elements.push({
        type: 'polygon',
        points,
        bounds,
        fill: polygon.getAttribute('fill') || 'black',
        stroke: polygon.getAttribute('stroke') || 'none',
        strokeWidth: parseFloat(polygon.getAttribute('stroke-width') || '1'),
      })
    }
  }

  // Parse paths (simplified: extract M/L/Z commands as polylines)
  const paths = svg.querySelectorAll('path')
  for (const path of paths) {
    const d = path.getAttribute('d') || ''
    const points = parsePathCommands(d)
    if (points.length >= 2) {
      const bounds = getPointBounds(points)
      elements.push({
        type: 'path',
        points,
        bounds,
        fill: path.getAttribute('fill') || 'black',
        stroke: path.getAttribute('stroke') || 'none',
        strokeWidth: parseFloat(path.getAttribute('stroke-width') || '1'),
      })
    }
  }

  return elements
}

function parsePathCommands(d: string): PointL[] {
  const points: PointL[] = []
  const commands = d.match(/[MLCZmlcz][^MLCZmlcz]*/g) || []
  let cx = 0, cy = 0

  for (const cmd of commands) {
    const type = cmd[0]
    const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n))

    if (type === 'M' || type === 'm') {
      for (let i = 0; i < nums.length - 1; i += 2) {
        cx = nums[i]
        cy = nums[i + 1]
        points.push({ x: cx, y: cy })
      }
    } else if (type === 'L' || type === 'l') {
      for (let i = 0; i < nums.length - 1; i += 2) {
        cx = nums[i]
        cy = nums[i + 1]
        points.push({ x: cx, y: cy })
      }
    } else if (type === 'Z' || type === 'z') {
      // Close path - no new point
    }
  }

  return points
}

function getPointBounds(points: PointL[]): RectL {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const { x, y } of points) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { left: minX, top: minY, right: maxX, bottom: maxY }
}

/**
 * Parse color string to RGB
 */
function parseColor(color: string): { r: number; g: number; b: number } {
  if (color === 'none' || !color) return { r: 0, g: 0, b: 0 }
  if (color.startsWith('rgb(')) {
    const nums = color.match(/\d+/g)?.map(Number) || [0, 0, 0]
    return { r: nums[0], g: nums[1], b: nums[2] }
  }
  // Hex color
  const hex = color.replace('#', '')
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    }
  }
  if (hex.length >= 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    }
  }
  return { r: 0, g: 0, b: 0 }
}

export function exportSvgAsEmf(svgString: string, filename: string): void {
  const elements = parseSVGToElements(svgString)

  if (elements.length === 0) {
    // Fallback: create a simple 64x64 filled rectangle EMF inline
    const fallbackRect: PointL[] = [
      { x: 0, y: 0 }, { x: 64, y: 0 }, { x: 64, y: 64 }, { x: 0, y: 64 }
    ]
    const fallbackBounds: RectL = { left: 0, top: 0, right: 64, bottom: 64 }
    const deviceSize = { cx: 64, cy: 64 }
    const millimeterSize = { cx: 17, cy: 17 }
    const recordCount = 2 // 1 polygon + 1 EOF
    const totalRecordSize = 20 + 4 * 8 // polyline record
    const totalSize = 80 + totalRecordSize + 20

    const emfBuffer = new Uint8Array(totalSize)
    const header = buildEMFHeader(fallbackBounds, fallbackBounds, deviceSize, millimeterSize, recordCount, totalSize)
    emfBuffer.set(header, 0)
    const polyRecord = buildPolylineRecord(fallbackRect, fallbackBounds, EMR_POLYGON)
    emfBuffer.set(polyRecord, 80)
    const eofRecord = buildEOFFRecord(totalSize)
    emfBuffer.set(eofRecord, 80 + totalRecordSize)

    const blob = new Blob([emfBuffer], { type: 'application/emf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.emf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return
  }

  // Calculate overall bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const el of elements) {
    if (el.bounds) {
      if (el.bounds.left < minX) minX = el.bounds.left
      if (el.bounds.top < minY) minY = el.bounds.top
      if (el.bounds.right > maxX) maxX = el.bounds.right
      if (el.bounds.bottom > maxY) maxY = el.bounds.bottom
    }
    if (el.x !== undefined && el.y !== undefined) {
      if (el.x < minX) minX = el.x
      if (el.y < minY) minY = el.y
      if (el.x + (el.width || 0) > maxX) maxX = el.x + (el.width || 0)
      if (el.y + (el.height || 0) > maxY) maxY = el.y + (el.height || 0)
    }
  }

  // Add padding
  const padding = 2
  minX -= padding
  minY -= padding
  maxX += padding
  maxY += padding

  const bounds: RectL = {
    left: Math.round(minX),
    top: Math.round(minY),
    right: Math.round(maxX),
    bottom: Math.round(maxY),
  }

  const frame: RectL = bounds // in device units (same as bounds for simplicity)

  // Build records
  const records: Uint8Array[] = []

  // Calculate device size from viewBox
  const width = bounds.right - bounds.left || 64
  const height = bounds.bottom - bounds.top || 64
  const deviceSize = { cx: width, cy: height }
  const millimeterSize = { cx: Math.round(width * 25.4 / 96), cy: Math.round(height * 25.4 / 96) }

  let recordCount = 0

  // Add polyline/polygon records
  for (const el of elements) {
    if (el.type === 'polygon' && el.points && el.points.length >= 3 && el.fill !== 'none') {
      records.push(buildPolylineRecord(el.points, el.bounds || bounds, EMR_POLYGON))
      recordCount++
    } else if (el.type === 'path' && el.points && el.points.length >= 2 && el.stroke !== 'none') {
      records.push(buildPolylineRecord(el.points, el.bounds || bounds, EMR_POLYLINE))
      recordCount++
    } else if (el.type === 'rect' && el.fill !== 'none') {
      // Emit as polygon
      const { x = 0, y = 0, width: w = 64, height: h = 64 } = el
      const rectPoints: PointL[] = [
        { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }
      ]
      records.push(buildPolylineRecord(rectPoints, bounds, EMR_POLYGON))
      recordCount++
    }
  }

  recordCount++ // for EOF

  const totalRecordSize = records.reduce((sum, r) => sum + r.length, 0)
  const totalSize = 80 + totalRecordSize + 20 // header + records + EOF

  // Build EMF
  const emfBuffer = new Uint8Array(totalSize)
  const header = buildEMFHeader(bounds, frame, deviceSize, millimeterSize, recordCount, totalSize)
  emfBuffer.set(header, 0)

  let offset = 80
  for (const record of records) {
    emfBuffer.set(record, offset)
    offset += record.length
  }

  const eofRecord = buildEOFFRecord(totalSize)
  emfBuffer.set(eofRecord, offset)

  // Download
  const blob = new Blob([emfBuffer], { type: 'application/emf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.emf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
