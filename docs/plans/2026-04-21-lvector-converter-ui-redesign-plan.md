# LVector Converter UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current side-by-panel converter UI with the Canvas Studio design — centered preview canvas with always-visible settings, progressive action bar, and Figma-grade polish.

**Architecture:** Single focused page with vertically stacked sections: Header → Preview Canvas → Settings Panel → Action Bar → Stats Strip. All components are new. Existing components (InputPanel, OutputPanel, SettingsStrip) will be replaced wholesale.

**Tech Stack:** Next.js 16 App Router, shadcn/ui (button, slider, tabs, tooltip), Tailwind CSS, Lucide icons, CSS custom properties for theming.

---

## Before Starting

- All new components go in `components/convert/` replacing existing files
- Existing components to replace: `convert-view.tsx`, `input-panel.tsx`, `output-panel.tsx`, `settings-strip.tsx`, `drop-zone.tsx`, `svg-code.tsx`
- Keep: `svg-to-emf.ts` (EMF export logic), `types.ts` (unchanged), `use-settings.ts` (unchanged), `/api/convert` (unchanged)
- Reference: `docs/plans/2026-04-21-lvector-converter-ui-design.md`

---

## Task 1: Create HeaderBar Component

**Files:**
- Create: `D:\LVector\lvector\components\convert\header-bar.tsx`

**Step 1: Write the component**

```tsx
// components/convert/header-bar.tsx
'use client'

import { HelpCircle, Moon, Sun, Hexagon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function HeaderBar() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-surface shrink-0">
      {/* Logo & name */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Hexagon className="w-5 h-5 text-white" />
        </div>
        <span className="text-base font-semibold text-foreground">LVector</span>
        <span className="text-xs text-muted-foreground ml-1">EMF Converter</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Help & shortcuts</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-muted-foreground" />
                : <Moon className="w-4 h-4 text-muted-foreground" />
              }
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
```

**Step 2: Verify file compiles**

Run: `cd D:/LVector/lvector && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add components/convert/header-bar.tsx
git commit -m "feat: add HeaderBar component with logo and theme toggle"
```

---

## Task 2: Create StatsBar Component

**Files:**
- Create: `D:\LVector\lvector\components\convert\stats-bar.tsx`

**Step 1: Write the component**

```tsx
// components/convert/stats-bar.tsx
'use client'

interface StatsBarProps {
  pathCount?: number
  fileSize?: string
  colorCount?: number
}

export function StatsBar({ pathCount, fileSize, colorCount }: StatsBarProps) {
  const hasStats = pathCount !== undefined || fileSize || colorCount

  if (!hasStats) return null

  const parts: string[] = []
  if (pathCount !== undefined) parts.push(`${pathCount} paths`)
  if (fileSize) parts.push(`${fileSize} SVG`)
  if (colorCount !== undefined) parts.push(`${colorCount} colors`)

  return (
    <div className="h-12 flex items-center justify-center">
      <p className="text-xs font-mono text-muted-foreground tracking-wide">
        {parts.join(' · ')}
      </p>
    </div>
  )
}
```

**Step 2: Verify file compiles**

Run: `cd D:/LVector/lvector && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add components/convert/stats-bar.tsx
git commit -m "feat: add StatsBar component for SVG metadata display"
```

---

## Task 3: Create ComparisonSlider Component

**Files:**
- Create: `D:\LVector\lvector\components\convert\comparison-slider.tsx`

**Step 1: Write the component**

