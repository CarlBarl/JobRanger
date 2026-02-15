export function formatDateTime(iso: string) {
  const date = new Date(iso)
  const formattedDate = date.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const formattedTime = date.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${formattedDate}, ${formattedTime}`
}
