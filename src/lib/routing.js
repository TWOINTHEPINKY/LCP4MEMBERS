const legacyHashRoutes = new Map([
  ['#/account', '/app'],
  ['#/login', '/login'],
])

const loginDestinations = new Set(['/app', '/plans', '/devices'])

export function getLoginNextPath(search = '') {
  const values = new URLSearchParams(search).getAll('next')
  return values.length === 1 && loginDestinations.has(values[0]) ? values[0] : '/app'
}

export function migrateLegacyHashRoute() {
  if (typeof window === 'undefined') return
  const { location, history } = window
  // Only old application links at the site root; leave anchors and Telegram
  // launch data alone. Run before BrowserRouter reads the initial location.
  if (location.pathname !== '/') return
  const path = legacyHashRoutes.get(location.hash)
  if (path) history.replaceState(history.state, '', `${path}${location.search}`)
}
