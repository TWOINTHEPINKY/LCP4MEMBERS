const initializedWebApps = new WeakSet()

function callSafely(webApp, method) {
  try {
    if (typeof webApp[method] === 'function') {
      Promise.resolve(webApp[method]()).catch(() => {})
    }
  } catch {
    // Fullscreen/expansion is optional; unsupported clients keep the normal UI.
  }
}

export function initializeTelegramWebApp() {
  if (typeof window === 'undefined') return
  const webApp = window.Telegram?.WebApp
  if (!webApp || typeof webApp !== 'object') return
  // The official SDK also creates this object outside Telegram. Its default
  // platform is "unknown" with no launch data; do not send bridge requests there.
  if (webApp.platform === 'unknown' && !webApp.initData) return
  if (initializedWebApps.has(webApp)) return
  initializedWebApps.add(webApp)

  callSafely(webApp, 'ready')
  callSafely(webApp, 'expand')
  if (webApp.isFullscreen !== true) callSafely(webApp, 'requestFullscreen')
}
