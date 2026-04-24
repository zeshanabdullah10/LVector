// components/convert/convert-view.tsx
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { PreviewCanvas } from './preview-canvas'
import { SettingsPanel } from './settings-panel'
import { ActionBar } from './action-bar'
import { StatsBar } from './stats-bar'
import { useSettings } from '@/hooks/use-settings'

type ActionState = 'idle' | 'converting' | 'ready'

interface ConvertViewProps {
  initialSvg?: string | null
  onInitialSvgConsumed?: () => void
}

export function ConvertView({ initialSvg, onInitialSvgConsumed }: ConvertViewProps) {
  const [inputImage, setInputImage] = useState<string | null>(null)
  const [svgOutput, setSvgOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const { settings, updateSetting } = useSettings()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!initialSvg) return
    if (onInitialSvgConsumed) onInitialSvgConsumed()

    const blob = new Blob([initialSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = 2
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/png')
        setSvgOutput(null)
        setError(null)
        setInputImage(dataUrl)
      }
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
    }
    img.src = url
  }, [initialSvg, onInitialSvgConsumed])

  const svgElementCount = svgOutput
    ? (svgOutput.match(/<(path|polygon|rect|circle|ellipse|line)/g) || []).length
    : undefined
  const fileSize = svgOutput
    ? `${(new Blob([svgOutput]).size / 1024).toFixed(1)} KB`
    : undefined

  const getActionState = (): ActionState => {
    if (isConverting) return 'converting'
    if (!svgOutput) return 'idle'
    return 'ready'
  }

  useEffect(() => {
    if (!inputImage) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    const thisRequestId = ++requestIdRef.current

    debounceRef.current = setTimeout(async () => {
      setIsConverting(true)
      setError(null)

      try {
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

        if (requestIdRef.current === thisRequestId) {
          setSvgOutput(data.svg)
        }
      } catch (err: unknown) {
        if (requestIdRef.current === thisRequestId) {
          setError(err instanceof Error ? err.message : 'Conversion failed')
        }
      } finally {
        if (requestIdRef.current === thisRequestId) {
          setIsConverting(false)
        }
      }
    }, 500)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [inputImage, settings])

  const handleFileSelected = useCallback((dataUrl: string) => {
    setInputImage(dataUrl)
    setSvgOutput(null)
    setError(null)
  }, [])

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
    setIsConverting(false)
  }, [])

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-background)' }}>
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
          e.target.value = ''
        }}
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="shrink-0">
          <PreviewCanvas
            inputImage={inputImage}
            svgOutput={svgOutput}
            isConverting={isConverting}
            error={error}
            onUploadClick={handleUploadClick}
          />
        </div>

        <div className="shrink-0 max-h-[35vh] overflow-y-auto">
          <SettingsPanel
            settings={settings}
            onSettingChange={updateSetting}
          />
        </div>

        <div className="shrink-0">
          <ActionBar
            actionState={getActionState()}
            onUpload={handleUploadClick}
            onExportEMF={handleExportEMF}
            onReset={handleReset}
          />
        </div>

        <div className="shrink-0">
          <StatsBar
            pathCount={svgElementCount}
            fileSize={fileSize}
            colorCount={settings.numberofcolors}
          />
        </div>
      </div>
    </div>
  )
}
