export function validateSupportUrl(value) {
  if (typeof value !== 'string') return null
  const url = value.trim()
  // A single Telegram username, without credentials, query or extra path.
  return /^https:\/\/t\.me\/[A-Za-z0-9_]{1,32}$/.test(url) ? url : null
}

// Return false to leave the ordinary anchor navigation intact.
export function openSupportInTelegram(value) {
  const url = validateSupportUrl(value)
  if (!url || typeof window === 'undefined') return false
  const webApp = window.Telegram?.WebApp
  if (!webApp || (webApp.platform === 'unknown' && !webApp.initData)) return false
  if (typeof webApp.openTelegramLink !== 'function') return false
  try {
    Promise.resolve(webApp.openTelegramLink(url)).catch(() => {
      // The official method is synchronous; tolerate clients returning a promise.
      window.open(url, '_blank', 'noopener,noreferrer')
    }).catch(() => {})
    return true
  } catch {
    return false
  }
}
