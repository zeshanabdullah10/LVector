// components/convert/header-bar.tsx
'use client'

import { HelpCircle, Moon, Sun, Hexagon, Library } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'

interface HeaderBarProps {
  onGoToLibrary?: () => void
}

export function HeaderBar({ onGoToLibrary }: HeaderBarProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header
      className="h-14 px-6 flex items-center justify-between border-b shrink-0"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      {/* Logo & name */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Hexagon className="w-5 h-5" style={{ color: 'var(--color-primary-foreground)' }} />
        </div>
        <span className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>LVector</span>
        <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>EMF Converter</span>
      </div>

      {/* Center nav */}
      {onGoToLibrary && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onGoToLibrary}
          className="text-xs gap-1.5 h-8 px-3"
        >
          <Library className="w-3.5 h-3.5" />
          Icon Library
        </Button>
      )}

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