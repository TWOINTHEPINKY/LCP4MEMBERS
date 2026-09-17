import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LogoIcon from '../assets/icons/logo.svg?react'
import { apiRequest, authError, authText, getToken, removeToken } from '../lib/auth'

export default function Account({ lang }) {
  const navigate = useNavigate()
  const text = authText[lang]
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function loadProfile() {
      setError(null)
      try {
        const token = getToken()
        if (!token) {
          navigate('/login', { replace: true })
          return
        }
        const profile = await apiRequest('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        })
        if (!controller.signal.aborted) setUser(profile)
      } catch (failure) {
        if (controller.signal.aborted) return
        if (failure.status === 401 || failure.status === 403) {
          try {
            removeToken()
            navigate('/login', { replace: true })
          } catch {
            setError('storage')
          }
        } else {
          setError(failure.name === 'SecurityError' ? 'storage' : authError(failure))
        }
      }
    }
    loadProfile()
    return () => controller.abort()
  }, [navigate, attempt])

  function logout() {
    try {
      removeToken()
      navigate('/login', { replace: true })
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
        ) : <p className="auth-status" role="status">{text.loading}</p>}
        <button className="custom-telegram-btn" onClick={logout}>{text.logout}</button>
        <button className="back-btn" onClick={() => navigate('/')}>← {text.home}</button>
      </section>
    </div>
  )
}