```tsx
// components/convert/comparison-slider.tsx
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface ComparisonSliderProps {
  leftContent: React.ReactNode   // Original image
  rightContent: React.ReactNode  // SVG output
  leftLabel?: string
  rightLabel?: string
}

export function ComparisonSlider({
  leftContent,
  rightContent,
  leftLabel = 'Original',
  rightLabel = 'SVG',
}: ComparisonSliderProps) {
  const [position, setPosition] = useState(50) // percentage
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const pct = Math.min(Math.max((x / rect.width) * 100, 0), 100)
    setPosition(pct)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    updatePosition(e.clientX)

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) updatePosition(e.clientX)
    }

    const handleMouseUp = () => {
      isDragging.current = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [updatePosition])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    updatePosition(e.touches[0].clientX)
  }, [updatePosition])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none cursor-ew-resize overflow-hidden rounded-lg"
      onMouseDown={handleMouseDown}
      onTouchMove={handleTouchMove}
    >
      {/* Left (original) — clipped by position */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
          {leftContent}
        </div>
      </div>

      {/* Right (SVG) — always full, shown through clip */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {rightContent}
        </div>
      </div>

      {/* Slider line and handle */}
      <div
        className="absolute top-0 bottom-0 z-10"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        {/* Line */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-primary/60" />

        {/* Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-8 h-8 rounded-full bg-white border-2 border-primary shadow-lg flex items-center justify-center">
            <div className="w-1 h-4 rounded-full bg-primary" />
          </div>
        </div>

        {/* Labels */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
          <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full font-medium">
            {position < 50 ? leftLabel : rightLabel}
          </span>
        </div>
      </div>

      {/* Static labels in corners */}
      <div className="absolute top-3 left-3 z-10">
        <span className="text-xs bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full text-foreground shadow-sm">
          {leftLabel}
        </span>
      </div>
      <div className="absolute top-3 right-3 z-10">
        <span className="text-xs bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full text-foreground shadow-sm">
          {rightLabel}
        </span>
      </div>
    </div>
  )
}
```

**Step 2: Verify file compiles**

Run: `cd D:/LVector/lvector && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add components/convert/comparison-slider.tsx
git commit -m "feat: add ComparisonSlider component for before/after comparison"
```

---

## Task 4: Create PreviewCanvas Component

**Files:**
- Create: `D:\LVector\lvector\components\convert\preview-canvas.tsx`

**Step 1: Write the component**

