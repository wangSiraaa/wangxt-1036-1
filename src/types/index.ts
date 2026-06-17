export type UserRole = 'lecturer' | 'nurse' | 'warehouse' | 'parent'

export interface User {
  id: string
  name: string
  role: UserRole
  phone: string
  avatar?: string
  familyId?: string
  department?: string
  title?: string
}

export type SuppliesCategory = 'baby_scale' | 'nursing_pillow' | 'rehab_device'

export const suppliesCategoryMap: Record<SuppliesCategory, string> = {
  baby_scale: '婴儿秤',
  nursing_pillow: '哺乳枕',
  rehab_device: '康复辅具',
}

export type SuppliesStatus = 'available' | 'in_use' | 'sterilizing' | 'maintenance' | 'reserved' | 'pending_inspection'

export const suppliesStatusMap: Record<SuppliesStatus, string> = {
  available: '可领用',
  in_use: '使用中',
  sterilizing: '消毒中',
  maintenance: '维修中',
  reserved: '已预约',
  pending_inspection: '待复检',
}

export interface Supplies {
  id: string
  code: string
  name: string
  category: SuppliesCategory
  status: SuppliesStatus
  lastSterilizedBatch?: string
  lastSterilizedAt?: string
  nextMaintenanceAt?: string
  notes?: string
  model?: string
  ageMinMonths?: number
  ageMaxMonths?: number
  sterilizationWindowHours?: number
  lastPendingInspectionAt?: string
}

export type ClassStatus = 'draft' | 'published' | 'open' | 'ongoing' | 'completed' | 'cancelled'

export const classStatusMap: Record<ClassStatus, string> = {
  draft: '草稿',
  published: '已发布',
  open: '报名中',
  ongoing: '进行中',
  completed: '已完成',
  cancelled: '已取消',
}

export interface ClassSuppliesRequirement {
  category: SuppliesCategory
  quantity: number
  latestPickupTime: string
}

export interface ClassEntity {
  id: string
  code: string
  title: string
  description?: string
  lecturerId: string
  lecturerName: string
  startTime: string
  endTime: string
  location: string
  maxParticipants: number
  currentParticipants: number
  status: ClassStatus
  suppliesRequirements: ClassSuppliesRequirement[]
  coverImage?: string
  createdAt: string
}

export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'attended' | 'absent' | 'cancelled'

export const registrationStatusMap: Record<RegistrationStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  attended: '已参加',
  absent: '缺席',
  cancelled: '已取消',
}

export interface Registration {
  id: string
  classId: string
  className: string
  parentId: string
  parentName: string
  familyId: string
  status: RegistrationStatus
  registeredAt: string
}

export type ReservationStatus = 'pending' | 'approved' | 'picked_up' | 'returned' | 'cancelled' | 'waitlisted' | 'replaced'

export const reservationStatusMap: Record<ReservationStatus, string> = {
  pending: '待确认',
  approved: '待领取',
  picked_up: '已领取',
  returned: '已归还',
  cancelled: '已取消',
  waitlisted: '候补中',
  replaced: '已替换',
}

export interface Reservation {
  id: string
  code: string
  classId: string
  className: string
  suppliesId?: string
  suppliesName: string
  suppliesCode?: string
  suppliesCategory: SuppliesCategory
  parentId: string
  parentName: string
  familyId: string
  status: ReservationStatus
  createdAt: string
  estimatedPickupTime?: string
  estimatedReturnTime?: string
  waitlistPosition?: number
  replacementSuppliesId?: string
  replacementSuppliesName?: string
}

export interface PickupRecord {
  id: string
  reservationId: string
  suppliesId: string
  suppliesName: string
  suppliesCode: string
  suppliesCategory: SuppliesCategory
  parentId: string
  parentName: string
  familyId: string
  classId: string
  className: string
  nurseId: string
  nurseName: string
  sterilizedBatch: string
  usageNotes?: string
  pickupTime: string
  expectedReturnTime: string
  actualReturnTime?: string
  isReturned: boolean
}

export type ReturnCondition = 'good' | 'damaged_minor' | 'damaged_major' | 'lost'

export const returnConditionMap: Record<ReturnCondition, string> = {
  good: '完好',
  damaged_minor: '轻微损坏',
  damaged_major: '严重损坏',
  lost: '丢失',
}

