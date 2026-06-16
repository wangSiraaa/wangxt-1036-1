import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Lock,
  Unlock,
  Search,
  Package,
  User,
  Clock,
  Calendar,
  Filter,
  ShieldCheck,
  AlertCircle,
  X,
  Check,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { EmptyState, Steps } from '../components/ui'
import { formatDateTime, formatDate } from '../utils/format'
import { suppliesCategoryMap } from '../types'
import clsx from 'clsx'

export default function Overdue() {
  const {
    currentUser,
    overdueRecords,
    pickupRecords,
    freezeOverdue,
    unfreezeOverdue,
    users,
  } = useAppStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterFrozen, setFilterFrozen] = useState<'all' | 'frozen' | 'normal'>('all')
  const [showFreezeModal, setShowFreezeModal] = useState<string | null>(null)
  const [showUnfreezeModal, setShowUnfreezeModal] = useState<string | null>(null)
  const [freezeReason, setFreezeReason] = useState('')
  const [unfreezeReason, setUnfreezeReason] = useState('')

  const myFamilyRecords = useMemo(() => {
    if (currentUser.role !== 'parent') return []
    return overdueRecords.filter((o) => o.familyId === currentUser.familyId)
  }, [overdueRecords, currentUser])

  const filtered = useMemo(() => {
    let list = currentUser.role === 'parent' ? myFamilyRecords : overdueRecords
    if (search) {
      list = list.filter(
        (o) =>
          o.parentName.includes(search) ||
          o.suppliesName.includes(search) ||
          o.suppliesCode.includes(search) ||
          o.familyId.includes(search)
      )
    }
    if (filterFrozen === 'frozen') list = list.filter((o) => o.isFrozen)
    if (filterFrozen === 'normal') list = list.filter((o) => !o.isFrozen)
    return list.sort((a, b) => b.overdueDays - a.overdueDays)
  }, [overdueRecords, myFamilyRecords, search, filterFrozen, currentUser.role])

  const stats = useMemo(() => {
    const records = currentUser.role === 'parent' ? myFamilyRecords : overdueRecords
    return {
      total: records.length,
      frozen: records.filter((o) => o.isFrozen).length,
      avgDays: records.length > 0
        ? Math.round(records.reduce((acc, o) => acc + o.overdueDays, 0) / records.length)
        : 0,
      serious: records.filter((o) => o.overdueDays >= 3).length,
    }
  }, [overdueRecords, myFamilyRecords, currentUser.role])

  const handleFreeze = () => {
    if (!showFreezeModal || !freezeReason) return
    freezeOverdue(showFreezeModal, freezeReason)
    setShowFreezeModal(null)
    setFreezeReason('')
  }

  const handleUnfreeze = () => {
    if (!showUnfreezeModal || !unfreezeReason) return
    unfreezeOverdue(showUnfreezeModal, unfreezeReason)
    setShowUnfreezeModal(null)
    setUnfreezeReason('')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <AlertTriangle size={24} className="text-danger" />
            逾期管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {currentUser.role === 'parent'
              ? '查看家庭逾期记录与账户状态，及时归还以免影响后续使用'
              : '跟踪逾期用品、执行账户冻结和解冻，保障周转秩序'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-danger flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">逾期总数</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Lock size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.frozen}</div>
              <div className="text-xs text-gray-500">已冻结账户</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Calendar size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.avgDays}天</div>
              <div className="text-xs text-gray-500">平均逾期时长</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <AlertCircle size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.serious}</div>
              <div className="text-xs text-gray-500">严重逾期（≥3天）</div>
            </div>
          </div>
        </div>
      </div>

      {currentUser.role !== 'parent' && (
        <div className="card border-danger/30 bg-red-50/30">
          <div className="card-body flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-danger/10 text-danger flex-shrink-0 flex items-center justify-center">
              <ShieldCheck size={22} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">逾期冻结规则</h3>
              <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>逾期 1-2 天：用品显示<span className="text-danger font-semibold">🔴红色标记</span>，提醒归还</li>
                <li>逾期 ≥3 天：建议<span className="text-danger font-semibold">冻结账户</span>，暂停其所有预约和领用权限</li>
                <li>归还用品并说明原因后：<span className="text-emerald-600 font-semibold">可解冻账户</span>恢复使用</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body flex flex-wrap items-center gap-4 border-b border-gray-100">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索家长姓名、用品名称、编码或家庭ID..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterFrozen}
              onChange={(e) => setFilterFrozen(e.target.value as any)}
              className="select w-40"
            >
              <option value="all">全部状态</option>
              <option value="frozen">已冻结</option>
              <option value="normal">未冻结</option>
            </select>
          </div>
        </div>
        <div className="max-h-[560px] overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck size={36} />}
              title={currentUser.role === 'parent' ? '家庭暂无逾期记录' : '暂无逾期用品'}
              description={
                currentUser.role === 'parent'
                  ? '按时归还所有用品，非常棒！继续保持～'
                  : '所有借出用品均在正常归还周期内'
              }
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((o) => {
                const pickup = pickupRecords.find((p) => p.id === o.pickupId)
                return (
                  <div
                    key={o.id}
                    className={clsx(
                      'p-5 transition-colors',
                      o.isFrozen ? 'bg-red-50/60' : o.overdueDays >= 3 ? 'bg-orange-50/40' : 'hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={clsx(
                          'w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0',
                          o.isFrozen
                            ? 'bg-gradient-to-br from-red-500 to-red-700'
                            : o.overdueDays >= 3
                            ? 'bg-gradient-to-br from-orange-400 to-red-500'
                            : 'bg-gradient-to-br from-amber-400 to-orange-500'
                        )}>
                          {o.isFrozen ? <Lock size={26} /> : <AlertTriangle size={26} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2">
                            <h4 className="font-semibold text-gray-900">{o.suppliesName}</h4>
                            <span className="font-mono text-xs text-gray-500">{o.suppliesCode}</span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                              {suppliesCategoryMap[o.suppliesCategory]}
                            </span>
                            {o.isFrozen ? (
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1 animate-pulse">
                                <Lock size={10} /> 账户已冻结
                              </span>
                            ) : o.overdueDays >= 3 ? (
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500 text-white flex items-center gap-1 border border-orange-600">
                                🔴 严重逾期
                              </span>
                            ) : (
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1 border border-red-200">
                                🔴 逾期未还
                              </span>
                            )}
                          </div>
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <User size={13} className="text-gray-400" />
                              使用人：<span className="font-medium text-gray-900">{o.parentName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Package size={13} className="text-gray-400" />
                              家庭ID：<span className="font-mono font-medium">{o.familyId}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Clock size={13} className="text-gray-400" />
                              应归还：<span className="font-medium">{formatDateTime(o.expectedReturnTime)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-danger">
                              <AlertTriangle size={13} />
                              已逾期：<span className="font-bold">{o.overdueDays} 天</span>
                            </div>
                          </div>
                          {pickup && (
                            <div className="mt-2 text-xs text-gray-500">
                              关联领用：{pickup.className} · 办理护士 {pickup.nurseName} · {formatDate(pickup.pickupTime)} 领取
                            </div>
                          )}
                          {o.isFrozen && (
                            <div className="mt-3 p-3 rounded-lg bg-red-100/60 text-sm text-red-800 border border-red-200">
                              <div className="flex items-center gap-2">
                                <Lock size={14} />
                                <span className="font-medium">
                                  {o.frozenAt && `于 ${formatDateTime(o.frozenAt)} 冻结`}
                                </span>
                              </div>
                              {o.frozenReason && (
                                <div className="mt-1 text-xs text-red-700">原因：{o.frozenReason}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {currentUser.role !== 'parent' && (
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {!o.isFrozen ? (
                            <button
                              onClick={() => {
                                setShowFreezeModal(o.id)
                                setFreezeReason(`逾期${o.overdueDays}天未归还，按规则冻结账户`)
                              }}
                              className="btn-danger text-sm py-1.5 px-3 whitespace-nowrap"
                            >
                              <Lock size={14} className="mr-1" /> 冻结账户
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setShowUnfreezeModal(o.id)
                                setUnfreezeReason('家长已归还用品，经确认后解冻')
                              }}
                              className="btn-success text-sm py-1.5 px-3 whitespace-nowrap"
                            >
                              <Unlock size={14} className="mr-1" /> 解冻账户
                            </button>
                          )}
                          <button
                            onClick={() => navigate('/return')}
                            className="btn-outline text-sm py-1.5 px-3 whitespace-nowrap"
                          >
                            办理归还
                          </button>
                        </div>
                      )}
                      {currentUser.role === 'parent' && (
                        <div className="text-right flex-shrink-0">
                          {o.isFrozen ? (
                            <div className="text-sm text-danger font-medium">联系护士办理归还</div>
                          ) : (
                            <button
                              onClick={() => navigate('/return')}
                              className="btn-primary text-sm py-1.5 px-3 whitespace-nowrap"
                            >
                              立即归还
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showFreezeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3 bg-red-50">
              <div className="w-10 h-10 rounded-lg bg-danger/10 text-danger flex items-center justify-center">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">确认冻结账户</h3>
                <p className="text-xs text-gray-500">冻结后该家庭将无法预约和领取用品</p>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 p-4 rounded-xl bg-orange-50 border border-orange-200">
                <div className="text-sm text-orange-800">
                  <div className="font-medium">冻结影响</div>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-xs text-orange-700">
                    <li>暂停该家庭所有预约、领取权限</li>
                    <li>候补队列中的申请将自动退回</li>
                    <li>归还用品并经确认后可解冻</li>
                  </ul>
                </div>
              </div>
              <label className="label">冻结原因</label>
              <textarea
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="请填写冻结原因（必填）"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowFreezeModal(null); setFreezeReason('') }}
                className="btn-outline"
              >
                取消
              </button>
              <button onClick={handleFreeze} disabled={!freezeReason.trim()} className="btn-danger">
                <Lock size={16} className="mr-2" /> 确认冻结
              </button>
            </div>
          </div>
        </div>
      )}

      {showUnfreezeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3 bg-emerald-50">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Unlock size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">确认解冻账户</h3>
                <p className="text-xs text-gray-500">解冻后该家庭恢复所有使用权限</p>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-sm text-emerald-800">
                  <div className="font-medium">解冻恢复</div>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-xs text-emerald-700">
                    <li>恢复课堂报名和用品预约权限</li>
                    <li>可重新加入候补队列</li>
                    <li>请确保逾期用品已归还</li>
                  </ul>
                </div>
              </div>
              <label className="label">解冻说明</label>
              <textarea
                value={unfreezeReason}
                onChange={(e) => setUnfreezeReason(e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="请填写解冻原因（必填）"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowUnfreezeModal(null); setUnfreezeReason('') }}
                className="btn-outline"
              >
                取消
              </button>
              <button onClick={handleUnfreeze} disabled={!unfreezeReason.trim()} className="btn-success">
                <Unlock size={16} className="mr-2" /> 确认解冻
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
