import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  Package,
  Check,
  AlertCircle,
  ListChecks,
  UserPlus,
  X,
  AlertTriangle,
  Loader2,
  Clock4,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { ClassStatusBadge, RegistrationStatusBadge, ReservationStatusBadge, Steps, EmptyState } from '../components/ui'
import { formatDateTime, formatTime, formatDateCN } from '../utils/format'
import { suppliesCategoryMap, SuppliesCategory, Registration, Reservation } from '../types'
import clsx from 'clsx'

export default function ClassDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    classes,
    registrations,
    reservations,
    supplies,
    pickupRecords,
    overdueRecords,
    currentUser,
    registerForClass,
    updateRegistrationStatus,
    createReservation,
    updateClassStatus,
    users,
  } = useAppStore()

  const cls = classes.find((c) => c.id === id)
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<SuppliesCategory | null>(null)
  const [reserveStep, setReserveStep] = useState(0)
  const [reserveResult, setReserveResult] = useState<{ success: boolean; message: string; reservation?: Reservation } | null>(null)
  const [showCheckReg, setShowCheckReg] = useState(false)

  const myRegistration = useMemo(() => {
    if (currentUser.role !== 'parent') return null
    return registrations.find((r) => r.classId === id && r.parentId === currentUser.id)
  }, [registrations, id, currentUser])

  const myReservations = useMemo(() => {
    if (currentUser.role !== 'parent') return []
    return reservations.filter((r) => r.classId === id && r.parentId === currentUser.id)
  }, [reservations, id, currentUser])

  const classRegistrations = useMemo(() => {
    return registrations.filter((r) => r.classId === id)
  }, [registrations, id])

  const classReservations = useMemo(() => {
    return reservations.filter((r) => r.classId === id)
  }, [reservations, id])

  if (!cls) {
    return (
      <div>
        <button onClick={() => navigate('/classes')} className="flex items-center gap-2 text-gray-600 mb-6 hover:text-gray-900">
          <ArrowLeft size={18} /> 返回课堂列表
        </button>
        <EmptyState title="课堂不存在" description="该课堂可能已被删除" />
      </div>
    )
  }

  const checkEligibility = () => {
    if (!myRegistration || !['approved', 'attended'].includes(myRegistration.status)) {
      return { ok: false, reason: '未通过课堂报名审核，不能预约用品' }
    }
    const overdue = overdueRecords.find(
      (o) => o.familyId === currentUser.familyId && o.isFrozen
    )
    if (overdue) {
      return { ok: false, reason: '账户因逾期被冻结，请先归还用品并解冻' }
    }
    const unreturned = pickupRecords.filter(
      (p) => p.familyId === currentUser.familyId && !p.isReturned
    )
    if (unreturned.length >= 3) {
      return { ok: false, reason: `家庭已有${unreturned.length}件用品未归还，请先归还后再预约` }
    }
    return { ok: true }
  }

  const getAvailability = (category: SuppliesCategory) => {
    const req = cls.suppliesRequirements.find((r) => r.category === category)
    if (!req) return { total: 0, reserved: 0, available: 0, availableSupplies: [] }
    const reservedCount = classReservations.filter(
      (r) =>
        r.suppliesCategory === category &&
        ['pending', 'approved', 'picked_up'].includes(r.status)
    ).length
    const availableSupplies = supplies.filter(
      (s) => s.category === category && s.status === 'available' && s.lastSterilizedBatch
    )
    return {
      total: req.quantity,
      reserved: reservedCount,
      available: Math.max(req.quantity - reservedCount, 0) + availableSupplies.length,
      availableSupplies,
    }
  }

  const handleReserve = () => {
    if (!selectedCategory || !myRegistration) return
    setReserveStep(1)
    setTimeout(() => {
      const result = createReservation({
        classId: cls.id,
        className: cls.title,
        suppliesCategory: selectedCategory,
        parentId: currentUser.id,
        parentName: currentUser.name,
        familyId: currentUser.familyId || 'f_' + Date.now(),
      })
      setReserveResult(result)
      setReserveStep(2)
    }, 800)
  }

  const resetReserve = () => {
    setShowReserveModal(false)
    setTimeout(() => {
      setSelectedCategory(null)
      setReserveStep(0)
      setReserveResult(null)
    }, 200)
  }

  const eligibility = checkEligibility()

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/classes')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{cls.title}</h1>
              <ClassStatusBadge status={cls.status} />
              <span className="text-sm text-gray-500">{cls.code}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{cls.description}</p>
          </div>
        </div>
        {currentUser.role === 'lecturer' && cls.lecturerId === currentUser.id && (
          <div className="flex gap-2">
            {cls.status === 'draft' && (
              <button onClick={() => updateClassStatus(cls.id, 'published')} className="btn-primary">
                发布课堂
              </button>
            )}
            {cls.status === 'published' && (
              <button onClick={() => updateClassStatus(cls.id, 'open')} className="btn-success">
                开启报名
              </button>
            )}
            {cls.status === 'open' && (
              <button onClick={() => updateClassStatus(cls.id, 'ongoing')} className="btn-primary">
                开始上课
              </button>
            )}
            {(cls.status === 'ongoing') && (
              <button onClick={() => updateClassStatus(cls.id, 'completed')} className="btn-success">
                结束课堂
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="h-40 bg-gradient-to-br from-primary-400 via-pink-400 to-purple-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex flex-wrap gap-6 text-white">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} />
                    <span className="font-medium">{formatDateCN(cls.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={18} />
                    <span className="font-medium">{formatTime(cls.startTime)} - {formatTime(cls.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={18} />
                    <span className="font-medium">{cls.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={18} />
                    <span className="font-medium">{cls.lecturerName}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-body grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-xl bg-blue-50">
                <div className="text-3xl font-bold text-blue-600">{cls.maxParticipants}</div>
                <div className="text-xs text-blue-700 mt-1">最大名额</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50">
                <div className="text-3xl font-bold text-emerald-600">{cls.currentParticipants}</div>
                <div className="text-xs text-emerald-700 mt-1">已报名</div>
              </div>
              <div className="p-3 rounded-xl bg-purple-50">
                <div className="text-3xl font-bold text-purple-600">{cls.suppliesRequirements.length}</div>
                <div className="text-xs text-purple-700 mt-1">辅具种类</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package size={18} className="text-primary-500" />
                辅具需求与库存
              </h3>
              {currentUser.role === 'parent' && cls.suppliesRequirements.length > 0 && (
                <button
                  onClick={() => {
                    if (!eligibility.ok) {
                      setShowCheckReg(true)
                    } else {
                      setShowReserveModal(true)
                    }
                  }}
                  className="btn-primary text-sm"
                >
                  <Package size={14} className="mr-2" />
                  预约用品
                </button>
              )}
            </div>
            <div className="card-body space-y-3">
              {cls.suppliesRequirements.map((req, i) => {
                const av = getAvailability(req.category)
                const pct = av.total > 0 ? (av.reserved / av.total) * 100 : 0
                const myRes = myReservations.find(
                  (r) => r.suppliesCategory === req.category
                )
                return (
                  <div key={i} className="p-4 rounded-xl border border-gray-200 hover:border-primary-200 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{suppliesCategoryMap[req.category]}</h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            需求 {req.quantity} 件
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock4 size={12} />
                          最晚领取 {formatDateTime(req.latestPickupTime)}
                        </div>
                      </div>
                      {myRes && <ReservationStatusBadge status={myRes.status} />}
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              'h-full rounded-full transition-all',
                              pct >= 100
                                ? 'bg-danger'
                                : pct >= 80
                                ? 'bg-warning'
                                : 'bg-gradient-to-r from-primary-400 to-primary-600'
                            )}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>已预约 {av.reserved}</span>
                          <span>剩余配额 {Math.max(req.quantity - av.reserved, 0)} · 可用库存 {av.availableSupplies.length}</span>
                        </div>
                      </div>
                      {av.availableSupplies.length === 0 && (
                        <span className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-700 border border-red-100">
                          库存不足
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {myReservations.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ListChecks size={18} className="text-primary-500" />
                  我的用品预约
                </h3>
              </div>
              <div className="card-body p-0">
                <table className="table">
                  <thead>
                    <tr>
                      <th>用品</th>
                      <th>编码</th>
                      <th>状态</th>
                      <th>预计领取</th>
                      <th>预计归还</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myReservations.map((r) => (
                      <tr key={r.id}>
                        <td className="font-medium">{r.suppliesName}</td>
                        <td className="text-gray-500">{r.suppliesCode || '-'}</td>
                        <td><ReservationStatusBadge status={r.status} /></td>
                        <td className="text-gray-500">{formatDateTime(r.estimatedPickupTime)}</td>
                        <td className="text-gray-500">{formatDateTime(r.estimatedReturnTime)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users size={18} className="text-primary-500" />
                我的报名状态
              </h3>
            </div>
            <div className="card-body">
              {myRegistration ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">报名状态</span>
                    <RegistrationStatusBadge status={myRegistration.status} />
                  </div>
                  <div className="text-xs text-gray-500">
                    报名时间：{formatDateTime(myRegistration.registeredAt)}
                  </div>
                </div>
              ) : currentUser.role === 'parent' ? (
                <div>
                  <div className="text-sm text-gray-500 mb-4">您尚未报名本课堂</div>
                  <button
                    onClick={() => registerForClass(cls.id, currentUser.id)}
                    disabled={cls.status !== 'open' && cls.status !== 'published'}
                    className="btn-primary w-full"
                  >
                    <UserPlus size={16} className="mr-2" />
                    {cls.currentParticipants >= cls.maxParticipants ? '候补报名' : '立即报名'}
                  </button>
                  {(cls.status !== 'open' && cls.status !== 'published') && (
                    <p className="text-xs text-gray-500 mt-2 text-center">当前状态下不可报名</p>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-2">
                  {currentUser.role === 'lecturer' ? '这是您发布的课堂' : '家长角色可查看报名'}
                </div>
              )}
            </div>
          </div>

          {(currentUser.role === 'lecturer' || currentUser.role === 'nurse') && (
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ListChecks size={18} className="text-blue-500" />
                  报名名单（{classRegistrations.length}）
                </h3>
              </div>
              <div className="card-body p-0 max-h-96 overflow-y-auto">
                {classRegistrations.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">暂无报名</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {classRegistrations.map((r) => (
                      <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center text-white text-sm font-medium">
                          {r.parentName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{r.parentName}</div>
                          <div className="text-xs text-gray-500">{formatDateTime(r.registeredAt)}</div>
                        </div>
                        <RegistrationStatusBadge status={r.status} />
                        {currentUser.role === 'lecturer' && r.status === 'pending' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateRegistrationStatus(r.id, 'approved')}
                              className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50"
                              title="通过"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => updateRegistrationStatus(r.id, 'rejected')}
                              className="p-1.5 rounded-md text-danger hover:bg-red-50"
                              title="拒绝"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showReserveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-slide-up overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">预约课堂用品</h3>
              {reserveStep < 2 && (
                <button
                  onClick={resetReserve}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <div className="p-6">
              <Steps
                steps={[
                  { label: '选择用品', description: '课堂所需辅具' },
                  { label: '库存校验', description: '检查名额与消毒状态' },
                  { label: '预约完成', description: '查看结果' },
                ]}
                current={reserveStep}
              />
            </div>

            {reserveStep === 0 && (
              <div className="px-6 pb-6">
                <div className="text-sm text-gray-500 mb-4">
                  选择需要预约的用品类型，每个类型限预约1件
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cls.suppliesRequirements.map((req) => {
                    const av = getAvailability(req.category)
                    const already = myReservations.find(
                      (r) =>
                        r.suppliesCategory === req.category &&
                        ['pending', 'approved', 'picked_up', 'waitlisted'].includes(r.status)
                    )
                    const disabled = !!already || (av.available === 0 && av.availableSupplies.length === 0)
                    return (
                      <button
                        key={req.category}
                        disabled={disabled}
                        onClick={() => setSelectedCategory(req.category)}
                        className={clsx(
                          'p-4 rounded-xl border-2 text-left transition-all',
                          selectedCategory === req.category
                            ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-100'
                            : 'border-gray-200 hover:border-primary-300',
                          disabled && 'opacity-50 cursor-not-allowed hover:border-gray-200'
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{suppliesCategoryMap[req.category]}</h4>
                          {selectedCategory === req.category && (
                            <div className="w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center">
                              <Check size={14} />
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <div>配额 {req.quantity} · 已约 {av.reserved}</div>
                          <div>库存可用 {av.availableSupplies.length} 件</div>
                        </div>
                        {already && (
                          <div className="mt-2 text-xs text-primary-600 font-medium">
                            您已预约（{already.status === 'waitlisted' ? '候补中' : '待领取'}）
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={resetReserve} className="btn-outline">取消</button>
                  <button
                    onClick={handleReserve}
                    disabled={!selectedCategory}
                    className="btn-primary"
                  >
                    确认预约
                  </button>
                </div>
              </div>
            )}

            {reserveStep === 1 && (
              <div className="px-6 pb-16 text-center py-8">
                <Loader2 size={40} className="mx-auto text-primary-500 animate-spin" />
                <div className="mt-4 text-gray-700 font-medium">正在校验库存与资格...</div>
                <div className="text-sm text-gray-500 mt-1">检查课堂报名、家庭用品、消毒批次与同日占用</div>
              </div>
            )}

            {reserveStep === 2 && reserveResult && (
              <div className="px-6 pb-6">
                <div className={clsx(
                  'p-6 rounded-xl text-center',
                  reserveResult.success ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
                )}>
                  <div className={clsx(
                    'w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white',
                    reserveResult.success ? 'bg-emerald-500' : 'bg-red-500'
                  )}>
                    {reserveResult.success ? <Check size={32} /> : <AlertTriangle size={32} />}
                  </div>
                  <h4 className={clsx(
                    'text-lg font-semibold mt-4',
                    reserveResult.success ? 'text-emerald-900' : 'text-red-900'
                  )}>
                    {reserveResult.success ? '预约成功' : '预约失败'}
                  </h4>
                  <p className={clsx(
                    'mt-2',
                    reserveResult.success ? 'text-emerald-700' : 'text-red-700'
                  )}>
                    {reserveResult.message}
                  </p>
                  {reserveResult.success && reserveResult.reservation && (
                    <div className="mt-4 text-sm text-gray-600 bg-white rounded-lg p-4 text-left">
                      <div className="flex justify-between py-1">
                        <span>预约单号</span>
                        <span className="font-mono font-medium">{reserveResult.reservation.code}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>用品类型</span>
                        <span className="font-medium">{suppliesCategoryMap[reserveResult.reservation.suppliesCategory]}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>状态</span>
                        <ReservationStatusBadge status={reserveResult.reservation.status} />
                      </div>
                    </div>
                  )}
                </div>
                {!reserveResult.success && (reserveResult.message.includes('候补') || reserveResult.message.includes('替换')) && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button className="btn-secondary" onClick={() => { setShowReserveModal(false); navigate('/waitlist') }}>
                      加入候补
                    </button>
                    <button className="btn-outline" onClick={() => { setShowReserveModal(false); navigate('/supplies') }}>
                      查看替换用品
                    </button>
                  </div>
                )}
                <div className="mt-6 flex justify-end">
                  <button onClick={resetReserve} className={reserveResult.success ? 'btn-primary' : 'btn-outline'}>
                    {reserveResult.success ? '完成' : '关闭'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showCheckReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle size={20} className="text-warning" />
                不能预约用品
              </h3>
              <button onClick={() => setShowCheckReg(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-sm text-amber-900">{eligibility.reason}</div>
              </div>
              <div className="mt-6 text-sm text-gray-600 space-y-2">
                <p className="font-medium text-gray-900">预约用品需满足：</p>
                <ul className="list-disc list-inside space-y-1 text-gray-500">
                  <li>已报名并通过该课堂审核 <span className="text-emerald-600">（未参加课堂不能领取）</span></li>
                  <li>家庭未归还用品不超过 3 件</li>
                  <li>账户未被逾期冻结（如有逾期请先归还）</li>
                  <li>用品非消毒中状态 <span className="text-emerald-600">（消毒中不能预约）</span></li>
                </ul>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setShowCheckReg(false)} className="btn-primary">
                  我知道了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
