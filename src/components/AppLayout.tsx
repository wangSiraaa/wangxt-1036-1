import { useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Package,
  ClipboardList,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Clock,
  Users,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  CalendarDays,
  ShieldAlert,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { UserRole } from '../types'
import clsx from 'clsx'

const roleMap: Record<UserRole, { label: string; color: string; icon: string }> = {
  lecturer: { label: '课堂讲师', color: 'bg-purple-100 text-purple-700', icon: '👨‍⚕️' },
  nurse: { label: '护士', color: 'bg-blue-100 text-blue-700', icon: '👩‍⚕️' },
  warehouse: { label: '库管', color: 'bg-amber-100 text-amber-700', icon: '📦' },
  parent: { label: '家长', color: 'bg-pink-100 text-pink-700', icon: '👩‍👧' },
}

const roleMenus: Record<UserRole, { to: string; label: string; icon: React.ReactNode; badge?: string }[]> = {
  lecturer: [
    { to: '/dashboard', label: '工作台', icon: <LayoutDashboard size={18} /> },
    { to: '/classes', label: '课堂管理', icon: <BookOpen size={18} /> },
    { to: '/turnover-plan', label: '周转计划', icon: <CalendarDays size={18} /> },
    { to: '/dashboard', label: '用品需求', icon: <Package size={18} /> },
  ],
  nurse: [
    { to: '/dashboard', label: '工作台', icon: <LayoutDashboard size={18} /> },
    { to: '/classes', label: '课堂列表', icon: <BookOpen size={18} /> },
    { to: '/pickup', label: '领用办理', icon: <ClipboardList size={18} /> },
    { to: '/return', label: '归还办理', icon: <RotateCcw size={18} /> },
    { to: '/turnover-plan', label: '周转计划', icon: <CalendarDays size={18} /> },
    { to: '/overdue', label: '逾期管理', icon: <AlertTriangle size={18} /> },
  ],
  warehouse: [
    { to: '/dashboard', label: '工作台', icon: <LayoutDashboard size={18} /> },
    { to: '/supplies', label: '用品管理', icon: <Package size={18} /> },
    { to: '/sterilization', label: '消毒管理', icon: <Sparkles size={18} /> },
    { to: '/inspection', label: '复检处理', icon: <ShieldAlert size={18} />, badge: 'inspection' },
    { to: '/turnover-plan', label: '周转计划', icon: <CalendarDays size={18} /> },
  ],
  parent: [
    { to: '/dashboard', label: '工作台', icon: <LayoutDashboard size={18} /> },
    { to: '/classes', label: '课堂预约', icon: <BookOpen size={18} /> },
    { to: '/my-reservations', label: '我的预约', icon: <ClipboardList size={18} /> },
    { to: '/waitlist', label: '候补队列', icon: <Users size={18} /> },
    { to: '/overdue', label: '逾期提醒', icon: <AlertTriangle size={18} /> },
  ],
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, users, switchRole, overdueRecords, inspectionRecords } = useAppStore()
  const navigate = useNavigate()
  const menus = useMemo(() => roleMenus[currentUser.role], [currentUser.role])
  const roleInfo = roleMap[currentUser.role]
  const overdueCount = overdueRecords.filter((o) => o.isFrozen || o.overdueDays > 0).length
  const pendingInspectionCount = inspectionRecords.filter((r) => r.status === 'pending').length

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl shadow-md">
              👶
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base">母婴课堂</h1>
              <p className="text-xs text-gray-500">用品预约管理</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-400 uppercase mb-2 px-2">当前角色</div>
          <div className="relative group">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <span className="text-2xl">{roleInfo.icon}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900">{currentUser.name}</div>
                <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-full mt-0.5', roleInfo.color)}>
                  {roleInfo.label}
                </span>
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {Object.entries(roleMap).map(([role, info]) => {
                const targetUser = users.find((u) => u.role === role)
                if (!targetUser) return null
                return (
                  <button
                    key={role}
                    onClick={() => {
                      switchRole(role as UserRole)
                      navigate('/dashboard')
                    }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left',
                      currentUser.role === role && 'bg-primary-50'
                    )}
                  >
                    <span className="text-xl">{info.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{targetUser.name}</div>
                      <div className="text-xs text-gray-500">{info.label}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="text-xs font-medium text-gray-400 uppercase mb-2 px-3">功能菜单</div>
          <div className="space-y-1">
            {menus.map((menu, idx) => (
              <NavLink
                key={idx}
                to={menu.to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                      : 'text-gray-600 hover:bg-gray-100'
                  )
                }
              >
                {menu.icon}
                <span>{menu.label}</span>
                {(menu.label === '逾期管理' || menu.label === '逾期提醒') && overdueCount > 0 && (
                  <span className="ml-auto bg-danger text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                    {overdueCount}
                  </span>
                )}
                {menu.badge === 'inspection' && pendingInspectionCount > 0 && (
                  <span className="ml-auto bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                    {pendingInspectionCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
            <LogOut size={16} />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">母婴课堂用品预约系统</h2>
            <p className="text-xs text-gray-500">围绕课堂统一管理用品周转、消毒与归还</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{currentUser.name}</div>
              <div className="text-xs text-gray-500">{currentUser.phone}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center text-white font-semibold shadow-sm">
              {currentUser.name.charAt(0)}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  )
}
