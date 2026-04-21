// components/library/icon-grid.tsx
'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CATEGORIES, getAllIconNames } from '@/lib/icons/categories'
import { LUCIDE_MAP } from '@/lib/icons/lucide'
import type { LucideIconName } from '@/lib/icons/lucide'

interface IconGridProps {
  icons: string[]
  onSelect: (iconName: string) => void
  selectedIcon?: string
}

export function IconGrid({ icons, onSelect, selectedIcon }: IconGridProps) {
  return (
    <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-1 p-2">
      {icons.map((iconName) => {
        const LucideIcon = LUCIDE_MAP[iconName as LucideIconName]
        if (!LucideIcon) return null

        return (
          <button
            key={iconName}
            onClick={() => onSelect(iconName)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 p-2 rounded-md border transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/50',
              'aspect-square w-full',
              selectedIcon === iconName
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-transparent text-muted-foreground'
            )}
            title={iconName}
            aria-label={`Select icon: ${iconName}`}
          >
            <LucideIcon className="h-5 w-5 shrink-0" />
            <span className="text-[9px] truncate w-full text-center leading-none">
              {iconName}
            </span>
          </button>
        )
      })}
    </div>
  )
}
