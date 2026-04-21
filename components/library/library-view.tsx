// components/library/library-view.tsx
'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { CategorySidebar } from './category-sidebar'
import { IconGrid } from './icon-grid'
import { CATEGORIES, getAllIconNames } from '@/lib/icons/categories'
import type { Category } from '@/lib/icons/categories'

interface LibraryViewProps {
  onSelectIcon: (iconName: string) => void
}

export function LibraryView({ onSelectIcon }: LibraryViewProps) {
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
      // Search across all icons
      icons = getAllIconNames().filter((name) =>
        name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    } else if (activeCategory === null) {
      // All icons from first subcategory of each category
      for (const cat of Object.keys(CATEGORIES) as Category[]) {
        const subcats = Object.keys(CATEGORIES[cat])
        if (subcats.length > 0) {
          icons.push(...(CATEGORIES[cat] as unknown as Record<string, readonly string[]>)[subcats[0]])
        }
      }
      // Flatten and deduplicate
      icons = [...new Set(icons)]
    } else if (activeSubcategory) {
      icons = [...((CATEGORIES[activeCategory] as unknown as Record<string, readonly string[]>)[activeSubcategory] || [])]
    } else {
      // All icons in category
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

  const handleConfirmSelection = useCallback(() => {
    if (selectedIcon) {
      onSelectIcon(selectedIcon)
    }
  }, [selectedIcon, onSelectIcon])

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-48 border-r border-border bg-card shrink-0">
        <CategorySidebar
          activeCategory={activeCategory}
          activeSubcategory={activeSubcategory}
          onCategoryChange={handleCategoryChange}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Search bar */}
        <div className="p-3 border-b border-border bg-card shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              {searchQuery
                ? `No icons found for "${searchQuery}"`
                : 'Select a category or search for icons'
              }
            </div>
          )}
        </ScrollArea>

        {/* Selection bar */}
        {selectedIcon && (
          <div className="p-3 border-t border-border bg-card shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Selected:</span>
                <span className="text-sm font-mono font-medium">{selectedIcon}</span>
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
                  onClick={handleConfirmSelection}
                  className="text-xs gap-1"
                >
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
