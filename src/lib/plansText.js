export const plansText = {
  ru: {
    title: 'Тарифы', choose: 'Выберите подписку',
    regularTraffic: 'Обычный трафик — безлимит', bypassTraffic: '«Обход» — трафик на БС',
    balance: 'Баланс', billingPeriod: 'Период подписки', planChoice: 'Выбор тарифа',
    periods: { 1: '1 месяц', 6: '6 месяцев', 12: '12 месяцев' },
    devices: { 2: '2 устройства', 5: '5 устройств', 10: '10 устройств' },
    bypass: amount => `Обход ${amount} ГБ`, perMonth: '/мес',
    totalFor: months => `за ${months} мес`,
    amountDue: 'К оплате', notSelected: 'Тариф не выбран',
    pay: 'Оплатить', paymentSoon: 'Оплата скоро будет доступна',
  },
  en: {
    title: 'Plans', choose: 'Choose a subscription',
    regularTraffic: 'Regular traffic — unlimited', bypassTraffic: 'Bypass traffic — traffic for BS',
    balance: 'Balance', billingPeriod: 'Billing period', planChoice: 'Choose a plan',
    periods: { 1: '1 month', 6: '6 months', 12: '12 months' },
    devices: { 2: '2 devices', 5: '5 devices', 10: '10 devices' },
    bypass: amount => `Bypass ${amount} GB`, perMonth: '/mo',
    totalFor: months => `for ${months} months`,
    amountDue: 'Amount due', notSelected: 'No plan selected',
    pay: 'Pay', paymentSoon: 'Payment will be available soon',
  },
}
