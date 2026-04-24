'use client'

import { useState, useMemo, useCallback, useEffect, useDeferredValue, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Search, X, Send, Loader2 } from 'lucide-react'
import { Icon } from '@iconify/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CategorySidebar } from './category-sidebar'
import { IconGrid } from './icon-grid'
import { CATEGORIES, getAllIconNames } from '@/lib/icons/categories'
import { getIconifyIconNames, getIconifyCategories } from '@/lib/icons/iconify-categories'
import { loadAllIcons } from '@/lib/icons/icon-loader'
import type { IconComponentMap } from '@/lib/icons/icon-loader'

interface LibraryViewProps {
  onUseIcon: (svgString: string) => void
}

const ALL_ICONIFY_NAMES = getIconifyIconNames()
const ALL_LUCIDE_NAMES = getAllIconNames()
const TOTAL_ICONS = ALL_LUCIDE_NAMES.length + ALL_ICONIFY_NAMES.length

export function LibraryView({ onUseIcon }: LibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const deferredQuery = useDeferredValue(searchQuery)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null)
  const [activeSet, setActiveSet] = useState<string | null>(null)
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
  const [iconComponents, setIconComponents] = useState<IconComponentMap>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAllIcons().then((icons) => {
      setIconComponents(icons)
      setIsLoading(false)
    })
  }, [])

  const handleCategoryChange = useCallback((cat: string | null, sub: string | null, set: string | null) => {
    setActiveCategory(cat)
    setActiveSubcategory(sub)
    setActiveSet(set)
  }, [])

  const filteredIcons = useMemo(() => {
    const q = deferredQuery.toLowerCase()

    if (q.trim()) {
      const lucideMatches = ALL_LUCIDE_NAMES.filter(name => name.toLowerCase().includes(q))
      const iconifyMatches = ALL_ICONIFY_NAMES.filter(name => {
        const shortName = name.split(':')[1] || name
        return shortName.toLowerCase().includes(q) || name.toLowerCase().includes(q)
      })
      return [...lucideMatches, ...iconifyMatches]
    }

    if (activeSet === null) {
      return [...ALL_LUCIDE_NAMES, ...ALL_ICONIFY_NAMES]
    }

    if (activeSet === 'lucide') {
      if (activeSubcategory && activeCategory) {
        return CATEGORIES[activeCategory]?.[activeSubcategory] || []
      }
      if (activeCategory) {
        const subcats = CATEGORIES[activeCategory]
        if (subcats) {
          const seen = new Set<string>()
          const icons: string[] = []
          for (const subIcons of Object.values(subcats)) {
            for (const name of subIcons) {
              if (!seen.has(name)) {
                seen.add(name)
                icons.push(name)
              }
            }
          }
          return icons.sort()
        }
      }
      return ALL_LUCIDE_NAMES
    }

    const cats = getIconifyCategories(activeSet)
    if (activeCategory) {
      return cats[activeCategory] || []
    }
    return ALL_ICONIFY_NAMES.filter(n => n.startsWith(activeSet + ':'))

  }, [deferredQuery, activeCategory, activeSubcategory, activeSet])

  const handleUseIcon = useCallback(async () => {
    if (!selectedIcon) return

    const container = document.createElement('div')
    container.style.cssText = 'position:absolute;visibility:hidden;width:48px;height:48px;'
    document.body.appendChild(container)

    const root = createRoot(container)

    if (selectedIcon.includes(':')) {
      root.render(<Icon icon={selectedIcon} width={48} height={48} />)
    } else {
      const LucideIcon = iconComponents[selectedIcon]
      if (!LucideIcon) { root.unmount(); document.body.removeChild(container); return }
      root.render(<LucideIcon size={48} />)
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve()
        })
      })
    })

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
  }, [selectedIcon, onUseIcon, iconComponents])

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-56 border-r shrink-0" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <CategorySidebar
          activeCategory={activeCategory}
          activeSubcategory={activeSubcategory}
          activeSet={activeSet}
          onCategoryChange={handleCategoryChange}
        />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4" style={{ color: 'var(--color-muted-foreground)' }} />
            <Input
              type="text"
              placeholder={`Search ${TOTAL_ICONS.toLocaleString()} icons...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9"
              aria-label="Search icons"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3"
                style={{ color: 'var(--color-muted-foreground)' }}
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="mt-1.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            {filteredIcons.length.toLocaleString()} icon{filteredIcons.length !== 1 ? 's' : ''}
            {deferredQuery !== searchQuery && ' (searching...)'}
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoading && (activeSet === null || activeSet === 'lucide') ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-muted-foreground)' }} />
              <span className="ml-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Loading icons...</span>
            </div>
          ) : filteredIcons.length > 0 ? (
            <IconGrid
              icons={filteredIcons}
              iconComponents={iconComponents}
              onSelect={setSelectedIcon}
              selectedIcon={selectedIcon || undefined}
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              {deferredQuery ? `No icons found for "${deferredQuery}"` : 'Select a category or search for icons'}
            </div>
          )}
        </ScrollArea>

        {selectedIcon && (
          <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Selected:</span>
                <span className="text-sm font-mono font-medium" style={{ color: 'var(--color-foreground)' }}>{selectedIcon}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedIcon(null)} className="text-xs">
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
