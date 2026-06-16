import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  Search,
  Package,
  Calendar,
  Clock,
  QrCode,
  Sparkles,
  User,
  BookOpen,
  AlertCircle,
  Check,
  X,
  Info,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { ReservationStatusBadge, Steps, EmptyState } from '../components/ui'
import { formatDateTime } from '../utils/format'
import { suppliesCategoryMap, PickupRecord, Reservation, UserRole } from '../types'
import clsx from 'clsx'

export default function Pickup() {
  const {
    currentUser,
    reservations,
    registrations,
    pickupRecords,
    supplies,
    createPickup,
    users,
  } = useAppStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [selected, setSelected] = useState<Reservation | null>(null)
  const [batchNumber, setBatchNumber] = useState('')
  const [usageNotes, setUsageNotes] = useState('')
  const [error, setError] = useState('')
  const [resultMsg, setResultMsg] = useState('')

  const pendingReservations = useMemo(() => {
    let list = reservations.filter((r) => r.status === 'approved' || r.status === 'pending')
    if (searchText) {
      list = list.filter(
        (r) =>
          r.parentName.includes(searchText) ||
          r.suppliesName.includes(searchText) ||
          r.className.includes(searchText) ||
          r.code.toLowerCase().includes(searchText.toLowerCase())
      )
    }
    return list
  }, [reservations, searchText])

  const handleSelect = (r: Reservation) => {
    const reg = registrations.find((reg) => reg.classId === r.classId && reg.parentId === r.parentId)
    if (!reg || !['approved', 'attended'].includes(reg.status)) {
      setError('该家长未通过课堂报名审核，不能领取')
      return
    }
    if (!r.suppliesId) {
      setError('该预约尚未分配具体用品，请先分配库存')
      return
    }
    const supply = supplies.find((s) => s.id === r.suppliesId)
    if (!supply || !supply.lastSterilizedBatch) {
      setError('分配的用品未完成消毒，消毒中不能领取')
      return
    }
    setError('')
    setSelected(r)
    setBatchNumber(supply.lastSterilizedBatch || '')
    setStep(1)
  }

  const handleConfirmPickup = () => {
    if (!selected || !selected.suppliesId || !currentUser) return
    const supply = supplies.find((s) => s.id === selected.suppliesId)
    if (!supply) return
    createPickup({
      reservationId: selected.id,
      suppliesId: supply.id,
      suppliesName: supply.name,
      suppliesCode: supply.code,
      suppliesCategory: supply.category,
      parentId: selected.parentId,
      parentName: selected.parentName,
      familyId: selected.familyId,
      classId: selected.classId,
      className: selected.className,
      nurseId: currentUser.id,
      nurseName: currentUser.name,
      sterilizedBatch: batchNumber,
      usageNotes: usageNotes || undefined,
      pickupTime: new Date().toISOString(),
      expectedReturnTime: selected.estimatedReturnTime || new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      isReturned: false,
    })
    setStep(2)
    setResultMsg(`${selected.parentName} 已成功领取 ${supply.name}（${supply.code}）`)
  }

  const reset = () => {
    setStep(0)
    setSelected(null)
    setBatchNumber('')
    setUsageNotes('')
    setSearchText('')
    setError('')
    setResultMsg('')
  }

  if (currentUser.role !== 'nurse') {
    return (
      <div className="card">
        <div className="card-body text-center py-16">
          <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">护士专属功能</h2>
          <p className="text-gray-500 mt-2">请切换到护士角色使用领用办理功能</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary mt-6">
            返回工作台
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">领用办理</h1>
          <p className="text-sm text-gray-500 mt-1">为家长办理课堂辅具领用，记录消毒批号与使用提醒</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <Steps
            steps={[
              { label: '选择预约', description: '查找待领取预约' },
              { label: '核对信息', description: '记录消毒批号' },
              { label: '领取完成', description: '家长签字确认' },
            ]}
            current={step}
          />
        </div>
      </div>

      {step === 0 && (
        <div className="card">
          <div className="card-body flex flex-wrap items-center gap-4 border-b border-gray-100">
            <div className="relative flex-1 min-w-[300px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <QrCode size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="输入预约单号、家长姓名、用品名称或课堂名称查找..."
                className="input pl-10 pr-10"
              />
            </div>
            <span className="text-sm text-gray-500">
              共 {pendingReservations.length} 条待领取
            </span>
          </div>
          {error && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          <div className="max-h-[500px] overflow-y-auto">
            {pendingReservations.length === 0 ? (
              <EmptyState title="暂无待领取预约" description="完成预约审批后将在此显示" />
            ) : (
              <table className="table">
                <thead className="sticky top-0 bg-white z-10 shadow-sm">
                  <tr>
                    <th>预约单号</th>
                    <th>家长</th>
                    <th>用品</th>
                    <th>课堂</th>
                    <th>状态</th>
                    <th>预计领取</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReservations.map((r) => {
                    const supply = r.suppliesId ? supplies.find((s) => s.id === r.suppliesId) : null
                    return (
                      <tr key={r.id}>
                        <td className="font-mono text-xs text-primary-600">{r.code}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center text-white text-xs font-medium">
                              {r.parentName.charAt(0)}
                            </div>
                            <span className="font-medium">{r.parentName}</span>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div className="font-medium">{r.suppliesName}</div>
                            <div className="text-xs text-gray-500">
                              {suppliesCategoryMap[r.suppliesCategory]} · {supply?.code || '待分配'}
                            </div>
                          </div>
                        </td>
                        <td className="text-gray-600">{r.className}</td>
                        <td><ReservationStatusBadge status={r.status} /></td>
                        <td className="text-gray-500 text-xs">{formatDateTime(r.estimatedPickupTime)}</td>
                        <td>
                          <button
                            onClick={() => handleSelect(r)}
                            className="btn-primary text-sm py-1.5 px-3"
                          >
                            办理领用
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {step === 1 && selected && (
        <div className="card animate-slide-up">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles size={18} className="text-primary-500" />
              领用登记信息
            </h3>
            <button onClick={() => setStep(0)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <X size={14} /> 返回列表
            </button>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 border-b border-gray-100 pb-2">预约信息核对</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">预约单号：</span>
                  <span className="font-mono font-medium text-primary-600">{selected.code}</span>
                </div>
                <div>
                  <span className="text-gray-500">课堂：</span>
                  <span className="font-medium">{selected.className}</span>
                </div>
                <div>
                  <span className="text-gray-500">家长：</span>
                  <span className="font-medium">{selected.parentName}</span>
                </div>
                <div>
                  <span className="text-gray-500">用品类型：</span>
                  <span className="font-medium">{suppliesCategoryMap[selected.suppliesCategory]}</span>
                </div>
                <div>
                  <span className="text-gray-500">用品：</span>
                  <span className="font-medium">{selected.suppliesName}</span>
                </div>
                <div>
                  <span className="text-gray-500">预计归还：</span>
                  <span className="font-medium text-orange-600">{formatDateTime(selected.estimatedReturnTime)}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-start gap-2">
                  <Check size={18} className="text-emerald-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-emerald-900">资格校验通过</div>
                    <div className="text-xs text-emerald-700 mt-0.5">
                      课堂报名已通过 · 用品已消毒 · 家庭无逾期冻结
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 border-b border-gray-100 pb-2">护士登记信息</h4>
              <div>
                <label className="label flex items-center gap-1">
                  <Sparkles size={14} className="text-purple-500" />
                  消毒批号 <span className="text-danger">*</span>
                </label>
                <input
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="扫描或输入消毒批次号"
                  className="input font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  系统已自动带出用品最近一次消毒批号，如有更换请手动输入
                </p>
              </div>
              <div>
                <label className="label flex items-center gap-1">
                  <Info size={14} className="text-blue-500" />
                  适用提醒（交给家长时口头告知并记录）
                </label>
                <textarea
                  value={usageNotes}
                  onChange={(e) => setUsageNotes(e.target.value)}
                  placeholder="例如：使用前请洗手，避免接触化学品；秤盘使用时请垫干净毛巾..."
                  rows={4}
                  className="input resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(0)} className="btn-outline flex-1">返回</button>
                <button
                  onClick={handleConfirmPickup}
                  disabled={!batchNumber}
                  className="btn-success flex-1"
                >
                  <Check size={16} className="mr-2" />
                  确认领取
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card animate-slide-up">
          <div className="card-body py-12 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
              <Check size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mt-6">领用办理成功</h3>
            <p className="text-gray-600 mt-2">{resultMsg}</p>
            <div className="mt-8 flex gap-4 justify-center">
              <button onClick={reset} className="btn-primary">
                继续办理下一个
              </button>
              <button onClick={() => navigate('/return')} className="btn-outline">
                前往归还办理
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
