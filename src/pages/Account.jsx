import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LogoIcon from '../assets/icons/logo.svg?react'
import Dashboard from './Dashboard'
import { ApiError, apiRequest, authenticateTelegramWebApp, authError, authText, getTelegramInitData, getToken, removeToken, saveToken, telegramAuthError } from '../lib/auth'

export default function Account({ lang, profileControls }) {
  const navigate = useNavigate()
  const text = authText[lang]
  const [initData] = useState(getTelegramInitData)
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [authenticating, setAuthenticating] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function loadProfile() {
      setError(null)
      setAuthenticating(false)
      try {
        const token = getToken()
        if (token) {
          try {
            const profile = await apiRequest('/auth/me', {
              headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
            })
            if (!controller.signal.aborted) setUser(profile)
            return
          } catch (failure) {
            if (controller.signal.aborted) return
            if (failure.status !== 401 && failure.status !== 403) throw failure
            removeToken()
          }
        }
        if (!initData) {
          navigate('/login', { replace: true })
          return
        }
        setAuthenticating(true)
        const result = await authenticateTelegramWebApp(initData)
        if (controller.signal.aborted) return
        try { saveToken(result.access_token) } catch { throw new ApiError('storage') }
        setAuthenticating(false)
        const profile = await apiRequest('/auth/me', {
          headers: { Authorization: `Bearer ${result.access_token}` }, signal: controller.signal,
        })
        if (!controller.signal.aborted) setUser(profile)
      } catch (failure) {
        if (controller.signal.aborted) return
        if (failure.status === 401 || failure.status === 403) {
          try {
            removeToken()
            // Stay on this page after a rejected Mini App exchange or token.
            // Only an explicit retry may start another exchange.
            if (initData) setError('miniAppFailed')
            else navigate('/login', { replace: true })
          } catch {
            setError('storage')
          }
        } else {
          setError(initData ? telegramAuthError(failure) : failure.name === 'SecurityError' ? 'storage' : authError(failure))
        }
      }
    }
    loadProfile()
    return () => controller.abort()
  }, [navigate, attempt, initData])

  if (user && !error) return <Dashboard user={user} lang={lang} profileControls={profileControls} />

  return (
    <div className="login-container fade-in visible">
      <section className="login-card" aria-labelledby="account-title">
        <div className="login-header">
          <LogoIcon className="login-logo" />
          <h2 id="account-title">{text.account}</h2>
        </div>
        {error ? (
          <div className="auth-status" role="alert">
            <p>{text[error]}</p>
            <button className="back-btn" onClick={() => setAttempt(value => value + 1)}>{text.retry}</button>
          </div>
        ) : <p className="auth-status" role="status">{authenticating ? text.authenticating : text.loading}</p>}
        <button className="back-btn" onClick={() => navigate('/')}>← {text.home}</button>
      </section>
    </div>
  )
}
