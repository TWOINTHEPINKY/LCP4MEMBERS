const initializedWebApps = new WeakSet()

function callSafely(webApp, method) {
  try {
    if (typeof webApp[method] === 'function') {
      Promise.resolve(webApp[method]()).catch(() => {})
    }
  } catch {
    // Optional bridge calls must not break initialization on unsupported clients.
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
  callSafely(webApp, 'disableVerticalSwipes')
  if (webApp.isFullscreen !== true) callSafely(webApp, 'requestFullscreen')
}
