'use client'

import { Icon } from '@iconify/react'

interface IconRendererProps {
  iconId: string
  iconComponents: Record<string, React.ComponentType<{ size?: number; className?: string }>>
  className?: string
}

export function IconRenderer({ iconId, iconComponents, className }: IconRendererProps) {
  if (iconId.includes(':')) {
    return <Icon icon={iconId} width={24} height={24} className={className} />
  }

  const LucideIcon = iconComponents[iconId]
  if (!LucideIcon) {
    return <div className="w-6 h-6 rounded bg-muted animate-pulse" />
  }

  return <LucideIcon size={24} className={className} />
}
