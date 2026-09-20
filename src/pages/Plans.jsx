import { useState } from 'react'
import InternalPageTitle from '../components/InternalPageTitle'
import { dashboardMock } from '../data/dashboardMock'
import { billingPeriods, plansMock } from '../data/plansMock'
import { calculatePlanPrice } from '../lib/plansPricing'
import { plansText } from '../lib/plansText'
import './Dashboard.css'
import './Plans.css'

export default function Plans({ lang }) {
  const [months, setMonths] = useState(1)
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const text = plansText[lang]
  const selectedPlan = plansMock.find(plan => plan.id === selectedPlanId)
  const total = selectedPlan ? calculatePlanPrice(selectedPlan.monthlyPrice, months).total : 0
  const number = new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'en-GB', { maximumFractionDigits: 0 })
  const money = amount => `${number.format(amount)} ₽`

  return (
    <main className="dashboard-page plans-page" aria-labelledby="plans-title">
      <div className="dashboard-inner">
        <InternalPageTitle id="plans-title" lang={lang}>{text.title}</InternalPageTitle>

        <section className="dashboard-glass plans-info" aria-labelledby="plans-choose-title">
          <div className="plans-info-copy">
            <h2 id="plans-choose-title">{text.choose}</h2>
            <p>{text.regularTraffic}<br />{text.bypassTraffic}</p>
          </div>
          <dl className="plans-balance">
            <dt>{text.balance}</dt>
            <dd>{money(dashboardMock.balance.amount)}</dd>
          </dl>
        </section>

        <fieldset className="dashboard-glass plans-periods">
          <legend className="plans-sr-only">{text.billingPeriod}</legend>
          {billingPeriods.map(period => (
            <label className="plans-period" key={period.months}>
              <input className="plans-sr-only" type="radio" name="plans-period" value={period.months}
                checked={months === period.months} onChange={() => setMonths(period.months)} />
              <span className="plans-period-face">
                <span>{text.periods[period.months]}</span>
                {period.discount > 0 && <span className="plans-discount">−{period.discount * 100}%</span>}
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="dashboard-glass plans-options">
          <legend className="plans-sr-only">{text.planChoice}</legend>
          {plansMock.map(plan => {
            const price = calculatePlanPrice(plan.monthlyPrice, months)
            return (
              <label className="plans-option" key={plan.id}>
                <input className="plans-sr-only" type="radio" name="plans-plan" value={plan.id}
                  checked={selectedPlanId === plan.id} onChange={() => setSelectedPlanId(plan.id)} />
                <span className="plans-option-face">
                  <span className="plans-option-details">
                    <span className="plans-name-row">
                      <span className="plans-selection" aria-hidden="true">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 8 3 3 6-6" /></svg>
                      </span>
                      <span className="plans-name">{plan.name}</span>
                    </span>
                    <span className="plans-features">
                      <span>{text.devices[plan.devices]}</span>
                      <span aria-hidden="true">·</span>
                      <span>{text.bypass(plan.bypassGb)}</span>
                    </span>
                  </span>
                  <span className="plans-price">
                    <span className="plans-monthly">{months > 1 && '≈ '}{money(price.effectiveMonthly)}<span>{text.perMonth}</span></span>
                    {months > 1 && <span className="plans-period-total">{money(price.total)} {text.totalFor(months)}</span>}
                  </span>
                </span>
              </label>
            )
          })}
        </fieldset>

        <section className="dashboard-glass plans-payment" aria-labelledby="plans-payment-title">
          <div className="plans-payment-copy">
            <h2 id="plans-payment-title">{text.amountDue}</h2>
            <p>{selectedPlan ? `${selectedPlan.name} · ${text.periods[months]}` : text.notSelected}</p>
          </div>
          <div className="plans-payment-action">
            <output className="plans-payment-total" aria-label={text.amountDue} aria-live="polite" aria-atomic="true">{money(total)}</output>
            <button type="button" className="dashboard-action plans-pay" disabled aria-describedby="plans-payment-note">{text.pay}</button>
          </div>
          <p id="plans-payment-note" className="plans-payment-note">{text.paymentSoon}</p>
        </section>
      </div>
    </main>
  )
}
