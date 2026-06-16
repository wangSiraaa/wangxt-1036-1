import { create } from 'zustand'
import {
  User,
  Supplies,
  ClassEntity,
  Registration,
  Reservation,
  PickupRecord,
  ReturnRecord,
  SterilizationRecord,
  OverdueRecord,
  WaitlistEntry,
  UserRole,
  ClassStatus,
  RegistrationStatus,
  ReservationStatus,
  ReturnCondition,
  SterilizationStatus,
} from '../types'
import {
  mockUsers,
  mockSupplies,
  mockClasses,
  mockRegistrations,
  mockReservations,
  mockPickupRecords,
  mockReturnRecords,
  mockSterilizationRecords,
  mockOverdueRecords,
  mockWaitlistEntries,
} from '../data/mockData'

interface AppState {
  currentUser: User
  users: User[]
  supplies: Supplies[]
  classes: ClassEntity[]
  registrations: Registration[]
  reservations: Reservation[]
  pickupRecords: PickupRecord[]
  returnRecords: ReturnRecord[]
  sterilizationRecords: SterilizationRecord[]
  overdueRecords: OverdueRecord[]
  waitlistEntries: WaitlistEntry[]

  setCurrentUser: (user: User) => void
  switchRole: (role: UserRole) => void

  addClass: (cls: ClassEntity) => void
  updateClassStatus: (classId: string, status: ClassStatus) => void
  registerForClass: (classId: string, parentId: string) => void
  updateRegistrationStatus: (regId: string, status: RegistrationStatus) => void

  createReservation: (data: Partial<Reservation> & Pick<Reservation, 'classId' | 'className' | 'suppliesCategory' | 'parentId' | 'parentName' | 'familyId'>) => { success: boolean; message: string; reservation?: Reservation }
  updateReservationStatus: (resId: string, status: ReservationStatus, updates?: Partial<Reservation>) => void
  replaceSupplies: (resId: string, suppliesId: string, suppliesName: string) => void

  createPickup: (data: Omit<PickupRecord, 'id'>) => void
  createReturn: (data: Omit<ReturnRecord, 'id'>) => { success: boolean; message: string; affectsNextClass?: boolean; affectedClassName?: string }

  addSterilization: (data: Omit<SterilizationRecord, 'id'>) => void
  updateSterilizationStatus: (id: string, status: SterilizationStatus, endTime?: string) => void

  freezeOverdue: (overdueId: string, reason: string) => void
  unfreezeOverdue: (overdueId: string, reason: string) => void

  addWaitlist: (data: Omit<WaitlistEntry, 'id' | 'position' | 'status'>) => { success: boolean; message: string; entry?: WaitlistEntry }
  updateWaitlistStatus: (id: string, status: WaitlistEntry['status']) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: mockUsers[0],
  users: mockUsers,
  supplies: mockSupplies,
  classes: mockClasses,
  registrations: mockRegistrations,
  reservations: mockReservations,
  pickupRecords: mockPickupRecords,
  returnRecords: mockReturnRecords,
  sterilizationRecords: mockSterilizationRecords,
  overdueRecords: mockOverdueRecords,
  waitlistEntries: mockWaitlistEntries,

  setCurrentUser: (user) => set({ currentUser: user }),

  switchRole: (role) => {
    const user = get().users.find((u) => u.role === role)
    if (user) set({ currentUser: user })
  },

  addClass: (cls) => set((s) => ({ classes: [cls, ...s.classes] })),

  updateClassStatus: (classId, status) =>
    set((s) => ({
      classes: s.classes.map((c) => (c.id === classId ? { ...c, status } : c)),
    })),

  registerForClass: (classId, parentId) => {
    const s = get()
    const cls = s.classes.find((c) => c.id === classId)
    const parent = s.users.find((u) => u.id === parentId)
    if (!cls || !parent) return

    const existing = s.registrations.find((r) => r.classId === classId && r.parentId === parentId)
    if (existing) return

    const newReg: Registration = {
      id: 'r_' + Date.now(),
      classId,
      className: cls.title,
      parentId,
      parentName: parent.name,
      familyId: parent.familyId || 'f_' + Date.now(),
      status: 'pending',
      registeredAt: new Date().toISOString(),
    }

    set((state) => ({
      registrations: [...state.registrations, newReg],
      classes: state.classes.map((c) =>
        c.id === classId ? { ...c, currentParticipants: c.currentParticipants + 1 } : c
      ),
    }))
  },

