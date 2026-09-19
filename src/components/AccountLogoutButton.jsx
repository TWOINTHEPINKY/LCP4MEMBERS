import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authText, getTelegramInitData, removeToken } from '../lib/auth'

export default function AccountLogoutButton({ lang, onError }) {
  const navigate = useNavigate()
  const [initData] = useState(getTelegramInitData)
  const text = authText[lang]

  function logout() {
    try {
      removeToken()
      // /login auto-authenticates in Telegram, so logout must leave the auth routes.
      navigate(initData ? '/' : '/login', { replace: true })
    } catch {
      onError(text.storage)
    }
  }

  return (
    <button type="button" className="header-control account-btn logout-btn" onClick={logout} aria-label={text.logout} title={text.logout}>
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M10 12h10m-4-4 4 4-4 4" />
      </svg>
    </button>
  )
}
