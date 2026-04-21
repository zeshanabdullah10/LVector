'use client'

import { useState, useRef, useCallback } from 'react'

interface ComparisonSliderProps {
  leftContent: React.ReactNode
  rightContent: React.ReactNode
  leftLabel?: string
  rightLabel?: string
}

export function ComparisonSlider({
  leftContent,
  rightContent,
  leftLabel = 'Original',
  rightLabel = 'SVG',
}: ComparisonSliderProps) {
  const [position, setPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const pct = Math.min(Math.max((x / rect.width) * 100, 0), 100)
    setPosition(pct)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    updatePosition(e.clientX)

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) updatePosition(e.clientX)
    }

    const handleMouseUp = () => {
      isDragging.current = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [updatePosition])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    isDragging.current = true
    updatePosition(e.touches[0].clientX)

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging.current) updatePosition(e.touches[0].clientX)
    }

    const handleTouchEnd = () => {
      isDragging.current = false
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }

    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
  }, [updatePosition])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setPosition(p => Math.max(0, p - step))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setPosition(p => Math.min(100, p + step))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setPosition(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setPosition(100)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none cursor-ew-resize overflow-hidden rounded-lg"
      style={{ touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-label="Drag to compare original and SVG"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={position}
    >
      {/* Left (original) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--color-muted)', opacity: 0.3 }}>
          {leftContent}
        </div>
      </div>

      {/* Right (SVG) */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {rightContent}
        </div>
      </div>

      {/* Slider line and handle */}
      <div
        className="absolute top-0 bottom-0 z-10"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-0 bottom-0 w-0.5" style={{ backgroundColor: 'var(--color-primary)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="w-6 h-6 rounded-full border-2 shadow-lg flex items-center justify-center"
            style={{
              backgroundColor: 'var(--color-background)',
              borderColor: 'var(--color-primary)',
            }}
          >
            <div className="w-1 h-4 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
          </div>
        </div>
        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
            }}
          >
            {position < 50 ? leftLabel : rightLabel}
          </span>
        </div>
      </div>

      <div className="absolute top-3 left-3 z-10">
        <span
          className="text-xs px-2 py-1 rounded-full shadow-sm"
          style={{
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-foreground)',
            opacity: 0.9,
          }}
        >
          {leftLabel}
        </span>
      </div>
      <div className="absolute top-3 right-3 z-10">
        <span
          className="text-xs px-2 py-1 rounded-full shadow-sm"
          style={{
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-foreground)',
            opacity: 0.9,
          }}
        >
          {rightLabel}
        </span>
      </div>
    </div>
  )
}