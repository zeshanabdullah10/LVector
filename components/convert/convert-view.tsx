// components/convert/convert-view.tsx
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { HeaderBar } from './header-bar'
import { PreviewCanvas } from './preview-canvas'
import { SettingsPanel } from './settings-panel'
import { ActionBar } from './action-bar'
import { StatsBar } from './stats-bar'
import { useSettings } from '@/hooks/use-settings'

type ActionState = 'idle' | 'converting' | 'ready'

export function ConvertView() {
  const [inputImage, setInputImage] = useState<string | null>(null)
  const [svgOutput, setSvgOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const { settings, updateSetting } = useSettings()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const svgElementCount = svgOutput
    ? (svgOutput.match(/<(path|polygon|rect|circle|ellipse|line)/g) || []).length
    : undefined
  const fileSize = svgOutput
    ? `${(new Blob([svgOutput]).size / 1024).toFixed(1)} KB`
    : undefined

  const getActionState = (): ActionState => {
    if (isConverting) return 'converting'
    if (!inputImage) return 'idle'
    if (!svgOutput) return 'idle'
    return 'ready'
  }

  const convert = useCallback(async () => {
    if (!inputImage) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

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
      setSvgOutput(data.svg)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
    } finally {
      setIsConverting(false)
    }
  }, [inputImage, settings])

  // Auto-convert when image is uploaded
  const handleFileSelected = useCallback((dataUrl: string) => {
    setInputImage(dataUrl)
    setSvgOutput(null)
    setError(null)
  }, [])

  // Auto-reconvert when settings change (debounced)
  useEffect(() => {
    if (!inputImage) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      convert()
    }, 500)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [inputImage, settings, convert])

  const handleExportEMF = useCallback(() => {
    if (!svgOutput) return
    import('@/lib/conversion/svg-to-emf').then(({ exportSvgAsEmf }) => {
      exportSvgAsEmf(svgOutput, 'lvector-export')
    })
    setSvgOutput(null)
    setInputImage(null)
    setError(null)
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
      <HeaderBar />

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