import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export const maxDuration = 30

interface ConvertRequest {
  imageData?: string
  mimeType?: string
  options: Record<string, number | string | boolean>
}

const getTracer = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ImageTracer = require('imagetracerjs')
  return (ImageTracer as any).default || ImageTracer
}

export async function POST(request: NextRequest) {
  try {
    const body: ConvertRequest = await request.json()
    const { imageData, options } = body

    if (!imageData) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 })
    }

    const buffer = Buffer.from(imageData, 'base64')

    const { data: rgbaData, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const imageDataObj = {
      width: info.width,
      height: info.height,
      data: new Uint8ClampedArray(rgbaData),
    }

    const ImageTracer = await getTracer()

    const tracerOptions: Record<string, any> = {}

    if (options.preset && options.preset !== 'custom') {
      const presets = (ImageTracer as any).optionpresets
      if (presets && presets[options.preset as string]) {
        Object.assign(tracerOptions, presets[options.preset as string])
      }
    }

    const numericKeys = [
      'ltres', 'qtres', 'pathomit', 'colorsampling', 'numberofcolors',
      'mincolorratio', 'colorquantcycles', 'blurradius', 'blurdelta',
      'scale', 'roundcoords', 'strokewidth', 'linefilter', 'layering',
    ]

    const stringKeys = ['desc', 'viewbox']

    for (const key of numericKeys) {
      if (options[key] !== undefined && options[key] !== null && options[key] !== '') {
        tracerOptions[key] = Number(options[key])
      }
    }

    for (const key of stringKeys) {
      if (options[key] !== undefined && options[key] !== null) {
        tracerOptions[key] = options[key]
      }
    }

    if ((ImageTracer as any).checkoptions) {
      (ImageTracer as any).checkoptions(tracerOptions)
    }

    const svgString = (ImageTracer as any).imagedataToSVG(imageDataObj, tracerOptions)

    return NextResponse.json({
      success: true,
      svg: svgString,
      width: info.width,
      height: info.height,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Conversion failed'
    console.error('SVG conversion error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}