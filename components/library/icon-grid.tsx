'use client'

import { cn } from '@/lib/utils'
import { IconRenderer } from './icon-renderer'

interface IconGridProps {
  icons: string[]
  iconComponents: Record<string, React.ComponentType<{ className?: string; size?: number }>>
  onSelect: (iconName: string) => void
  selectedIcon?: string
}

export function IconGrid({ icons, iconComponents, onSelect, selectedIcon }: IconGridProps) {
  return (
    <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-1 p-2">
      {icons.map((iconName) => {
        const isSelected = selectedIcon === iconName

        return (
          <button
            key={iconName}
            onClick={() => onSelect(iconName)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 p-2 rounded-md transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/50',
              isSelected
                ? 'ring-2 ring-primary bg-primary/10 text-primary'
                : 'text-muted-foreground'
            )}
            title={iconName}
            aria-label={`Select icon: ${iconName}`}
          >
            <IconRenderer iconId={iconName} iconComponents={iconComponents} className="shrink-0" />
            <span className="text-[9px] truncate w-full text-center leading-none">
              {iconName.includes(':') ? iconName.split(':')[1] : iconName}
            </span>
          </button>
        )
      })}
    </div>
  )
}
