// components/convert/stats-bar.tsx
'use client'

interface StatsBarProps {
  pathCount?: number
  fileSize?: string
  colorCount?: number
}

export function StatsBar({ pathCount, fileSize, colorCount }: StatsBarProps) {
  const hasStats = pathCount !== undefined || fileSize || colorCount

  if (!hasStats) return null

  const parts: string[] = []
  if (pathCount !== undefined) parts.push(`${pathCount} paths`)
  if (fileSize) parts.push(`${fileSize} SVG`)
  if (colorCount !== undefined) parts.push(`${colorCount} colors`)

  return (
    <div className="h-12 flex items-center justify-center">
      <p className="text-xs font-mono tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>
        {parts.join(' · ')}
      </p>
    </div>
  )
}