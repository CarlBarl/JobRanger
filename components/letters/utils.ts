export function buildExcerpt(value: string, maxChars = 380): { excerpt: string; isTruncated: boolean } {
  const text = value.trim()
  if (text.length <= maxChars) return { excerpt: text, isTruncated: false }

  const hardLimit = Math.max(0, maxChars - 3)
  const slice = text.slice(0, hardLimit)
  const lastBreak = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'), slice.lastIndexOf(' '))
  const cutoff = lastBreak > Math.floor(hardLimit * 0.6) ? lastBreak : hardLimit
  return { excerpt: `${slice.slice(0, cutoff).trimEnd()}...`, isTruncated: true }
}

export async function copyTextToClipboard(value: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard unavailable')
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!ok) {
    throw new Error('Copy failed')
  }
}
