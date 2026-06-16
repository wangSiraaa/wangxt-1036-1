import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  Package,
  Calendar,
  Clock,
  MapPin,
  Users,
  Eye,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { Steps } from '../components/ui'
import { ClassSuppliesRequirement, ClassEntity, SuppliesCategory, suppliesCategoryMap } from '../types'

export default function PublishClass() {
  const { currentUser, addClass, users } = useAppStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [maxParticipants, setMaxParticipants] = useState(15)
  const [requirements, setRequirements] = useState<ClassSuppliesRequirement[]>([])

  const steps = [
    { label: '课堂基本信息', description: '名称、时间、地点' },
    { label: '辅具需求配置', description: '需要的用品类型与数量' },
    { label: '确认发布', description: '检查信息并发布' },
  ]

  const addRequirement = () => {
    setRequirements([
      ...requirements,
      { category: 'baby_scale', quantity: 1, latestPickupTime: `${date}T08:00:00` },
    ])
  }

  const updateRequirement = (idx: number, field: keyof ClassSuppliesRequirement, value: any) => {
    const next = [...requirements]
    next[idx] = { ...next[idx], [field]: value }
    setRequirements(next)
  }

  const removeRequirement = (idx: number) => {
    setRequirements(requirements.filter((_, i) => i !== idx))
  }

  const publish = (asDraft = false) => {
    const start = new Date(`${date}T${startTime}`).toISOString()
    const end = new Date(`${date}T${endTime}`).toISOString()
    const newClass: ClassEntity = {
      id: 'c_' + Date.now(),
      code: `MC-${date.replace(/-/g, '')}-${String(Math.floor(Math.random() * 900) + 100)}`,
      title,
      description,
      lecturerId: currentUser.id,
      lecturerName: currentUser.name,
      startTime: start,
      endTime: end,
      location,
      maxParticipants,
      currentParticipants: 0,
      status: asDraft ? 'draft' : 'published',
      suppliesRequirements: requirements.map((r) => ({
        ...r,
        latestPickupTime: r.latestPickupTime || `${date}T08:30:00`,
      })),
      createdAt: new Date().toISOString(),
    }
    addClass(newClass)
    navigate('/classes')
  }

  const canGoNext = () => {
    if (step === 0) return title && date && startTime && endTime && location && maxParticipants > 0
    if (step === 1) return true
    return true
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/classes')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">发布新课堂</h1>
          <p className="text-sm text-gray-500 mt-1">配置课堂信息和所需辅具类型数量</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body pb-8">
          <Steps steps={steps} current={step} />
        </div>
      </div>

      {step === 0 && (
        <div className="card animate-slide-up">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar size={18} className="text-primary-500" />
              课堂基本信息
            </h3>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="label">课堂名称 <span className="text-danger">*</span></label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：新生儿护理技能课（一）"
                className="input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">课堂描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简要介绍本堂课的内容和学习目标..."
                rows={3}
                className="input resize-none"
              />
            </div>
            <div>
              <label className="label">上课日期 <span className="text-danger">*</span></label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">开始时间 <span className="text-danger">*</span></label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">结束时间 <span className="text-danger">*</span></label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input" />
              </div>
            </div>
            <div>
              <label className="label">上课地点 <span className="text-danger">*</span></label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="母婴培训室A"
                  className="input pl-9"
                />
              </div>
            </div>
            <div>
              <label className="label">最大参与人数 <span className="text-danger">*</span></label>
              <div className="relative">
                <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 0)}
                  className="input pl-9"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card animate-slide-up">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Package size={18} className="text-primary-500" />
              课堂所需辅具
            </h3>
            <button onClick={addRequirement} className="btn-outline text-sm">
              <Plus size={14} className="mr-1" />
              添加需求
            </button>
          </div>
          <div className="card-body">
            {requirements.length === 0 ? (
              <div className="text-center py-12">
                <Package size={40} className="mx-auto text-gray-300" />
                <p className="text-gray-500 mt-3">暂未配置辅具需求</p>
                <p className="text-sm text-gray-400 mt-1">如果本课堂需要家长领用辅具，请点击上方"添加需求"按钮配置</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requirements.map((r, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">需求 #{idx + 1}</span>
                      <button
                        onClick={() => removeRequirement(idx)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-red-50 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">辅具类型</label>
                        <select
                          value={r.category}
                          onChange={(e) => updateRequirement(idx, 'category', e.target.value)}
                          className="select"
                        >
                          {Object.entries(suppliesCategoryMap).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">需求数量</label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={r.quantity}
                          onChange={(e) => updateRequirement(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">最晚领取时间</label>
                        <input
                          type="datetime-local"
                          value={r.latestPickupTime?.slice(0, 16) || ''}
                          onChange={(e) => updateRequirement(idx, 'latestPickupTime', new Date(e.target.value).toISOString())}
                          className="input"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card animate-slide-up">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Eye size={18} className="text-primary-500" />
              确认信息
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">课堂名称：</span>
                <span className="font-medium text-gray-900">{title || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">上课地点：</span>
                <span className="font-medium text-gray-900">{location || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">上课日期：</span>
                <span className="font-medium text-gray-900">{date || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">上课时间：</span>
                <span className="font-medium text-gray-900">{startTime || '-'} - {endTime || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">最大人数：</span>
                <span className="font-medium text-gray-900">{maxParticipants} 人</span>
              </div>
              <div>
                <span className="text-gray-500">授课讲师：</span>
                <span className="font-medium text-gray-900">{currentUser.name}</span>
              </div>
              {description && (
                <div className="col-span-2">
                  <span className="text-gray-500">课堂描述：</span>
                  <span className="font-medium text-gray-900 block mt-1 p-3 bg-gray-50 rounded-lg">{description}</span>
                </div>
              )}
            </div>
            {requirements.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Package size={16} />
                  辅具需求清单
                </div>
                <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">
                  {requirements.map((r, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">{suppliesCategoryMap[r.category as SuppliesCategory]}</span>
                        <span className="text-gray-500 text-sm ml-2">× {r.quantity}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={12} />
                        最晚领取 {r.latestPickupTime?.slice(0, 16).replace('T', ' ') || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="btn-secondary">
              <ArrowLeft size={16} className="mr-2" />
              上一步
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {step < 2 && (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
              className="btn-primary"
            >
              下一步 <ArrowLeft size={16} className="ml-2 rotate-180" />
            </button>
          )}
          {step === 2 && (
            <>
              <button onClick={() => publish(true)} className="btn-outline">
                保存为草稿
              </button>
              <button onClick={() => publish(false)} className="btn-primary">
                <Save size={16} className="mr-2" />
                确认发布
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
