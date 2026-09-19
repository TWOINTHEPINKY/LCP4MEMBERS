import { billingPeriods } from '../data/plansMock.js'

export function calculatePlanPrice(monthlyPrice, months = 1) {
  const period = billingPeriods.find(period => period.months === months)
  if (!period) throw new RangeError('Unsupported billing period')
  if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) throw new RangeError('Invalid monthly price')

  const total = Math.round(monthlyPrice * period.months * (1 - period.discount))
  if (!Number.isSafeInteger(total)) throw new RangeError('Total exceeds the supported range')
  // The rounded total is authoritative; the monthly figure is approximate.
  return { total, effectiveMonthly: Math.round(total / period.months) }
}
