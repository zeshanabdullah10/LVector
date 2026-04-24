'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/icons/categories'
import { ICONIFY_SETS, getIconifyCategories } from '@/lib/icons/iconify-categories'

interface CategorySidebarProps {
  activeCategory: string | null
  activeSubcategory: string | null
  activeSet: string | null
  onCategoryChange: (category: string | null, subcategory: string | null, set: string | null) => void
}

function getCategoryCount(catKey: string): number {
  const subcats = CATEGORIES[catKey]
  if (!subcats) return 0
  let total = 0
  for (const icons of Object.values(subcats)) {
    total += icons.length
  }
  return total
}

function getTotalLucideCount(): number {
  let total = 0
  for (const catKey of Object.keys(CATEGORIES)) {
    total += getCategoryCount(catKey)
  }
  return total
}

function getTotalCount(): number {
  let total = getTotalLucideCount()
  for (const set of ICONIFY_SETS) {
    total += set.iconCount
  }
  return total
}

export function CategorySidebar({
  activeCategory,
  activeSubcategory,
  activeSet,
  onCategoryChange,
}: CategorySidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  const totalCount = getTotalCount()
  const lucideCount = getTotalLucideCount()

  return (
    <div className="h-full overflow-y-auto p-2">
      <button
        onClick={() => onCategoryChange(null, null, null)}
        className={cn(
          'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
          activeCategory === null && activeSet === null
            ? 'bg-primary text-primary-foreground font-medium'
            : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
        )}
      >
        <span>All Icons</span>
        <span className="ml-2 text-xs opacity-60">{totalCount.toLocaleString()}</span>
      </button>

      <div className="mt-3 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
        Lucide ({lucideCount.toLocaleString()})
      </div>
      {Object.keys(CATEGORIES).map((category) => {
        const subcats = CATEGORIES[category]
        const catCount = getCategoryCount(category)
        const isExpanded = expandedCategories.has(category)
        const isActive = activeSet === 'lucide' && activeCategory === category

        return (
          <div key={category} className="mt-0.5">
            <button
              onClick={() => {
                if (!isActive || activeSubcategory !== null) {
                  onCategoryChange(category, null, 'lucide')
                }
                toggleCategory(category)
              }}
              className={cn(
                'w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2',
                isActive && activeSubcategory === null
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50 text-muted-foreground'
              )}
            >
              {isExpanded
                ? <ChevronDown className="h-3 w-3 shrink-0" />
                : <ChevronRight className="h-3 w-3 shrink-0" />
              }
              <span className="flex-1 truncate">{category}</span>
              <span className="text-xs text-muted-foreground/50">{catCount}</span>
            </button>

            {isExpanded && subcats && (
              <div className="ml-3 mt-0.5">
                {Object.entries(subcats).map(([subcategory, icons]) => (
                  <button
                    key={subcategory}
                    onClick={() => onCategoryChange(category, subcategory, 'lucide')}
                    className={cn(
                      'w-full text-left px-3 py-1 rounded-md text-xs transition-colors flex items-center justify-between',
                      activeSet === 'lucide' && activeCategory === category && activeSubcategory === subcategory
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-accent/50 text-muted-foreground'
                    )}
                  >
                    <span className="truncate">{subcategory}</span>
                    <span className="text-xs text-muted-foreground/50 ml-1">{icons.length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {ICONIFY_SETS.map((set) => {
        const setKey = 'iconify-' + set.id
        const isExpanded = expandedCategories.has(setKey)
        const isActive = activeSet === set.id
        const cats = getIconifyCategories(set.id)
        const catEntries = Object.entries(cats).slice(0, 50)

        return (
          <div key={set.id}>
            <div className="mt-3 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              {set.label} ({set.iconCount.toLocaleString()})
            </div>
            <button
              onClick={() => {
                if (!isActive || activeCategory !== null) {
                  onCategoryChange(null, null, set.id)
                }
                toggleCategory(setKey)
              }}
              className={cn(
                'w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2',
                isActive && activeCategory === null
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50 text-muted-foreground'
              )}
            >
              {isExpanded
                ? <ChevronDown className="h-3 w-3 shrink-0" />
                : <ChevronRight className="h-3 w-3 shrink-0" />
              }
              <span className="flex-1 truncate">All {set.label}</span>
              <span className="text-xs text-muted-foreground/50">{set.iconCount.toLocaleString()}</span>
            </button>

            {isExpanded && (
              <div className="ml-3 mt-0.5">
                {catEntries.map(([cat, icons]) => (
                  <button
                    key={cat}
                    onClick={() => onCategoryChange(cat, null, set.id)}
                    className={cn(
                      'w-full text-left px-3 py-1 rounded-md text-xs transition-colors flex items-center justify-between',
                      activeSet === set.id && activeCategory === cat
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-accent/50 text-muted-foreground'
                    )}
                  >
                    <span className="truncate">{cat}</span>
                    <span className="text-xs text-muted-foreground/50 ml-1">{icons.length}</span>
                  </button>
                ))}
                {Object.keys(cats).length > 50 && (
                  <div className="px-3 py-1 text-xs text-muted-foreground/40">
                    +{Object.keys(cats).length - 50} more categories (use search)
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
