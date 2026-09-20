import { Link } from 'react-router-dom'
import InternalPageTitle from '../components/InternalPageTitle'
import { dashboardMock } from '../data/dashboardMock'
import { dashboardText } from '../lib/dashboardText'
import './Dashboard.css'

function UsageChart({ values, label }) {
  const max = Math.max(...values)
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${100 - (value / max) * 78 - 10}`).join(' ')
  return (
    <div className="usage-chart" role="img" aria-label={label}>
      <div className="usage-chart-grid"><span /><span /><span /></div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points={`0,100 ${points} 100,100`} className="usage-chart-area" />
        <polyline points={points} className="usage-chart-line" />
      </svg>
      <div className="usage-chart-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
    </div>
  )
}

export default function Devices({ lang }) {
  const text = dashboardText[lang]
  const { devices } = dashboardMock
  return (
    <main className="dashboard-page devices-page" aria-labelledby="devices-page-title">
      <div className="dashboard-inner">
        <InternalPageTitle id="devices-page-title" lang={lang}>{text.deviceStats}</InternalPageTitle>
        <section className="device-stat-hero dashboard-glass">
          <div><p className="dashboard-note">{text.weeklyUsage}</p><strong className="device-total-usage">{devices.totalUsageGb} <small>GB</small></strong><p className="dashboard-copy">{text.usageThisWeek}</p></div>
          <div className="device-usage-chip"><span className="usage-dot" />{text.vpnActive}</div>
        </section>
        <section className="usage-card dashboard-glass" aria-labelledby="usage-title">
          <div className="device-section-heading"><div><p className="dashboard-note">{text.trafficOverview}</p><h2 id="usage-title">{text.vpnUsage}</h2></div><span className="usage-period">{text.lastSevenDays}</span></div>
          <UsageChart values={devices.usage} label={text.vpnUsage} />
        </section>
        <section className="device-list-section" aria-labelledby="device-list-title">
          <div className="device-section-heading"><div><p className="dashboard-note">{text.connected}</p><h2 id="device-list-title">{devices.items.length} / {devices.limit} {text.devices.toLowerCase()}</h2></div><button className="btn btn-primary device-add-button" type="button">{text.addDevice}<span aria-hidden="true">+</span></button></div>
          <div className="device-grid">
            {devices.items.map(device => (
              <article className="device-card dashboard-glass" key={device.id}>
                <div className="device-card-top"><div className="device-platform-icon" aria-hidden="true">{device.platform === 'iOS' ? '◉' : '⌘'}</div><span className="device-live"><i />{device.active ? text.online : text.offline}</span></div>
                <h3>{device.name}</h3><p>{device.platform} · {device.location}</p>
                <div className="device-card-stats"><span>{text.used}<strong>{device.usageGb} GB</strong></span><span>{text.lastActive}<strong>{device.lastActive}</strong></span></div>
                <button className="btn btn-secondary device-manage-button" type="button">{text.manageDevice}<span aria-hidden="true">↗</span></button>
              </article>
            ))}
          </div>
        </section>
        <Link className="dashboard-action devices-back-action" to="/app">{text.back}<span aria-hidden="true">←</span></Link>
      </div>
    </main>
  )
}
