// components/convert/header-bar.tsx
'use client'

import { HelpCircle, Moon, Sun, Hexagon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function HeaderBar() {
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
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Hexagon className="w-5 h-5" style={{ color: 'var(--color-primary-foreground)' }} />
        </div>
        <span className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>LVector</span>
        <span className="text-xs ml-1" style={{ color: 'var(--color-muted-foreground)' }}>EMF Converter</span>
      </div>

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