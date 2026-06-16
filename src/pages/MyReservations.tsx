import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  Search,
  Package,
  Calendar,
  Clock,
  BookOpen,
  QrCode,
  Filter,
  AlertTriangle,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { ReservationStatusBadge, EmptyState } from '../components/ui'
import { formatDateTime, getOverdueDays } from '../utils/format'
import { suppliesCategoryMap, ReservationStatus } from '../types'
import clsx from 'clsx'

export default function MyReservations() {
  const { currentUser, reservations, pickupRecords, returnRecords, overdueRecords, supplies } =
    useAppStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | 'all'>('all')

  const myReservations = useMemo(() => {
    return reservations.filter((r) => r.parentId === currentUser.id)
  }, [reservations, currentUser])

  const familyOverdue = useMemo(
    () => overdueRecords.find((o) => o.familyId === currentUser.familyId && o.isFrozen),
    [overdueRecords, currentUser]
  )

  const filtered = useMemo(() => {
    let list = [...myReservations].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    if (search) {
      list = list.filter(
        (r) =>
          r.className.includes(search) ||
          r.suppliesName.includes(search) ||
          r.code.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (filterStatus !== 'all') {
      list = list.filter((r) => r.status === filterStatus)
    }
    return list
  }, [myReservations, search, filterStatus])

  const stats = useMemo(() => ({
    total: myReservations.length,
    pending: myReservations.filter((r) => ['pending', 'approved'].includes(r.status)).length,
    using: myReservations.filter((r) => r.status === 'picked_up').length,
    waitlisted: myReservations.filter((r) => r.status === 'waitlisted').length,
    returned: myReservations.filter((r) => r.status === 'returned').length,
  }), [myReservations])

  const familyUnreturned = useMemo(() => {
    return pickupRecords.filter(
      (p) => p.familyId === currentUser.familyId && !p.isReturned
    ).length
  }, [pickupRecords, currentUser])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <ClipboardList size={24} className="text-primary-500" />
          我的预约
        </h1>
        <p className="text-sm text-gray-500 mt-1">查看用品预约状态、领取归还进度与历史记录</p>
      </div>

      {familyOverdue && (
        <div className="p-4 rounded-xl bg-red-50 border-2 border-red-300 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-100 text-danger flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">账户已被冻结</h3>
            <p className="text-sm text-red-700 mt-1">
              因逾期未归还用品，您的账户已被暂停预约和领取权限。请立即联系护士办理归还。
            </p>
            <div className="mt-2 text-xs text-red-600">
              冻结原因：{familyOverdue.frozenReason} · {formatDateTime(familyOverdue.frozenAt)}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card"><div className="card-body flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center"><ClipboardList size={18} /></div><div><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-gray-500">总预约</div></div></div></div>
        <div className="card"><div className="card-body flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><Clock size={18} /></div><div><div className="text-2xl font-bold">{stats.pending}</div><div className="text-xs text-gray-500">待领取</div></div></div></div>
        <div className="card"><div className="card-body flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><Package size={18} /></div><div><div className="text-2xl font-bold">{stats.using}</div><div className="text-xs text-gray-500">使用中</div></div></div></div>
        <div className="card"><div className="card-body flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center"><Calendar size={18} /></div><div><div className="text-2xl font-bold">{stats.waitlisted}</div><div className="text-xs text-gray-500">候补中</div></div></div></div>
        <div className="card"><div className="card-body flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><BookOpen size={18} /></div><div><div className="text-2xl font-bold">{stats.returned}</div><div className="text-xs text-gray-500">已完成</div></div></div></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-blue-50/40 border-blue-200">
          <div className="card-body flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><Package size={22} /></div>
              <div>
                <div className="text-sm text-blue-700">家庭未归还用品</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-blue-900">{familyUnreturned}</span>
                  <span className="text-xs text-blue-600">/ 上限 3 件</span>
                </div>
              </div>
            </div>
            {familyUnreturned >= 3 && <span className="text-xs px-3 py-1 rounded-full bg-danger text-white animate-pulse">已达上限</span>}
          </div>
        </div>
        <div className="card bg-purple-50/40 border-purple-200">
          <div className="card-body flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center"><Calendar size={22} /></div>
              <div>
                <div className="text-sm text-purple-700">本月课堂预约</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-purple-900">{new Set(myReservations.map(r => r.classId)).size}</span>
                  <span className="text-xs text-purple-600">节课堂</span>
                </div>
              </div>
            </div>
            <button onClick={() => navigate('/classes')} className="btn-primary text-sm py-1.5 px-3">继续预约</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body flex flex-wrap items-center gap-4 border-b border-gray-100">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <QrCode size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索课堂名称、用品、预约单号..." className="input pl-10 pr-10" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="select w-36">
              <option value="all">全部状态</option>
              <option value="pending">待确认</option>
              <option value="approved">待领取</option>
              <option value="picked_up">已领取</option>
              <option value="returned">已归还</option>
              <option value="waitlisted">候补中</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
        </div>
        <div className="max-h-[540px] overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyState icon={<ClipboardList size={36} />} title="暂无预约记录" description="前往课堂列表选择感兴趣的课程并预约所需辅具"
              action={<button onClick={() => navigate('/classes')} className="btn-primary">去预约课堂</button>} />
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(r => {
                const pickup = pickupRecords.find(p => p.reservationId === r.id)
                const ret = pickup ? returnRecords.find(rr => rr.pickupId === pickup.id) : undefined
                const overdue = pickup && !pickup.isReturned ? getOverdueDays(pickup.expectedReturnTime) : 0
                return (
                  <div key={r.id} onClick={() => navigate(`/classes/${r.classId}`)}
                    className={clsx('p-5 cursor-pointer transition-colors hover:bg-primary-50/40', overdue > 0 && 'bg-red-50/60')}>
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={clsx('w-14 h-14 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 text-white',
                          r.status === 'returned' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' :
                          r.status === 'picked_up' ? (overdue > 0 ? 'bg-gradient-to-br from-red-400 to-red-600' : 'bg-gradient-to-br from-blue-400 to-blue-600') :
                          r.status === 'approved' ? 'bg-gradient-to-br from-primary-400 to-primary-600' :
                          r.status === 'waitlisted' ? 'bg-gradient-to-br from-purple-400 to-purple-600' :
                          'bg-gradient-to-br from-amber-400 to-amber-600')}>
                          <Package size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-3">
                            <span className="font-mono text-xs text-primary-600">{r.code}</span>
                            <ReservationStatusBadge status={r.status} />
                            {overdue > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 animate-pulse">🔴 逾期 {overdue} 天</span>}
                            {r.waitlistPosition !== undefined && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">候补 #{r.waitlistPosition}</span>}
                          </div>
                          <h4 className="mt-2 font-semibold text-gray-900 text-lg">
                            {r.suppliesName}
                            {r.replacementSuppliesName && <span className="ml-2 text-xs text-indigo-600 font-normal bg-indigo-50 px-2 py-0.5 rounded-md">替换品：{r.replacementSuppliesName}</span>}
                          </h4>
                          <div className="mt-1 text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                            <BookOpen size={14} className="text-gray-400" />
                            {r.className}
                            <span className="text-gray-300">|</span>
                            <span>{suppliesCategoryMap[r.suppliesCategory]}</span>
                            {r.suppliesCode && <><span className="text-gray-300">|</span><span className="font-mono text-xs text-gray-500">{r.suppliesCode}</span></>}
                          </div>
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1"><Calendar size={11} /> 预约：{formatDateTime(r.createdAt)}</div>
                            {r.estimatedPickupTime && <div className="flex items-center gap-1"><Clock size={11} /> 应取：{formatDateTime(r.estimatedPickupTime)}</div>}
                            {pickup && <div className="text-blue-600">✅ 领取：{formatDateTime(pickup.pickupTime)}</div>}
                            {pickup && <div className={clsx('flex items-center gap-1', pickup.isReturned ? 'text-emerald-600' : overdue > 0 ? 'text-danger font-semibold' : 'text-orange-600')}>
                              {pickup.isReturned ? `✅ 归还：${formatDateTime(pickup.actualReturnTime)}` : `⏰ 应还：${formatDateTime(pickup.expectedReturnTime)}`}
                            </div>}
                          </div>
                        </div>
                      </div>
                      <div className="hidden md:flex flex-col items-end gap-2 flex-shrink-0">
                        {r.status === 'approved' && <button onClick={e => { e.stopPropagation(); navigate('/pickup') }} className="btn-primary text-xs py-1 px-3 whitespace-nowrap">到护士站领取</button>}
                        {r.status === 'waitlisted' && <button onClick={e => { e.stopPropagation(); navigate('/waitlist') }} className="btn-secondary text-xs py-1 px-3 whitespace-nowrap">查看候补</button>}
                        {(r.status === 'picked_up' && !pickup?.isReturned) && <button onClick={e => { e.stopPropagation(); navigate('/return') }} className={clsx('text-xs py-1 px-3 whitespace-nowrap', overdue > 0 ? 'btn-danger' : 'btn-outline')}>{overdue > 0 ? '逾期归还' : '办理归还'}</button>}
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
  )
}
