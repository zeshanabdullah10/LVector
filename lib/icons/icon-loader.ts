import type { LucideIcon } from 'lucide-react'

export type IconComponentMap = Record<string, LucideIcon>

let iconsCache: IconComponentMap | null = null
let loadingPromise: Promise<IconComponentMap> | null = null

const NON_ICON_EXPORTS = new Set([
  'default',
  'LucideIcon',
  'createLucideIcon',
  'icons',
  'LucideProvider',
  'useLucideContext',
])

export function loadAllIcons(): Promise<IconComponentMap> {
  if (iconsCache) {
    return Promise.resolve(iconsCache)
  }

  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = import('lucide-react').then((lucideModule) => {
    const icons: IconComponentMap = {}

    for (const [key, value] of Object.entries(lucideModule)) {
      if (NON_ICON_EXPORTS.has(key)) {
        continue
      }

      if (typeof value === 'object' && value !== null) {
        icons[key] = value as unknown as LucideIcon
      }
    }

    iconsCache = icons
    return icons
  })

  return loadingPromise
}

export function getCachedIcons(): IconComponentMap | null {
  return iconsCache
}

export function isIconsLoaded(): boolean {
  return iconsCache !== null
}
