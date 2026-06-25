import {
  btnGhost,
  btnPrimary as baseBtnPrimary,
  field as baseField,
  fieldTextarea as baseFieldTextarea,
} from '../../../lib/salesFormStyles.js'
import { getManagerTheme } from '../../../lib/managerTheme.js'

export const KPI_ROWS = [
  { key: 'newCustomers', label: 'New customers' },
  { key: 'existingFollowUps', label: 'Existing follow-ups' },
  { key: 'customerVisits', label: 'Customer visits' },
  { key: 'callsMade', label: 'Calls made' },
  { key: 'quotationsSent', label: 'Quotations sent' },
  { key: 'ordersReceived', label: 'Orders received' },
  { key: 'collectionFollowUps', label: 'Collection follow-ups' },
]

export const CHECK_KEYS = [
  'customerNamesRecorded',
  'outcomesMentioned',
  'quoteValuesRecorded',
  'orderValuesRecorded',
  'newCustomersClearlyMarked',
  'businessGeneratedVisible',
  'crmUpdated',
  'verifiedByManager',
]

export const FORM_STEPS = [
  { step: 1, title: 'Basics & daily targets' },
  { step: 2, title: 'Customer activity & business' },
  { step: 3, title: 'Support activities' },
  { step: 4, title: 'Achievements & plan' },
]

export function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function isSeltecCompany(company) {
  return String(company || '').trim().toLowerCase().includes('seltec')
}

export function displayValue(v) {
  if (v == null) return '—'
  const x = String(v).trim()
  return x === '' ? '—' : x
}

export function blankKpi() {
  return {
    achievedToday: '',
    remarks: '',
    managerComments: '',
  }
}

export function normalizeKpiRow(row) {
  const source = row && typeof row === 'object' ? row : {}
  return {
    achievedToday: String(source.achievedToday ?? '').trim(),
    remarks: String(source.remarks ?? '').trim(),
    managerComments: String(source.managerComments ?? '').trim(),
  }
}

export function salesDailyTargetPayload(dta) {
  return KPI_ROWS.reduce((acc, { key }) => {
    const row = dta?.[key] || {}
    acc[key] = {
      achievedToday: row.achievedToday ?? '',
      remarks: row.remarks ?? '',
    }
    return acc
  }, {})
}

export function blankCustomerActivity() {
  return {
    customerType: '',
    customerName: '',
    purpose: '',
    outcomeNextAction: '',
    quoteAed: '',
    orderAed: '',
  }
}

export function normalizeCustomerActivities(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [blankCustomerActivity()]
  return rows.map((row) => ({ ...blankCustomerActivity(), ...(row || {}) }))
}

export function blankSupportActivity() {
  return {
    taskCompleted: '',
    customerOrDepartment: '',
    resultOutcome: '',
    whomSupported: '',
    qtyOrValue: '',
  }
}

export function normalizeSupportActivities(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [blankSupportActivity()]
  return rows.map((row) => ({ ...blankSupportActivity(), ...(row || {}) }))
}

export function supportActivitiesFromReport(report) {
  if (Array.isArray(report?.supportActivities)) return report.supportActivities
  if (Array.isArray(report?.indoorSupportActivities)) return report.indoorSupportActivities
  return []
}

export function normalizeTextRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return ['']
  return rows.map((row) => String(row ?? ''))
}

export function createInitialForm(user) {
  const dailyTargetAchievement = {}
  for (const { key } of KPI_ROWS) {
    dailyTargetAchievement[key] = blankKpi()
  }
  return {
    date: todayIso(),
    type: 'outdoor',
    companyName: user?.company || '',
    salesExecutiveName: user?.name || '',
    dailyTargetAchievement,
    customerActivities: [blankCustomerActivity()],
    activityCountSummary: {
      totalActivitiesDoneToday: '',
      pendingNonProductive: '',
      activitiesNotInCrm: '',
      productiveActivities: '',
      activitiesUpdatedInCrm: '',
      crmUpdated: false,
    },
    businessGenerated: {
      totalQuotationValue: '',
      totalOrderValue: '',
      collectionsFollowedUp: '',
      pipelineValue: '',
    },
    supportActivities: [blankSupportActivity()],
    topAchievementsToday: [''],
    tomorrowsPlan: [''],
    managementCheck: {
      customerNamesRecorded: false,
      outcomesMentioned: false,
      quoteValuesRecorded: false,
      orderValuesRecorded: false,
      newCustomersClearlyMarked: false,
      businessGeneratedVisible: false,
      crmUpdated: false,
      verifiedByManager: false,
      managerRemarks: '',
      managerInitials: '',
      verifiedBy: null,
      verifiedAt: null,
    },
  }
}

export function reportToForm(report, user) {
  const base = createInitialForm(user)
  return {
    ...base,
    date: report?.date ? new Date(report.date).toISOString().slice(0, 10) : base.date,
    type: report?.type || base.type,
    companyName: base.companyName,
    salesExecutiveName: base.salesExecutiveName,
    dailyTargetAchievement: KPI_ROWS.reduce((acc, { key }) => {
      acc[key] = normalizeKpiRow(report?.dailyTargetAchievement?.[key])
      return acc
    }, {}),
    customerActivities: normalizeCustomerActivities(report?.customerActivities),
    activityCountSummary: {
      ...base.activityCountSummary,
      ...(report?.activityCountSummary || {}),
    },
    businessGenerated: {
      ...base.businessGenerated,
      ...(report?.businessGenerated || {}),
    },
    supportActivities: normalizeSupportActivities(supportActivitiesFromReport(report)),
    topAchievementsToday: normalizeTextRows(report?.topAchievementsToday),
    tomorrowsPlan: normalizeTextRows(report?.tomorrowsPlan),
    managementCheck: {
      ...base.managementCheck,
      ...(report?.managementCheck || {}),
    },
  }
}

