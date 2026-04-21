'use client'

import { useState } from 'react'
import { ConvertView } from '@/components/convert/convert-view'
import { LibraryView } from '@/components/library/library-view'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'convert' | 'library'>('convert')

  return (
    <div className="flex flex-col h-screen">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'convert' | 'library')} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b px-4 h-11" style={{ backgroundColor: 'var(--color-background)' }}>
          <TabsTrigger value="convert">Convert</TabsTrigger>
          <TabsTrigger value="library">Icon Library</TabsTrigger>
        </TabsList>
        <TabsContent value="convert" className="flex-1 m-0 overflow-hidden">
          <ConvertView />
        </TabsContent>
        <TabsContent value="library" className="flex-1 m-0 overflow-hidden">
          <LibraryView onSelectIcon={() => setActiveTab('convert')} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