  updateRegistrationStatus: (regId, status) =>
    set((s) => ({
      registrations: s.registrations.map((r) => (r.id === regId ? { ...r, status } : r)),
    })),

  createReservation: (data) => {
    const s = get()
    const cls = s.classes.find((c) => c.id === data.classId)

    const registration = s.registrations.find(
      (r) => r.classId === data.classId && r.parentId === data.parentId
    )
    if (!registration || !['approved', 'attended'].includes(registration.status)) {
      return { success: false, message: '未通过课堂报名审核，不能预约用品' }
    }

    const overdue = s.overdueRecords.find(
      (o) => o.familyId === data.familyId && o.isFrozen
    )
    if (overdue) {
      return { success: false, message: '账户因逾期被冻结，请先归还用品并解冻' }
    }

    const unreturned = s.pickupRecords.filter(
      (p) => p.familyId === data.familyId && !p.isReturned
    )
    if (unreturned.length >= 3) {
      return { success: false, message: '家庭已有3件用品未归还，请先归还后再预约' }
    }

    const categoryAvailable = s.supplies.filter(
      (x) =>
        x.category === data.suppliesCategory &&
        x.status === 'available' &&
        x.lastSterilizedBatch
    )

    const todayReservations = s.reservations.filter(
      (r) =>
        r.classId === data.classId &&
        r.suppliesCategory === data.suppliesCategory &&
        ['pending', 'approved', 'picked_up'].includes(r.status)
    )

    const req = cls?.suppliesRequirements.find((x) => x.category === data.suppliesCategory)
    const allocated = req ? req.quantity : 5

    if (todayReservations.length >= allocated && categoryAvailable.length === 0) {
      return { success: false, message: '该用品今日配额已满，请加入候补或选择替换用品' }
    }

    let assignedSupplies: Supplies | undefined
    if (categoryAvailable.length > 0) {
      assignedSupplies = categoryAvailable[0]
    }

    const newRes: Reservation = {
      id: 'res_' + Date.now(),
      code: 'RSV-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(Math.floor(Math.random() * 900) + 100),
      ...data,
      suppliesId: assignedSupplies?.id,
      suppliesName: assignedSupplies?.name || data.suppliesCategory,
      suppliesCode: assignedSupplies?.code,
      status: assignedSupplies ? 'approved' : 'waitlisted',
      createdAt: new Date().toISOString(),
      waitlistPosition: assignedSupplies ? undefined : 1,
    }

    if (assignedSupplies) {
      set((state) => ({
        reservations: [...state.reservations, newRes],
        supplies: state.supplies.map((x) =>
          x.id === assignedSupplies!.id ? { ...x, status: 'reserved' } : x
        ),
      }))
      return { success: true, message: '预约成功，待领取', reservation: newRes }
    } else {
      set((state) => ({
        reservations: [...state.reservations, newRes],
      }))
      return { success: true, message: '已加入候补队列，位置 #1', reservation: newRes }
    }
  },

  updateReservationStatus: (resId, status, updates) =>
    set((s) => ({
      reservations: s.reservations.map((r) =>
        r.id === resId ? { ...r, status, ...updates } : r
      ),
    })),

  replaceSupplies: (resId, suppliesId, suppliesName) => {
    set((s) => {
      const res = s.reservations.find((r) => r.id === resId)
      if (!res) return s
      return {
        reservations: s.reservations.map((r) =>
          r.id === resId
            ? {
                ...r,
                replacementSuppliesId: suppliesId,
                replacementSuppliesName: suppliesName,
                status: 'replaced',
              }
            : r
        ),
        supplies: s.supplies.map((x) =>
          x.id === suppliesId ? { ...x, status: 'reserved' } : x
        ),
      }
    })
  },

  createPickup: (data) => {
    const id = 'p_' + Date.now()
    set((s) => ({
      pickupRecords: [...s.pickupRecords, { ...data, id }],
      supplies: s.supplies.map((x) =>
        x.id === data.suppliesId ? { ...x, status: 'in_use' } : x
      ),
      reservations: s.reservations.map((r) =>
        r.id === data.reservationId ? { ...r, status: 'picked_up' } : r
      ),
    }))
  },

