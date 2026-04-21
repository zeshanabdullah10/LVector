// hooks/use-settings.ts
'use client'

import { useState, useCallback } from 'react'
import type { ConversionSettings } from '@/lib/conversion/types'

const DEFAULT_SETTINGS: ConversionSettings = {
  preset: 'default',
  numberofcolors: 16,
  colorsampling: 2,
  colorquantcycles: 3,
  mincolorratio: 0,
  ltres: 1,
  qtres: 1,
  blurradius: 0,
  blurdelta: 20,
  pathomit: 8,
  linefilter: false,
  scale: 1,
  strokewidth: 1,
  roundcoords: 1,
  layering: 0,
  viewbox: false,
}

export function useSettings() {
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS)

  const updateSetting = useCallback(<K extends keyof ConversionSettings>(
    key: K,
    value: ConversionSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  return { settings, updateSetting, resetSettings }
}