export interface ReturnRecord {
  id: string
  pickupId: string
  suppliesId: string
  suppliesName: string
  condition: ReturnCondition
  needReSterilize: boolean
  affectsNextClass: boolean
  affectedClassId?: string
  affectedClassName?: string
  notes?: string
  nurseId: string
  nurseName: string
  returnedAt: string
}

export type SterilizationStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

export const sterilizationStatusMap: Record<SterilizationStatus, string> = {
  pending: '待消毒',
  in_progress: '消毒中',
  completed: '已完成',
  failed: '消毒失败',
}

export interface SterilizationRecord {
  id: string
  batchNumber: string
  suppliesIds: string[]
  suppliesNames: string
  warehouseId: string
  warehouseName: string
  status: SterilizationStatus
  startTime: string
  endTime?: string
  method: string
  temperature?: number
  duration?: number
  notes?: string
}

export interface OverdueRecord {
  id: string
  pickupId: string
  suppliesId: string
  suppliesName: string
  suppliesCode: string
  suppliesCategory: SuppliesCategory
  parentId: string
  parentName: string
  familyId: string
  expectedReturnTime: string
  overdueDays: number
  isFrozen: boolean
  frozenAt?: string
  unfrozenAt?: string
  frozenReason?: string
  unfreezeReason?: string
  createdAt: string
}

export interface WaitlistEntry {
  id: string
  classId: string
  className: string
  suppliesCategory: SuppliesCategory
  parentId: string
  parentName: string
  familyId: string
  position: number
  createdAt: string
  expiresAt: string
  isNotified: boolean
  status: 'waiting' | 'offered' | 'accepted' | 'declined' | 'expired'
}

export interface ReplacementOption {
  suppliesId: string
  suppliesName: string
  suppliesCode: string
  available: boolean
}

export type InspectionStatus = 'pending' | 'passed' | 'failed'

export const inspectionStatusMap: Record<InspectionStatus, string> = {
  pending: '待复检',
  passed: '复检通过',
  failed: '需维修',
}

export type SafetyAssessment = 'safe' | 'caution' | 'unsafe'

export const safetyAssessmentMap: Record<SafetyAssessment, string> = {
  safe: '安全可用',
  caution: '谨慎使用',
  unsafe: '存在安全隐患',
}

export interface InspectionRecord {
  id: string
  returnRecordId: string
  suppliesId: string
  suppliesName: string
  suppliesCode: string
  condition: ReturnCondition
  damageDescription?: string
  nurseId: string
  nurseName: string
  submittedAt: string
  inspectorId?: string
  inspectorName?: string
  inspectedAt?: string
  status: InspectionStatus
  safetyAssessment?: SafetyAssessment
  inspectionNotes?: string
  maintenanceRequired?: boolean
  reSterilizeRequired?: boolean
  affectsUpcomingClasses?: boolean
  affectedReservationIds?: string[]
}

export type OccupancyType = 'reservation' | 'pickup' | 'sterilization' | 'inspection' | 'maintenance' | 'replacement_wait'

export const occupancyTypeMap: Record<OccupancyType, string> = {
  reservation: '课堂预约',
  pickup: '使用中',
  sterilization: '消毒中',
  inspection: '待复检',
  maintenance: '维修中',
  replacement_wait: '待替换',
}

export interface SuppliesOccupancy {
  id: string
  suppliesId: string
  suppliesName: string
  suppliesCode: string
  type: OccupancyType
  reservationId?: string
  pickupId?: string
  sterilizationId?: string
  inspectionId?: string
  classId?: string
  className?: string
  parentId?: string
  parentName?: string
  startTime: string
  endTime: string
  lockReason?: string
  replacementForReservationId?: string
  createdAt: string
}

export interface TransferCheckResult {
  canTransfer: boolean
  reasons: string[]
  checks: {
    sterilizationWindow: { passed: boolean; message: string; readyAt?: string }
    ageLimit: { passed: boolean; message: string }
    inventoryConflict: { passed: boolean; message: string; conflictingClasses?: string[] }
  }
  alternatives: ReplacementOption[]
}

export interface ClassTransferRecord {
  id: string
  originalReservationId: string
  originalClassId: string
  originalClassName: string
  newReservationId?: string
  newClassId: string
  newClassName: string
  suppliesId?: string
  parentId: string
  parentName: string
  transferCheckResult?: TransferCheckResult
  status: 'requested' | 'checking' | 'transferred' | 'rejected'
  createdAt: string
  processedAt?: string
  notes?: string
}
