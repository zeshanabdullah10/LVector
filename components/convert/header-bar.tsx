// components/convert/header-bar.tsx
'use client'

import { HelpCircle, Moon, Sun, Hexagon, Library, ImagePlus } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type ViewType = 'convert' | 'library'

interface AppHeaderProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

const NAV_ITEMS: { key: ViewType; label: string; icon: typeof ImagePlus }[] = [
  { key: 'convert', label: 'Converter', icon: ImagePlus },
  { key: 'library', label: 'Icon Library', icon: Library },
]

export function AppHeader({ activeView, onViewChange }: AppHeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header
      className="h-12 px-4 flex items-center border-b shrink-0"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Hexagon className="w-4 h-4" style={{ color: 'var(--color-primary-foreground)' }} />
        </div>
        <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--color-foreground)' }}>LVector</span>
      </div>

      {/* Separator */}
      <div className="mx-4 h-5 w-px" style={{ backgroundColor: 'var(--color-border)' }} />

      {/* Nav */}
      <nav className="flex items-center gap-0.5" role="tablist">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeView === key}
              onClick={() => onViewChange(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors',
              )}
              style={{
                backgroundColor: activeView === key ? 'var(--color-muted)' : 'transparent',
                color: activeView === key ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right controls */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md h-9 w-9 transition-colors"
                style={{ color: 'var(--color-muted-foreground)' }}
                aria-label="Help & shortcuts"
              />
            }
          >
            <HelpCircle className="w-4 h-4" />
          </TooltipTrigger>
          <TooltipContent>Help & shortcuts</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md h-9 w-9 transition-colors"
                style={{ color: 'var(--color-muted-foreground)' }}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle theme"
              />
            }
          >
            <span suppressHydrationWarning>
              {theme === 'dark'
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />
              }
            </span>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
