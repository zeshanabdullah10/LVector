// lib/conversion/types.ts
export interface ConversionSettings {
  // Preset
  preset: string
  // Color options
  numberofcolors: number
  colorsampling: number
  colorquantcycles: number
  mincolorratio: number
  // Shape options
  ltres: number
  qtres: number
  blurradius: number
  blurdelta: number
  pathomit: number
  linefilter: boolean
  // Output options
  scale: number
  strokewidth: number
  roundcoords: number
  layering: number
  viewbox: boolean
}