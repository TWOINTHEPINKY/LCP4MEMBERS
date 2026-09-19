import { dashboardText } from '../lib/dashboardText'
import { openSupportInTelegram, validateSupportUrl } from '../lib/support'

export default function SupportAction({ lang, url = import.meta.env.VITE_SUPPORT_TELEGRAM_URL }) {
  const text = dashboardText[lang]
  const supportUrl = validateSupportUrl(url)
  if (!supportUrl) return <>
    <p className="dashboard-note" id="support-note">{text.supportSoon}</p>
    <button className="dashboard-action" type="button" disabled aria-describedby="support-note">{text.contact}</button>
  </>

  function openSupport(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (openSupportInTelegram(supportUrl)) event.preventDefault()
  }

  return <a className="dashboard-action" href={supportUrl} target="_blank" rel="noopener noreferrer" onClick={openSupport}>
    {text.contact}<span aria-hidden="true">↗</span>
  </a>
}
