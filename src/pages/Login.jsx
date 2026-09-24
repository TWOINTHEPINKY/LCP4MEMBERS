import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LogoIcon from '../assets/icons/logo.svg?react'
import { ApiError, apiRequest, authenticateTelegramWebApp, authError, authText, getTelegramInitData, readChallenge, rememberChallenge, saveToken, telegramAuthError } from '../lib/auth'
import { getLoginNextPath } from '../lib/routing'

export default function Login({ lang }) {
  const navigate = useNavigate()
  const nextPath = getLoginNextPath(useLocation().search)
  const text = authText[lang]
  const [initData] = useState(getTelegramInitData)
  const [challenge, setChallenge] = useState(() => initData ? null : readChallenge())
  const [phase, setPhase] = useState(() => initData ? 'authenticating' : 'idle')
  const [attempt, setAttempt] = useState(0)
  const startRequest = useRef(null)

  useEffect(() => {
    if (!initData) return
    let active = true
    setPhase('authenticating')
    authenticateTelegramWebApp(initData).then(result => {
      if (!active) return
      try { saveToken(result.access_token) } catch { throw new ApiError('storage') }
      navigate(nextPath, { replace: true })
    }).catch(error => {
      if (active) setPhase(telegramAuthError(error))
    })
    return () => { active = false }
  }, [initData, navigate, attempt, nextPath])

  useEffect(() => () => {
    startRequest.current?.controller.abort()
    startRequest.current?.popup?.close()
  }, [])

  useEffect(() => {
    if (initData || !challenge) return
    const controller = new AbortController()
    let timer
    function finish(nextPhase) {
      rememberChallenge(null)
      setChallenge(null)
      setPhase(nextPhase)
    }
    async function poll() {
      if (controller.signal.aborted) return
      if (Date.now() >= challenge.expiresAt) {
        finish('expired')
        return
      }
      try {
        const result = await apiRequest(`/auth/bot/status/${challenge.login_id}`, {
          headers: { 'X-Login-Token': challenge.browser_token }, signal: controller.signal,
        })
        if (controller.signal.aborted) return
        if (result.status === 'pending') {
          // Schedule only after the previous request completes; never overlap polls.
          timer = setTimeout(poll, Math.min(2000, Math.max(0, challenge.expiresAt - Date.now())))
        } else if (result.status === 'approved' && typeof result.access_token === 'string') {
          try {
            saveToken(result.access_token)
          } catch {
            finish('storage')
            return
          }
          rememberChallenge(null)
          navigate(nextPath, { replace: true })
        } else {
          finish(['cancelled', 'expired'].includes(result.status) ? result.status : 'backend')
        }
      } catch (error) {
        if (!controller.signal.aborted) finish(authError(error))
      }
    }
    timer = setTimeout(poll, 2000)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [challenge, initData, navigate, nextPath])

  async function startLogin() {
    if (initData || startRequest.current || challenge) return
    const controller = new AbortController()
    // Reserve a tab during the user gesture, before awaiting the backend.
    // A visible link below also works when the browser blocks popups.
    let popup = null
    try {
      popup = window.open('about:blank', '_blank')
      if (popup) popup.opener = null
    } catch { /* The explicit link remains available. */ }
    startRequest.current = { controller, popup }
    setPhase('starting')
    try {
      const result = await apiRequest('/auth/bot/start', { method: 'POST', signal: controller.signal })
      if (controller.signal.aborted) return
      const pending = { ...result, expiresAt: Date.now() + result.expires_in * 1000 }
      rememberChallenge(pending)
      setChallenge(pending)
      setPhase('idle')
      if (popup && !popup.closed) {
        try { popup.location.replace(result.telegram_url) } catch { popup.close() }
      }
    } catch (error) {
      popup?.close()
      if (!controller.signal.aborted) setPhase(authError(error))
    } finally {
      if (startRequest.current?.controller === controller) startRequest.current = null
    }
  }

  return (
    <div className="login-container fade-in visible">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-header">
          <LogoIcon className="login-logo" />
          <h2 id="login-title">{text.title}</h2>
          <p>{initData ? text.miniAppDescription : text.description}</p>
        </div>

        {initData ? (
          <div className="auth-status" role={phase === 'authenticating' ? 'status' : 'alert'} aria-live="polite">
            <p>{text[phase]}</p>
            {phase !== 'authenticating' && (
              <button type="button" className="custom-telegram-btn" onClick={() => setAttempt(value => value + 1)}>
                {text.retry}
              </button>
            )}
          </div>
        ) : challenge ? (
          <>
            <div className="auth-status" role="status" aria-live="polite">
              <p>{text.open}</p>
              <p>{text.pending}</p>
              <p>{text.returnHere}</p>
            </div>
            <a href={challenge.telegram_url} target="_blank" rel="noopener noreferrer" className="custom-telegram-btn">
              {text.reopen}
            </a>
          </>
        ) : (
          <>
            {phase !== 'idle' && phase !== 'starting' && <p className="auth-status" role="alert">{text[phase]}</p>}
            <button type="button" onClick={startLogin} disabled={phase === 'starting'} className="custom-telegram-btn">
              <svg viewBox="0 0 24 24" fill="currentColor" className="tg-icon" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
              <span>{phase === 'starting' ? text.starting : phase === 'idle' ? text.login : text.retry}</span>
            </button>
          </>
        )}
        <button className="back-btn" onClick={() => navigate('/')}>← {text.home}</button>
      </section>
    </div>
  )
}