  createReturn: (data) => {
    const id = 'ret_' + Date.now()
    const s = get()
    const pickup = s.pickupRecords.find((p) => p.id === data.pickupId)
    if (!pickup) return { success: false, message: '未找到领用记录' }

    let affectsNextClass = false
    let affectedClassName = ''

    if (data.condition === 'damaged_major' || data.condition === 'lost') {
      const upcoming = s.classes
        .filter((c) => new Date(c.startTime) > new Date())
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

      for (const c of upcoming) {
        const needs = c.suppliesRequirements.find(
          (r) => r.category === pickup.suppliesCategory
        )
        if (needs) {
          const available = s.supplies.filter(
            (x) =>
              x.category === pickup.suppliesCategory &&
              (x.status === 'available' || x.status === 'reserved') &&
              x.id !== data.suppliesId
          )
          const reservedCount = s.reservations.filter(
            (r) =>
              r.classId === c.id &&
              r.suppliesCategory === pickup.suppliesCategory &&
              ['pending', 'approved'].includes(r.status)
          ).length
          if (available.length < needs.quantity - reservedCount) {
            affectsNextClass = true
            affectedClassName = c.title
            break
          }
        }
      }
    }

    set((state) => ({
      returnRecords: [...state.returnRecords, { ...data, id }],
      pickupRecords: state.pickupRecords.map((p) =>
        p.id === data.pickupId
          ? { ...p, isReturned: true, actualReturnTime: data.returnedAt }
          : p
      ),
      supplies: state.supplies.map((x) =>
        x.id === data.suppliesId
          ? {
              ...x,
              status: data.condition === 'damaged_major' || data.condition === 'lost' ? 'maintenance' : data.needReSterilize ? 'sterilizing' : 'available',
              notes: data.condition !== 'good' ? data.notes : x.notes,
            }
          : x
      ),
      reservations: state.reservations.map((r) =>
        r.id === pickup.reservationId ? { ...r, status: 'returned' } : r
      ),
    }))

    return {
      success: true,
      message: affectsNextClass
        ? `归还成功，但该用品损坏将影响下一场【${affectedClassName}】课堂，请及时安排处理`
        : '归还成功',
      affectsNextClass,
      affectedClassName,
    }
  },

  addSterilization: (data) =>
    set((s) => ({
      sterilizationRecords: [{ ...data, id: 'st_' + Date.now() }, ...s.sterilizationRecords],
      supplies: s.supplies.map((x) =>
        data.suppliesIds.includes(x.id) ? { ...x, status: 'sterilizing' } : x
      ),
    })),

  updateSterilizationStatus: (id, status, endTime) =>
    set((s) => {
      const record = s.sterilizationRecords.find((r) => r.id === id)
      return {
        sterilizationRecords: s.sterilizationRecords.map((r) =>
          r.id === id ? { ...r, status, endTime } : r
        ),
        supplies: status === 'completed' && record
          ? s.supplies.map((x) =>
              record.suppliesIds.includes(x.id)
                ? {
                    ...x,
                    status: 'available',
                    lastSterilizedBatch: record.batchNumber,
                    lastSterilizedAt: endTime || new Date().toISOString(),
                  }
                : x
            )
          : s.supplies,
      }
    }),

  freezeOverdue: (overdueId, reason) =>
    set((s) => ({
      overdueRecords: s.overdueRecords.map((o) =>
        o.id === overdueId
          ? {
              ...o,
              isFrozen: true,
              frozenAt: new Date().toISOString(),
              frozenReason: reason,
            }
          : o
      ),
    })),

  unfreezeOverdue: (overdueId, reason) =>
    set((s) => ({
      overdueRecords: s.overdueRecords.map((o) =>
        o.id === overdueId
          ? {
              ...o,
              isFrozen: false,
              unfrozenAt: new Date().toISOString(),
              unfreezeReason: reason,
            }
          : o
      ),
    })),

  addWaitlist: (data) => {
    const s = get()
    const count = s.waitlistEntries.filter(
      (w) => w.classId === data.classId && w.suppliesCategory === data.suppliesCategory && w.status === 'waiting'
    ).length
    const entry: WaitlistEntry = {
      ...data,
      id: 'w_' + Date.now(),
      position: count + 1,
      status: 'waiting',
    }
    set((state) => ({ waitlistEntries: [...state.waitlistEntries, entry] }))
    return { success: true, message: `已加入候补队列，位置 #${count + 1}`, entry }
  },

  updateWaitlistStatus: (id, status) =>
    set((s) => ({
      waitlistEntries: s.waitlistEntries.map((w) =>
        w.id === id ? { ...w, status, isNotified: true } : w
      ),
    })),
}))
