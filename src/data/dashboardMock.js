// Frontend-only preview, fixed as of 2026-09-19. No entitlement or payment logic.
// Replace this model with real business data later; identity comes from /auth/me.
export const dashboardMock = {
  subscription: { planName: 'Plus', active: true, expiresAt: '2026-10-10', remainingDays: 21, totalDays: 30 },
  devices: {
    limit: 5,
    items: [
      { id: 'macbook', name: 'MacBook Pro 14', platform: 'macOS', location: 'Berlin', usageGb: 18.4, lastActive: '2 min ago', active: true },
      { id: 'iphone', name: 'iPhone 15 Pro', platform: 'iOS', location: 'Warsaw', usageGb: 7.8, lastActive: '18 min ago', active: true },
    ],
    usage: [2.4, 4.8, 3.2, 8.1, 6.7, 11.4, 9.8],
    totalUsageGb: 26.2,
  },
  balance: { amount: 0, currency: 'RUB' },
  referrals: { invited: 0, bonus: 0, currency: 'RUB' },
}
