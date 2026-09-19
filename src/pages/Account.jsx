import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LogoIcon from '../assets/icons/logo.svg?react'
import { ApiError, apiRequest, authenticateTelegramWebApp, authError, authText, getTelegramInitData, getToken, removeToken, saveToken, telegramAuthError } from '../lib/auth'

export default function Account({ lang }) {
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

  function logout() {
    try {
      removeToken()
      // /login auto-authenticates in Telegram, so logout must leave the auth routes.
      navigate(initData ? '/' : '/login', { replace: true })
    } catch {
      setError('storage')
    }
  }

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
        ) : user ? (
          <dl className="account-details">
            <div><dt>{text.firstName}</dt><dd>{user.first_name}</dd></div>
            <div><dt>{text.username}</dt><dd>{user.username ? `@${user.username}` : text.noUsername}</dd></div>
            <div><dt>Telegram ID</dt><dd>{user.id}</dd></div>
          </dl>
        ) : <p className="auth-status" role="status">{authenticating ? text.authenticating : text.loading}</p>}
        <button className="custom-telegram-btn" onClick={logout}>{text.logout}</button>
        <button className="back-btn" onClick={() => navigate('/')}>← {text.home}</button>
      </section>
    </div>
  )
}
