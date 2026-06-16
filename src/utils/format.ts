import { format, parseISO, differenceInDays, differenceInHours } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function formatDateTime(iso?: string, pattern = 'yyyy-MM-dd HH:mm') {
  if (!iso) return '-'
  try {
    return format(parseISO(iso), pattern, { locale: zhCN })
  } catch {
    return iso
  }
}

export function formatDate(iso?: string, pattern = 'yyyy-MM-dd') {
  if (!iso) return '-'
  try {
    return format(parseISO(iso), pattern, { locale: zhCN })
  } catch {
    return iso
  }
}

export function formatTime(iso?: string, pattern = 'HH:mm') {
  if (!iso) return '-'
  try {
    return format(parseISO(iso), pattern, { locale: zhCN })
  } catch {
    return iso
  }
}

export function formatDateCN(iso?: string) {
  if (!iso) return '-'
  try {
    return format(parseISO(iso), 'M月d日 EEEE', { locale: zhCN })
  } catch {
    return iso
  }
}

export function getOverdueDays(expectedReturnTime: string): number {
  try {
    const days = differenceInDays(new Date(), parseISO(expectedReturnTime))
    return days > 0 ? days : 0
  } catch {
    return 0
  }
}

export function isApproachingDeadline(iso: string, hours = 24): boolean {
  try {
    const h = differenceInHours(parseISO(iso), new Date())
    return h > 0 && h <= hours
  } catch {
    return false
  }
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function generateCode(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const num = String(Math.floor(Math.random() * 900) + 100)
  return `${prefix}-${date}-${num}`
}

export function generateBatchNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const num = String(Math.floor(Math.random() * 900) + 100)
  return `DIS-${date}-${num}`
}

export function classNames(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(' ')
}
