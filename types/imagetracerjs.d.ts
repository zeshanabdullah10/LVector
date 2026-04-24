declare module 'imagetracerjs' {
  export interface ImageTracerOptions {
    ltres?: number
    qtres?: number
    pathomit?: number
    colorsampling?: number
    numberofcolors?: number
    mincolorratio?: number
    colorquantcycles?: number
    blurradius?: number
    blurdelta?: number
    scale?: number
    roundcoords?: number
    strokewidth?: number
    linefilter?: boolean
    layering?: number
    desc?: string
    viewbox?: boolean
    preset?: string
    rightangleenhance?: boolean
    corsenabled?: boolean
    lcpr?: number
    qcpr?: number
  }

  export interface ImageDataLike {
    width: number
    height: number
    data: Uint8ClampedArray
  }

  export const optionpresets: Record<string, ImageTracerOptions>
  export function imagedataToSVG(imageData: ImageDataLike, options?: ImageTracerOptions): string
  export function checkoptions(options: ImageTracerOptions): void

  const _default: {
    optionpresets: Record<string, ImageTracerOptions>
    imagedataToSVG(imageData: ImageDataLike, options?: ImageTracerOptions): string
    checkoptions(options: ImageTracerOptions): void
  }
  export default _default
}