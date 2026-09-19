import { useNavigate } from 'react-router-dom'
import { authText, removeToken } from '../lib/auth'

export default function AccountLogoutButton({ lang, onError }) {
  const navigate = useNavigate()
  const text = authText[lang]

  function logout() {
    try {
      removeToken()
      // Login already exchanges raw initData automatically inside Telegram,
      // then replaces this route with /app. Browsers retain the manual login UI.
      navigate('/login', { replace: true })
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
