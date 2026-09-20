import { useEffect, useState } from 'react'
import InternalPageTitle from '../components/InternalPageTitle'
import { apiRequest } from '../lib/auth'
import { dashboardText } from '../lib/dashboardText'
import './Dashboard.css'

const categoryKeys = ['connection', 'payment', 'account', 'other']

function formatDate(value, lang) {
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

export default function Support({ lang }) {
  const text = dashboardText[lang]
  const [tickets, setTickets] = useState([])
  const [selected, setSelected] = useState(null)
  const [category, setCategory] = useState('connection')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function loadTickets() {
      try {
        const result = await apiRequest('/support/tickets')
        if (!active) return
        setTickets(result.tickets || [])
        if (!selected && result.tickets?.[0]) setSelected(result.tickets[0].id)
      } catch {
        if (active) setError(text.supportLoadError)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadTickets()
    return () => { active = false }
  }, [text.supportLoadError, selected])

  useEffect(() => {
    if (!selected) return undefined
    let active = true
    async function loadTicket() {
      try {
        const result = await apiRequest(`/support/tickets/${selected}`)
        if (active) setTickets(current => current.map(ticket => ticket.id === result.id ? result : ticket))
      } catch {
        if (active) setError(text.supportLoadError)
      }
    }
    loadTicket()
    const interval = window.setInterval(loadTicket, 5000)
    return () => { active = false; window.clearInterval(interval) }
  }, [selected, text.supportLoadError])

  const activeTicket = tickets.find(ticket => ticket.id === selected)

  async function submitMessage(event) {
    event.preventDefault()
    const value = message.trim()
    if (!value || sending) return
    setSending(true)
    setError('')
    try {
      if (activeTicket) {
        const result = await apiRequest(`/support/tickets/${activeTicket.id}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: value }),
        })
        setTickets(current => current.map(ticket => ticket.id === result.id ? result : ticket))
      } else {
        const result = await apiRequest('/support/tickets', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, message: value }),
        })
        setTickets(current => [result, ...current])
        setSelected(result.id)
      }
      setMessage('')
    } catch {
      setError(text.supportSendError)
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="dashboard-page support-page" aria-labelledby="support-page-title">
      <div className="dashboard-inner">
        <InternalPageTitle id="support-page-title" lang={lang}>{text.support}</InternalPageTitle>
        <div className="support-layout dashboard-glass">
          <aside className="support-sidebar" aria-label={text.supportRequests}>
            <div className="support-sidebar-heading">
              <h2>{text.supportRequests}</h2>
              <button type="button" className="support-new-button" onClick={() => setSelected(null)}>{text.newRequest}</button>
            </div>
            {loading ? <p className="dashboard-note">{text.loading}</p> : tickets.length === 0 ? (
              <p className="dashboard-note">{text.noRequests}</p>
            ) : (
              <div className="support-ticket-list">
                {tickets.map(ticket => (
                  <button type="button" key={ticket.id} className={`support-ticket-item${ticket.id === selected ? ' is-active' : ''}`} onClick={() => setSelected(ticket.id)}>
                    <span>#{ticket.id} · {text.categories[ticket.category]}</span>
                    <strong>{text.statuses[ticket.status] || ticket.status}</strong>
                    <time>{formatDate(ticket.updated_at, lang)}</time>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="support-conversation" aria-live="polite">
            {activeTicket ? (
              <>
                <header className="support-conversation-heading">
                  <div><span>#{activeTicket.id}</span><h2>{text.categories[activeTicket.category]}</h2></div>
                  <span className="dashboard-status">{text.statuses[activeTicket.status] || activeTicket.status}</span>
                </header>
                <div className="support-messages">
                  {activeTicket.messages?.map(item => (
                    <article key={item.id} className={`support-message support-message--${item.author_kind}`}>
                      <div className="support-message-meta"><strong>{item.author_kind === 'admin' ? text.supportTeam : text.you}</strong><time>{formatDate(item.created_at, lang)}</time></div>
                      <p>{item.message}</p>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="support-empty"><h2>{text.newRequest}</h2><p>{text.supportIntro}</p></div>
            )}
            {error && <p className="support-error" role="alert">{error}</p>}
            <form className="support-compose" onSubmit={submitMessage}>
              {!activeTicket && <label>{text.category}<select value={category} onChange={event => setCategory(event.target.value)}>{categoryKeys.map(key => <option key={key} value={key}>{text.categories[key]}</option>)}</select></label>}
              <label><span className="sr-only">{text.message}</span><textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={4000} placeholder={text.messagePlaceholder} rows={4} /></label>
              <button className="dashboard-action dashboard-action-primary" type="submit" disabled={sending || !message.trim()}>{sending ? text.sending : text.send}<span aria-hidden="true">↗</span></button>
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}
