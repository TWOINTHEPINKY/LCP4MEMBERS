import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import InternalPageTitle from '../components/InternalPageTitle'
import { dashboardMock } from '../data/dashboardMock'
import { dashboardText } from '../lib/dashboardText'
import { deviceClients, devicePlatforms, getDeviceConnection, getSubscriptionUrl } from '../lib/deviceConnection'
import { clientDownloads } from '../lib/clientDownloads'
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

function DeviceIcon({ platform }) {
  const mobile = ['ios', 'iOS', 'android', 'Android'].includes(platform)
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    {mobile ? <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M10 18h4" /></> :
      <><rect x="3" y="3" width="18" height="13" rx="2" /><path d="M8 21h8m-4-5v5" /></>}
  </svg>
}

function DeviceDialog({ title, closeLabel, onDismiss, children }) {
  const dialogRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  return <dialog ref={dialogRef} className="device-dialog dashboard-glass" aria-labelledby="device-dialog-title"
    onCancel={event => { event.preventDefault(); onDismiss() }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const controls = [...event.currentTarget.querySelectorAll('button, a[href], input, select, textarea, summary, [tabindex], [contenteditable="true"]')]
        .filter(element => !element.matches(':disabled') && !element.closest('[inert]') &&
          (element.tabIndex >= 0 || (element.isContentEditable && !element.hasAttribute('tabindex'))) &&
          element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible')
      const first = controls[0]
      const last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus()
      }
    }}
    onClick={event => {
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) onDismiss()
    }}>
    <div className="device-dialog-heading">
      <h2 id="device-dialog-title">{title}</h2>
      <button type="button" className="device-dialog-close" onClick={onDismiss} aria-label={closeLabel}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </div>
    {children}
  </dialog>
}

function ConnectionStatus({ state, text }) {
  const keys = state === 'handoff' ? ['clientHandoff', 'clientHandoffNote'] : state === 'failed' ? ['clientOpenFailed', 'clientOpenFailedNote'] : ['accessNotIssued', 'accessNotIssuedNote']
  return <div className="device-connection-status" role="status">
    <h3>{text[keys[0]]}</h3><p>{text[keys[1]]}</p>
  </div>
}

