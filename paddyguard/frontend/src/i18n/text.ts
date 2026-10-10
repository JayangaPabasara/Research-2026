import i18n from './index'
import { sourceKeys } from './ui'
import { enhancementSourceKeys } from './enhancements'
export function uiText(value: string): string {
  const source = value.trim().replace(/\s+/g, ' ')
  const enhancementKey = enhancementSourceKeys[source]
  if (enhancementKey) return String(i18n.t(enhancementKey))
  const key = sourceKeys[source]
  return key ? String(i18n.t(`ui.${key}`)) : value
}
