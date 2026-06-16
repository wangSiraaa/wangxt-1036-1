import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  Package,
  BookOpen,
  Clock,
  Check,
  X,
  UserPlus,
  UserMinus,
  Bell,
  Filter,
  ArrowRight,
  AlertCircle,
  ArrowLeftRight,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { EmptyState, ReservationStatusBadge, Steps } from '../components/ui'
import { formatDateTime, formatDateCN } from '../utils/format'
import { suppliesCategoryMap, WaitlistEntry, suppliesStatusMap } from '../types'
import clsx from 'clsx'

export default function Waitlist() {
  const {
    currentUser,
    waitlistEntries,
    reservations,
    supplies,
    classes,
    updateWaitlistStatus,
    fulfillWaitlistWithSupplies,
    addWaitlist,
    updateReservationStatus,
  } = useAppStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | WaitlistEntry['status']>('all')
  const [showReplaceModal, setShowReplaceModal] = useState<WaitlistEntry | null>(null)
  const [replaceStep, setReplaceStep] = useState(0)
  const [selectedReplaceId, setSelectedReplaceId] = useState<string>('')

  const myEntries = useMemo(() => {
    if (currentUser.role !== 'parent') return []
    return waitlistEntries.filter((w) => w.parentId === currentUser.id)
  }, [waitlistEntries, currentUser])

  const allEntries = useMemo(() => {
    return currentUser.role === 'parent' ? myEntries : waitlistEntries
  }, [myEntries, waitlistEntries, currentUser.role])

  const filtered = useMemo(() => {
    let list = [...allEntries].sort((a, b) => {
      if (a.classId !== b.classId) return a.classId.localeCompare(b.classId)
      return a.position - b.position
    })
    if (search) {
      list = list.filter(
        (w) =>
          w.parentName.includes(search) ||
          w.className.includes(search) ||
          w.familyId.includes(search)
      )
    }
    if (filterStatus !== 'all') list = list.filter((w) => w.status === filterStatus)
    return list
  }, [allEntries, search, filterStatus])

  const stats = useMemo(() => ({
    waiting: allEntries.filter((w) => w.status === 'waiting').length,
    offered: allEntries.filter((w) => w.status === 'offered').length,
    accepted: allEntries.filter((w) => w.status === 'accepted').length,
    expired: allEntries.filter((w) => w.status === 'declined' || w.status === 'expired').length,
  }), [allEntries])

  const getReplaceOptions = (w: WaitlistEntry) => {
    return supplies.filter(
      (s) =>
        s.category === w.suppliesCategory &&
        s.status === 'available' &&
        s.lastSterilizedBatch
    )
  }

  const handleAccept = (w: WaitlistEntry) => {
    updateWaitlistStatus(w.id, 'accepted')
  }

  const handleDecline = (w: WaitlistEntry) => {
    updateWaitlistStatus(w.id, 'declined')
  }

  const [replaceResult, setReplaceResult] = useState<{ success: boolean; message: string; reservationCode?: string } | null>(null)

  const handleConfirmReplace = () => {
    if (!showReplaceModal || !selectedReplaceId) return
    const result = fulfillWaitlistWithSupplies(
      showReplaceModal.id,
      selectedReplaceId
    )
    setReplaceResult({
      success: result.success,
      message: result.message,
      reservationCode: result.reservation?.code,
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Users size={24} className="text-purple-500" />
            候补队列 & 替换用品
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {currentUser.role === 'parent'
              ? '查看候补排队进度，有可替换用品时及时接收通知'
              : '管理候补队列顺序，安排替换用品，提高周转效率'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.waiting}</div>
              <div className="text-xs text-gray-500">排队中</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.offered}</div>
              <div className="text-xs text-gray-500">已通知</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Check size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.accepted}</div>
              <div className="text-xs text-gray-500">已确认</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
              <X size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.expired}</div>
              <div className="text-xs text-gray-500">已失效</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-body flex flex-wrap items-center gap-4 border-b border-gray-100">
              <div className="relative flex-1 min-w-[240px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索家长姓名、课堂名称、家庭ID..."
                  className="input pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="select w-32"
                >
                  <option value="all">全部</option>
                  <option value="waiting">排队中</option>
                  <option value="offered">已通知</option>
                  <option value="accepted">已确认</option>
                  <option value="declined">已拒绝</option>
                  <option value="expired">已过期</option>
                </select>
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {filtered.length === 0 ? (
                <EmptyState
                  icon={<Users size={36} />}
                  title={currentUser.role === 'parent' ? '您暂未加入任何候补' : '暂无候补记录'}
                  description={
                    currentUser.role === 'parent'
                      ? '课堂用品紧张时可在此查看候补进度'
                      : '用品库存不足时家长会自动加入候补队列'
                  }
                />
              ) : (
                <div className="divide-y divide-gray-100">
                  {filtered.map((w) => {
                    const cls = classes.find((c) => c.id === w.classId)
                    return (
                      <div
                        key={w.id}
                        className={clsx(
                          'p-5',
                          w.status === 'offered' && 'bg-amber-50/60',
                          w.status === 'waiting' && 'hover:bg-gray-50 transition-colors'
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-3">
                              <div className={clsx(
                                'w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm',
                                w.position === 1
                                  ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                                  : w.position === 2
                                  ? 'bg-gradient-to-br from-gray-300 to-gray-400'
                                  : w.position === 3
                                  ? 'bg-gradient-to-br from-orange-300 to-orange-400'
                                  : 'bg-gradient-to-br from-purple-400 to-primary-500'
                              )}>
                                #{w.position}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-gray-900">{w.className}</h4>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                    {suppliesCategoryMap[w.suppliesCategory]}
                                  </span>
                                  <span
                                    className={clsx(
                                      'text-xs px-2 py-0.5 rounded-full font-medium',
                                      w.status === 'waiting' && 'bg-blue-100 text-blue-700',
                                      w.status === 'offered' && 'bg-amber-100 text-amber-700 animate-pulse',
                                      w.status === 'accepted' && 'bg-emerald-100 text-emerald-700',
                                      (w.status === 'declined' || w.status === 'expired') && 'bg-gray-100 text-gray-500'
                                    )}
                                  >
                                    {w.status === 'waiting' && '⏳ 排队中'}
                                    {w.status === 'offered' && '🔔 已有货通知'}
                                    {w.status === 'accepted' && '✅ 已确认'}
                                    {w.status === 'declined' && '❌ 已拒绝'}
                                    {w.status === 'expired' && '⏰ 已过期'}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                  <span>👤 {w.parentName} · 家庭 {w.familyId}</span>
                                  {cls && <span>📅 {formatDateCN(cls.startTime)}</span>}
                                  <span>加入时间 {formatDateTime(w.createdAt)}</span>
                                  <span className="text-amber-600">⏰ 有效期至 {formatDateTime(w.expiresAt)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            {w.status === 'offered' && currentUser.role === 'parent' && (
                              <>
                                <button onClick={() => handleAccept(w)} className="btn-success text-sm py-1.5 px-3">
                                  <Check size={14} className="mr-1" /> 确认领取
                                </button>
                                <button onClick={() => handleDecline(w)} className="btn-outline text-sm py-1.5 px-3">
                                  <X size={14} className="mr-1" /> 放弃
                                </button>
                              </>
                            )}
                            {w.status === 'waiting' && currentUser.role !== 'parent' && (
                              <button
                                onClick={() => {
                                  setShowReplaceModal(w)
                                  setReplaceStep(0)
                                  setSelectedReplaceId('')
                                }}
                                className="btn-primary text-sm py-1.5 px-3 whitespace-nowrap"
                              >
                                <ArrowLeftRight size={14} className="mr-1" /> 安排替换
                              </button>
                            )}
                            {w.status === 'waiting' && currentUser.role === 'parent' && (
                              <button
                                onClick={() => navigate('/supplies')}
                                className="btn-outline text-sm py-1.5 px-3 whitespace-nowrap"
                              >
                                <ArrowLeftRight size={14} className="mr-1" /> 看替换品
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ArrowLeftRight size={18} className="text-blue-500" />
                备用替换用品
              </h3>
            </div>
            <div className="card-body p-0 max-h-96 overflow-y-auto">
              {Object.keys(suppliesCategoryMap).map((cat) => {
                const list = supplies.filter(
                  (s) =>
                    s.category === (cat as any) &&
                    s.status === 'available' &&
                    s.lastSterilizedBatch
                )
                return (
                  <div key={cat} className="px-4 py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {suppliesCategoryMap[cat as keyof typeof suppliesCategoryMap]}
                      </span>
                      <span className="text-xs text-emerald-600 font-semibold">{list.length} 件可用</span>
                    </div>
                    {list.length === 0 ? (
                      <div className="text-xs text-gray-400 italic py-1">暂无可用替换品</div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {list.slice(0, 6).map((s) => (
                          <span
                            key={s.id}
                            title={`${s.name} · 批次 ${s.lastSterilizedBatch}`}
                            className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono"
                          >
                            {s.code}
                          </span>
                        ))}
                        {list.length > 6 && (
                          <span className="text-xs px-2 py-1 rounded-md bg-gray-50 text-gray-500">
                            +{list.length - 6}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-500" />
                候补与替换说明
              </h3>
            </div>
            <div className="card-body text-sm text-gray-600 space-y-2">
              <p className="flex items-start gap-2">
                <span className="text-purple-500 font-bold">1.</span>
                用品库存不足时，预约申请将自动进入候补队列，按先后顺序排列
              </p>
              <p className="flex items-start gap-2">
                <span className="text-purple-500 font-bold">2.</span>
                当有其他家长归还并完成消毒后，系统按候补顺序通知（24小时内有效）
              </p>
              <p className="flex items-start gap-2">
                <span className="text-purple-500 font-bold">3.</span>
                工作人员也可直接安排<span className="text-primary-600 font-medium">替换用品</span>，提供同类别其他可用品
              </p>
              <p className="flex items-start gap-2">
                <span className="text-purple-500 font-bold">4.</span>
                逾期冻结账户的候补申请将自动取消并释放位置
              </p>
            </div>
          </div>
        </div>
      </div>

      {showReplaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-slide-up overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ArrowLeftRight size={20} className="text-primary-500" />
                安排替换用品 - #{showReplaceModal.position} {showReplaceModal.parentName}
              </h3>
              {replaceStep < 2 && (
                <button
                  onClick={() => {
                    setShowReplaceModal(null)
                    setReplaceStep(0)
                    setSelectedReplaceId('')
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              )}
            </div>
            <div className="px-6 py-4 border-b border-gray-100">
              <Steps
                steps={[
                  { label: '确认候补信息', description: '课堂与用品类型' },
                  { label: '选择替换用品', description: '从可用库存中选择' },
                  { label: '完成替换', description: '通知家长领取' },
                ]}
                current={replaceStep}
              />
            </div>
            <div className="p-6">
              {replaceStep === 0 && (
                <div className="p-5 rounded-xl bg-gradient-to-br from-purple-50 to-primary-50 border border-purple-100">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">课堂名称：</span>
                      <span className="font-semibold text-gray-900 block mt-1">{showReplaceModal.className}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">用品类型：</span>
                      <span className="font-semibold text-gray-900 block mt-1">
                        {suppliesCategoryMap[showReplaceModal.suppliesCategory]}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">家长姓名：</span>
                      <span className="font-semibold text-gray-900 block mt-1">{showReplaceModal.parentName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">候补位置：</span>
                      <span className="font-semibold text-primary-600 block mt-1">#{showReplaceModal.position}</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-white/60 text-xs text-gray-600">
                    💡 替换用品原则：选择相同类别、已完成消毒、且未被预约的用品。替换后将直接生成预约单。
                  </div>
                </div>
              )}
              {replaceStep === 1 && (
                <div>
                  <div className="text-sm text-gray-600 mb-3">
                    以下 <span className="font-semibold text-emerald-600">{getReplaceOptions(showReplaceModal).length}</span> 件用品可用于替换，点击选择：
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                    {getReplaceOptions(showReplaceModal).length === 0 ? (
                      <div className="col-span-2 text-center py-10 text-sm text-gray-500">
                        暂无可用替换用品，请等待消毒完成或联系库管
                      </div>
                    ) : (
                      getReplaceOptions(showReplaceModal).map((s) => {
                        const checked = selectedReplaceId === s.id
                        return (
                          <button
                            key={s.id}
                            onClick={() => setSelectedReplaceId(s.id)}
                            className={clsx(
                              'p-4 rounded-xl border-2 text-left transition-all',
                              checked
                                ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-100'
                                : 'border-gray-200 hover:border-primary-200'
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-semibold text-gray-900">{s.name}</div>
                                <div className="text-xs text-gray-500 font-mono mt-0.5">{s.code}</div>
                              </div>
                              <div className={clsx(
                                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                                checked ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                              )}>
                                {checked && <Check size={12} className="text-white" />}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">
                                批次：{s.lastSterilizedBatch}
                              </span>
                              {s.model && (
                                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                                  {s.model}
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
              {replaceStep === 2 && replaceResult && (
                <div className={clsx(
                  'p-5 rounded-xl border text-center',
                  replaceResult.success
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-200'
                )}>
                  <div className={clsx(
                    'w-16 h-16 mx-auto rounded-full text-white flex items-center justify-center shadow-lg',
                    replaceResult.success
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-200'
                      : 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-200'
                  )}>
                    {replaceResult.success ? <Check size={32} /> : <X size={32} />}
                  </div>
                  <h4 className="mt-4 text-xl font-bold text-gray-900">
                    {replaceResult.success ? '替换安排完成' : '替换安排失败'}
                  </h4>
                  <p className={clsx(
                    'mt-2',
                    replaceResult.success ? 'text-emerald-700' : 'text-red-700'
                  )}>
                    {replaceResult.message}
                  </p>
                  {replaceResult.success && replaceResult.reservationCode && (
                    <>
                      <div className="mt-4 p-4 bg-white/70 rounded-xl text-left text-sm grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-500">预约编号：</span>
                          <span className="font-mono font-semibold text-primary-600">{replaceResult.reservationCode}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">用品：</span>
                          <span className="font-semibold">{supplies.find((x) => x.id === selectedReplaceId)?.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">编码：</span>
                          <span className="font-mono font-semibold">{supplies.find((x) => x.id === selectedReplaceId)?.code}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">消毒批次：</span>
                          <span className="font-mono text-purple-600">{supplies.find((x) => x.id === selectedReplaceId)?.lastSterilizedBatch}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">家长：</span>
                          <span className="font-semibold">{showReplaceModal?.parentName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">状态：</span>
                          <span className="font-semibold text-emerald-600">待领取</span>
                        </div>
                      </div>
                      <div className="mt-4 text-xs text-gray-500 bg-white/50 p-2 rounded">
                        💡 该预约已自动同步到<strong>家长我的预约</strong>和<strong>护士领用办理</strong>列表，可直接前往办理领用
                      </div>
                    </>
                  )}
                </div>
              )}
              {replaceStep === 2 && !replaceResult && (
                <div className="p-5 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gray-200 text-gray-400 flex items-center justify-center">
                      <Package size={32} />
                    </div>
                    <h4 className="mt-4 text-xl font-bold text-gray-900">确认替换信息</h4>
                    <p className="mt-2 text-gray-500">请确认以下替换用品信息，确认后将生成正式预约</p>
                  </div>
                  <div className="mt-4 p-4 bg-white rounded-xl text-sm grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">用品：</span>
                      <span className="font-semibold">{supplies.find((x) => x.id === selectedReplaceId)?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">编码：</span>
                      <span className="font-mono font-semibold">{supplies.find((x) => x.id === selectedReplaceId)?.code}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">消毒批次：</span>
                      <span className="font-mono text-purple-600">{supplies.find((x) => x.id === selectedReplaceId)?.lastSterilizedBatch}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">家长：</span>
                      <span className="font-semibold">{showReplaceModal?.parentName}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div>
                {replaceStep > 0 && replaceStep < 2 && (
                  <button onClick={() => setReplaceStep(replaceStep - 1)} className="btn-secondary">
                    上一步
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReplaceModal(null)
                    setReplaceStep(0)
                    setSelectedReplaceId('')
                    setReplaceResult(null)
                  }}
                  className="btn-outline"
                >
                  {replaceStep === 2 && replaceResult ? '关闭' : '取消'}
                </button>
                {replaceStep < 2 && (
                  <button
                    onClick={() => {
                      if (replaceStep === 1 && selectedReplaceId) {
                        handleConfirmReplace()
                      }
                      setReplaceStep(replaceStep + 1)
                    }}
                    disabled={replaceStep === 1 && !selectedReplaceId}
                    className="btn-primary"
                  >
                    {replaceStep === 0 ? '下一步' : '确认替换'}
                    <ArrowRight size={14} className="ml-2" />
                  </button>
                )}
                {replaceStep === 2 && replaceResult && replaceResult.success && (
                  <>
                    <button
                      onClick={() => {
                        setShowReplaceModal(null)
                        setReplaceStep(0)
                        setSelectedReplaceId('')
                        setReplaceResult(null)
                        navigate('/pickup')
                      }}
                      className="btn-primary"
                    >
                      前往领用办理
                      <ArrowRight size={14} className="ml-2" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
