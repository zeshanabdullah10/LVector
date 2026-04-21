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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none cursor-ew-resize overflow-hidden rounded-lg"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Left (original) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
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
        <div className="absolute top-0 bottom-0 w-0.5 bg-primary" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-6 h-6 rounded-full bg-white border-2 border-primary shadow-lg flex items-center justify-center">
            <div className="w-1 h-4 rounded-full bg-primary" />
          </div>
        </div>
        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
          <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full font-medium">
            {position < 50 ? leftLabel : rightLabel}
          </span>
        </div>
      </div>

      <div className="absolute top-3 left-3 z-10">
        <span className="text-xs bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full text-foreground shadow-sm">
          {leftLabel}
        </span>
      </div>
      <div className="absolute top-3 right-3 z-10">
        <span className="text-xs bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full text-foreground shadow-sm">
          {rightLabel}
        </span>
      </div>
    </div>
  )
}
