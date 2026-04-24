import iconifyRaw from './iconify-data.json'

interface IconifySetData {
  prefix: string
  names: string[]
  categories: Record<string, string[]>
}

const iconifyData = iconifyRaw as Record<string, IconifySetData>

export interface IconSet {
  id: string
  label: string
  iconCount: number
  categories: Record<string, string[]>
}

export const ICONIFY_SETS: IconSet[] = Object.entries(iconifyData).map(([key, data]) => ({
  id: key,
  label: key === 'mdi' ? 'Material Design' : key === 'tabler' ? 'Tabler' : key.charAt(0).toUpperCase() + key.slice(1),
  iconCount: data.names.length,
  categories: data.categories,
}))

export function getIconifyIconNames(): string[] {
  const names: string[] = []
  for (const set of Object.values(iconifyData)) {
    names.push(...set.names)
  }
  return names.sort()
}

export function getIconifySetNames(): string[] {
  return ICONIFY_SETS.map(s => s.id)
}

export function getIconifyCategories(setId: string): Record<string, string[]> {
  return iconifyData[setId]?.categories || {}
}
