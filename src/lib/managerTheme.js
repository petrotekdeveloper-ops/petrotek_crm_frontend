import {
  field as baseField,
  fieldTextarea as baseFieldTextarea,
  btnPrimary as baseBtnPrimary,
} from './salesFormStyles.js'

/** Petrotek vs Seltec chrome for manager or sales users (by `user.company`). */
export function getCompanyTheme(user) {
  return getManagerTheme(user)
}

/** Seltec managers use blue chrome; Petrotek managers use red. */
export function isSeltecManager(user) {
  return String(user?.company ?? '').trim().toLowerCase() === 'seltec'
}

export function getManagerTheme(user) {
  const isSeltec = isSeltecManager(user)

  const field = isSeltec
    ? baseField
        .replace(/focus:border-red-600/g, 'focus:border-blue-600')
        .replace(/focus:ring-red-500\/20/g, 'focus:ring-blue-500/20')
    : baseField

  const fieldTextarea = isSeltec
    ? baseFieldTextarea
        .replace(/focus:border-red-600/g, 'focus:border-blue-600')
        .replace(/focus:ring-red-500\/20/g, 'focus:ring-blue-500/20')
    : baseFieldTextarea

  const btnPrimary = isSeltec
    ? baseBtnPrimary
        .replace(/bg-red-600/g, 'bg-blue-600')
        .replace(/hover:bg-red-700/g, 'hover:bg-blue-700')
    : baseBtnPrimary

  return {
    isSeltec,
    statAccent: isSeltec ? 'blue' : 'red',
    accentBg: isSeltec ? 'bg-blue-600' : 'bg-red-600',
    accentBgHover: isSeltec ? 'hover:bg-blue-700' : 'hover:bg-red-700',
    tableHead: isSeltec
      ? 'border-b border-blue-700 bg-blue-600 text-xs font-semibold uppercase text-white'
      : 'border-b border-red-700 bg-red-600 text-xs font-semibold uppercase text-white',
    tableHeadSimple: isSeltec
      ? 'bg-blue-600 text-xs font-semibold uppercase text-white'
      : 'bg-red-600 text-xs font-semibold uppercase text-white',
    tableHeadSticky: isSeltec
      ? 'sticky top-0 z-[1] border-b border-blue-700 bg-blue-600 text-xs font-semibold uppercase text-white backdrop-blur-sm'
      : 'sticky top-0 z-[1] border-b border-red-700 bg-red-600 text-xs font-semibold uppercase text-white backdrop-blur-sm',
    tableHeadTracking: isSeltec
      ? 'border-b border-blue-700 bg-blue-600 text-[11px] font-semibold uppercase tracking-wider text-white'
      : 'border-b border-red-700 bg-red-600 text-[11px] font-semibold uppercase tracking-wider text-white',
    link: isSeltec ? 'text-blue-700 hover:text-blue-900' : 'text-red-700 hover:text-red-900',
    linkBtn: isSeltec
      ? 'font-medium text-blue-700 shadow-sm transition hover:bg-slate-50 hover:text-blue-900'
      : 'font-medium text-red-700 shadow-sm transition hover:bg-slate-50 hover:text-red-900',
    achievedAmount: isSeltec ? 'text-blue-900' : 'text-red-900',
    progressBar: isSeltec ? 'bg-blue-600' : 'bg-red-600',
    progressGradient: isSeltec
      ? 'bg-gradient-to-r from-blue-600 to-blue-800'
      : 'bg-gradient-to-r from-red-600 to-red-800',
    cardBorder: isSeltec ? 'border-blue-100' : 'border-red-100',
    cardGradient: isSeltec
      ? 'bg-gradient-to-br from-blue-50 via-white to-slate-50'
      : 'bg-gradient-to-br from-red-50 via-white to-slate-50',
    labelAccent: isSeltec ? 'text-blue-700' : 'text-red-700',
    accentSoftGradient: isSeltec
      ? 'from-blue-50/95 via-white to-blue-50/70'
      : 'from-red-50/95 via-white to-red-50/70',
    modalSoftGradient: isSeltec
      ? 'from-slate-50 via-white to-blue-50/25'
      : 'from-slate-50 via-white to-red-50/25',
    modalLabel: isSeltec ? 'text-blue-900/55' : 'text-red-900/55',
    deleteBtn: isSeltec
      ? 'border border-blue-200 bg-white text-blue-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-900'
      : 'border border-red-200 bg-white text-red-700 shadow-sm transition hover:bg-red-50 hover:text-red-900',
    deleteBtnMobile: isSeltec
      ? 'border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100'
      : 'border border-red-200 bg-red-50 text-red-800 hover:bg-red-100',
    fieldFocus: isSeltec
      ? 'focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
      : 'focus:border-red-600 focus:ring-2 focus:ring-red-500/20',
    searchFocus: isSeltec
      ? 'focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
      : 'focus:border-red-600 focus:ring-2 focus:ring-red-500/20',
    field,
    fieldTextarea,
    btnPrimary,
    primaryBtn: isSeltec
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'bg-red-600 text-white hover:bg-red-700',
  }
}
