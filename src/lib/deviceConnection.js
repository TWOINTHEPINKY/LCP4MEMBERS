export const deviceClients = ['happ', 'incy']
export const devicePlatforms = ['ios', 'android', 'windows', 'macos', 'linux']

function safeAccessUrl(value, protocols) {
  if (typeof value !== 'string' || !value.trim() || /[\s\\]/.test(value)) return null
  try {
    const url = new URL(value)
    return protocols.includes(url.protocol) && url.hostname && !url.username && !url.password ? value : null
  } catch {
    return null
  }
}

export function getSubscriptionUrl(access) {
  return safeAccessUrl(access?.subscriptionUrl, ['https:'])
}

// Resolve an action only: handing a link to a client does not confirm VPN status.
export function getDeviceConnection(client, { subscription, access } = {}) {
  if (!subscription?.active) return { type: 'plans', to: '/plans' }
  if (client === 'incy') {
    const subscriptionUrl = getSubscriptionUrl(access)
    if (subscriptionUrl) return { type: 'open', href: `incy://import/${subscriptionUrl}` }
  }
  if (client === 'happ') {
    // Use only an explicit access link; never construct a Happ URL scheme.
    const href = safeAccessUrl(access?.happDeepLink, ['happ:', 'https:'])
    if (href) return { type: 'open', href }
  }
  return { type: 'unavailable' }
}