```tsx
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
}

type ViewMode = 'svg' | 'split' | 'original'

export function PreviewCanvas({ inputImage, svgOutput, onUploadClick }: PreviewCanvasProps) {
  const [zoom, setZoom] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('svg')

  const hasContent = inputImage || svgOutput

  // Checkered background via CSS
  const checkeredBg = `repe-linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
    repeating-linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
    repeating-linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
    repeating-linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)`
  const bgSize = '20px 20px'
  const bgPos = '0 0, 0 10px, 10px -10px, -10px 0px'

  return (
    <div className="relative flex items-center justify-center bg-muted/20 px-6 py-8 min-h-[300px]">
      {/* Canvas frame */}
      {!hasContent ? (
        /* Empty state */
        <button
          onClick={onUploadClick}
          className={cn(
            'w-full max-w-2xl aspect-video rounded-xl border-2 border-dashed',
            'border-muted-foreground/40 bg-surface flex flex-col items-center justify-center gap-3',
            'cursor-pointer transition-all duration-200 hover:border-primary hover:bg-primary/5',
            'focus:outline-none focus:ring-2 focus:ring-primary/50'
          )}
        >
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Upload className="w-7 h-7 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Drop an image here or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF, BMP, WEBP</p>
          </div>
        </button>
      ) : (
        /* Preview content */
        <div
          className={cn(
            'relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden',
            'bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-border/50',
            'flex items-center justify-center'
          )}
          style={{
            backgroundImage: `linear-gradient(45deg, #e8e8e8 25%, transparent 25%),
              linear-gradient(-45deg, #e8e8e8 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #e8e8e8 75%),
              linear-gradient(-45deg, transparent 75%, #e8e8e8 75%)`,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
        >
          {viewMode === 'split' && inputImage && svgOutput ? (
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
          ) : viewMode === 'original' && inputImage ? (
            <img
              src={inputImage}
              alt="Original"
              className="max-w-full max-h-full object-contain"
              style={{ transform: `scale(${zoom})` }}
            />
          ) : svgOutput ? (
            <div
              className="max-w-full max-h-full"
              style={{ transform: `scale(${zoom})` }}
              dangerouslySetInnerHTML={{ __html: svgOutput }}
            />
          ) : null}

          {/* Floating controls */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {/* Zoom controls */}
            <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-sm rounded-lg border border-border/50 shadow-sm p-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => setZoom(1)}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => setZoom(z => Math.min(3, z + 0.25))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            {/* View toggle */}
            {svgOutput && (
              <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-sm rounded-lg border border-border/50 shadow-sm p-0.5">
                <Button
                  variant={viewMode === 'svg' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 rounded-md"
                  onClick={() => setViewMode('svg')}
                  title="SVG output"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'split' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 rounded-md"
                  onClick={() => setViewMode('split')}
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
```

**Step 2: Verify file compiles**

Run: `cd D:/LVector/lvector && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add components/convert/preview-canvas.tsx
git commit -m "feat: add PreviewCanvas component with checkered frame and floating controls"
```

---

## Task 5: Create SettingsPanel Component

**Files:**
- Create: `D:\LVector\lvector\components\convert\settings-panel.tsx`

**Step 1: Write the component**

```tsx
// components/convert/settings-panel.tsx
'use client'

import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ConversionSettings } from '@/lib/conversion/types'

interface SettingsPanelProps {
  settings: ConversionSettings
  onSettingChange: <K extends keyof ConversionSettings>(
    key: K,
    value: ConversionSettings[K]
  ) => void
}

const PRESETS = [
  { value: 'default', label: 'Default' },
  { value: 'posterized', label: 'Posterized' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'smooth', label: 'Smooth' },
  { value: 'sharp', label: 'Sharp' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'artistic', label: 'Artistic' },
  { value: 'custom', label: 'Custom' },
]

function SettingRow({
  label,
  id,
  min,
  max,
  step,
  value,
  onChange,
  format,
}: {
  label: string
  id: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <label className="text-xs font-medium text-muted-foreground w-28 shrink-0" htmlFor={id}>
        {label}
      </label>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        className="flex-1"
        aria-label={label}
      />
      <span className="text-xs font-mono text-foreground w-10 text-right shrink-0">
        {format ? format(value) : value}
      </span>
    </div>
  )
}

export function SettingsPanel({ settings, onSettingChange }: SettingsPanelProps) {
  return (
    <div className="border-t border-border bg-surface px-6 py-4">
      <Tabs defaultValue="colors" className="w-full">
        <TabsList className="mb-4 h-9 gap-1 bg-muted/50 p-0.5 rounded-lg w-fit">
          <TabsTrigger
            value="presets"
            className="text-xs px-4 py-1.5 h-8 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Presets
          </TabsTrigger>
          <TabsTrigger
            value="colors"
            className="text-xs px-4 py-1.5 h-8 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Colors
          </TabsTrigger>
          <TabsTrigger
            value="shape"
            className="text-xs px-4 py-1.5 h-8 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Shape
          </TabsTrigger>
          <TabsTrigger
            value="output"
            className="text-xs px-4 py-1.5 h-8 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Output
          </TabsTrigger>
        </TabsList>

        {/* Presets tab */}
        <TabsContent value="presets" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => onSettingChange('preset', p.value)}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150
                  ${settings.preset === p.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }
                `}
              >
                {p.label}
              </button>
            ))}
          </div>
        </TabsContent>

        {/* Colors tab */}
        <TabsContent value="colors" className="space-y-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
            <SettingRow
              label="Number of colors"
              id="numberofcolors"
              min={2} max={64} step={1}
              value={settings.numberofcolors}
              onChange={(v) => onSettingChange('numberofcolors', v)}
            />
            <SettingRow
              label="Color sampling"
              id="colorsampling"
              min={0} max={2} step={1}
              value={settings.colorsampling}
              onChange={(v) => onSettingChange('colorsampling', v)}
            />
            <SettingRow
              label="Color quant cycles"
              id="colorquantcycles"
              min={1} max={10} step={1}
              value={settings.colorquantcycles}
              onChange={(v) => onSettingChange('colorquantcycles', v)}
            />
            <SettingRow
              label="Min color ratio"
              id="mincolorratio"
              min={0} max={1} step={0.05}
              value={settings.mincolorratio}
              onChange={(v) => onSettingChange('mincolorratio', v)}
              format={(v) => v.toFixed(2)}
            />
          </div>
        </TabsContent>

        {/* Shape tab */}
        <TabsContent value="shape" className="space-y-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
            <SettingRow
              label="Line threshold"
              id="ltres"
              min={0.1} max={10} step={0.1}
              value={settings.ltres}
              onChange={(v) => onSettingChange('ltres', v)}
              format={(v) => v.toFixed(1)}
            />
            <SettingRow
              label="Curve threshold"
              id="qtres"
              min={0.1} max={10} step={0.1}
              value={settings.qtres}
              onChange={(v) => onSettingChange('qtres', v)}
              format={(v) => v.toFixed(1)}
            />
            <SettingRow
              label="Blur radius"
              id="blurradius"
              min={0} max={5} step={0.5}
              value={settings.blurradius}
              onChange={(v) => onSettingChange('blurradius', v)}
              format={(v) => v.toFixed(1)}
            />
            <SettingRow
              label="Blur delta"
              id="blurdelta"
              min={0} max={256} step={1}
              value={settings.blurdelta}
              onChange={(v) => onSettingChange('blurdelta', v)}
            />
            <SettingRow
              label="Path omit"
              id="pathomit"
              min={0} max={100} step={1}
              value={settings.pathomit}
              onChange={(v) => onSettingChange('pathomit', v)}
            />
          </div>
        </TabsContent>

        {/* Output tab */}
        <TabsContent value="output" className="space-y-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
            <SettingRow
              label="Stroke width"
              id="strokewidth"
              min={0} max={10} step={0.5}
              value={settings.strokewidth}
              onChange={(v) => onSettingChange('strokewidth', v)}
              format={(v) => v.toFixed(1)}
            />
            <SettingRow
              label="Round coords"
              id="roundcoords"
              min={0} max={10} step={0.5}
              value={settings.roundcoords}
              onChange={(v) => onSettingChange('roundcoords', v)}
              format={(v) => v.toFixed(1)}
            />
            <SettingRow
              label="Scale"
              id="scale"
              min={0.1} max={10} step={0.1}
              value={settings.scale}
              onChange={(v) => onSettingChange('scale', v)}
              format={(v) => v.toFixed(1)}
            />
            <SettingRow
              label="Layering"
              id="layering"
              min={0} max={2} step={1}
              value={settings.layering}
              onChange={(v) => onSettingChange('layering', v)}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Step 2: Verify file compiles**

Run: `cd D:/LVector/lvector && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add components/convert/settings-panel.tsx
git commit -m "feat: add SettingsPanel with pill tabs and inline sliders"
```

---

## Task 6: Create ActionBar Component

**Files:**
- Create: `D:\LVector\lvector\components\convert\action-bar.tsx`

**Step 1: Write the component**

```tsx
// components/convert/action-bar.tsx
'use client'

import { Upload, RefreshCw, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ActionState = 'idle' | 'upload' | 'converting' | 'ready' | 'done'

interface ActionBarProps {
  actionState: ActionState
  onUpload: () => void
  onConvert: () => void
  onExportEMF: () => void
  onReset: () => void
}

const BUTTON_CONFIG: Record<ActionState, {
  label: string
  icon: React.ReactNode
  variant: 'default' | 'outline' | 'secondary' | 'destructive'
  className?: string
}> = {
  idle: {
    label: 'Upload Image',
    icon: <Upload className="w-4 h-4" />,
    variant: 'outline',
  },
  upload: {
    label: 'Convert to SVG',
    icon: <RefreshCw className="w-4 h-4" />,
    variant: 'default',
    className: 'animate-subtle-shimmer',
  },
  converting: {
    label: 'Converting...',
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    variant: 'default',
    className: 'opacity-80',
  },
  ready: {
    label: 'Export EMF',
    icon: <Download className="w-4 h-4" />,
    variant: 'default',
    className: 'bg-emerald-500 hover:bg-emerald-600',
  },
  done: {
    label: 'Download Another',
    icon: <RefreshCw className="w-4 h-4" />,
    variant: 'outline',
  },
}

export function ActionBar({ actionState, onUpload, onConvert, onExportEMF, onReset }: ActionBarProps) {
  const config = BUTTON_CONFIG[actionState]

  const handleClick = () => {
    switch (actionState) {
      case 'idle': onUpload(); break
      case 'upload': onConvert(); break
      case 'converting': break
      case 'ready': onExportEMF(); break
      case 'done': onReset(); break
    }
  }

  return (
    <div className="h-20 flex items-center justify-center px-6">
      <Button
        onClick={handleClick}
        variant={config.variant}
        size="lg"
        disabled={actionState === 'converting'}
        className={cn(
          'h-12 px-8 text-[15px] font-semibold gap-2 rounded-[10px]',
          'transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
          'shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
          config.className
        )}
      >
        {config.icon}
        {config.label}
      </Button>
    </div>
  )
}
```

**Step 2: Add shimmer animation to globals.css**

Read `D:\LVector\lvector\app\globals.css` first, then add:

```css
/* Shimmer animation for idle Convert button */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.animate-subtle-shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 1) 0%,
    hsl(var(--primary) / 0.85) 40%,
    hsl(var(--primary) / 1) 80%
  );
  background-size: 200% 100%;
  animation: shimmer 2s ease-in-out infinite;
}
```

**Step 3: Verify file compiles**

Run: `cd D:/LVector/lvector && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add components/convert/action-bar.tsx app/globals.css
git commit -m "feat: add ActionBar with progressive states and shimmer animation"
```

---

## Task 7: Rewrite ConvertView (Root Orchestrator)

**Files:**
- Modify: `D:\LVector\lvector\components\convert\convert-view.tsx` (replace entirely)

**Step 1: Write the new ConvertView**

```tsx
// components/convert/convert-view.tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import { HeaderBar } from './header-bar'
import { PreviewCanvas } from './preview-canvas'
import { SettingsPanel } from './settings-panel'
import { ActionBar } from './action-bar'
import { StatsBar } from './stats-bar'
import { useSettings } from '@/hooks/use-settings'

type ActionState = 'idle' | 'upload' | 'converting' | 'ready' | 'done'

export function ConvertView() {
  const [inputImage, setInputImage] = useState<string | null>(null)
  const [svgOutput, setSvgOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { settings, updateSetting } = useSettings()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Compute path count from SVG (rough estimate from path elements)
  const pathCount = svgOutput
    ? (svgOutput.match(/<(path|polygon|rect|circle|ellipse|line)/g) || []).length
    : undefined
  const fileSize = svgOutput
    ? `${(new Blob([svgOutput]).size / 1024).toFixed(1)} KB`
    : undefined

  const getActionState = (): ActionState => {
    if (!inputImage) return 'idle'
    if (inputImage && !svgOutput && error) return 'upload'
    if (!svgOutput) return 'upload'
    return 'ready'
  }

  const handleFileSelected = useCallback((dataUrl: string) => {
    setInputImage(dataUrl)
    setSvgOutput(null)
    setError(null)
  }, [])

  const handleConvert = useCallback(async () => {
    if (!inputImage) return

    try {
      setError(null)
      const base64 = inputImage.split(',')[1]
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: base64,
          mimeType: 'image/png',
          options: settings,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Conversion failed')
      setSvgOutput(data.svg)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
    }
  }, [inputImage, settings])

  const handleExportEMF = useCallback(() => {
    if (!svgOutput) return
    import('@/lib/conversion/svg-to-emf').then(({ exportSvgAsEmf }) => {
      exportSvgAsEmf(svgOutput, 'lvector-export')
    })
  }, [svgOutput])

  const handleReset = useCallback(() => {
    setInputImage(null)
    setSvgOutput(null)
    setError(null)
    fileInputRef.current?.click()
  }, [])

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className="flex flex-col h-full bg-background">
      <HeaderBar />

      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            const reader = new FileReader()
            reader.onload = (ev) => handleFileSelected(ev.target?.result as string)
            reader.readAsDataURL(file)
          }
          // Reset so same file can be re-selected
          e.target.value = ''
        }}
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Preview Canvas — takes ~55% of viewport */}
        <div className="shrink-0">
          <PreviewCanvas
            inputImage={inputImage}
            svgOutput={svgOutput}
            onUploadClick={handleUploadClick}
          />
        </div>

        {/* Settings Panel — scrollable, ~30% of viewport */}
        <div className="shrink-0 max-h-[35vh] overflow-y-auto">
          <SettingsPanel
            settings={settings}
            onSettingChange={updateSetting}
          />
        </div>

        {/* Action Bar */}
        <div className="shrink-0">
          <ActionBar
            actionState={getActionState()}
            onUpload={handleUploadClick}
            onConvert={handleConvert}
            onExportEMF={handleExportEMF}
            onReset={handleReset}
          />
        </div>

        {/* Stats Bar */}
        <div className="shrink-0">
          <StatsBar
            pathCount={pathCount}
            fileSize={fileSize}
            colorCount={settings.numberofcolors}
          />
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify file compiles**

Run: `cd D:/LVector/lvector && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add components/convert/convert-view.tsx
git commit -m "feat: rewrite ConvertView with Canvas Studio layout"
```

---

## Task 8: Delete Old Components

**Files:**
- Delete: `D:\LVector\lvector\components\convert\input-panel.tsx`
- Delete: `D:\LVector\lvector\components\convert\output-panel.tsx`
- Delete: `D:\LVector\lvector\components\convert\settings-strip.tsx`
- Delete: `D:\LVector\lvector\components\convert\drop-zone.tsx`
- Delete: `D:\LVector\lvector\components\convert\svg-code.tsx`

**Step 1: Delete all old components**

```bash
rm D:/LVector/lvector/components/convert/input-panel.tsx \
   D:/LVector/lvector/components/convert/output-panel.tsx \
   D:/LVector/lvector/components/convert/settings-strip.tsx \
   D:/LVector/lvector/components/convert/drop-zone.tsx \
   D:/LVector/lvector/components/convert/svg-code.tsx
```

**Step 2: Verify no broken imports**

Run: `cd D:/LVector/lvector && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git rm components/convert/input-panel.tsx \
       components/convert/output-panel.tsx \
       components/convert/settings-strip.tsx \
       components/convert/drop-zone.tsx \
       components/convert/svg-code.tsx
git commit -m "chore: remove old converter components replaced by Canvas Studio design"
```

---

## Task 9: Final Build Verification

**Step 1: Run production build**

```bash
cd D:/LVector/lvector && npm run build 2>&1
```

Expected: Successful build with all routes compiled.

**Step 2: Check for any remaining TypeScript errors**

```bash
cd D:/LVector/lvector && npx tsc --noEmit 2>&1
```

Expected: No errors.

**Step 3: Start dev server and verify (manual)**

```bash
cd D:/LVector/lvector && npm run dev
```

Navigate to http://localhost:3000 and verify:
- Header bar with LVector logo and theme toggle
- Empty state with upload prompt centered on checkered background
- Click to upload → image appears in preview
- "Convert to SVG" button → spinner → SVG output
- Settings panel with 4 tabs all functional
- Comparison slider works (drag left/right)
- "Export EMF" button downloads EMF
- Stats bar shows path count and file size

**Step 4: Commit final**

```bash
git add -A
git commit -m "feat: complete Canvas Studio converter UI redesign"
```

---

## Component Summary

| Component | File | Notes |
|-----------|------|-------|
| HeaderBar | `components/convert/header-bar.tsx` | Logo, theme toggle, help |
| StatsBar | `components/convert/stats-bar.tsx` | Path count, file size, colors |
| ComparisonSlider | `components/convert/comparison-slider.tsx` | Drag-to-reveal before/after |
| PreviewCanvas | `components/convert/preview-canvas.tsx` | Checkered frame, zoom, view modes |
| SettingsPanel | `components/convert/settings-panel.tsx` | 4-tab pill interface, inline sliders |
| ActionBar | `components/convert/action-bar.tsx` | Progressive states, shimmer animation |
| ConvertView | `components/convert/convert-view.tsx` | Root orchestrator, all state |

**Deleted:** input-panel, output-panel, settings-strip, drop-zone, svg-code

**Kept untouched:** `svg-to-emf.ts`, `types.ts`, `use-settings.ts`, `/api/convert`, `app/page.tsx`