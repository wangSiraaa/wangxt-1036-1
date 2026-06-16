import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Plus,
  Search,
  Package,
  Play,
  Check,
  Clock,
  Thermometer,
  Timer,
  FileText,
  Info,
  AlertCircle,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { SterilizationStatusBadge, EmptyState, Steps } from '../components/ui'
import { formatDateTime, generateBatchNumber } from '../utils/format'
import { SterilizationStatus, Supplies, suppliesCategoryMap } from '../types'
import clsx from 'clsx'

export default function Sterilization() {
  const { currentUser, supplies, sterilizationRecords, addSterilization, updateSterilizationStatus } = useAppStore()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [step, setStep] = useState(0)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<SterilizationStatus | 'all'>('all')

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [method, setMethod] = useState('高温蒸汽消毒')
  const [temperature, setTemperature] = useState(121)
  const [duration, setDuration] = useState(30)
  const [notes, setNotes] = useState('')
  const [batchNumberDraft, setBatchNumberDraft] = useState('')

  const pendingSupplies = useMemo(() => {
    return supplies.filter((s) => s.status === 'sterilizing' || s.status === 'in_use' || s.status === 'maintenance')
  }, [supplies])

  const availableForSterilize = useMemo(() => {
    return supplies.filter((s) => s.status === 'available' || s.status === 'sterilizing' || s.status === 'in_use')
  }, [supplies])

  const filteredRecords = useMemo(() => {
    let list = [...sterilizationRecords].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )
    if (search) {
      list = list.filter(
        (r) =>
          r.batchNumber.includes(search) ||
          r.suppliesNames.includes(search) ||
          r.warehouseName.includes(search)
      )
    }
    if (filterStatus !== 'all') {
      list = list.filter((r) => r.status === filterStatus)
    }
    return list
  }, [sterilizationRecords, search, filterStatus])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const selectAll = (arr: Supplies[]) => {
    if (selectedIds.length === arr.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(arr.map((s) => s.id))
    }
  }

  const handleCreate = () => {
    setBatchNumberDraft(generateBatchNumber())
    setSelectedIds([])
    setStep(0)
    setShowCreate(true)
  }

  const handleStart = () => {
    if (selectedIds.length === 0 || !currentUser) return
    const namesMap: Record<string, number> = {}
    selectedIds.forEach((id) => {
      const s = supplies.find((x) => x.id === id)
      if (s) namesMap[s.category] = (namesMap[s.category] || 0) + 1
    })
    const namesStr = Object.entries(namesMap)
      .map(([k, v]) => `${suppliesCategoryMap[k as keyof typeof suppliesCategoryMap]} × ${v}`)
      .join('、')
    addSterilization({
      batchNumber: batchNumberDraft,
      suppliesIds: selectedIds,
      suppliesNames: namesStr,
      warehouseId: currentUser.id,
      warehouseName: currentUser.name,
      status: 'pending',
      startTime: new Date().toISOString(),
      method,
      temperature: method.includes('高温') ? temperature : undefined,
      duration,
      notes: notes || undefined,
    })
    setShowCreate(false)
  }

  const startBatch = (id: string) => {
    updateSterilizationStatus(id, 'in_progress')
  }

  const completeBatch = (id: string) => {
    updateSterilizationStatus(id, 'completed', new Date().toISOString())
  }

  if (currentUser.role !== 'warehouse') {
    return (
      <div className="card">
        <div className="card-body text-center py-16">
          <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">库管专属功能</h2>
          <p className="text-gray-500 mt-2">请切换到库管角色使用消毒管理功能</p>
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
          <h1 className="text-2xl font-bold text-gray-900">消毒管理</h1>
          <p className="text-sm text-gray-500 mt-1">创建消毒批次、跟踪消毒进度、完成用品消毒入库</p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <Plus size={16} className="mr-2" />
          新建消毒批次
        </button>
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
                  placeholder="搜索批次号、用品名称或操作人..."
                  className="input pl-10"
                />
              </div>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="select w-36">
                <option value="all">全部状态</option>
                <option value="pending">待消毒</option>
                <option value="in_progress">消毒中</option>
                <option value="completed">已完成</option>
                <option value="failed">消毒失败</option>
              </select>
            </div>
            <div className="max-h-[640px] overflow-y-auto">
              {filteredRecords.length === 0 ? (
                <EmptyState title="暂无消毒记录" description="点击右上角新建消毒批次" />
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredRecords.map((r) => (
                    <div key={r.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-semibold text-primary-600 text-sm">
                              {r.batchNumber}
                            </span>
                            <SterilizationStatusBadge status={r.status} />
                          </div>
                          <div className="text-sm text-gray-700 mt-2 flex items-center gap-2">
                            <Package size={14} className="text-gray-400" />
                            {r.suppliesNames}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <FileText size={12} /> 方法：{r.method}
                            </span>
                            {r.temperature && (
                              <span className="flex items-center gap-1">
                                <Thermometer size={12} /> {r.temperature}℃
                              </span>
                            )}
                            {r.duration && (
                              <span className="flex items-center gap-1">
                                <Timer size={12} /> {r.duration}分钟
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock size={12} /> 开始 {formatDateTime(r.startTime)}
                            </span>
                            {r.endTime && (
                              <span className="text-emerald-600">完成 {formatDateTime(r.endTime)}</span>
                            )}
                            <span>操作：{r.warehouseName}</span>
                          </div>
                          {r.notes && (
                            <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg inline-block">
                              📝 {r.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {r.status === 'pending' && (
                            <button
                              onClick={() => startBatch(r.id)}
                              className="btn-primary text-xs py-1.5"
                            >
                              <Play size={12} className="mr-1" /> 开始
                            </button>
                          )}
                          {r.status === 'in_progress' && (
                            <button
                              onClick={() => completeBatch(r.id)}
                              className="btn-success text-xs py-1.5"
                            >
                              <Check size={12} className="mr-1" /> 完成
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock size={18} className="text-amber-500" />
                待消毒队列
              </h3>
            </div>
            <div className="card-body p-0 max-h-80 overflow-y-auto">
              {pendingSupplies.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">✅ 所有用品已完成消毒</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pendingSupplies.map((s) => (
                    <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                        <Sparkles size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{s.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{s.code}</div>
                      </div>
                      <span
                        className={clsx(
                          'text-xs px-2 py-0.5 rounded-full',
                          s.status === 'sterilizing' ? 'bg-purple-100 text-purple-700' :
                          s.status === 'maintenance' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        )}
                      >
                        {s.status === 'sterilizing' ? '消毒中' : s.status === 'maintenance' ? '维修' : '使用中'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Info size={18} className="text-blue-500" />
                本周消毒统计
              </h3>
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-50">
                <span className="text-sm text-emerald-700">已完成批次</span>
                <span className="text-2xl font-bold text-emerald-700">
                  {sterilizationRecords.filter((r) => r.status === 'completed').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50">
                <span className="text-sm text-blue-700">进行中</span>
                <span className="text-2xl font-bold text-blue-700">
                  {sterilizationRecords.filter((r) => r.status === 'in_progress').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                <span className="text-sm text-gray-700">覆盖用品数</span>
                <span className="text-2xl font-bold text-gray-700">
                  {sterilizationRecords.reduce((acc, r) => acc + r.suppliesIds.length, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles size={20} className="text-purple-500" />
                新建消毒批次
              </h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <span className="text-xl leading-none">×</span>
              </button>
            </div>

            <div className="px-6 py-4 border-b border-gray-100">
              <Steps
                steps={[
                  { label: '选择用品', description: '勾选需消毒的用品' },
                  { label: '消毒设置', description: '方法、温度、时长' },
                  { label: '确认创建', description: '生成批次开始消毒' },
                ]}
                current={step}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {step === 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600">
                      批次号 <span className="font-mono font-medium text-primary-600">{batchNumberDraft}</span>
                    </span>
                    <button
                      onClick={() => selectAll(availableForSterilize)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {selectedIds.length === availableForSterilize.length ? '取消全选' : '全选'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableForSterilize.map((s) => {
                      const checked = selectedIds.includes(s.id)
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleSelect(s.id)}
                          className={clsx(
                            'p-3 rounded-xl border-2 text-left transition-all flex items-start gap-3',
                            checked
                              ? 'border-primary-500 bg-primary-50 shadow-sm shadow-primary-100'
                              : 'border-gray-200 hover:border-primary-200'
                          )}
                        >
                          <div className={clsx(
                            'w-5 h-5 rounded flex-shrink-0 mt-0.5 border-2 flex items-center justify-center',
                            checked ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                          )}>
                            {checked && <Check size={12} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{s.name}</div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <span className="font-mono">{s.code}</span>
                              <span>·</span>
                              <span>{suppliesCategoryMap[s.category]}</span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-4 text-sm text-gray-500">
                    已选择 <span className="font-semibold text-primary-600">{selectedIds.length}</span> 件用品
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">消毒方法 <span className="text-danger">*</span></label>
                    <select value={method} onChange={(e) => setMethod(e.target.value)} className="select">
                      <option>高温蒸汽消毒</option>
                      <option>紫外线消毒</option>
                      <option>酒精擦拭消毒</option>
                      <option>紫外线消毒+枕套更换</option>
                      <option>环氧乙烷消毒</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">
                      温度（℃） {!method.includes('高温') && <span className="text-gray-400">（可选）</span>}
                    </label>
                    <input
                      type="number"
                      value={temperature}
                      onChange={(e) => setTemperature(parseInt(e.target.value) || 0)}
                      className="input"
                      disabled={!method.includes('高温')}
                    />
                  </div>
                  <div>
                    <label className="label">消毒时长（分钟）</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                      className="input"
                    />
                  </div>
                  <div />
                  <div className="md:col-span-2">
                    <label className="label">备注</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="特殊注意事项..."
                      className="input resize-none"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div className="p-5 rounded-xl bg-gradient-to-br from-purple-50 to-primary-50 border border-purple-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-primary-500 flex items-center justify-center text-white shadow-md">
                        <Sparkles size={22} />
                      </div>
                      <div>
                        <div className="text-xs text-purple-600">批次号</div>
                        <div className="font-mono font-bold text-lg text-gray-900">{batchNumberDraft}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">用品数量：</span>
                        <span className="font-semibold">{selectedIds.length} 件</span>
                      </div>
                      <div>
                        <span className="text-gray-500">操作人：</span>
                        <span className="font-semibold">{currentUser.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">消毒方法：</span>
                        <span className="font-semibold">{method}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">预计时长：</span>
                        <span className="font-semibold">{duration} 分钟</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <div className="text-xs text-purple-600 mb-2">用品清单：</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedIds.map((id) => {
                          const s = supplies.find((x) => x.id === id)
                          return s ? (
                            <span key={id} className="text-xs px-2 py-1 rounded-md bg-white text-gray-700 border border-gray-200">
                              {s.name}
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div>
                {step > 0 && (
                  <button onClick={() => setStep(step - 1)} className="btn-secondary">
                    上一步
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowCreate(false)} className="btn-outline">取消</button>
                {step < 2 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    disabled={step === 0 && selectedIds.length === 0}
                    className="btn-primary"
                  >
                    下一步
                  </button>
                ) : (
                  <button onClick={handleStart} className="btn-success">
                    <Sparkles size={16} className="mr-2" />
                    创建批次
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
