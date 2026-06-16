import { useState, useMemo } from 'react'
import { Search, Package, Sparkles, Wrench, Clock, Filter, Info } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { SuppliesStatusBadge, EmptyState } from '../components/ui'
import { formatDateTime } from '../utils/format'
import { SuppliesStatus, suppliesCategoryMap, SuppliesCategory } from '../types'
import clsx from 'clsx'

export default function SuppliesList() {
  const { supplies, sterilizationRecords } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<SuppliesCategory | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<SuppliesStatus | 'all'>('all')
  const [selected, setSelected] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = supplies
    if (search) {
      list = list.filter(
        (s) =>
          s.name.includes(search) ||
          s.code.includes(search) ||
          (s.model && s.model.includes(search))
      )
    }
    if (filterCategory !== 'all') list = list.filter((s) => s.category === filterCategory)
    if (filterStatus !== 'all') list = list.filter((s) => s.status === filterStatus)
    return list
  }, [supplies, search, filterCategory, filterStatus])

  const stats = useMemo(() => {
    const map: Record<string, number> = { available: 0, in_use: 0, sterilizing: 0, maintenance: 0, reserved: 0 }
    supplies.forEach((s) => (map[s.status] = (map[s.status] || 0) + 1))
    return map
  }, [supplies])

  const selectedSupply = selected ? supplies.find((s) => s.id === selected) : null
  const relatedSterilizations = selectedSupply
    ? sterilizationRecords.filter((r) => r.suppliesIds.includes(selectedSupply.id))
    : []

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">用品管理</h1>
        <p className="text-sm text-gray-500 mt-1">查看母婴辅具库存状态、消毒记录与详情</p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Package size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.available}</div>
              <div className="text-xs text-gray-500">可领用</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.in_use + stats.reserved}</div>
              <div className="text-xs text-gray-500">使用/预约</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.sterilizing}</div>
              <div className="text-xs text-gray-500">消毒中</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Wrench size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.maintenance}</div>
              <div className="text-xs text-gray-500">维修中</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
              <Info size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{supplies.length}</div>
              <div className="text-xs text-gray-500">总计</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="card-body flex flex-wrap items-center gap-4 border-b border-gray-100">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索名称、编码、型号..." className="input pl-10" />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as any)} className="select w-36">
                <option value="all">全部类别</option>
                {Object.entries(suppliesCategoryMap).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="select w-32">
                <option value="all">全部状态</option>
                <option value="available">可领用</option>
                <option value="in_use">使用中</option>
                <option value="sterilizing">消毒中</option>
                <option value="maintenance">维修中</option>
                <option value="reserved">已预约</option>
              </select>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {filtered.length === 0 ? (
              <EmptyState title="未找到匹配用品" description="请调整搜索或筛选条件" />
            ) : (
              <table className="table">
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr>
                    <th>编码</th>
                    <th>用品名称</th>
                    <th>类别</th>
                    <th>型号</th>
                    <th>状态</th>
                    <th>最近消毒</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setSelected(s.id)}
                      className={clsx('cursor-pointer transition-colors', selected === s.id && 'bg-primary-50 !bg-primary-50')}
                    >
                      <td className="font-mono text-xs text-gray-600">{s.code}</td>
                      <td className="font-medium">{s.name}</td>
                      <td>{suppliesCategoryMap[s.category]}</td>
                      <td className="text-gray-500">{s.model || '-'}</td>
                      <td><SuppliesStatusBadge status={s.status} /></td>
                      <td className="text-gray-500 text-xs">
                        {s.lastSterilizedAt ? (
                          <div>
                            <div>{formatDateTime(s.lastSterilizedAt)}</div>
                            <div className="text-primary-600 font-mono">{s.lastSterilizedBatch}</div>
                          </div>
                        ) : (
                          <span className="text-danger">未消毒</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Info size={18} className="text-primary-500" />
              用品详情
            </h3>
          </div>
          <div className="card-body">
            {!selectedSupply ? (
              <div className="text-center py-12">
                <Package size={40} className="mx-auto text-gray-300" />
                <p className="text-sm text-gray-500 mt-3">从左侧列表选择用品查看详情</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary-50 to-purple-50 border border-primary-100">
                  <div className="text-xs text-primary-600 font-mono">{selectedSupply.code}</div>
                  <div className="text-lg font-bold text-gray-900 mt-1">{selectedSupply.name}</div>
                  <div className="mt-2">
                    <SuppliesStatusBadge status={selectedSupply.status} />
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">类别</span>
                    <span className="font-medium">{suppliesCategoryMap[selectedSupply.category]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">型号</span>
                    <span className="font-medium">{selectedSupply.model || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">最近消毒批次</span>
                    <span className="font-mono font-medium text-primary-600">
                      {selectedSupply.lastSterilizedBatch || '无'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">最近消毒时间</span>
                    <span className="font-medium">{formatDateTime(selectedSupply.lastSterilizedAt)}</span>
                  </div>
                  {selectedSupply.nextMaintenanceAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">下次维护</span>
                      <span className="font-medium text-orange-600">
                        {formatDateTime(selectedSupply.nextMaintenanceAt)}
                      </span>
                    </div>
                  )}
                  {selectedSupply.notes && (
                    <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-xs">
                      📝 {selectedSupply.notes}
                    </div>
                  )}
                </div>

                {relatedSterilizations.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Sparkles size={14} className="text-purple-500" />
                      消毒记录
                    </div>
                    <div className="space-y-2">
                      {relatedSterilizations.slice(0, 5).map((r) => (
                        <div key={r.id} className="p-2 rounded-lg bg-gray-50 text-xs">
                          <div className="flex justify-between">
                            <span className="font-mono text-primary-600">{r.batchNumber}</span>
                            <span
                              className={clsx(
                                'px-2 py-0.5 rounded-full',
                                r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                r.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                r.status === 'pending' ? 'bg-gray-100 text-gray-600' :
                                'bg-red-100 text-red-700'
                              )}
                            >
                              {r.status === 'completed' ? '已完成' : r.status === 'in_progress' ? '进行中' : r.status === 'pending' ? '待开始' : '失败'}
                            </span>
                          </div>
                          <div className="text-gray-500 mt-1">
                            {formatDateTime(r.startTime)} · {r.method}
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
    </div>
  )
}
