// Frontend-only preview, fixed as of 2026-09-19. No entitlement or payment logic.
// Replace this model with real business data later; identity comes from /auth/me.
export const dashboardMock = {
  subscription: { planName: 'Plus', active: true, expiresAt: '2026-10-10', remainingDays: 21, totalDays: 30 },
  devices: { limit: 5, items: [] }, // Future items: { id, name }; show at most three.
  balance: { amount: 0, currency: 'RUB' },
  referrals: { invited: 0, bonus: 0, currency: 'RUB' },
}
