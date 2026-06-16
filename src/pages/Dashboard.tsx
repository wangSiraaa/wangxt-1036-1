import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Package,
  ClipboardList,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Users,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { StatCard, ClassStatusBadge, ReservationStatusBadge, OverdueBadge, EmptyState } from '../components/ui'
import { formatDateCN, formatDateTime, formatTime } from '../utils/format'
import { suppliesCategoryMap, suppliesStatusMap } from '../types'

export default function Dashboard() {
  const {
    currentUser,
    classes,
    supplies,
    reservations,
    pickupRecords,
    returnRecords,
    sterilizationRecords,
    overdueRecords,
    waitlistEntries,
  } = useAppStore()
  const navigate = useNavigate()

  const stats = useMemo(() => {
    const todayClasses = classes.filter(
      (c) => c.status === 'open' || c.status === 'ongoing'
    ).length
    const availableSupplies = supplies.filter((s) => s.status === 'available').length
    const pendingPickups = reservations.filter((r) => r.status === 'approved').length
    const unreturned = pickupRecords.filter((p) => !p.isReturned).length
    const sterilizing = sterilizationRecords.filter((s) => s.status === 'in_progress').length
    const overdue = overdueRecords.filter((o) => o.overdueDays > 0).length

    return {
      todayClasses,
      availableSupplies,
      pendingPickups,
      unreturned,
      sterilizing,
      overdue,
    }
  }, [classes, supplies, reservations, pickupRecords, sterilizationRecords, overdueRecords])

  const today = new Date().toISOString().slice(0, 10)
  const upcomingClasses = useMemo(() => {
    return classes
      .filter((c) => new Date(c.startTime) >= new Date(today) && c.status !== 'completed' && c.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5)
  }, [classes, today])

  const recentActivity = useMemo(() => {
    const events: Array<{
      id: string
      type: string
      title: string
      time: string
      color: string
    }> = []
    reservations.slice(-5).forEach((r) => {
      events.push({
        id: r.id,
        type: '预约',
        title: `${r.parentName} 预约了 ${r.suppliesName}（${r.className}）`,
        time: r.createdAt,
        color: 'bg-blue-500',
      })
    })
    pickupRecords.slice(-5).forEach((p) => {
      events.push({
        id: p.id,
        type: '领用',
        title: `${p.parentName} 领取了 ${p.suppliesName}`,
        time: p.pickupTime,
        color: 'bg-emerald-500',
      })
    })
    returnRecords.slice(-5).forEach((r) => {
      events.push({
        id: r.id,
        type: '归还',
        title: `${r.nurseName} 办理了 ${r.suppliesName} 的归还`,
        time: r.returnedAt,
        color: 'bg-purple-500',
      })
    })
    return events
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8)
  }, [reservations, pickupRecords, returnRecords])

  const suppliesByCategory = useMemo(() => {
    const map: Record<string, { total: number; available: number; sterilizing: number; inUse: number }> = {}
    Object.keys(suppliesCategoryMap).forEach((k) => {
      map[k] = { total: 0, available: 0, sterilizing: 0, inUse: 0 }
    })
    supplies.forEach((s) => {
      map[s.category].total++
      if (s.status === 'available') map[s.category].available++
      if (s.status === 'sterilizing') map[s.category].sterilizing++
      if (s.status === 'in_use') map[s.category].inUse++
    })
    return map
  }, [supplies])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工作台</h1>
          <p className="text-sm text-gray-500 mt-1">
            欢迎回来，{currentUser.name}！今日概览数据如下
          </p>
        </div>
        <div className="flex gap-3">
          {currentUser.role === 'lecturer' && (
            <button onClick={() => navigate('/classes/publish')} className="btn-primary">
              <BookOpen size={16} className="mr-2" />
              发布课堂
            </button>
          )}
          {currentUser.role === 'nurse' && (
            <>
              <button onClick={() => navigate('/pickup')} className="btn-primary">
                <ClipboardList size={16} className="mr-2" />
                领用办理
              </button>
              <button onClick={() => navigate('/return')} className="btn-secondary">
                <RotateCcw size={16} className="mr-2" />
                归还办理
              </button>
            </>
          )}
          {currentUser.role === 'parent' && (
            <button onClick={() => navigate('/classes')} className="btn-primary">
              <BookOpen size={16} className="mr-2" />
              预约课堂
            </button>
          )}
          {currentUser.role === 'warehouse' && (
            <button onClick={() => navigate('/sterilization')} className="btn-primary">
              <Sparkles size={16} className="mr-2" />
              消毒管理
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="进行中/报名中课堂" value={stats.todayClasses} icon={<BookOpen size={20} />} color="primary" />
        <StatCard label="可用用品" value={stats.availableSupplies} icon={<Package size={20} />} color="success" />
        <StatCard label="待领取预约" value={stats.pendingPickups} icon={<ClipboardList size={20} />} color="info" />
        <StatCard label="未归还" value={stats.unreturned} icon={<RotateCcw size={20} />} color="warning" />
        <StatCard label="消毒中批次" value={stats.sterilizing} icon={<Sparkles size={20} />} color="primary" />
        <StatCard label="逾期记录" value={stats.overdue} icon={<AlertTriangle size={20} />} color="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen size={18} className="text-primary-500" />
              即将开始的课堂
            </h3>
            <button onClick={() => navigate('/classes')} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
              查看全部 <ArrowRight size={14} />
            </button>
          </div>
          <div className="card-body p-0">
            {upcomingClasses.length === 0 ? (
              <EmptyState title="暂未安排课堂" description="发布或报名新课堂后将在此显示" />
            ) : (
              <div className="divide-y divide-gray-100">
                {upcomingClasses.map((c) => (
                  <div key={c.id} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(`/classes/${c.id}`)}>
                    <div className="flex items-start gap-4">
                      <div className="w-16 text-center">
                        <div className="text-xs text-primary-600 font-medium">{formatDateCN(c.startTime).split(' ')[0]}</div>
                        <div className="text-2xl font-bold text-gray-900">{new Date(c.startTime).getDate()}</div>
                        <div className="text-xs text-gray-500">{formatDateCN(c.startTime).split(' ')[1]}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900 truncate">{c.title}</h4>
                          <ClassStatusBadge status={c.status} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatTime(c.startTime)} - {formatTime(c.endTime)}
                          </span>
                          <span>{c.location}</span>
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            {c.currentParticipants}/{c.maxParticipants}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {c.suppliesRequirements.map((r, i) => (
                            <span key={i} className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded-md">
                              {suppliesCategoryMap[r.category]} × {r.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-gray-300 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package size={18} className="text-emerald-500" />
                用品库存概览
              </h3>
            </div>
            <div className="card-body space-y-3">
              {Object.entries(suppliesCategoryMap).map(([k, name]) => {
                const data = suppliesByCategory[k] || { total: 0, available: 0 }
                const pct = data.total > 0 ? (data.available / data.total) * 100 : 0
                return (
                  <div key={k}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{name}</span>
                      <span className="text-gray-500">
                        {data.available}/{data.total} 可用
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle size={18} className="text-danger" />
                逾期 & 候补预警
              </h3>
            </div>
            <div className="card-body space-y-3 max-h-64 overflow-y-auto">
              {overdueRecords.length === 0 && waitlistEntries.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500">暂无预警</div>
              ) : (
                <>
                  {overdueRecords.map((o) => (
                    <div key={o.id} className="p-3 rounded-lg bg-red-50 border border-red-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-red-900">{o.suppliesName}</span>
                        <OverdueBadge overdueDays={o.overdueDays} isFrozen={o.isFrozen} />
                      </div>
                      <div className="text-xs text-red-700 mt-1">
                        {o.parentName} · 应归还 {formatDateCN(o.expectedReturnTime)}
                      </div>
                    </div>
                  ))}
                  {waitlistEntries.filter((w) => w.status === 'waiting').map((w) => (
                    <div key={w.id} className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-amber-900">候补 #{w.position}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                          {suppliesCategoryMap[w.suppliesCategory]}
                        </span>
                      </div>
                      <div className="text-xs text-amber-700 mt-1">
                        {w.parentName} · {w.className}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList size={18} className="text-blue-500" />
            最近动态
          </h3>
        </div>
        <div className="card-body p-0">
          {recentActivity.length === 0 ? (
            <EmptyState title="暂无动态" description="完成操作后将在此记录" />
          ) : (
            <div className="divide-y divide-gray-100">
              {recentActivity.map((e) => (
                <div key={e.id} className="px-6 py-3 flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${e.color}`} />
                  <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium w-12 text-center">
                    {e.type}
                  </span>
                  <span className="text-sm text-gray-700 flex-1">{e.title}</span>
                  <span className="text-xs text-gray-400">{formatDateTime(e.time)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {currentUser.role === 'warehouse' && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-purple-500" />
              周转看板
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-5 gap-4">
              {Object.entries(suppliesStatusMap).map(([k, name]) => {
                const count = supplies.filter((s) => s.status === k).length
                const colors: Record<string, string> = {
                  available: 'from-emerald-400 to-emerald-600',
                  in_use: 'from-blue-400 to-blue-600',
                  sterilizing: 'from-purple-400 to-purple-600',
                  maintenance: 'from-orange-400 to-orange-600',
                  reserved: 'from-amber-400 to-amber-600',
                }
                return (
                  <div key={k} className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center">
                    <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${colors[k]} text-white flex items-center justify-center text-xl font-bold shadow-sm`}>
                      {count}
                    </div>
                    <div className="text-sm font-medium text-gray-700 mt-2">{name}</div>
                  </div>
                )
              })}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="text-xs font-medium text-blue-600 uppercase">本月周转次数</div>
                <div className="text-3xl font-bold text-blue-900 mt-1">
                  {returnRecords.length + pickupRecords.length}
                </div>
                <div className="text-xs text-blue-600 mt-2">
                  领出 {pickupRecords.length} · 归还 {returnRecords.length}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="text-xs font-medium text-emerald-600 uppercase">已完成消毒批次</div>
                <div className="text-3xl font-bold text-emerald-900 mt-1">
                  {sterilizationRecords.filter((s) => s.status === 'completed').length}
                </div>
                <div className="text-xs text-emerald-600 mt-2">
                  覆盖用品 {supplies.filter((s) => s.lastSterilizedBatch).length} 件
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
