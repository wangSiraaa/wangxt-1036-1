import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { StatCard } from '../components/ui'
import {
  Clock,
  Package,
  AlertTriangle,
  RefreshCcw,
  CalendarDays,
  User,
  BookOpen,
  Lock,
  Search,
  Filter,
  ChevronRight,
} from 'lucide-react'
import {
  SuppliesOccupancy,
  occupancyTypeMap,
  Supplies,
  suppliesStatusMap,
  suppliesCategoryMap,
} from '../types'
import clsx from 'clsx'
import { formatDateTime, formatDate, formatDateCN } from '../utils/format'
import { addDays, parseISO, differenceInHours, differenceInMinutes, isSameDay } from 'date-fns'

const typeColorMap: Record<string, { bg: string; text: string; border: string; dot: string; icon: React.ReactNode }> = {
  reservation: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', icon: <BookOpen size={12} /> },
  pickup: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', icon: <User size={12} /> },
  sterilization: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500', icon: <RefreshCcw size={12} /> },
  inspection: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', icon: <AlertTriangle size={12} /> },
  maintenance: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', icon: <Lock size={12} /> },
  replacement_wait: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', icon: <AlertTriangle size={12} /> },
}

export default function TurnoverPlan() {
  const { supplies, buildOccupancies, classes, inspectionRecords, reservations } = useAppStore()
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedSuppliesId, setSelectedSuppliesId] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')

  const occupancies = useMemo(() => buildOccupancies(), [buildOccupancies])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = addDays(today, 1)
  const dayAfter = addDays(today, 2)

  const stats = useMemo(() => {
    const total = occupancies.length
    const locked = occupancies.filter(
      (o) => o.type === 'inspection' || o.type === 'maintenance' || o.type === 'sterilization'
    ).length
    const waiting = occupancies.filter((o) => o.type === 'replacement_wait').length
    const uniqueSupplies = new Set(occupancies.map((o) => o.suppliesId)).size
    return { total, locked, waiting, uniqueSupplies }
  }, [occupancies])

  const categories = useMemo(() => {
    return [...new Set(supplies.map((s) => s.category))]
  }, [supplies])

  const filteredSupplies = useMemo(() => {
    return supplies.filter((s) => {
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (searchText) {
        const t = searchText.toLowerCase()
        return s.name.toLowerCase().includes(t) || s.code.toLowerCase().includes(t)
      }
      return true
    })
  }, [supplies, categoryFilter, statusFilter, searchText])

  const getSuppliesOccupancies = (sid: string) =>
    occupancies.filter(
      (o) =>
        o.suppliesId === sid ||
        (o.type === 'replacement_wait' && o.replacementForReservationId)
    )

  const selectedSupplies = supplies.find((s) => s.id === selectedSuppliesId)
  const selectedOccs = selectedSuppliesId
    ? occupancies
        .filter(
          (o) =>
            o.suppliesId === selectedSuppliesId ||
            (o.suppliesId.includes(selectedSuppliesId) && o.type === 'replacement_wait')
        )
        .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime())
    : []

  const groupedByDay = useMemo(() => {
    if (!selectedSuppliesId) return { today: [], tomorrow: [], later: [] }
    const result = {
      today: [] as SuppliesOccupancy[],
      tomorrow: [] as SuppliesOccupancy[],
      later: [] as SuppliesOccupancy[],
    }
    selectedOccs.forEach((occ) => {
      const d = parseISO(occ.startTime)
      if (isSameDay(d, today) || isSameDay(parseISO(occ.endTime), today)) result.today.push(occ)
      else if (isSameDay(d, tomorrow) || isSameDay(parseISO(occ.endTime), tomorrow)) result.tomorrow.push(occ)
      else result.later.push(occ)
    })
    return result
  }, [selectedOccs, selectedSuppliesId, today, tomorrow])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="text-primary-500" />
            用品周转计划
          </h1>
          <p className="text-sm text-gray-500 mt-1">查看未来两天用品的预占、锁定和待替换情况</p>
        </div>
        <div className="flex gap-2 text-xs text-gray-500 items-center">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>预约</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>使用中</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span>消毒</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>待复检</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span>维修</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span>等替换</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="未来2天总预占" value={stats.total} icon={<Clock size={20} />} color="info" />
        <StatCard label="锁定用品数" value={stats.locked} icon={<Lock size={20} />} color="warning" />
        <StatCard label="等待替换" value={stats.waiting} icon={<AlertTriangle size={20} />} color="danger" />
        <StatCard label="涉及用品数" value={stats.uniqueSupplies} icon={<Package size={20} />} color="primary" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package size={16} className="text-primary-500" />
                用品清单
              </h3>
              <span className="text-xs text-gray-500">{filteredSupplies.length} 件</span>
            </div>
            <div className="card-body space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索用品名称或编号..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={clsx(
                    'px-2.5 py-1 text-xs rounded-full border transition-colors',
                    categoryFilter === 'all'
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  )}
                >
                  全部
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={clsx(
                      'px-2.5 py-1 text-xs rounded-full border transition-colors',
                      categoryFilter === cat
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    )}
                  >
                    {suppliesCategoryMap[cat] || cat}
                  </button>
                ))}
              </div>

              <div className="max-h-[600px] overflow-y-auto -mx-5 -mb-5 px-5 pb-5 space-y-1.5">
                {filteredSupplies.map((s) => {
                  const occs = getSuppliesOccupancies(s.id)
                  const hasLock = occs.some((o) => o.type === 'inspection' || o.type === 'maintenance')
                  const hasWait = occs.some((o) => o.type === 'replacement_wait')
                  const isSelected = selectedSuppliesId === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSuppliesId(isSelected ? null : s.id)}
                      className={clsx(
                        'w-full text-left px-3 py-2.5 rounded-lg border transition-all',
                        isSelected
                          ? 'bg-primary-50 border-primary-300 ring-2 ring-primary-100'
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">{s.name}</span>
                            {hasLock && (
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                            )}
                            {hasWait && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">{s.code}</span>
                            <span
                              className={clsx(
                                'text-xs px-1.5 py-0.5 rounded-full',
                                s.status === 'available' && 'bg-emerald-100 text-emerald-700',
                                s.status === 'in_use' && 'bg-blue-100 text-blue-700',
                                s.status === 'sterilizing' && 'bg-purple-100 text-purple-700',
                                s.status === 'maintenance' && 'bg-orange-100 text-orange-700',
                                s.status === 'reserved' && 'bg-amber-100 text-amber-700',
                                s.status === 'pending_inspection' && 'bg-amber-100 text-amber-800 border border-amber-200'
                              )}
                            >
                              {suppliesStatusMap[s.status]}
                            </span>
                          </div>
                          {occs.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                              <Clock size={11} />
                              未来 {occs.length} 项占用
                            </div>
                          )}
                          {s.ageMinMonths !== undefined && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              适用 {s.ageMinMonths}~{s.ageMaxMonths} 月龄
                            </div>
                          )}
                        </div>
                        <ChevronRight
                          size={16}
                          className={clsx(
                            'text-gray-400 mt-1 transition-transform shrink-0',
                            isSelected && 'rotate-90 text-primary-500'
                          )}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          {!selectedSupplies ? (
            <div className="card h-full flex items-center justify-center">
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary-50 flex items-center justify-center mb-4">
                  <CalendarDays size={32} className="text-primary-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">选择用品查看周转计划</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  从左侧选择一件用品，查看它在未来两天内的课堂预约、消毒、复检、维修等占用情况
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="card">
                <div className="card-header flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{selectedSupplies.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>编号：{selectedSupplies.code}</span>
                      <span>类别：{suppliesCategoryMap[selectedSupplies.category] || selectedSupplies.category}</span>
                      {selectedSupplies.ageMinMonths !== undefined && (
                        <span>月龄：{selectedSupplies.ageMinMonths}~{selectedSupplies.ageMaxMonths}月</span>
                      )}
                      {selectedSupplies.sterilizationWindowHours && (
                        <span>消毒窗口：{selectedSupplies.sterilizationWindowHours}h</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'px-2.5 py-1 text-xs rounded-full font-medium',
                        selectedSupplies.status === 'available' && 'bg-emerald-100 text-emerald-700',
                        selectedSupplies.status === 'in_use' && 'bg-blue-100 text-blue-700',
                        selectedSupplies.status === 'sterilizing' && 'bg-purple-100 text-purple-700',
                        selectedSupplies.status === 'maintenance' && 'bg-orange-100 text-orange-700',
                        selectedSupplies.status === 'reserved' && 'bg-amber-100 text-amber-700',
                        selectedSupplies.status === 'pending_inspection' && 'bg-amber-100 text-amber-800 border border-amber-200'
                      )}
                    >
                      {suppliesStatusMap[selectedSupplies.status]}
                    </span>
                  </div>
                </div>
              </div>

              {[
                { label: `今天 · ${formatDateCN(today.toISOString())}`, key: 'today', items: groupedByDay.today, date: today },
                { label: `明天 · ${formatDateCN(tomorrow.toISOString())}`, key: 'tomorrow', items: groupedByDay.tomorrow, date: tomorrow },
                { label: '更晚', key: 'later', items: groupedByDay.later, date: dayAfter },
              ].map((section) => (
                <div key={section.key} className="card">
                  <div className="card-header flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <span
                        className={clsx(
                          'w-2 h-2 rounded-full',
                          section.key === 'today' && 'bg-primary-500',
                          section.key === 'tomorrow' && 'bg-blue-400',
                          section.key === 'later' && 'bg-gray-400'
                        )}
                      ></span>
                      {section.label}
                    </h4>
                    <span className="text-xs text-gray-500">{section.items.length} 项</span>
                  </div>
                  <div className="card-body">
                    {section.items.length === 0 ? (
                      <div className="text-center py-6 text-sm text-gray-400">无安排</div>
                    ) : (
                      <div className="space-y-3">
                        {section.items.map((occ) => {
                          const colors = typeColorMap[occ.type] || typeColorMap.reservation
                          const occClasses = classes.find((c) => c.id === occ.classId)
                          const startMin = parseISO(occ.startTime).getHours() * 60 + parseISO(occ.startTime).getMinutes()
                          const endMin = parseISO(occ.endTime).getHours() * 60 + parseISO(occ.endTime).getMinutes()
                          const totalMin = 24 * 60
                          const leftPct = (startMin / totalMin) * 100
                          const widthPct = Math.max(((endMin - startMin) / totalMin) * 100, 4)
                          return (
                            <div
                              key={occ.id}
                              className={clsx(
                                'rounded-lg border p-3 relative overflow-hidden transition-all hover:shadow-md',
                                colors.bg,
                                colors.border
                              )}
                            >
                              <div className="flex items-start justify-between gap-3 relative z-10">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span
                                      className={clsx(
                                        'inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium',
                                        colors.dot && 'text-white',
                                        `bg-current bg-opacity-10`
                                      )}
                                    >
                                      <span className={clsx('w-1.5 h-1.5 rounded-full', colors.dot)}></span>
                                      <span className={colors.text}>{occupancyTypeMap[occ.type] || occ.type}</span>
                                    </span>
                                    <span className="text-xs text-gray-600 font-medium">
                                      {formatDateTime(occ.startTime, 'HH:mm')} ~ {formatDateTime(occ.endTime, 'HH:mm')}
                                      <span className="ml-1 opacity-70">
                                        ({differenceInHours(parseISO(occ.endTime), parseISO(occ.startTime))}h
                                        {differenceInMinutes(parseISO(occ.endTime), parseISO(occ.startTime)) % 60 > 0 &&
                                          `${differenceInMinutes(parseISO(occ.endTime), parseISO(occ.startTime)) % 60}m`}
                                        )
                                      </span>
                                    </span>
                                  </div>
                                  <div className={clsx('text-sm font-medium', colors.text)}>
                                    {occ.lockReason}
                                  </div>
                                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                    {occ.className && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/60 rounded-md text-gray-600">
                                        <BookOpen size={11} /> {occ.className}
                                      </span>
                                    )}
                                    {occ.parentName && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/60 rounded-md text-gray-600">
                                        <User size={11} /> {occ.parentName}
                                      </span>
                                    )}
                                    {occ.reservationId && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/60 rounded-md text-gray-600">
                                        #{occ.reservationId.toUpperCase().slice(0, 8)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {occ.type === 'inspection' && (
                                  <div className="px-2 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-medium">
                                    库管待处理
                                  </div>
                                )}
                                {occ.type === 'replacement_wait' && (
                                  <div className="px-2 py-1 rounded-md bg-rose-100 text-rose-700 text-xs font-medium animate-pulse">
                                    待分配替换
                                  </div>
                                )}
                              </div>
                              <div className="mt-3 h-1.5 bg-white/50 rounded-full overflow-hidden relative z-10">
                                <div
                                  className={clsx('h-full rounded-full', colors.dot)}
                                  style={{ marginLeft: `${leftPct}%`, width: `${widthPct}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between mt-1.5 text-[10px] text-gray-500 relative z-10">
                                <span>00:00</span>
                                <span>06:00</span>
                                <span>12:00</span>
                                <span>18:00</span>
                                <span>24:00</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {inspectionRecords.some(
                (r) => r.suppliesId === selectedSupplies.id && r.status === 'pending'
              ) && (
                <div className="card border-amber-300 bg-amber-50/50">
                  <div className="card-header">
                    <h4 className="font-semibold text-amber-900 flex items-center gap-2">
                      <AlertTriangle size={16} />
                      待复检事项
                    </h4>
                  </div>
                  <div className="card-body space-y-2">
                    {inspectionRecords
                      .filter((r) => r.suppliesId === selectedSupplies.id && r.status === 'pending')
                      .map((r) => (
                        <div key={r.id} className="bg-white rounded-lg p-3 border border-amber-200">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{r.damageDescription}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                提交护士：{r.nurseName} · {formatDateTime(r.submittedAt)}
                              </div>
                              {r.affectsUpcomingClasses && (
                                <div className="text-xs text-rose-600 mt-1 font-medium flex items-center gap-1">
                                  <AlertTriangle size={11} />
                                  影响预约单：{(r.affectedReservationIds || []).map((id) => id.toUpperCase().slice(0, 8)).join('、')}
                                </div>
                              )}
                            </div>
                            <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-medium">
                              待复检
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
