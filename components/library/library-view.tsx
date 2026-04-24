// components/library/library-view.tsx
'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Search, X, Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CategorySidebar } from './category-sidebar'
import { IconGrid } from './icon-grid'
import { CATEGORIES, getAllIconNames } from '@/lib/icons/categories'
import { LUCIDE_MAP } from '@/lib/icons/lucide'
import type { LucideIconName } from '@/lib/icons/lucide'
import type { Category } from '@/lib/icons/categories'

interface LibraryViewProps {
  onUseIcon: (svgString: string) => void
}

export function LibraryView({ onUseIcon }: LibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null)
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)

  const handleCategoryChange = useCallback((cat: Category | null, sub: string | null) => {
    setActiveCategory(cat)
    setActiveSubcategory(sub)
  }, [])

  const filteredIcons = useMemo(() => {
    let icons: string[] = []

    if (searchQuery.trim()) {
      icons = getAllIconNames().filter((name) =>
        name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    } else if (activeCategory === null) {
      for (const cat of Object.keys(CATEGORIES) as Category[]) {
        const subcats = Object.keys(CATEGORIES[cat])
        if (subcats.length > 0) {
          icons.push(...(CATEGORIES[cat] as unknown as Record<string, readonly string[]>)[subcats[0]])
        }
      }
      icons = [...new Set(icons)]
    } else if (activeSubcategory) {
      icons = [...((CATEGORIES[activeCategory] as unknown as Record<string, readonly string[]>)[activeSubcategory] || [])]
    } else {
      for (const subIcons of Object.values(CATEGORIES[activeCategory] as unknown as Record<string, readonly string[]>)) {
        icons.push(...subIcons)
      }
      icons = [...new Set(icons)]
    }

    return icons.sort()
  }, [searchQuery, activeCategory, activeSubcategory])

  const handleSelectIcon = useCallback((iconName: string) => {
    setSelectedIcon(iconName)
  }, [])

  const handleUseIcon = useCallback(async () => {
    if (!selectedIcon) return
    const LucideIcon = LUCIDE_MAP[selectedIcon as LucideIconName]
    if (!LucideIcon) return

    const container = document.createElement('div')
    container.style.cssText = 'position:absolute;visibility:hidden;width:48px;height:48px;'
    document.body.appendChild(container)

    const root = createRoot(container)
    root.render(<LucideIcon size={48} />)

    requestAnimationFrame(async () => {
      const svgEl = container.querySelector('svg')
      if (svgEl) {
        let svgStr = svgEl.outerHTML
        if (!svgStr.includes('xmlns')) {
          svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
        }
        onUseIcon(svgStr)
      }
      root.unmount()
      document.body.removeChild(container)
    })
  }, [selectedIcon, onUseIcon])

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-48 border-r shrink-0" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <CategorySidebar
          activeCategory={activeCategory}
          activeSubcategory={activeSubcategory}
          onCategoryChange={handleCategoryChange}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Search bar */}
        <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-muted-foreground)' }} />
            <Input
              type="text"
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9"
              aria-label="Search icons"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-muted-foreground)' }}
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Icon grid */}
        <ScrollArea className="flex-1">
          {filteredIcons.length > 0 ? (
            <IconGrid
              icons={filteredIcons}
              onSelect={handleSelectIcon}
              selectedIcon={selectedIcon || undefined}
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              {searchQuery
                ? `No icons found for "${searchQuery}"`
                : 'Select a category or search for icons'
              }
            </div>
          )}
        </ScrollArea>

        {/* Selection bar */}
        {selectedIcon && (
          <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Selected:</span>
                <span className="text-sm font-mono font-medium" style={{ color: 'var(--color-foreground)' }}>{selectedIcon}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIcon(null)}
                  className="text-xs"
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={handleUseIcon}
                  className="text-xs gap-1 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  <Send className="w-3.5 h-3.5" />
                  Use Icon
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
