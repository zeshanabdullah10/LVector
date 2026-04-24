'use client'

import { useState, useCallback } from 'react'
import { AppHeader } from '@/components/convert/header-bar'
import { ConvertView } from '@/components/convert/convert-view'
import { LibraryView } from '@/components/library/library-view'

export default function Home() {
  const [activeView, setActiveView] = useState<'convert' | 'library'>('convert')
  const [pendingSvg, setPendingSvg] = useState<string | null>(null)

  const handleUseIcon = useCallback((svgString: string) => {
    setPendingSvg(svgString)
    setActiveView('convert')
  }, [])

  const handleClearPendingSvg = useCallback(() => {
    setPendingSvg(null)
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <AppHeader
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <div className="flex-1 min-h-0">
        {activeView === 'convert' ? (
          <ConvertView
            initialSvg={pendingSvg}
            onInitialSvgConsumed={handleClearPendingSvg}
          />
        ) : (
          <LibraryView onUseIcon={handleUseIcon} />
        )}
      </div>
    </div>
  )
}
