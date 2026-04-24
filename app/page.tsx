'use client'

import { useState } from 'react'
import { ConvertView } from '@/components/convert/convert-view'
import { LibraryView } from '@/components/library/library-view'

export default function Home() {
  const [activeView, setActiveView] = useState<'convert' | 'library'>('convert')

  return (
    <div className="flex flex-col h-screen">
      {activeView === 'convert' ? (
        <ConvertView onGoToLibrary={() => setActiveView('library')} />
      ) : (
        <LibraryView onBack={() => setActiveView('convert')} />
      )}
    </div>
  )
}
