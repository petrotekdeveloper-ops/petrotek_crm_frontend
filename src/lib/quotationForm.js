export function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function emptyCustomer() {
  return {
    name: '',
    trn: '',
    phone: '',
    mobile: '',
    email: '',
    address: '',
  }
}

export function emptyItem() {
  return {
    itemCode: '',
    item: '',
    itemQuantity: '',
    itemUnitPrice: '',
    itemTotalPrice: '',
  }
}

export function emptyQuotationForm(date = todayIso()) {
  return {
    date,
    quoteNo: '',
    ref: '',
    trn: '',
    customerDetails: [emptyCustomer()],
    quotationItems: [emptyItem()],
    subTotal: '',
    total: '',
    totalWords: '',
  }
}

function toDateInput(value) {
  if (!value) return todayIso()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? todayIso() : d.toISOString().slice(0, 10)
}

function lineTotal(quantity, unitPrice) {
  const qty = Number(quantity)
  const price = Number(unitPrice)
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return ''
  return String(qty * price)
}

export function recalcQuotationItems(items) {
  const next = items.map((row) => ({
    ...row,
    itemTotalPrice: lineTotal(row.itemQuantity, row.itemUnitPrice),
  }))
  const subTotal = next.reduce((sum, row) => {
    const n = Number(row.itemTotalPrice)
    return Number.isFinite(n) ? sum + n : sum
  }, 0)
  return {
    quotationItems: next,
    subTotal: next.some((row) => row.itemTotalPrice !== '') ? String(subTotal) : '',
    total: next.some((row) => row.itemTotalPrice !== '') ? String(subTotal) : '',
  }
}

export function quotationToForm(doc) {
  if (!doc) return emptyQuotationForm()
  const customers =
    Array.isArray(doc.customerDetails) && doc.customerDetails.length > 0
      ? doc.customerDetails.map((row) => ({
          name: row?.name ?? '',
          trn: row?.trn ?? '',
          phone: row?.phone ?? '',
          mobile: row?.mobile ?? '',
          email: row?.email ?? '',
          address: row?.address ?? '',
        }))
      : [emptyCustomer()]
  const items =
    Array.isArray(doc.quotationItems) && doc.quotationItems.length > 0
      ? doc.quotationItems.map((row) => ({
          itemCode: row?.itemCode ?? '',
          item: row?.item ?? '',
          itemQuantity: row?.itemQuantity ?? '',
          itemUnitPrice: row?.itemUnitPrice ?? '',
          itemTotalPrice: row?.itemTotalPrice ?? '',
        }))
      : [emptyItem()]

  return {
    date: toDateInput(doc.date),
    quoteNo: doc.quoteNo ?? '',
    ref: doc.ref ?? '',
    trn: doc.trn ?? '',
    customerDetails: customers,
    quotationItems: items,
    subTotal: doc.subTotal ?? '',
    total: doc.total ?? '',
    totalWords: doc.totalWords ?? '',
  }
}

export function formToPayload(form) {
  return {
    date: form.date,
    quoteNo: String(form.quoteNo || '').trim(),
    ref: String(form.ref || '').trim(),
    trn: String(form.trn || '').trim(),
    customerDetails: form.customerDetails.map((row) => ({
      name: String(row.name || '').trim(),
      trn: String(row.trn || '').trim(),
      phone: String(row.phone || '').trim(),
      mobile: String(row.mobile || '').trim(),
      email: String(row.email || '').trim(),
      address: String(row.address || '').trim(),
    })),
    quotationItems: form.quotationItems.map((row) => ({
      itemCode: String(row.itemCode || '').trim(),
      item: String(row.item || '').trim(),
      itemQuantity: String(row.itemQuantity || '').trim(),
      itemUnitPrice: String(row.itemUnitPrice || '').trim(),
      itemTotalPrice: String(row.itemTotalPrice || '').trim(),
    })),
    subTotal: String(form.subTotal || '').trim(),
    total: String(form.total || '').trim(),
    totalWords: String(form.totalWords || '').trim(),
  }
}

export function primaryCustomerName(row) {
  const first = Array.isArray(row?.customerDetails) ? row.customerDetails[0] : null
  const name = String(first?.name ?? '').trim()
  return name || '—'
}

export function formatQuotationDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(d)
}

export function ownerDisplayName(ownerRef) {
  if (!ownerRef) return '—'
  if (typeof ownerRef === 'object' && ownerRef.name) {
    const role = ownerRef.designation ? ` · ${ownerRef.designation}` : ''
    return `${ownerRef.name}${role}`
  }
  return '—'
}
