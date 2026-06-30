export const ENQUIRY_ENUMS = {
  leadSource: [
    'Email',
    'WhatsApp',
    'Walk-in',
    'Referral',
    'Website',
    'Chatbot',
    'Phone',
    'Existing Customer',
  ],
  leadType: ['New', 'Repeat', 'Existing', 'Project'],
  status: [
    'Open',
    'Follow Up',
    'Quoted',
    'Negotiation',
    'Offer Sent',
    'Won',
    'Lost',
    'Hold',
    'Closed-No Business',
  ],
  priority: ['High', 'Medium', 'Low'],
}

export function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function emptyEnquiryForm() {
  return {
    dateReceived: todayIso(),
    customerCompany: '',
    contactPerson: '',
    sourceContact: '',
    subject: '',
    leadSource: ENQUIRY_ENUMS.leadSource[0] || '',
    leadType: ENQUIRY_ENUMS.leadType[0] || '',
    priority: ENQUIRY_ENUMS.priority[0] || '',
    status: ENQUIRY_ENUMS.status[0] || '',
    closedDate: '',
    itemProduct: '',
    qty: '',
    unit: '',
    stockPosition: '',
    avgMonthlyMovement: '',
    offerNo: '',
    offerDate: '',
    offeredValueAed: '',
    orderValueAed: '',
    expectedClosureDate: '',
    nextActionDate: todayIso(),
    actionTaken: '',
    reasonLostPending: '',
    converted: false,
    managerReview: '',
  }
}

export function enquiryToForm(enquiry) {
  const toDate = (v) => {
    if (!v) return ''
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  return {
    dateReceived: toDate(enquiry.dateReceived),
    customerCompany: enquiry.customerCompany || '',
    contactPerson: enquiry.contactPerson || '',
    sourceContact: enquiry.sourceContact || '',
    subject: enquiry.subject || '',
    leadSource: enquiry.leadSource || '',
    leadType: enquiry.leadType || '',
    priority: enquiry.priority || '',
    status: enquiry.status || '',
    closedDate: toDate(enquiry.closedDate),
    itemProduct: enquiry.itemProduct || '',
    qty: enquiry.qty ?? '',
    unit: enquiry.unit || '',
    stockPosition: enquiry.stockPosition || '',
    avgMonthlyMovement: enquiry.avgMonthlyMovement ?? '',
    offerNo: enquiry.offerNo || '',
    offerDate: toDate(enquiry.offerDate),
    offeredValueAed: enquiry.offeredValueAed ?? '',
    orderValueAed: enquiry.orderValueAed ?? '',
    expectedClosureDate: toDate(enquiry.expectedClosureDate),
    nextActionDate: toDate(enquiry.nextActionDate),
    actionTaken: enquiry.actionTaken || '',
    reasonLostPending: enquiry.reasonLostPending || '',
    converted: Boolean(enquiry.converted),
    managerReview: enquiry.managerReview || '',
  }
}

export function formToPayload(form) {
  const numOrNull = (v) => {
    if (v === '' || v == null) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  return {
    dateReceived: form.dateReceived,
    customerCompany: form.customerCompany.trim(),
    contactPerson: form.contactPerson.trim(),
    sourceContact: form.sourceContact.trim(),
    subject: form.subject.trim(),
    leadSource: form.leadSource,
    leadType: form.leadType,
    priority: form.priority,
    status: form.status,
    closedDate: form.closedDate || null,
    itemProduct: form.itemProduct.trim(),
    qty: numOrNull(form.qty),
    unit: form.unit.trim(),
    stockPosition: form.stockPosition.trim(),
    avgMonthlyMovement: numOrNull(form.avgMonthlyMovement),
    offerNo: form.offerNo.trim(),
    offerDate: form.offerDate || null,
    offeredValueAed: numOrNull(form.offeredValueAed),
    orderValueAed: numOrNull(form.orderValueAed),
    expectedClosureDate: form.expectedClosureDate || null,
    nextActionDate: form.nextActionDate,
    actionTaken: form.actionTaken.trim(),
    reasonLostPending: form.reasonLostPending.trim(),
    converted: Boolean(form.converted),
    managerReview: form.managerReview.trim(),
  }
}

export function formatEnquiryDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

export function creatorDisplayName(enquiry) {
  const creator = enquiry?.createdBy
  if (!creator) return '—'
  if (typeof creator === 'string') return '—'
  const name = creator.name || 'Unknown'
  const role = creator.designation ? ` (${creator.designation})` : ''
  return `${name}${role}`
}
