import clsx from 'clsx'
import { Package } from 'lucide-react'
import {
  suppliesStatusMap,
  classStatusMap,
  registrationStatusMap,
  reservationStatusMap,
  returnConditionMap,
  sterilizationStatusMap,
  SuppliesStatus,
  ClassStatus,
  RegistrationStatus,
  ReservationStatus,
  ReturnCondition,
  SterilizationStatus,
} from '../types'

export function SuppliesStatusBadge({ status }: { status: SuppliesStatus }) {
  const label = suppliesStatusMap[status]
  const styles: Record<SuppliesStatus, string> = {
    available: 'bg-emerald-100 text-emerald-700',
    in_use: 'bg-blue-100 text-blue-700',
    sterilizing: 'bg-purple-100 text-purple-700',
    maintenance: 'bg-orange-100 text-orange-700',
    reserved: 'bg-amber-100 text-amber-700',
  }
  return <span className={clsx('badge', styles[status])}>{label}</span>
}

export function ClassStatusBadge({ status }: { status: ClassStatus }) {
  const label = classStatusMap[status]
  const styles: Record<ClassStatus, string> = {
    draft: 'bg-gray-100 text-gray-600',
    published: 'bg-indigo-100 text-indigo-700',
    open: 'bg-emerald-100 text-emerald-700',
    ongoing: 'bg-blue-100 text-blue-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
  }
  return <span className={clsx('badge', styles[status])}>{label}</span>
}

export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  const label = registrationStatusMap[status]
  const styles: Record<RegistrationStatus, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    attended: 'bg-blue-100 text-blue-700',
    absent: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-gray-100 text-gray-500',
  }
  return <span className={clsx('badge', styles[status])}>{label}</span>
}

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const label = reservationStatusMap[status]
  const styles: Record<ReservationStatus, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    picked_up: 'bg-blue-100 text-blue-700',
    returned: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-gray-100 text-gray-500',
    waitlisted: 'bg-purple-100 text-purple-700',
    replaced: 'bg-indigo-100 text-indigo-700',
  }
  return <span className={clsx('badge', styles[status])}>{label}</span>
}

export function ReturnConditionBadge({ condition }: { condition: ReturnCondition }) {
  const label = returnConditionMap[condition]
  const styles: Record<ReturnCondition, string> = {
    good: 'bg-emerald-100 text-emerald-700',
    damaged_minor: 'bg-amber-100 text-amber-700',
    damaged_major: 'bg-orange-100 text-orange-700',
    lost: 'bg-red-100 text-red-700',
  }
  return <span className={clsx('badge', styles[condition])}>{label}</span>
}

export function SterilizationStatusBadge({ status }: { status: SterilizationStatus }) {
  const label = sterilizationStatusMap[status]
  const styles: Record<SterilizationStatus, string> = {
    pending: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
  }
  return <span className={clsx('badge', styles[status])}>{label}</span>
}

export function OverdueBadge({ overdueDays, isFrozen }: { overdueDays: number; isFrozen: boolean }) {
  if (isFrozen) {
    return <span className="badge bg-red-600 text-white animate-pulse">🔒 已冻结</span>
  }
  if (overdueDays > 0) {
    return <span className="badge bg-red-100 text-red-700 border border-red-300">逾期 {overdueDays} 天</span>
  }
  return null
}

export function StatCard({
  label,
  value,
  icon,
  color = 'primary',
  trend,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  trend?: { value: string; up: boolean }
}) {
  const colorMap = {
    primary: 'from-primary-500 to-primary-600',
    success: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
    danger: 'from-red-500 to-red-600',
    info: 'from-blue-500 to-blue-600',
  }
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="card-body flex items-start gap-4">
        <div className={clsx('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm', colorMap[color])}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-500">{label}</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
          {trend && (
            <div className={clsx('text-xs mt-1 font-medium', trend.up ? 'text-emerald-600' : 'text-red-600')}>
              {trend.up ? '↑' : '↓'} {trend.value}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function Steps({
  steps,
  current,
}: {
  steps: { label: string; description?: string }[]
  current: number
}) {
  return (
    <div className="flex items-start">
      {steps.map((step, idx) => (
        <div key={idx} className="step-item">
          {idx < steps.length - 1 && (
            <div
              className={clsx(
                'step-line',
                idx < current ? 'bg-primary-500' : 'bg-gray-200'
              )}
              style={{ right: '-50%', width: '100%' }}
            />
          )}
          <div
            className={clsx(
              'step-circle',
              idx < current
                ? 'bg-emerald-500'
                : idx === current
                ? 'bg-primary-500 ring-4 ring-primary-100'
                : 'bg-gray-300'
            )}
          >
            {idx < current ? '✓' : idx + 1}
          </div>
          <div className="mt-3 text-center px-2">
            <div
              className={clsx(
                'text-sm font-medium',
                idx <= current ? 'text-gray-900' : 'text-gray-400'
              )}
            >
              {step.label}
            </div>
            {step.description && (
              <div className="text-xs text-gray-500 mt-1">{step.description}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
        {icon || <Package size={36} />}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-2 max-w-md">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
