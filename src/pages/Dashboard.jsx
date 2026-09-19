import { Link } from 'react-router-dom'
import { dashboardMock } from '../data/dashboardMock'
import { dashboardText } from '../lib/dashboardText'
import SupportAction from '../components/SupportAction'
import './Dashboard.css'

function WidgetIcon({ children }) {
  return <svg className="dashboard-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
}

export default function Dashboard({ user, lang, profileControls }) {
  const text = dashboardText[lang]
  const { subscription, devices, balance, referrals } = dashboardMock
  const locale = lang === 'ru' ? 'ru-RU' : 'en-GB'
  const money = ({ amount, currency }) => new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  const expiry = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${subscription.expiresAt}T00:00:00Z`))
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ')

  return (
    <main className="dashboard-page" aria-labelledby="dashboard-title">
      <div className="dashboard-inner">
        <h1 id="dashboard-title" className="dashboard-title">{text.title}</h1>
        <section className={`dashboard-profile dashboard-glass${profileControls ? ' dashboard-profile--telegram' : ''}`} aria-label={text.telegramAccount}>
          <div className="dashboard-avatar" aria-hidden="true">{Array.from(user.first_name || '')[0]}</div>
          <div className="dashboard-identity">
            <h2>{displayName}</h2>
            <p className="dashboard-profile-meta">
              {user.username && <><span className="dashboard-username">@{user.username}</span><span aria-hidden="true">·</span></>}
              <span className="dashboard-telegram-id">TG ID {user.id}</span>
            </p>
          </div>
          {profileControls}
        </section>

        <div className="dashboard-overview dashboard-glass">
          <div className="dashboard-primary-grid">
            <section className="dashboard-widget dashboard-subscription" aria-labelledby="subscription-title">
              <div className="dashboard-widget-heading">
                <WidgetIcon><path d="m12 3 8 4v6c0 4-8 8-8 8s-8-4-8-8V7l8-4Z" /><path d="m8 12 3 3 5-6" /></WidgetIcon>
                <h3 id="subscription-title">{text.subscription}</h3>
              </div>
              <div className="dashboard-plan-row">
                <p className="dashboard-value">{subscription.planName}</p>
                <span className="dashboard-status">{subscription.active ? text.active : text.inactive}</span>
              </div>
              <p className="dashboard-expiry">{text.expires} <time dateTime={subscription.expiresAt}>{expiry}</time></p>
              <div className="dashboard-duration">
                <div><span>{text.remaining}</span><strong>{subscription.remainingDays} {text.days}</strong></div>
                <progress value={subscription.remainingDays} max={subscription.totalDays} aria-label={`${text.remaining}: ${subscription.remainingDays} ${text.days}`} />
              </div>
              <Link className="dashboard-action dashboard-action-primary" to="/plans">{text.renew}<span aria-hidden="true">↗</span></Link>
            </section>

            <section className="dashboard-widget" aria-labelledby="devices-title">
              <div className="dashboard-widget-heading">
                <WidgetIcon><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 21h8m-4-5v5" /></WidgetIcon>
                <h3 id="devices-title">{text.devices}</h3>
              </div>
              <p className="dashboard-device-count dashboard-value" aria-label={`${text.connected}: ${devices.items.length} / ${devices.limit}`}>
                {devices.items.length}<span> / {devices.limit}</span>
              </p>
              {devices.items.length === 0 ? <p className="dashboard-copy">{text.noDevices}<br />{text.firstDevice}</p> : (
                <ul className="dashboard-device-list">
                  {devices.items.slice(0, 3).map(device => <li key={device.id} title={device.name}>{device.name}</li>)}
                </ul>
              )}
              <Link className="dashboard-action" to="/devices">{text.manage}<span aria-hidden="true">↗</span></Link>
            </section>
          </div>

          <div className="dashboard-secondary-grid">
            <section className="dashboard-widget" aria-labelledby="balance-title">
              <div className="dashboard-widget-heading">
                <WidgetIcon><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M3 8h18m0 5h-5v3h5M6 5V3h12" /></WidgetIcon>
                <h3 id="balance-title">{text.balance}</h3>
              </div>
              <p className="dashboard-value dashboard-value-small">{money(balance)}</p>
              <p className="dashboard-note" id="top-up-note">{text.topUpSoon}</p>
              <button className="dashboard-action" type="button" disabled aria-describedby="top-up-note">{text.topUp}</button>
            </section>
            <section className="dashboard-widget" aria-labelledby="referrals-title">
              <div className="dashboard-widget-heading">
                <WidgetIcon><circle cx="9" cy="7" r="3" /><path d="M3 20v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-2-4" /></WidgetIcon>
                <h3 id="referrals-title">{text.referrals}</h3>
              </div>
              <dl className="dashboard-referral-stats">
                <div><dt>{text.invited}</dt><dd>{referrals.invited}</dd></div>
                <div><dt>{text.bonus}</dt><dd>{money({ amount: referrals.bonus, currency: referrals.currency })}</dd></div>
              </dl>
              <Link className="dashboard-action" to="/referrals">{text.details}<span aria-hidden="true">↗</span></Link>
            </section>
            <section className="dashboard-widget" aria-labelledby="support-title">
              <div className="dashboard-widget-heading">
                <WidgetIcon><path d="M4 13v-1a8 8 0 0 1 16 0v1M4 12H2v6h4v-6H4Zm16 0h2v6h-4v-6h2Zm0 6v2a2 2 0 0 1-2 2h-4" /></WidgetIcon>
                <h3 id="support-title">{text.support}</h3>
              </div>
              <p className="dashboard-copy">{text.help}</p>
              <SupportAction lang={lang} />
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
