import i18n from './index'
import { sourceKeys } from './ui'
export function uiText(value: string): string { const key = sourceKeys[value.trim().replace(/\s+/g, ' ')]; return key ? String(i18n.t(`ui.${key}`)) : value }
