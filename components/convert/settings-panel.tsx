// components/convert/settings-panel.tsx
'use client'

import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import type { ConversionSettings } from '@/lib/conversion/types'

interface SettingsPanelProps {
  settings: ConversionSettings
  onSettingChange: <K extends keyof ConversionSettings>(
    key: K,
    value: ConversionSettings[K]
  ) => void
}

const PRESETS = [
  { value: 'default', label: 'Default' },
  { value: 'posterized1', label: 'Posterized 1' },
  { value: 'posterized2', label: 'Posterized 2' },
  { value: 'curvy', label: 'Curvy' },
  { value: 'sharp', label: 'Sharp' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'smoothed', label: 'Smoothed' },
  { value: 'grayscale', label: 'Grayscale' },
  { value: 'artistic1', label: 'Artistic 1' },
  { value: 'artistic2', label: 'Artistic 2' },
  { value: 'artistic3', label: 'Artistic 3' },
  { value: 'artistic4', label: 'Artistic 4' },
  { value: 'randomsampling1', label: 'Random 1' },
  { value: 'randomsampling2', label: 'Random 2' },
  { value: 'fixedpalette', label: 'Fixed' },
  { value: 'custom', label: 'Custom' },
]

type TabValue = 'presets' | 'colors' | 'shape' | 'output'

function SettingRow({
  label,
  id,
  min,
  max,
  step,
  value,
  onChange,
  format,
}: {
  label: string
  id: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <label className="text-xs font-medium w-28 shrink-0" htmlFor={id} style={{ color: 'var(--color-muted-foreground)' }}>
        {label}
      </label>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        className="flex-1"
        aria-label={label}
      />
      <span className="text-xs font-mono w-10 text-right shrink-0" style={{ color: 'var(--color-foreground)' }}>
        {format ? format(value) : value}
      </span>
    </div>
  )
}

export function SettingsPanel({ settings, onSettingChange }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('colors')

  const tabs: { value: TabValue; label: string }[] = [
    { value: 'presets', label: 'Presets' },
    { value: 'colors', label: 'Colors' },
    { value: 'shape', label: 'Shape' },
    { value: 'output', label: 'Output' },
  ]

  return (
    <div className="border-t px-6 py-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {/* Tab buttons */}
      <div className="flex gap-1 p-0.5 rounded-lg w-fit mb-4" style={{ backgroundColor: 'var(--color-muted)' }}>
        {tabs.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className="text-xs px-4 py-1.5 h-8 rounded-full transition-all duration-150"
            style={
              activeTab === tab.value
                ? { backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                : { backgroundColor: 'var(--color-background)', color: 'var(--color-muted-foreground)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'presets' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => onSettingChange('preset', p.value)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
                style={
                  settings.preset === p.value
                    ? { backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }
                    : { backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'colors' && (
        <div className="space-y-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
            <SettingRow label="Number of colors" id="numberofcolors" min={2} max={64} step={1} value={settings.numberofcolors} onChange={(v) => onSettingChange('numberofcolors', v)} />
            <SettingRow label="Color sampling" id="colorsampling" min={0} max={2} step={1} value={settings.colorsampling} onChange={(v) => onSettingChange('colorsampling', v)} />
            <SettingRow label="Color quant cycles" id="colorquantcycles" min={1} max={10} step={1} value={settings.colorquantcycles} onChange={(v) => onSettingChange('colorquantcycles', v)} />
            <SettingRow label="Min color ratio" id="mincolorratio" min={0} max={1} step={0.05} value={settings.mincolorratio} onChange={(v) => onSettingChange('mincolorratio', v)} format={(v) => v.toFixed(2)} />
          </div>
        </div>
      )}

      {activeTab === 'shape' && (
        <div className="space-y-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
            <SettingRow label="Line threshold" id="ltres" min={0.1} max={10} step={0.1} value={settings.ltres} onChange={(v) => onSettingChange('ltres', v)} format={(v) => v.toFixed(1)} />
            <SettingRow label="Curve threshold" id="qtres" min={0.1} max={10} step={0.1} value={settings.qtres} onChange={(v) => onSettingChange('qtres', v)} format={(v) => v.toFixed(1)} />
            <SettingRow label="Blur radius" id="blurradius" min={0} max={5} step={0.5} value={settings.blurradius} onChange={(v) => onSettingChange('blurradius', v)} format={(v) => v.toFixed(1)} />
            <SettingRow label="Blur delta" id="blurdelta" min={0} max={256} step={1} value={settings.blurdelta} onChange={(v) => onSettingChange('blurdelta', v)} />
            <SettingRow label="Path omit" id="pathomit" min={0} max={100} step={1} value={settings.pathomit} onChange={(v) => onSettingChange('pathomit', v)} />
            <div className="flex items-center gap-3 py-1.5">
              <label className="text-xs font-medium w-28 shrink-0" htmlFor="linefilter" style={{ color: 'var(--color-muted-foreground)' }}>
                Line filter
              </label>
              <Checkbox
                id="linefilter"
                checked={settings.linefilter}
                onCheckedChange={(v) => onSettingChange('linefilter', Boolean(v))}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'output' && (
        <div className="space-y-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
            <SettingRow label="Stroke width" id="strokewidth" min={0} max={10} step={0.5} value={settings.strokewidth} onChange={(v) => onSettingChange('strokewidth', v)} format={(v) => v.toFixed(1)} />
            <SettingRow label="Round coords" id="roundcoords" min={0} max={10} step={0.5} value={settings.roundcoords} onChange={(v) => onSettingChange('roundcoords', v)} format={(v) => v.toFixed(1)} />
            <SettingRow label="Scale" id="scale" min={0.1} max={10} step={0.1} value={settings.scale} onChange={(v) => onSettingChange('scale', v)} format={(v) => v.toFixed(1)} />
            <SettingRow label="Layering" id="layering" min={0} max={2} step={1} value={settings.layering} onChange={(v) => onSettingChange('layering', v)} />
            <div className="flex items-center gap-3 py-1.5">
              <label className="text-xs font-medium w-28 shrink-0" htmlFor="viewbox" style={{ color: 'var(--color-muted-foreground)' }}>
                Viewbox
              </label>
              <Checkbox
                id="viewbox"
                checked={settings.viewbox}
                onCheckedChange={(v) => onSettingChange('viewbox', Boolean(v))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}