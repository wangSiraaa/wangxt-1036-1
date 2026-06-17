import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { StatCard, EmptyState, ReturnConditionBadge } from '../components/ui'
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  User,
  Package,
  Clock,
  FileText,
  Check,
  X,
  Search,
} from 'lucide-react'
import {
  InspectionRecord,
  InspectionStatus,
  SafetyAssessment,
  inspectionStatusMap,
  safetyAssessmentMap,
  SuppliesStatus,
  suppliesStatusMap,
} from '../types'
import clsx from 'clsx'
import { formatDateTime, generateId } from '../utils/format'

export default function InspectionList() {
  const {
    inspectionRecords,
    supplies,
    currentUser,
    resolveInspection,
    buildOccupancies,
    reservations,
  } = useAppStore()

  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending')
  const [searchText, setSearchText] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [resolveData, setResolveData] = useState<{
    safetyAssessment: SafetyAssessment
    notes: string
    maintenanceRequired: boolean
    reSterilizeRequired: boolean
  }>({
    safetyAssessment: 'safe',
    notes: '',
    maintenanceRequired: false,
    reSterilizeRequired: true,
  })

  const occupancies = useMemo(() => buildOccupancies(), [buildOccupancies])

  const filtered = useMemo(() => {
    let list = inspectionRecords
    if (activeTab === 'pending') list = list.filter((r) => r.status === 'pending')
    if (searchText) {
      const t = searchText.toLowerCase()
      list = list.filter(
        (r) =>
          r.suppliesName.toLowerCase().includes(t) ||
          r.suppliesCode.toLowerCase().includes(t) ||
          r.damageDescription.toLowerCase().includes(t) ||
          r.nurseName.toLowerCase().includes(t)
      )
    }
    return [...list].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    })
  }, [inspectionRecords, activeTab, searchText])

  const stats = useMemo(() => {
    const pending = inspectionRecords.filter((r) => r.status === 'pending').length
    const passed = inspectionRecords.filter((r) => r.status === 'passed').length
    const failed = inspectionRecords.filter((r) => r.status === 'failed').length
    const affectsClasses = inspectionRecords.filter(
      (r) => r.status === 'pending' && r.affectsUpcomingClasses
    ).length
    return { pending, passed, failed, affectsClasses }
  }, [inspectionRecords])

  const selected = inspectionRecords.find((r) => r.id === selectedId)
  const selectedSupplies = selected ? supplies.find((s) => s.id === selected.suppliesId) : null
  const affectedReservations = selected?.affectedReservationIds
    ? reservations.filter((r) => selected.affectedReservationIds?.includes(r.id))
    : []
  const relatedOccupancies = selected
    ? occupancies.filter(
        (o) =>
          o.suppliesId === selected.suppliesId ||
          (o.type === 'replacement_wait' &&
            selected.affectedReservationIds?.includes(o.reservationId || ''))
      )
    : []

  const handleResolve = (status: InspectionStatus) => {
    if (!selected || !currentUser) return
    resolveInspection(selected.id, status, {
      inspectorId: currentUser.id,
      inspectorName: currentUser.name,
      safetyAssessment: resolveData.safetyAssessment,
      inspectionNotes: resolveData.notes,
      maintenanceRequired: resolveData.maintenanceRequired,
      reSterilizeRequired: resolveData.reSterilizeRequired,
    })
    setSelectedId(null)
    setResolveData({
      safetyAssessment: 'safe',
      notes: '',
      maintenanceRequired: false,
      reSterilizeRequired: true,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="text-amber-500" />
            用品复检处理
          </h1>
          <p className="text-sm text-gray-500 mt-1">护士判定轻微破损的用品需库管进行安全复检后才能重新上架</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="待复检" value={stats.pending} icon={<Clock size={20} />} color="warning" />
        <StatCard label="影响课堂" value={stats.affectsClasses} icon={<AlertTriangle size={20} />} color="danger" />
        <StatCard label="复检通过" value={stats.passed} icon={<CheckCircle2 size={20} />} color="success" />
        <StatCard label="复检不通过" value={stats.failed} icon={<XCircle size={20} />} color="info" />
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="card">
            <div className="card-header flex items-center justify-between gap-3">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={clsx(
                    'px-3 py-1.5 text-sm rounded-md font-medium transition-all',
                    activeTab === 'pending'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  待处理 {stats.pending > 0 && <span className="ml-1 text-amber-600">({stats.pending})</span>}
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={clsx(
                    'px-3 py-1.5 text-sm rounded-md font-medium transition-all',
                    activeTab === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  全部记录
                </button>
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索用品/破损描述..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="card-body">
              {filtered.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 size={32} className="text-emerald-400" />}
                  title="暂无待复检用品"
                  description="当前所有用品复检工作已处理完毕"
                />
              ) : (
                <div className="space-y-2 -mx-5 -mb-5 px-5 pb-5 max-h-[640px] overflow-y-auto">
                  {filtered.map((r) => {
                    const isSelected = selectedId === r.id
                    return (
                      <button
                        key={r.id}
                        onClick={() => {
                          setSelectedId(isSelected ? null : r.id)
                          if (!isSelected) {
                            setResolveData({
                              safetyAssessment: 'safe',
                              notes: '',
                              maintenanceRequired: false,
                              reSterilizeRequired: r.status === 'pending',
                            })
                          }
                        }}
                        className={clsx(
                          'w-full text-left p-3.5 rounded-xl border transition-all',
                          isSelected
                            ? 'bg-primary-50 border-primary-300 ring-2 ring-primary-100'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{r.suppliesName}</span>
                              {r.status === 'pending' && (
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-500">{r.suppliesCode}</span>
                              <ReturnConditionBadge condition={r.condition} />
                            </div>
                            <div className="text-sm text-gray-700 mt-2 line-clamp-2">{r.damageDescription}</div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                              <span className="inline-flex items-center gap-1">
                                <User size={11} /> {r.nurseName}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock size={11} /> {formatDateTime(r.submittedAt)}
                              </span>
                              {r.affectsUpcomingClasses && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium">
                                  <AlertTriangle size={11} /> 影响课堂
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            className={clsx(
                              'px-2 py-1 rounded-md text-xs font-medium shrink-0',
                              r.status === 'pending' && 'bg-amber-100 text-amber-800',
                              r.status === 'passed' && 'bg-emerald-100 text-emerald-700',
                              r.status === 'failed' && 'bg-rose-100 text-rose-700'
                            )}
                          >
                            {inspectionStatusMap[r.status]}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-3">
          {!selected ? (
            <div className="card h-full flex items-center justify-center">
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto rounded-full bg-amber-50 flex items-center justify-center mb-4">
                  <FileText size={32} className="text-amber-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">选择复检记录</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  从左侧选择一条复检记录进行安全评估和处理
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="card border-amber-200 bg-gradient-to-br from-amber-50/60 to-white">
                <div className="card-header flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                      <Package size={18} className="text-amber-600" />
                      {selected.suppliesName}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                      <span>编号：{selected.suppliesCode}</span>
                      {selectedSupplies && (
                        <span
                          className={clsx(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            selectedSupplies.status === 'pending_inspection' &&
                              'bg-amber-100 text-amber-800 border border-amber-200'
                          )}
                        >
                          当前状态：{suppliesStatusMap[selectedSupplies.status]}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={clsx(
                      'px-3 py-1 rounded-full text-sm font-medium',
                      selected.status === 'pending' && 'bg-amber-100 text-amber-800 border border-amber-200',
                      selected.status === 'passed' && 'bg-emerald-100 text-emerald-700',
                      selected.status === 'failed' && 'bg-rose-100 text-rose-700'
                    )}
                  >
                    {inspectionStatusMap[selected.status]}
                  </span>
                </div>
                <div className="card-body grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">破损情况</div>
                      <div className="text-sm font-medium text-gray-900">{selected.damageDescription}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">物品状态</div>
                      <ReturnConditionBadge condition={selected.condition} />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">提交护士</div>
                      <div className="text-sm text-gray-900">{selected.nurseName}（{selected.nurseId}）</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">提交时间</div>
                      <div className="text-sm text-gray-900">{formatDateTime(selected.submittedAt)}</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {selected.inspectedAt && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">复检时间</div>
                        <div className="text-sm text-gray-900">{formatDateTime(selected.inspectedAt)}</div>
                      </div>
                    )}
                    {selected.inspectorName && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">复检库管</div>
                        <div className="text-sm text-gray-900">{selected.inspectorName}</div>
                      </div>
                    )}
                    {selected.safetyAssessment && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">安全评估</div>
                        <div
                          className={clsx(
                            'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium',
                            selected.safetyAssessment === 'safe' && 'bg-emerald-100 text-emerald-700',
                            selected.safetyAssessment === 'caution' && 'bg-amber-100 text-amber-700',
                            selected.safetyAssessment === 'unsafe' && 'bg-rose-100 text-rose-700'
                          )}
                        >
                          {selected.safetyAssessment === 'safe' && <ShieldCheck size={14} />}
                          {selected.safetyAssessment === 'caution' && <ShieldAlert size={14} />}
                          {selected.safetyAssessment === 'unsafe' && <ShieldX size={14} />}
                          {safetyAssessmentMap[selected.safetyAssessment]}
                        </div>
                      </div>
                    )}
                    {selected.inspectionNotes && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">复检说明</div>
                        <div className="text-sm text-gray-900 bg-white/70 p-2 rounded-lg border border-gray-100">
                          {selected.inspectionNotes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selected.affectsUpcomingClasses && (
                <div className="card border-rose-200 bg-rose-50/40">
                  <div className="card-header">
                    <h4 className="font-semibold text-rose-900 flex items-center gap-2">
                      <AlertTriangle size={16} />
                      影响的预约单（需安排替换用品）
                    </h4>
                  </div>
                  <div className="card-body">
                    {affectedReservations.length > 0 ? (
                      <div className="space-y-2">
                        {affectedReservations.map((res) => (
                          <div
                            key={res.id}
                            className="flex items-center justify-between bg-white rounded-lg p-3 border border-rose-100"
                          >
                            <div>
                              <div className="text-sm font-medium text-gray-900">#{res.id.toUpperCase().slice(0, 8)}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {res.parentName} · {formatDateTime(res.createdAt)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium">
                                等待替换
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        预约ID：{(selected.affectedReservationIds || []).join('、')}
                      </div>
                    )}
                    {relatedOccupancies.filter((o) => o.type === 'replacement_wait').length > 0 && (
                      <div className="mt-3 pt-3 border-t border-rose-100">
                        <div className="text-xs text-rose-700 mb-2">已自动创建待替换占用：</div>
                        {relatedOccupancies
                          .filter((o) => o.type === 'replacement_wait')
                          .map((o) => (
                            <div key={o.id} className="text-xs text-gray-600 bg-white/50 rounded-md p-2 mb-1.5">
                              {o.lockReason}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selected.status === 'pending' && (
                <div className="card">
                  <div className="card-header">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-primary-500" />
                      安全评估与处理
                    </h4>
                  </div>
                  <div className="card-body space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">安全评估结果 *</label>
                      <div className="grid grid-cols-3 gap-3">
                        {([
                          {
                            value: 'safe',
                            label: '安全可使用',
                            desc: '破损不影响使用，可直接投入周转',
                            icon: <ShieldCheck size={20} />,
                            color: 'emerald',
                          },
                          {
                            value: 'caution',
                            label: '需谨慎使用',
                            desc: '轻微瑕疵，可使用但需注意',
                            icon: <ShieldAlert size={20} />,
                            color: 'amber',
                          },
                          {
                            value: 'unsafe',
                            label: '不安全',
                            desc: '破损严重，需维修或报废',
                            icon: <ShieldX size={20} />,
                            color: 'rose',
                          },
                        ] as { value: SafetyAssessment; label: string; desc: string; icon: React.ReactNode; color: string }[]).map(
                          (opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setResolveData({ ...resolveData, safetyAssessment: opt.value })}
                              className={clsx(
                                'text-left p-3 rounded-xl border-2 transition-all',
                                resolveData.safetyAssessment === opt.value &&
                                  opt.color === 'emerald' &&
                                  'border-emerald-400 bg-emerald-50',
                                resolveData.safetyAssessment === opt.value &&
                                  opt.color === 'amber' &&
                                  'border-amber-400 bg-amber-50',
                                resolveData.safetyAssessment === opt.value &&
                                  opt.color === 'rose' &&
                                  'border-rose-400 bg-rose-50',
                                resolveData.safetyAssessment !== opt.value &&
                                  'border-gray-200 bg-white hover:border-gray-300'
                              )}
                            >
                              <div
                                className={clsx(
                                  'mb-1.5',
                                  opt.color === 'emerald' && 'text-emerald-600',
                                  opt.color === 'amber' && 'text-amber-600',
                                  opt.color === 'rose' && 'text-rose-600'
                                )}
                              >
                                {opt.icon}
                              </div>
                              <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">复检说明 *</label>
                      <textarea
                        rows={3}
                        placeholder="详细描述检查发现和处理建议..."
                        value={resolveData.notes}
                        onChange={(e) => setResolveData({ ...resolveData, notes: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      />
                    </div>

                    <div className="flex gap-6 pt-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={resolveData.reSterilizeRequired}
                          onChange={(e) =>
                            setResolveData({ ...resolveData, reSterilizeRequired: e.target.checked })
                          }
                          className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">复检通过后需重新消毒</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={resolveData.maintenanceRequired}
                          onChange={(e) =>
                            setResolveData({ ...resolveData, maintenanceRequired: e.target.checked })
                          }
                          className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">需要维修处理</span>
                      </label>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleResolve('passed')}
                        disabled={!resolveData.notes.trim()}
                        className={clsx(
                          'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                          resolveData.notes.trim()
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-500/30'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        )}
                      >
                        <Check size={16} />
                        复检通过
                        {resolveData.reSterilizeRequired && resolveData.safetyAssessment === 'safe' && (
                          <span className="text-xs opacity-80">→ 消毒</span>
                        )}
                        {!resolveData.reSterilizeRequired && resolveData.safetyAssessment === 'safe' && (
                          <span className="text-xs opacity-80">→ 可上架</span>
                        )}
                        {resolveData.maintenanceRequired && (
                          <span className="text-xs opacity-80">→ 维修</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleResolve('failed')}
                        disabled={!resolveData.notes.trim()}
                        className={clsx(
                          'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                          resolveData.notes.trim()
                            ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm shadow-rose-500/30'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        )}
                      >
                        <X size={16} />
                        复检不通过 → 维修
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selected.status !== 'pending' && (
                <div className="card">
                  <div className="card-header">
                    <h4 className="font-semibold text-gray-900">处理结果</h4>
                  </div>
                  <div className="card-body space-y-2 text-sm">
                    {selected.maintenanceRequired && (
                      <div className="text-gray-700">• 已安排维修处理</div>
                    )}
                    {selected.reSterilizeRequired && (
                      <div className="text-gray-700">• 已安排重新消毒</div>
                    )}
                    {!selected.maintenanceRequired && !selected.reSterilizeRequired && selected.status === 'passed' && (
                      <div className="text-emerald-700 font-medium">• 已重新上架，可继续预约使用</div>
                    )}
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