export function getReview(report) {
  return report?.managementCheck || report?.managementReview || {}
}

export function verificationSummary(report) {
  const review = getReview(report)
  const done = CHECK_KEYS.filter((k) => Boolean(review?.[k])).length
  return `${done}/8 verified`
}

export function buildSubmitPayload(form, user) {
  return {
    date: form.date,
    type: form.type,
    companyName: user?.company || form.companyName,
    salesExecutiveName: user?.name || form.salesExecutiveName,
    dailyTargetAchievement: salesDailyTargetPayload(form.dailyTargetAchievement),
    customerActivities: form.customerActivities,
    activityCountSummary: form.activityCountSummary,
    businessGenerated: form.businessGenerated,
    supportActivities: form.supportActivities,
    topAchievementsToday: form.topAchievementsToday.filter((x) => String(x || '').trim() !== ''),
    tomorrowsPlan: form.tomorrowsPlan.filter((x) => String(x || '').trim() !== ''),
    managementCheck: form.managementCheck,
  }
}

export const buildReportPayload = buildSubmitPayload
export const buildDailyReportPayload = buildSubmitPayload

export function buildReportDraft(form, user) {
  const companyName = user?.company || form.companyName || ''
  return {
    date: form.date,
    type: form.type,
    companyName,
    salesExecutiveName: user?.name || form.salesExecutiveName || '',
    dailyTargetAchievement: salesDailyTargetPayload(form.dailyTargetAchievement),
    customerActivities: form.customerActivities,
    activityCountSummary: form.activityCountSummary,
    businessGenerated: form.businessGenerated,
    supportActivities: form.supportActivities,
    topAchievementsToday: form.topAchievementsToday.filter((x) => String(x || '').trim() !== ''),
    tomorrowsPlan: form.tomorrowsPlan.filter((x) => String(x || '').trim() !== ''),
    managementCheck: form.managementCheck,
  }
}

export const buildPreviewReportDraft = buildReportDraft
export const buildDailyReportDraft = buildReportDraft

export function formToPreviewMeta(form, user) {
  const companyName = user?.company || form.companyName || ''
  return {
    report: buildReportDraft(form, user),
    companyName,
    salesExecutiveName: user?.name || form.salesExecutiveName || '',
    salesExecutivePhone: user?.phone || user?.phoneNumber || '',
  }
}

export function validateFormStep(step) {
  const root = document.getElementById(`daily-report-form-step-${step}`)
  if (!root) return true
  const fields = root.querySelectorAll('input, textarea, select')
  for (const el of fields) {
    if (!el.reportValidity()) return false
  }
  return true
}

function salesTheme(user) {
  const isSeltecTheme = isSeltecCompany(user?.company)
  return {
    accentBgClass: isSeltecTheme ? 'bg-blue-600' : 'bg-red-600',
    accentBorderClass: isSeltecTheme ? 'border-blue-300' : 'border-red-300',
    typeRadioAccentClass: isSeltecTheme
      ? 'text-[#1d4ed8] focus:ring-[#1d4ed8]'
      : 'text-[#E7000B] focus:ring-[#E7000B]',
    formTableHeadClass: isSeltecTheme
      ? 'bg-[#1d4ed8] text-xs uppercase tracking-wide text-white'
      : 'bg-[#E7000B] text-xs uppercase tracking-wide text-white',
    field: isSeltecTheme
      ? baseField
          .replace(/focus:border-red-600/g, 'focus:border-blue-600')
          .replace(/focus:ring-red-500\/20/g, 'focus:ring-blue-500/20')
      : baseField,
    fieldTextarea: isSeltecTheme
      ? baseFieldTextarea
          .replace(/focus:border-red-600/g, 'focus:border-blue-600')
          .replace(/focus:ring-red-500\/20/g, 'focus:ring-blue-500/20')
      : baseFieldTextarea,
    btnPrimary: isSeltecTheme
      ? baseBtnPrimary.replace(/bg-red-600/g, 'bg-blue-600').replace(/hover:bg-red-700/g, 'hover:bg-blue-700')
      : baseBtnPrimary,
    btnGhost,
    submitterNameLabel: 'Sales executive name',
  }
}

function managerTheme(user) {
  const managerThemeValues = getManagerTheme(user)
  return {
    accentBgClass: managerThemeValues.accentBg,
    accentBorderClass: managerThemeValues.cardBorder,
    typeRadioAccentClass: managerThemeValues.isSeltec
      ? 'text-[#1d4ed8] focus:ring-[#1d4ed8]'
      : 'text-[#E7000B] focus:ring-[#E7000B]',
    formTableHeadClass: managerThemeValues.tableHeadSimple,
    field: managerThemeValues.field,
    fieldTextarea: managerThemeValues.fieldTextarea,
    btnPrimary: managerThemeValues.btnPrimary,
    btnGhost,
    submitterNameLabel: 'Your name',
  }
}

/** @param {'sales' | 'manager'} variant */
export function getDailyReportFormTheme(user, variant = 'sales') {
  return variant === 'manager' ? managerTheme(user) : salesTheme(user)
}

export const getDailyReportFormStyles = getDailyReportFormTheme
export const getSalesDailyReportFormTheme = (user) => getDailyReportFormTheme(user, 'sales')
export const getManagerDailyReportFormTheme = (user) => getDailyReportFormTheme(user, 'manager')

export function reportApiBase(role) {
  return role === 'manager' ? '/api/reports/manager/mine' : '/api/reports'
}

export { btnGhost } from '../../../lib/salesFormStyles.js'