export default function Devices({ lang, model = dashboardMock }) {
  const text = dashboardText[lang]
  const { devices, subscription } = model
  const navigate = useNavigate()
  const [dialog, setDialog] = useState(null)
  const [step, setStep] = useState(1)
  const [platform, setPlatform] = useState('ios')
  const [client, setClient] = useState('happ')
  const [connectionState, setConnectionState] = useState(null)
  const [copyState, setCopyState] = useState(null)
  const stepHeading = useRef(null)
  const expiry = new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${subscription.expiresAt}T00:00:00Z`))
  const count = text.deviceCount.replace('{used}', devices.items.length).replace('{limit}', devices.limit)

  useEffect(() => {
    if (dialog === 'wizard') stepHeading.current?.focus()
  }, [step, dialog])

  function connect(clientId) {
    setCopyState(null)
    const action = getDeviceConnection(clientId, model)
    if (action.type === 'plans') {
      navigate(action.to)
      return
    }
    setDialog(current => current || 'status')
    setConnectionState(action.type === 'open' ? 'handoff' : 'unavailable')
    if (action.type === 'open') {
      try { window.location.assign(action.href) } catch { setConnectionState('failed') }
    }
  }

  async function copySubscriptionLink() {
    setCopyState(null)
    if (!subscription?.active) {
      navigate('/plans')
      return
    }
    const url = getSubscriptionUrl(model.access)
    if (!url) {
      setConnectionState('unavailable')
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  function openWizard() {
    setStep(1)
    setPlatform('ios')
    setClient('happ')
    setConnectionState(null)
    setCopyState(null)
    setDialog('wizard')
  }

  function changeStep(next) {
    setConnectionState(null)
    setCopyState(null)
    setStep(next)
  }

  return (
    <main className="dashboard-page devices-page" aria-labelledby="devices-page-title">
      <div className="dashboard-inner">
        <InternalPageTitle id="devices-page-title" lang={lang}>{text.deviceOnboarding}</InternalPageTitle>
        <section className="device-summary dashboard-glass" aria-labelledby="device-subscription-title">
          <div>
            <h2 id="device-subscription-title" className="dashboard-note">{text.subscription}</h2>
            <div className="dashboard-plan-row"><p className="device-plan-name">{subscription.planName}</p><span className="dashboard-status">{subscription.active ? text.active : text.inactive}</span></div>
            <p className="dashboard-expiry">{text.expires} <time dateTime={subscription.expiresAt}>{expiry}</time></p>
          </div>
          <dl className="device-summary-count"><dt>{text.connected}</dt><dd>{count}</dd></dl>
        </section>

        <section className="device-quick-section dashboard-glass" aria-labelledby="quick-connection-title">
          <div className="device-section-heading"><h2 id="quick-connection-title">{text.quickConnection}</h2></div>
          <p className="dashboard-note">{text.quickConnectionNote}</p>
          <div className="device-client-actions">
            {deviceClients.map(clientId => <button key={clientId} type="button" className={`dashboard-action device-client-action device-client-action--${clientId}`} onClick={() => connect(clientId)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {clientId === 'happ' ? <><path d="M12 3v9" /><path d="M6.3 5.7a8 8 0 1 0 11.4 0" /></> :
                  <><path d="m12 3 8 3v5c0 5-8 10-8 10S4 16 4 11V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>}
              </svg>
              <span>{text.clients[clientId]}</span>
            </button>)}
          </div>
        </section>

        <section className="device-onboarding dashboard-glass" aria-labelledby="another-device-title">
          <div><h2 id="another-device-title">{text.wizardTitle}</h2><p className="dashboard-copy">{text.anotherDeviceNote}</p></div>
          <button type="button" className="dashboard-action dashboard-action-primary device-add-button" onClick={openWizard}>
            {text.connectAnother}<span aria-hidden="true">+</span>
          </button>
        </section>

        <section className="device-list-section dashboard-glass" aria-labelledby="device-list-title">
          <div className="device-section-heading"><h2 id="device-list-title">{text.myDevices}</h2><span className="dashboard-status">{count}</span></div>
          <ul className="device-rows">
            {devices.items.map(device => <li className="device-row" key={device.id}>
              <span className="device-platform-icon"><DeviceIcon platform={device.platform} /></span>
              <div><h3>{device.name}</h3><p>{device.platform}</p></div>
              <button type="button" className="device-reset" disabled aria-describedby="device-reset-note" aria-label={`${text.resetDevice}: ${device.name}`}>{text.resetDevice}</button>
            </li>)}
          </ul>
          {devices.items.length === 0 && <p className="dashboard-copy">{text.noDevices}</p>}
          <button type="button" className="device-reset device-reset-all" disabled aria-describedby="device-reset-note">{text.resetAllDevices}</button>
          <p className="dashboard-note device-reset-note" id="device-reset-note">{text.resetDevicesNote}</p>
        </section>

        <section className="device-stat-hero dashboard-glass">
          <div><p className="dashboard-note">{text.weeklyUsage}</p><strong className="device-total-usage">{devices.totalUsageGb} <small>GB</small></strong><p className="dashboard-copy">{text.usageThisWeek}</p></div>
          <span className="device-usage-chip">{text.previewUsage}</span>
        </section>
        <section className="usage-card dashboard-glass" aria-labelledby="usage-title">
          <div className="device-section-heading"><div><p className="dashboard-note">{text.trafficOverview}</p><h2 id="usage-title">{text.vpnUsage}</h2></div><span className="usage-period">{text.lastSevenDays}</span></div>
          <UsageChart values={devices.usage} label={text.vpnUsage} />
        </section>
        <Link className="dashboard-action devices-back-action" to="/app">{text.back}<span aria-hidden="true">←</span></Link>
      </div>
      {dialog && <DeviceDialog title={dialog === 'wizard' ? text.wizardTitle : text.quickConnection} closeLabel={text.closeDialog} onDismiss={() => setDialog(null)}>
        {dialog === 'wizard' ? <>
          <p className="dashboard-note device-wizard-progress">{text.wizardStep.replace('{step}', step)}</p>
          <h3 className="device-step-title" ref={stepHeading} tabIndex={-1}>{step === 1 ? text.choosePlatform : step === 2 ? text.chooseClient : text.setupDevice}</h3>
          {step === 1 && <fieldset className="device-choices">
            <legend className="sr-only">{text.choosePlatform}</legend>
            {devicePlatforms.map(id => <label className="device-choice" key={id}>
              <input type="radio" name="device-platform" value={id} checked={platform === id} onChange={() => setPlatform(id)} />
              <DeviceIcon platform={id} /><span>{text.platforms[id]}</span>
            </label>)}
          </fieldset>}
          {step === 2 && <>
            <p className="dashboard-note">{text.installClientNote.replace('{platform}', text.platforms[platform])}</p>
            <fieldset className="device-choices">
              <legend className="sr-only">{text.chooseClient}</legend>
              {deviceClients.map(id => <div className="device-install-option" key={id}>
                <label className="device-choice">
                  <input type="radio" name="device-client" value={id} checked={client === id} onChange={() => setClient(id)} />
                  <span>{text.clients[id]}</span>
                </label>
                <div className="device-downloads">
                  {clientDownloads[id][platform].map(download => <a key={download.href} href={download.href} target="_blank" rel="noopener noreferrer" aria-label={`${text.clients[id]} — ${text.downloadLabels[download.label]}`}>
                    {text.downloadLabels[download.label]}<span aria-hidden="true">↗</span>
                  </a>)}
                </div>
              </div>)}
            </fieldset>
          </>}
          {step === 3 && <>
            <div className="device-setup-selection"><h4>{text.clients[client]}</h4><p>{text.platforms[platform]}</p></div>
            <div className="device-connection-actions">
              <button type="button" className="dashboard-action dashboard-action-primary device-open-client" onClick={() => connect(client)}>{text.openInApp}<span aria-hidden="true">↗</span></button>
              <button type="button" className="dashboard-action device-copy-link" onClick={copySubscriptionLink}>{text.copySubscriptionLink}</button>
              <button type="button" className="dashboard-action device-show-qr" disabled aria-describedby="device-qr-note">{text.showQr}</button>
            </div>
            <p className="dashboard-note" id="device-qr-note">{text.qrUnavailable}</p>
            {copyState && <p className="device-copy-status" role="status">{copyState === 'copied' ? text.linkCopied : text.linkCopyFailed}</p>}
            {connectionState && <ConnectionStatus state={connectionState} text={text} />}
          </>}
          <div className="device-wizard-actions">
            {step > 1 && <button type="button" className="dashboard-action" onClick={() => changeStep(step - 1)}>{text.wizardBack}</button>}
            {step < 3 && <button type="button" className="dashboard-action dashboard-action-primary" onClick={() => changeStep(step + 1)}>{text.wizardNext}<span aria-hidden="true">→</span></button>}
          </div>
        </> : <ConnectionStatus state={connectionState} text={text} />}
      </DeviceDialog>}
    </main>
  )
}
