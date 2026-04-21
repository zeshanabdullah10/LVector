// components/convert/action-bar.tsx
'use client'

import { Upload, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ActionState = 'idle' | 'converting' | 'ready'

interface ActionBarProps {
  actionState: ActionState
  onUpload: () => void
  onExportEMF: () => void
  onReset: () => void
}

const BUTTON_CONFIG: Record<ActionState, {
  label: string
  icon: React.ReactNode
  variant: 'default' | 'outline' | 'secondary' | 'destructive'
  className?: string
}> = {
  idle: {
    label: 'Upload Image',
    icon: <Upload className="w-4 h-4" />,
    variant: 'outline',
  },
  converting: {
    label: 'Converting...',
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    variant: 'default',
    className: 'opacity-80',
  },
  ready: {
    label: 'Export EMF',
    icon: <Download className="w-4 h-4" />,
    variant: 'default',
    className: 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700',
  },
}

export function ActionBar({ actionState, onUpload, onExportEMF, onReset }: ActionBarProps) {
  const config = BUTTON_CONFIG[actionState]

  const handleClick = () => {
    switch (actionState) {
      case 'idle': onUpload(); break
      case 'converting': break
      case 'ready': onExportEMF(); break
    }
  }

  return (
    <div className="h-20 flex items-center justify-center px-6">
      <Button
        onClick={handleClick}
        variant={actionState === 'idle' ? 'outline' : config.variant}
        size="lg"
        disabled={actionState === 'converting'}
        className={cn(
          'h-12 px-8 text-[15px] font-semibold gap-2 rounded-[10px]',
          'transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
          'shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
          config.className
        )}
      >
        {config.icon}
        {config.label}
      </Button>
    </div>
  )
}