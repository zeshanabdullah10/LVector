// components/convert/header-bar.tsx
'use client'

import { HelpCircle, Moon, Sun, Hexagon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function HeaderBar() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-surface shrink-0">
      {/* Logo & name */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Hexagon className="w-5 h-5 text-white" />
        </div>
        <span className="text-base font-semibold text-foreground">LVector</span>
        <span className="text-xs text-muted-foreground ml-1">EMF Converter</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md h-9 w-9 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Help & shortcuts"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Help & shortcuts</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md h-9 w-9 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              <span suppressHydrationWarning>
                {theme === 'dark'
                  ? <Sun className="w-4 h-4" />
                  : <Moon className="w-4 h-4" />
                }
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}