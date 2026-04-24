// components/convert/preview-canvas.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ComparisonSlider } from './comparison-slider'
import { cn } from '@/lib/utils'
import { buildEmfFromSvg } from '@/lib/conversion/svg-to-emf'
import { renderEmfToCanvas } from '@/lib/conversion/emf-renderer'

interface PreviewCanvasProps {
  inputImage: string | null
  svgOutput: string | null
  isConverting?: boolean
  onUploadClick: () => void
  error?: string | null
}

function EmfPreview({ svgOutput, zoom }: { svgOutput: string; zoom: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !svgOutput) return
    try {
      const emf = buildEmfFromSvg(svgOutput)
      const c = canvasRef.current
      const ctx = c.getContext('2d')
      if (!ctx) return
      renderEmfToCanvas(emf, c)
    } catch {}
  }, [svgOutput])

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full max-h-full"
      style={{
        transform: `scale(${zoom})`,
        imageRendering: 'pixelated',
        backgroundImage: 'linear-gradient(45deg, #e0e0e0 25%, transparent 25%), linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0e0e0 75%), linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)',
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
      }}
    />
  )
}

export function PreviewCanvas({ inputImage, svgOutput, isConverting, onUploadClick, error }: PreviewCanvasProps) {
  const [zoom, setZoom] = useState(1)

  const hasContent = inputImage || svgOutput

  return (
    <div
      className="relative flex items-center justify-center px-6 py-8 min-h-[300px]"
      style={{ backgroundColor: 'var(--color-muted)' }}
    >
      {/* Empty state */}
      {!hasContent ? (
        <button
          type="button"
          onClick={onUploadClick}
          className={cn(
            'w-full max-w-2xl aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 hover:border-[var(--color-primary)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/50'
          )}
          style={{
            borderColor: 'var(--color-muted-foreground)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-muted)' }}>
            <Upload className="w-7 h-7" style={{ color: 'var(--color-muted-foreground)' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Drop an image here or click to upload</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>PNG, JPG, GIF, BMP, WEBP</p>
          </div>
        </button>
      ) : (
        /* Preview content - always split view when both exist */
        <div
          className={cn(
            'relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden',
            'flex items-center justify-center'
          )}
          style={{
            backgroundColor: 'var(--color-background)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            border: '1px solid var(--color-border)',
          }}
        >
          {error && (
            <div
              className="absolute top-3 left-3 right-3 z-20 text-xs px-3 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--color-destructive)',
                color: 'var(--color-destructive-foreground)',
                opacity: 0.15,
                border: '1px solid var(--color-destructive)',
              }}
            >
              {error}
            </div>
          )}

          {isConverting && (
            <div
              className="absolute inset-0 z-30 flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-background)', opacity: 0.8 }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-t-primary animate-spin" />
                <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Converting...</span>
              </div>
            </div>
          )}

          {inputImage && svgOutput && (
            <ComparisonSlider
              leftContent={
                <img
                  src={inputImage}
                  alt="Original"
                  className="max-w-full max-h-full object-contain"
                  style={{ transform: `scale(${zoom})` }}
                />
              }
              rightContent={
                <EmfPreview svgOutput={svgOutput} zoom={zoom} />
              }
            />
          )}

          {svgOutput && !inputImage && (
            <EmfPreview svgOutput={svgOutput} zoom={zoom} />
          )}

          {inputImage && !svgOutput && !isConverting && (
            <img
              src={inputImage}
              alt="Original"
              className="max-w-full max-h-full object-contain"
              style={{ transform: `scale(${zoom})` }}
            />
          )}

          {/* Floating zoom controls */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <div
              className="flex items-center gap-0.5 rounded-lg shadow-sm p-0.5"
              style={{
                backgroundColor: 'var(--color-surface)',
                backdropFilter: 'blur(4px)',
                border: '1px solid var(--color-border)',
                opacity: 0.95,
              }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => setZoom(1)}
                aria-label="Reset zoom"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}