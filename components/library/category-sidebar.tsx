// components/library/category-sidebar.tsx
'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/icons/categories'
import type { Category } from '@/lib/icons/categories'

interface CategorySidebarProps {
  activeCategory: Category | null
  activeSubcategory: string | null
  onCategoryChange: (category: Category | null, subcategory: string | null) => void
}

export function CategorySidebar({
  activeCategory,
  activeSubcategory,
  onCategoryChange,
}: CategorySidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<Category>>(
    new Set(Object.keys(CATEGORIES) as Category[])
  )

  const toggleCategory = (cat: Category) => {
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

  const getSubcategoryCount = (cat: Category, sub: string): number => {
    return (CATEGORIES[cat] as unknown as Record<string, readonly string[]>)[sub]?.length || 0
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        {/* All icons option */}
        <button
          onClick={() => onCategoryChange(null, null)}
          className={cn(
            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
            activeCategory === null && activeSubcategory === null
              ? 'bg-primary text-primary-foreground font-medium'
              : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
          )}
        >
          All Icons
        </button>

        {/* Category tree */}
        {(Object.keys(CATEGORIES) as Category[]).map((category) => (
          <div key={category} className="mt-1">
            <button
              onClick={() => {
                if (activeCategory !== category || activeSubcategory !== null) {
                  onCategoryChange(category, null)
                }
                toggleCategory(category)
              }}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                activeCategory === category && activeSubcategory === null
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50 text-muted-foreground'
              )}
            >
              {expandedCategories.has(category)
                ? <ChevronDown className="h-3 w-3 shrink-0" />
                : <ChevronRight className="h-3 w-3 shrink-0" />
              }
              {category}
            </button>

            {expandedCategories.has(category) && (
              <div className="ml-3 mt-0.5">
                {(Object.keys(CATEGORIES[category]) as string[]).map((subcategory) => (
                  <button
                    key={subcategory}
                    onClick={() => onCategoryChange(category, subcategory)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors flex items-center justify-between',
                      activeCategory === category && activeSubcategory === subcategory
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-accent/50 text-muted-foreground'
                    )}
                  >
                    <span>{subcategory}</span>
                    <span className="text-xs text-muted-foreground/50">
                      {getSubcategoryCount(category, subcategory)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
