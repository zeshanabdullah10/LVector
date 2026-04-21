// components/convert/preview-canvas.tsx
'use client'

import { useState } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Eye, EyeOff, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ComparisonSlider } from './comparison-slider'
import { cn } from '@/lib/utils'

interface PreviewCanvasProps {
  inputImage: string | null
  svgOutput: string | null
  onUploadClick: () => void
  error?: string | null
}

type ViewMode = 'svg' | 'split' | 'original'

export function PreviewCanvas({ inputImage, svgOutput, onUploadClick, error }: PreviewCanvasProps) {
  const [zoom, setZoom] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('svg')

  const hasContent = inputImage || svgOutput

  const renderPreviewContent = () => {
    if (viewMode === 'split' && inputImage && svgOutput) {
      return (
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
            <div
              className="max-w-full max-h-full"
              style={{ transform: `scale(${zoom})` }}
              dangerouslySetInnerHTML={{ __html: svgOutput }}
            />
          }
        />
      )
    }
    if (viewMode === 'original' && inputImage) {
      return (
        <img
          src={inputImage}
          alt="Original"
          className="max-w-full max-h-full object-contain"
          style={{ transform: `scale(${zoom})` }}
        />
      )
    }
    if (svgOutput) {
      return (
        <div
          className="max-w-full max-h-full"
          style={{ transform: `scale(${zoom})` }}
          dangerouslySetInnerHTML={{ __html: svgOutput }}
        />
      )
    }
    return null
  }

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
        /* Preview content */
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
                backgroundColor: 'color-mix(in oklch, var(--color-destructive) 10%, transparent)',
                border: '1px solid color-mix(in oklch, var(--color-destructive) 30%, transparent)',
                color: 'var(--color-destructive)',
              }}
            >
              {error}
            </div>
          )}
          {renderPreviewContent()}

          {/* Floating controls */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {/* Zoom controls */}
            <div
              className="flex items-center gap-0.5 rounded-lg shadow-sm p-0.5"
              style={{
                backgroundColor: 'color-mix(in oklch, var(--color-background) 90%, transparent)',
                backdropFilter: 'blur(4px)',
                border: '1px solid var(--color-border)',
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

            {/* View toggle */}
            {svgOutput && (
              <div
                className="flex items-center gap-0.5 rounded-lg shadow-sm p-0.5"
                style={{
                  backgroundColor: 'color-mix(in oklch, var(--color-background) 90%, transparent)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Button
                  variant={viewMode === 'svg' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 rounded-md"
                  onClick={() => setViewMode('svg')}
                  aria-label="SVG view"
                  title="SVG output"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'split' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 rounded-md"
                  onClick={() => setViewMode('split')}
                  aria-label="Split view"
                  title="Compare before/after"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="8" height="18" rx="1" />
                    <rect x="13" y="3" width="8" height="18" rx="1" />
                  </svg>
                </Button>
                {inputImage && (
                  <Button
                    variant={viewMode === 'original' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 rounded-md"
                    onClick={() => setViewMode('original')}
                    aria-label="Original view"
                    title="Original image"
                  >
                    <EyeOff className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
