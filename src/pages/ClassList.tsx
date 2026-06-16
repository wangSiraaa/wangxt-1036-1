import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  MapPin,
  Users,
  Calendar,
  Clock,
  Package,
  ArrowRight,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { ClassStatusBadge, EmptyState } from '../components/ui'
import { formatDateTime, formatTime } from '../utils/format'
import { ClassStatus, suppliesCategoryMap } from '../types'
import clsx from 'clsx'

export default function ClassList() {
  const { classes, currentUser, registrations, registerForClass, updateRegistrationStatus } = useAppStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ClassStatus | 'all'>('all')
  const [showMy, setShowMy] = useState(currentUser.role === 'parent')

  const filtered = useMemo(() => {
    let list = classes
    if (search) {
      list = list.filter(
        (c) =>
          c.title.includes(search) ||
          c.lecturerName.includes(search) ||
          c.location.includes(search)
      )
    }
    if (filterStatus !== 'all') {
      list = list.filter((c) => c.status === filterStatus)
    }
    if (showMy && currentUser.role === 'parent') {
      const myRegIds = registrations
        .filter((r) => r.parentId === currentUser.id)
        .map((r) => r.classId)
      list = list.filter((c) => myRegIds.includes(c.id) || c.status === 'open' || c.status === 'published')
    }
    if (showMy && currentUser.role === 'lecturer') {
      list = list.filter((c) => c.lecturerId === currentUser.id)
    }
    return list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }, [classes, search, filterStatus, showMy, currentUser, registrations])

  const myRegistrationsMap = useMemo(() => {
    const map: Record<string, typeof registrations[number] | undefined> = {}
    if (currentUser.role === 'parent') {
      registrations
        .filter((r) => r.parentId === currentUser.id)
        .forEach((r) => (map[r.classId] = r))
    }
    return map
  }, [registrations, currentUser])

  const handleRegister = (classId: string) => {
    if (currentUser.role !== 'parent') return
    registerForClass(classId, currentUser.id)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentUser.role === 'lecturer' ? '我的课堂' : '课堂列表'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">浏览、发布或报名母婴培训课堂</p>
        </div>
        {currentUser.role === 'lecturer' && (
          <button onClick={() => navigate('/classes/publish')} className="btn-primary">
            <Plus size={16} className="mr-2" />
            发布新课堂
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-body flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索课堂名称、讲师、地点..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="select w-40">
              <option value="all">全部状态</option>
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
              <option value="open">报名中</option>
              <option value="ongoing">进行中</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showMy}
              onChange={(e) => setShowMy(e.target.checked)}
              className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">
              {currentUser.role === 'lecturer' ? '只看我发布的' : '只看与我相关'}
            </span>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={36} />}
          title="暂无课堂"
          description={currentUser.role === 'lecturer' ? '点击"发布新课堂"创建第一节课' : '关注的课堂列表为空，试试调整筛选条件'}
          action={
            currentUser.role === 'lecturer' ? (
              <button onClick={() => navigate('/classes/publish')} className="btn-primary">
                <Plus size={16} className="mr-2" />
                发布课堂
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c) => {
            const myReg = myRegistrationsMap[c.id]
            const isFull = c.currentParticipants >= c.maxParticipants
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/classes/${c.id}`)}
                className="card hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="h-32 bg-gradient-to-br from-primary-400 via-pink-400 to-purple-500 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/10" />
                  <BookOpen size={48} className="text-white/90 relative z-10" />
                  <div className="absolute top-3 left-3 z-10">
                    <ClassStatusBadge status={c.status} />
                  </div>
                  {isFull && (c.status === 'open' || c.status === 'published') && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="badge bg-amber-500 text-white">名额已满</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 text-lg group-hover:text-primary-600 transition-colors line-clamp-1">
                    {c.title}
                  </h3>
                  {c.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.description}</p>
                  )}
                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-primary-500" />
                      <span>{formatDateTime(c.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-primary-500" />
                      <span>{formatTime(c.startTime)} - {formatTime(c.endTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-primary-500" />
                      <span>{c.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-primary-500" />
                      <span>
                        讲师：{c.lecturerName} · {c.currentParticipants}/{c.maxParticipants}人
                      </span>
                    </div>
                  </div>
                  {c.suppliesRequirements.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                        <Package size={12} />
                        需要辅具
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {c.suppliesRequirements.map((r, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                            {suppliesCategoryMap[r.category]} ×{r.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    {myReg ? (
                      <span className={clsx(
                        'text-xs px-3 py-1.5 rounded-lg font-medium',
                        ['approved', 'attended'].includes(myReg.status)
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : ['pending'].includes(myReg.status)
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-gray-50 text-gray-500'
                      )}>
                        报名状态：{
                          myReg.status === 'approved' ? '已通过 ✅' :
                          myReg.status === 'pending' ? '审核中 ⏳' :
                          myReg.status === 'attended' ? '已参加' :
                          myReg.status === 'absent' ? '缺席' :
                          myReg.status === 'rejected' ? '未通过 ❌' : '已取消'
                        }
                      </span>
                    ) : currentUser.role === 'parent' && (c.status === 'open' || c.status === 'published') ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRegister(c.id)
                        }}
                        disabled={isFull}
                        className="btn-primary text-sm py-1.5"
                      >
                        {isFull ? '候补报名' : '立即报名'}
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/classes/${c.id}`)
                      }}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                    >
                      查看详情 <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
