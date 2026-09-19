const legacyHashRoutes = new Map([
  ['#/account', '/app'],
  ['#/login', '/login'],
])

export function migrateLegacyHashRoute() {
  if (typeof window === 'undefined') return
  const { location, history } = window
  // Only old application links at the site root; leave anchors and Telegram
  // launch data alone. Run before BrowserRouter reads the initial location.
  if (location.pathname !== '/') return
  const path = legacyHashRoutes.get(location.hash)
  if (path) history.replaceState(history.state, '', `${path}${location.search}`)
}
