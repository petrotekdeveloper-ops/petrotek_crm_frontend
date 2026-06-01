/** Load an image URL as a data URL so html2canvas can embed it in PDFs. */
export async function resolveLogoForPdf(src) {
  if (!src) return null
  try {
    const response = await fetch(src)
    const blob = await response.blob()
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    return typeof dataUrl === 'string' ? dataUrl : src
  } catch {
    return src
  }
}
