import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RotateCcw,
  Search,
  Package,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  AlertCircle,
  Check,
  Clock,
  BookOpen,
  User,
  X,
  Info,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { ReturnConditionBadge, Steps, EmptyState } from '../components/ui'
import { formatDateTime, getOverdueDays } from '../utils/format'
import { suppliesCategoryMap, ReturnCondition, PickupRecord } from '../types'
import clsx from 'clsx'

export default function ReturnPage() {
  const { currentUser, pickupRecords, classes, supplies, createReturn, reservations } = useAppStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [selected, setSelected] = useState<PickupRecord | null>(null)
  const [condition, setCondition] = useState<ReturnCondition>('good')
  const [needReSterilize, setNeedReSterilize] = useState(true)
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState<{ message: string; affects?: boolean; className?: string } | null>(null)

  const unreturned = useMemo(() => {
    let list = pickupRecords.filter((p) => !p.isReturned)
    if (searchText) {
      list = list.filter(
        (p) =>
          p.parentName.includes(searchText) ||
          p.suppliesName.includes(searchText) ||
          p.suppliesCode.includes(searchText) ||
          p.className.includes(searchText) ||
          p.sterilizedBatch.includes(searchText)
      )
    }
    return list
  }, [pickupRecords, searchText])

  const handleSelect = (p: PickupRecord) => {
    setSelected(p)
    setCondition('good')
    setNeedReSterilize(true)
    setNotes('')
    setStep(1)
  }

  const handleConfirm = () => {
    if (!selected || !currentUser) return
    const res = createReturn({
      pickupId: selected.id,
      suppliesId: selected.suppliesId,
      suppliesName: selected.suppliesName,
      condition,
      needReSterilize,
      affectsNextClass: false,
      notes: notes || undefined,
      nurseId: currentUser.id,
      nurseName: currentUser.name,
      returnedAt: new Date().toISOString(),
    })
    setResult({
      message: res.message,
      affects: res.affectsNextClass,
      className: res.affectedClassName,
    })
    setStep(2)
  }

  const reset = () => {
    setStep(0)
    setSelected(null)
    setSearchText('')
    setResult(null)
    setCondition('good')
    setNeedReSterilize(true)
    setNotes('')
  }

  if (currentUser.role !== 'nurse') {
    return (
      <div className="card">
        <div className="card-body text-center py-16">
          <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">护士专属功能</h2>
          <p className="text-gray-500 mt-2">请切换到护士角色使用归还办理功能</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary mt-6">
            返回工作台
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">归还办理</h1>
        <p className="text-sm text-gray-500 mt-1">检查用品完好情况，判断是否需重新消毒及对下一场课堂的影响</p>
      </div>

      <div className="card">
        <div className="card-body">
          <Steps
            steps={[
              { label: '选择领用记录', description: '查找待归还用品' },
              { label: '检查与登记', description: '破损判断与消毒' },
              { label: '归还完成', description: '入库与后续安排' },
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
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="输入家长姓名、用品名称/编码、课堂或消毒批号查找..."
                className="input pl-10"
              />
            </div>
            <span className="text-sm text-gray-500">共 {unreturned.length} 件待归还</span>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {unreturned.length === 0 ? (
              <EmptyState title="暂无待归还用品" description="所有用品均已归还" />
            ) : (
              <table className="table">
                <thead className="sticky top-0 bg-white z-10 shadow-sm">
                  <tr>
                    <th>用品</th>
                    <th>家长</th>
                    <th>课堂</th>
                    <th>领取时间</th>
                    <th>应归还</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {unreturned.map((p) => {
                    const overdue = getOverdueDays(p.expectedReturnTime)
                    return (
                      <tr key={p.id} className={overdue > 0 ? '!bg-red-50' : ''}>
                        <td>
                          <div>
                            <div className="font-medium">{p.suppliesName}</div>
                            <div className="text-xs text-gray-500 font-mono">{p.suppliesCode}</div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-300 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                              {p.parentName.charAt(0)}
                            </div>
                            <span className="font-medium">{p.parentName}</span>
                          </div>
                        </td>
                        <td className="text-gray-600">{p.className}</td>
                        <td className="text-gray-500 text-xs">{formatDateTime(p.pickupTime)}</td>
                        <td className="text-xs">
                          <div>{formatDateTime(p.expectedReturnTime)}</div>
                          {overdue > 0 && (
                            <div className="text-danger font-semibold mt-0.5 flex items-center gap-1">
                              <AlertTriangle size={12} /> 逾期 {overdue} 天
                            </div>
                          )}
                        </td>
                        <td>
                          {overdue > 0 ? (
                            <span className="badge bg-red-100 text-red-700 animate-pulse border border-red-300">
                              🔴 逾期未还
                            </span>
                          ) : (
                            <span className="badge bg-blue-100 text-blue-700">使用中</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => handleSelect(p)}
                            className={clsx(
                              'text-sm py-1.5 px-3 rounded-lg font-medium transition-all',
                              overdue > 0
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-primary-500 text-white hover:bg-primary-600'
                            )}
                          >
                            {overdue > 0 ? '逾期回收' : '办理归还'}
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
              <ShieldAlert size={18} className="text-primary-500" />
              归还检查登记
            </h3>
            <button onClick={() => setStep(0)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <X size={14} /> 返回列表
            </button>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                <Info size={16} className="text-blue-500" />
                领用信息回顾
              </h4>
              <div className="p-4 rounded-xl bg-gray-50 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">用品</span>
                  <span className="font-medium">{selected.suppliesName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">编码</span>
                  <span className="font-mono font-medium text-primary-600">{selected.suppliesCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">类别</span>
                  <span className="font-medium">{suppliesCategoryMap[selected.suppliesCategory]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">使用人</span>
                  <span className="font-medium">{selected.parentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">对应课堂</span>
                  <span className="font-medium">{selected.className}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">领取护士</span>
                  <span className="font-medium">{selected.nurseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">消毒批号</span>
                  <span className="font-mono font-medium text-purple-600">{selected.sterilizedBatch}</span>
                </div>
                {selected.usageNotes && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-gray-500">使用提醒：</span>
                    <span className="block mt-1 text-gray-700 text-xs">{selected.usageNotes}</span>
                  </div>
                )}
              </div>

              {getOverdueDays(selected.expectedReturnTime) > 0 && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={18} className="text-red-500 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-red-900">⚠️ 该用品已逾期</div>
                      <div className="text-xs text-red-700 mt-0.5">
                        应于 {formatDateTime(selected.expectedReturnTime)} 归还，
                        已逾期 {getOverdueDays(selected.expectedReturnTime)} 天。
                        系统将自动生成逾期记录。
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-500" />
                归还检查结果
              </h4>

              <div>
                <label className="label">用品完好情况 <span className="text-danger">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { v: 'good', label: '完好', icon: <Check size={16} />, color: 'emerald' },
                    { v: 'damaged_minor', label: '轻微损坏', icon: <AlertCircle size={16} />, color: 'amber' },
                    { v: 'damaged_major', label: '严重损坏', icon: <ShieldAlert size={16} />, color: 'orange' },
                    { v: 'lost', label: '丢失', icon: <X size={16} />, color: 'red' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => {
                        setCondition(opt.v)
                        if (opt.v === 'damaged_minor' || opt.v === 'damaged_major' || opt.v === 'lost') {
                          setNeedReSterilize(true)
                        }
                      }}
                      className={clsx(
                        'p-3 rounded-xl border-2 text-left transition-all flex items-center gap-2',
                        condition === opt.v
                          ? opt.color === 'emerald' ? 'border-emerald-500 bg-emerald-50'
                            : opt.color === 'amber' ? 'border-amber-500 bg-amber-50'
                            : opt.color === 'orange' ? 'border-orange-500 bg-orange-50'
                            : 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className={clsx(
                        'w-6 h-6 rounded-md flex items-center justify-center',
                        condition === opt.v
                          ? opt.color === 'emerald' ? 'bg-emerald-500 text-white'
                            : opt.color === 'amber' ? 'bg-amber-500 text-white'
                            : opt.color === 'orange' ? 'bg-orange-500 text-white'
                            : 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-400'
                      )}>
                        {opt.icon}
                      </div>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={needReSterilize}
                    onChange={(e) => setNeedReSterilize(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500"
                  />
                  <div className="flex items-center gap-1.5 text-sm">
                    <Sparkles size={14} className="text-purple-500" />
                    <span className="text-gray-700">归还后需要重新消毒入库</span>
                  </div>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  未消毒用品不能被下次预约领取
                </p>
              </div>

              <div>
                <label className="label">备注说明</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="例如：枕套已取下送洗；外观轻微划痕不影响使用；需联系维修..."
                  rows={3}
                  className="input resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(0)} className="btn-outline flex-1">返回</button>
                <button onClick={handleConfirm} className="btn-success flex-1">
                  <RotateCcw size={16} className="mr-2" />
                  确认归还
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && result && (
        <div className="card animate-slide-up">
          <div className="card-body py-12 text-center">
            <div className={clsx(
              'w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-lg',
              result.affects
                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-200'
                : 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-200'
            )}>
              {result.affects ? <AlertTriangle size={40} /> : <Check size={40} />}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mt-6">归还办理完成</h3>
            <p className={clsx(
              'mt-2 max-w-lg mx-auto',
              result.affects ? 'text-amber-700' : 'text-gray-600'
            )}>
              {result.message}
            </p>
            {result.affects && (
              <div className="mt-6 max-w-md mx-auto p-4 rounded-xl bg-amber-50 border border-amber-200 text-left">
                <div className="flex items-start gap-2">
                  <Clock size={18} className="text-amber-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-amber-900">建议处理</div>
                    <div className="text-xs text-amber-700 mt-1 space-y-0.5">
                      <p>1. 尽快安排该用品的维修/补充</p>
                      <p>2. 联系候补队列的家长提供替换用品</p>
                      <p>3. 必要时调整下一场课堂的分组安排</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <button onClick={reset} className="btn-primary">
                继续办理下一个
              </button>
              <button onClick={() => navigate('/sterilization')} className="btn-outline">
                <Sparkles size={16} className="mr-2" />
                查看消毒队列
              </button>
              {result.affects && (
                <button onClick={() => navigate('/waitlist')} className="btn-warning">
                  <BookOpen size={16} className="mr-2" />
                  安排候补与替换
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
