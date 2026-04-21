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
  const [isConverting, setIsConverting] = useState(false)
  const { settings, updateSetting } = useSettings()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Compute path count from SVG (rough estimate from path elements)
  const svgElementCount = svgOutput
    ? (svgOutput.match(/<(path|polygon|rect|circle|ellipse|line)/g) || []).length
    : undefined
  const fileSize = svgOutput
    ? `${(new Blob([svgOutput]).size / 1024).toFixed(1)} KB`
    : undefined

  const getActionState = (): ActionState => {
    if (isConverting) return 'converting'
    if (!inputImage) return 'idle'
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

    setIsConverting(true)

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
    } finally {
      setIsConverting(false)
    }
  }, [inputImage, settings])

  const handleExportEMF = useCallback(() => {
    if (!svgOutput) return
    import('@/lib/conversion/svg-to-emf').then(({ exportSvgAsEmf }) => {
      exportSvgAsEmf(svgOutput, 'lvector-export')
    })
    // After EMF export, reset to idle so user can upload another
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
        {/* Preview Canvas */}
        <div className="shrink-0">
          <PreviewCanvas
            inputImage={inputImage}
            svgOutput={svgOutput}
            error={error}
            onUploadClick={handleUploadClick}
          />
        </div>

        {/* Settings Panel */}
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
            pathCount={svgElementCount}
            fileSize={fileSize}
            colorCount={settings.numberofcolors}
          />
        </div>
      </div>
    </div>
  )
}