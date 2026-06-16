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
  InspectionRecord,
  InspectionStatus,
  SuppliesOccupancy,
  TransferCheckResult,
  ClassTransferRecord,
  ReplacementOption,
  SuppliesCategory,
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
  mockInspectionRecords,
  mockOccupancies,
  mockTransferRecords,
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
  inspectionRecords: InspectionRecord[]
  occupancies: SuppliesOccupancy[]
  transferRecords: ClassTransferRecord[]

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
  createReturn: (data: Omit<ReturnRecord, 'id'>) => { success: boolean; message: string; affectsNextClass?: boolean; affectedClassName?: string; inspectionRecord?: InspectionRecord }

  addSterilization: (data: Omit<SterilizationRecord, 'id'>) => void
  updateSterilizationStatus: (id: string, status: SterilizationStatus, endTime?: string) => void

  freezeOverdue: (overdueId: string, reason: string) => void
  unfreezeOverdue: (overdueId: string, reason: string) => void

  addWaitlist: (data: Omit<WaitlistEntry, 'id' | 'position' | 'status'>) => { success: boolean; message: string; entry?: WaitlistEntry }
  updateWaitlistStatus: (id: string, status: WaitlistEntry['status']) => void

  submitInspection: (inspection: Omit<InspectionRecord, 'id'>) => void
  resolveInspection: (id: string, status: InspectionStatus, data: { inspectorId: string; inspectorName: string; safetyAssessment: 'safe' | 'caution' | 'unsafe'; inspectionNotes?: string; maintenanceRequired?: boolean; reSterilizeRequired?: boolean }) => void

  buildOccupancies: () => SuppliesOccupancy[]
  getSuppliesOccupancies: (suppliesId: string, days?: number) => SuppliesOccupancy[]

  checkClassTransfer: (originalReservationId: string, newClassId: string, childAgeMonths?: number) => TransferCheckResult
  transferClassReservation: (originalReservationId: string, newClassId: string, childAgeMonths?: number) => { success: boolean; message: string; newReservation?: Reservation; checkResult: TransferCheckResult }
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
  inspectionRecords: mockInspectionRecords,
  occupancies: mockOccupancies,
  transferRecords: mockTransferRecords,

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
    let inspectionRecord: InspectionRecord | undefined

    const upcoming = s.classes
      .filter((c) => new Date(c.startTime) > new Date())
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    const checkAffects = (condition: ReturnCondition) => {
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

    if (data.condition === 'damaged_minor') {
      checkAffects(data.condition)
      const affectedReservationIds = s.reservations
        .filter((r) =>
          upcoming
            .filter((c) => c.suppliesRequirements.some((req) => req.category === pickup.suppliesCategory))
            .some((c) => c.id === r.classId) &&
          ['pending', 'approved', 'waitlisted'].includes(r.status) &&
          (r.suppliesId === data.suppliesId || (!r.suppliesId && r.suppliesCategory === pickup.suppliesCategory))
        )
        .map((r) => r.id)

      inspectionRecord = {
        id: 'insp_' + Date.now(),
        returnRecordId: id,
        suppliesId: data.suppliesId,
        suppliesName: data.suppliesName,
        suppliesCode: pickup.suppliesCode,
        condition: data.condition,
        damageDescription: data.notes,
        nurseId: data.nurseId,
        nurseName: data.nurseName,
        submittedAt: data.returnedAt,
        status: 'pending',
        affectsUpcomingClasses: affectsNextClass,
        affectedReservationIds,
      }
    } else if (data.condition === 'damaged_major' || data.condition === 'lost') {
      checkAffects(data.condition)
    }

    let newStatus: Supplies['status']
    if (data.condition === 'damaged_minor') {
      newStatus = 'pending_inspection'
    } else if (data.condition === 'damaged_major' || data.condition === 'lost') {
      newStatus = 'maintenance'
    } else {
      newStatus = data.needReSterilize ? 'sterilizing' : 'available'
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
              status: newStatus,
              notes: data.condition !== 'good' ? data.notes : x.notes,
              lastPendingInspectionAt: data.condition === 'damaged_minor' ? data.returnedAt : x.lastPendingInspectionAt,
            }
          : x
      ),
      reservations: state.reservations.map((r) =>
        r.id === pickup.reservationId ? { ...r, status: 'returned' } : r
      ),
      inspectionRecords: inspectionRecord
        ? [...state.inspectionRecords, inspectionRecord]
        : state.inspectionRecords,
      occupancies: inspectionRecord
        ? [
            ...state.occupancies,
            {
              id: 'occ_' + Date.now(),
              suppliesId: data.suppliesId,
              suppliesName: data.suppliesName,
              suppliesCode: pickup.suppliesCode,
              type: 'inspection',
              inspectionId: inspectionRecord.id,
              startTime: data.returnedAt,
              endTime: new Date(new Date(data.returnedAt).getTime() + 24 * 60 * 60 * 1000).toISOString(),
              lockReason: '轻微破损，待库管复检',
              createdAt: new Date().toISOString(),
            },
          ]
        : state.occupancies,
    }))

    return {
      success: true,
      message: data.condition === 'damaged_minor'
        ? `归还成功，该用品因轻微破损已进入待复检状态${affectsNextClass ? `，将影响下一场【${affectedClassName}】课堂` : ''}`
        : affectsNextClass
        ? `归还成功，但该用品损坏将影响下一场【${affectedClassName}】课堂，请及时安排处理`
        : '归还成功',
      affectsNextClass,
      affectedClassName,
      inspectionRecord,
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

  submitInspection: (inspection) =>
    set((s) => ({
      inspectionRecords: [...s.inspectionRecords, { ...inspection, id: 'insp_' + Date.now() }],
    })),

  resolveInspection: (id, status, data) => {
    const s = get()
    const insp = s.inspectionRecords.find((i) => i.id === id)
    if (!insp) return
    const now = new Date().toISOString()

    let newSupplyStatus: Supplies['status']
    if (status === 'passed') {
      newSupplyStatus = data.reSterilizeRequired ? 'sterilizing' : 'available'
    } else {
      newSupplyStatus = 'maintenance'
    }

    const affectedReservations = insp.affectedReservationIds || []
    const replacementOccs: SuppliesOccupancy[] = []

    if (status === 'passed' && affectedReservations.length > 0) {
      affectedReservations.forEach((rid) => {
        const res = s.reservations.find((r) => r.id === rid)
        if (res && res.suppliesId === insp.suppliesId && ['pending', 'approved', 'waitlisted'].includes(res.status)) {
          replacementOccs.push({
            id: 'occ_rep_' + Date.now() + '_' + rid,
            suppliesId: insp.suppliesId,
            suppliesName: insp.suppliesName,
            suppliesCode: insp.suppliesCode,
            type: 'replacement_wait',
            classId: res.classId,
            className: res.className,
            parentId: res.parentId,
            parentName: res.parentName,
            startTime: now,
            endTime: new Date(new Date(now).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            lockReason: `复检通过后为预约【${res.code}】重新分配，或家长需要领取替换品`,
            replacementForReservationId: rid,
            createdAt: now,
          })
        }
      })
    }

    set((state) => ({
      inspectionRecords: state.inspectionRecords.map((i) =>
        i.id === id
          ? {
              ...i,
              status,
              inspectorId: data.inspectorId,
              inspectorName: data.inspectorName,
              inspectedAt: now,
              safetyAssessment: data.safetyAssessment,
              inspectionNotes: data.inspectionNotes,
              maintenanceRequired: data.maintenanceRequired,
              reSterilizeRequired: data.reSterilizeRequired,
            }
          : i
      ),
      supplies: state.supplies.map((x) =>
        x.id === insp.suppliesId ? { ...x, status: newSupplyStatus } : x
      ),
      occupancies: [
        ...state.occupancies.filter((o) => !(o.type === 'inspection' && o.inspectionId === id)),
        ...replacementOccs,
      ],
    }))
  },

  buildOccupancies: () => {
    const s = get()
    const result: SuppliesOccupancy[] = []
    const now = new Date()
    const horizon = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    const nowIso = now.toISOString()

    s.reservations.forEach((r) => {
      if (!['pending', 'approved', 'waitlisted'].includes(r.status)) return
      const cls = s.classes.find((c) => c.id === r.classId)
      if (!cls) return
      if (new Date(cls.endTime) < now || new Date(cls.startTime) > horizon) return

      if (r.suppliesId) {
        const supply = s.supplies.find((x) => x.id === r.suppliesId)
        result.push({
          id: 'occ_res_' + r.id,
          suppliesId: r.suppliesId,
          suppliesName: supply?.name || r.suppliesName,
          suppliesCode: supply?.code || r.suppliesCode || '',
          type: 'reservation',
          reservationId: r.id,
          classId: r.classId,
          className: r.className,
          parentId: r.parentId,
          parentName: r.parentName,
          startTime: new Date(cls.startTime).getTime() < now.getTime() ? nowIso : cls.startTime,
          endTime: cls.endTime,
          lockReason: `课堂【${r.className}】预约，家长：${r.parentName}`,
          createdAt: nowIso,
        })
      } else if (r.status === 'waitlisted') {
        const req = cls.suppliesRequirements.find((req) => req.category === r.suppliesCategory)
        if (!req) return
        result.push({
          id: 'occ_waitlist_' + r.id,
          suppliesId: 'category_' + r.suppliesCategory + '_' + r.id,
          suppliesName: '候补队列（' + r.suppliesCategory + '）',
          suppliesCode: r.code,
          type: 'replacement_wait',
          reservationId: r.id,
          classId: r.classId,
          className: r.className,
          parentId: r.parentId,
          parentName: r.parentName,
          startTime: new Date(cls.startTime).getTime() < now.getTime() ? nowIso : cls.startTime,
          endTime: cls.endTime,
          lockReason: `候补队列，等待${r.suppliesCategory}释放，家长：${r.parentName}`,
          replacementForReservationId: r.id,
          createdAt: nowIso,
        })
      }
    })

    s.pickupRecords.forEach((p) => {
      if (p.isReturned) return
      if (new Date(p.expectedReturnTime) < now) return
      result.push({
        id: 'occ_pick_' + p.id,
        suppliesId: p.suppliesId,
        suppliesName: p.suppliesName,
        suppliesCode: p.suppliesCode,
        type: 'pickup',
        pickupId: p.id,
        classId: p.classId,
        className: p.className,
        parentId: p.parentId,
        parentName: p.parentName,
        startTime: new Date(p.pickupTime).getTime() < now.getTime() ? nowIso : p.pickupTime,
        endTime: p.expectedReturnTime,
        lockReason: `使用中，课堂【${p.className}】，家长：${p.parentName}`,
        createdAt: nowIso,
      })
    })

    s.sterilizationRecords.forEach((st) => {
      if (st.status !== 'in_progress' && st.status !== 'pending') return
      const endT = st.endTime || new Date(new Date(st.startTime).getTime() + 2 * 60 * 60 * 1000).toISOString()
      if (new Date(endT) < now) return
      if (st.startTime && new Date(st.startTime) > horizon) return
      st.suppliesIds.forEach((sid) => {
        const supply = s.supplies.find((x) => x.id === sid)
        result.push({
          id: 'occ_ster_' + st.id + '_' + sid,
          suppliesId: sid,
          suppliesName: supply?.name || st.suppliesNames,
          suppliesCode: supply?.code || '',
          type: 'sterilization',
          sterilizationId: st.id,
          startTime: new Date(st.startTime).getTime() < now.getTime() ? nowIso : st.startTime,
          endTime: endT,
          lockReason: `消毒中，批号：${st.batchNumber}，方式：${st.method}`,
          createdAt: nowIso,
        })
      })
    })

    s.inspectionRecords.forEach((insp) => {
      if (insp.status !== 'pending') return
      const endT = new Date(new Date(insp.submittedAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
      if (new Date(endT) < now) return
      result.push({
        id: 'occ_insp_' + insp.id,
        suppliesId: insp.suppliesId,
        suppliesName: insp.suppliesName,
        suppliesCode: insp.suppliesCode,
        type: 'inspection',
        inspectionId: insp.id,
        startTime: new Date(insp.submittedAt).getTime() < now.getTime() ? nowIso : insp.submittedAt,
        endTime: endT,
        lockReason: `待复检，${insp.damageDescription || '轻微破损'}，提交护士：${insp.nurseName}`,
        createdAt: nowIso,
      })
    })

    s.supplies.forEach((supply) => {
      if (supply.status === 'maintenance' && !result.some((o) => o.suppliesId === supply.id)) {
        result.push({
          id: 'occ_maint_' + supply.id,
          suppliesId: supply.id,
          suppliesName: supply.name,
          suppliesCode: supply.code,
          type: 'maintenance',
          startTime: nowIso,
          endTime: horizon.toISOString(),
          lockReason: supply.notes || '维修中，暂不可用',
          createdAt: nowIso,
        })
      }
    })

    return result
  },

  getSuppliesOccupancies: (suppliesId, days = 2) => {
    const all = get().buildOccupancies()
    const horizon = new Date(new Date().getTime() + days * 24 * 60 * 60 * 1000).toISOString()
    return all
      .filter((o) => o.suppliesId === suppliesId || o.suppliesId.startsWith('category_'))
      .filter((o) => o.startTime <= horizon)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  },

  checkClassTransfer: (originalReservationId, newClassId, childAgeMonths) => {
    const s = get()
    const origRes = s.reservations.find((r) => r.id === originalReservationId)
    if (!origRes) {
      return {
        canTransfer: false,
        reasons: ['未找到原始预约'],
        checks: {
          sterilizationWindow: { passed: false, message: '未找到原始预约' },
          ageLimit: { passed: false, message: '未找到原始预约' },
          inventoryConflict: { passed: false, message: '未找到原始预约', conflictingClasses: [] },
        },
        alternatives: [],
      }
    }

    const newClass = s.classes.find((c) => c.id === newClassId)
    if (!newClass) {
      return {
        canTransfer: false,
        reasons: ['新课堂不存在'],
        checks: {
          sterilizationWindow: { passed: false, message: '新课堂不存在' },
          ageLimit: { passed: false, message: '新课堂不存在' },
          inventoryConflict: { passed: false, message: '新课堂不存在', conflictingClasses: [] },
        },
        alternatives: [],
      }
    }

    const reasons: string[] = []
    const allOcc = s.buildOccupancies()
    const now = new Date()

    // 1. 消毒窗口校验
    let sterilizationPassed = true
    let sterilizationMessage = ''
    let sterilizationReadyAt: string | undefined

    if (origRes.suppliesId) {
      const supply = s.supplies.find((x) => x.id === origRes.suppliesId)
      if (supply) {
        const sterHours = supply.sterilizationWindowHours || 2
        const supplyOcc = allOcc.filter((o) => o.suppliesId === supply.id)
        const pickupRec = s.pickupRecords.find(
          (p) => p.reservationId === origRes.id && !p.isReturned
        )

        if (pickupRec) {
          const estReturn = new Date(pickupRec.expectedReturnTime)
          const readyAt = new Date(estReturn.getTime() + sterHours * 60 * 60 * 1000)
          const classStart = new Date(newClass.startTime)
          if (readyAt > classStart) {
            sterilizationPassed = false
            sterilizationReadyAt = readyAt.toISOString()
            sterilizationMessage = `用品【${supply.name}】需在归还后消毒 ${sterHours} 小时，预计 ${readyAt.toLocaleString()} 后才可用于下一场，新课堂开始时间不足`
          } else {
            sterilizationMessage = `消毒窗口校验通过（${sterHours}小时消毒时间足够）`
          }
        } else {
          const conflict = supplyOcc.find(
            (o) =>
              new Date(o.startTime) < new Date(newClass.endTime) &&
              new Date(o.endTime) > new Date(newClass.startTime)
          )
          if (conflict) {
            sterilizationPassed = false
            sterilizationMessage = `用品【${supply.name}】在新课堂时间段内被占用：${conflict.lockReason}`
          } else if (supply.lastSterilizedAt) {
            const lastSter = new Date(supply.lastSterilizedAt)
            const classStart = new Date(newClass.startTime)
            const hoursSince = (classStart.getTime() - lastSter.getTime()) / (1000 * 60 * 60)
            const maxHours = 72
            if (hoursSince > maxHours) {
              sterilizationPassed = false
              sterilizationMessage = `用品【${supply.name}】距离上次消毒已超过 ${maxHours} 小时，需重新消毒`
            } else {
              sterilizationMessage = `消毒状态有效（上次消毒后 ${Math.round(hoursSince)} 小时，${maxHours}小时内有效）`
            }
          } else {
            sterilizationPassed = false
            sterilizationMessage = `用品【${supply.name}】无消毒记录，不能直接使用`
          }
        }
      }
    } else {
      sterilizationPassed = false
      sterilizationMessage = '原始预约未分配具体用品，需在新课堂重新预约分配'
    }
    if (!sterilizationPassed) reasons.push(sterilizationMessage)

    // 2. 适龄限制校验
    let ageLimitPassed = true
    let ageLimitMessage = ''

    if (origRes.suppliesId && childAgeMonths !== undefined) {
      const supply = s.supplies.find((x) => x.id === origRes.suppliesId)
      if (supply) {
        const min = supply.ageMinMonths
        const max = supply.ageMaxMonths
        if (min !== undefined && childAgeMonths < min) {
          ageLimitPassed = false
          ageLimitMessage = `儿童月龄 ${childAgeMonths} 个月，低于用品【${supply.name}】最低适用月龄 ${min} 个月`
        } else if (max !== undefined && childAgeMonths > max) {
          ageLimitPassed = false
          ageLimitMessage = `儿童月龄 ${childAgeMonths} 个月，超过用品【${supply.name}】最高适用月龄 ${max} 个月`
        } else {
          if (min !== undefined && max !== undefined) {
            ageLimitMessage = `适龄校验通过（${childAgeMonths}个月在${min}-${max}个月范围内）`
          } else {
            ageLimitMessage = '适龄校验通过（该用品无月龄限制）'
          }
        }
      }
    } else if (childAgeMonths === undefined) {
      ageLimitPassed = false
      ageLimitMessage = '未提供儿童月龄，无法验证适龄限制'
    } else {
      ageLimitMessage = '原始预约未分配用品，适龄限制将在重新分配时校验'
    }
    if (!ageLimitPassed) reasons.push(ageLimitMessage)

    // 3. 库存占用校验
    let inventoryPassed = true
    let inventoryMessage = ''
    const conflictingClasses: string[] = []

    const req = newClass.suppliesRequirements.find((r) => r.category === origRes.suppliesCategory)
    if (!req) {
      inventoryPassed = false
      inventoryMessage = `新课堂【${newClass.title}】不要求用品类型：${origRes.suppliesCategory}`
    } else {
      const existingRes = s.reservations.filter(
        (r) =>
          r.classId === newClassId &&
          r.suppliesCategory === origRes.suppliesCategory &&
          r.id !== origRes.id &&
          ['pending', 'approved', 'waitlisted', 'picked_up'].includes(r.status)
      )

      const sameSupplyConflict = allOcc.filter(
        (o) =>
          origRes.suppliesId &&
          o.suppliesId === origRes.suppliesId &&
          o.reservationId !== origRes.id &&
          new Date(o.startTime) < new Date(newClass.endTime) &&
          new Date(o.endTime) > new Date(newClass.startTime)
      )

      if (sameSupplyConflict.length > 0) {
        inventoryPassed = false
        const clsNames = new Set(sameSupplyConflict.map((o) => o.className).filter(Boolean))
        conflictingClasses.push(...Array.from(clsNames))
        inventoryMessage = `用品已在以下课堂占用：${conflictingClasses.join('、')}`
      } else if (existingRes.length >= req.quantity) {
        inventoryPassed = false
        inventoryMessage = `新课堂【${newClass.title}】的${origRes.suppliesCategory}配额已满（${existingRes.length}/${req.quantity}）`

        const categoryAvailable = s.supplies.filter(
          (x) =>
            x.category === origRes.suppliesCategory &&
            x.status === 'available' &&
            x.lastSterilizedBatch
        )
        if (categoryAvailable.length > 0) {
          inventoryMessage += `，但还有 ${categoryAvailable.length} 件库存未分配`
          inventoryPassed = true
        }
      } else {
        inventoryMessage = `库存占用校验通过（已约${existingRes.length}/${req.quantity}）`
      }
    }
    if (!inventoryPassed) reasons.push(inventoryMessage)

    // 备选用品推荐
    const alternatives: ReplacementOption[] = []
    if (!(sterilizationPassed && inventoryPassed)) {
      const candidateSupplies = s.supplies.filter(
        (x) =>
          x.category === origRes.suppliesCategory &&
          x.id !== origRes.suppliesId &&
          x.status === 'available' &&
          x.lastSterilizedBatch
      )
      for (const supply of candidateSupplies.slice(0, 5)) {
        const conflict = allOcc.some(
          (o) =>
            o.suppliesId === supply.id &&
            new Date(o.startTime) < new Date(newClass.endTime) &&
            new Date(o.endTime) > new Date(newClass.startTime)
        )
        let ageOk = true
        if (childAgeMonths !== undefined) {
          if (supply.ageMinMonths !== undefined && childAgeMonths < supply.ageMinMonths) ageOk = false
          if (supply.ageMaxMonths !== undefined && childAgeMonths > supply.ageMaxMonths) ageOk = false
        }
        alternatives.push({
          suppliesId: supply.id,
          suppliesName: supply.name,
          suppliesCode: supply.code,
          available: !conflict && ageOk,
        })
      }
    }

    return {
      canTransfer: sterilizationPassed && ageLimitPassed && inventoryPassed,
      reasons,
      checks: {
        sterilizationWindow: { passed: sterilizationPassed, message: sterilizationMessage, readyAt: sterilizationReadyAt },
        ageLimit: { passed: ageLimitPassed, message: ageLimitMessage },
        inventoryConflict: { passed: inventoryPassed, message: inventoryMessage, conflictingClasses },
      },
      alternatives,
    }
  },

  transferClassReservation: (originalReservationId, newClassId, childAgeMonths) => {
    const s = get()
    const checkResult = s.checkClassTransfer(originalReservationId, newClassId, childAgeMonths)
    const origRes = s.reservations.find((r) => r.id === originalReservationId)
    const newClass = s.classes.find((c) => c.id === newClassId)

    if (!origRes || !newClass) {
      return { success: false, message: '预约或课堂不存在', checkResult }
    }

    const reg = s.registrations.find(
      (r) => r.classId === newClassId && r.parentId === origRes.parentId
    )
    if (!reg || !['approved', 'attended', 'pending'].includes(reg.status)) {
      return {
        success: false,
        message: '未在新课堂完成报名，不能直接改签用品，请先报名',
        checkResult,
      }
    }

    let newReservation: Reservation | undefined

    if (checkResult.canTransfer && origRes.suppliesId) {
      const newRes: Reservation = {
        id: 'res_' + Date.now(),
        code: 'RSV-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(Math.floor(Math.random() * 900) + 100),
        classId: newClassId,
        className: newClass.title,
        suppliesId: origRes.suppliesId,
        suppliesName: origRes.suppliesName,
        suppliesCode: origRes.suppliesCode,
        suppliesCategory: origRes.suppliesCategory,
        parentId: origRes.parentId,
        parentName: origRes.parentName,
        familyId: origRes.familyId,
        status: 'approved',
        createdAt: new Date().toISOString(),
        estimatedPickupTime: newClass.suppliesRequirements.find((r) => r.category === origRes.suppliesCategory)?.latestPickupTime,
        estimatedReturnTime: newClass.endTime,
      }
      newReservation = newRes

      const transferRecord: ClassTransferRecord = {
        id: 'tr_' + Date.now(),
        originalReservationId,
        originalClassId: origRes.classId,
        originalClassName: origRes.className,
        newReservationId: newRes.id,
        newClassId,
        newClassName: newClass.title,
        suppliesId: origRes.suppliesId,
        parentId: origRes.parentId,
        parentName: origRes.parentName,
        transferCheckResult: checkResult,
        status: 'transferred',
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        notes: '跨课堂改签成功，用品跟随重新分配',
      }

      set((state) => ({
        reservations: [
          ...state.reservations.map((r) =>
            r.id === originalReservationId ? { ...r, status: 'cancelled' } : r
          ),
          newRes,
        ],
        supplies: state.supplies.map((x) =>
          x.id === origRes.suppliesId ? { ...x, status: 'reserved' } : x
        ),
        transferRecords: [...state.transferRecords, transferRecord],
      }))

      return {
        success: true,
        message: `改签成功，用品【${origRes.suppliesName}】已重新分配到新课堂【${newClass.title}】`,
        newReservation,
        checkResult,
      }
    } else {
      const transferRecord: ClassTransferRecord = {
        id: 'tr_' + Date.now(),
        originalReservationId,
        originalClassId: origRes.classId,
        originalClassName: origRes.className,
        newClassId,
        newClassName: newClass.title,
        parentId: origRes.parentId,
        parentName: origRes.parentName,
        transferCheckResult: checkResult,
        status: 'requested',
        createdAt: new Date().toISOString(),
        notes: '改签校验未通过，需在新课堂重新发起预约',
      }

      set((state) => ({
        transferRecords: [...state.transferRecords, transferRecord],
      }))

      return {
        success: false,
        message: checkResult.reasons[0] || '改签校验未通过，请在新课堂重新预约用品',
        newReservation,
        checkResult,
      }
    }
  },
}))
