// Frontend-only catalogue. No payment, subscription or entitlement changes.
export const plansMock = [
  { id: 'basic', name: 'Basic', devices: 2, bypassGb: 50, monthlyPrice: 299 },
  { id: 'plus', name: 'Plus', devices: 5, bypassGb: 75, monthlyPrice: 599 },
  { id: 'pro-plus', name: 'Pro Plus', devices: 10, bypassGb: 100, monthlyPrice: 999 },
]

export const billingPeriods = [
  { months: 1, discount: 0 },
  { months: 6, discount: 0.1 },
  { months: 12, discount: 0.2 },
]
