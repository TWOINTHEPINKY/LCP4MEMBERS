import { useState, useEffect } from 'react'

const translations = {
  ru: { message: 'Мы используем cookies, чтобы сделать сайт удобнее. Продолжая пользоваться сайтом, вы соглашаетесь с их использованием.', accept: 'Принять' },
  en: { message: 'We use cookies to improve your experience. By continuing, you agree to our use of cookies.', accept: 'Accept' },
}

export default function CookieBanner({ lang }) {
  const text = translations[lang]
  const [show, setShow] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem('cookies-accepted')
    if (!accepted) setShow(true)
  }, [])

  const accept = () => {
    localStorage.setItem('cookies-accepted', 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="cookie-banner">
      <div className="cookie-content">
        <p>🍪 {text.message}</p>
        <div className="cookie-buttons">
          <button className="cookie-accept" onClick={accept}>{text.accept}</button>
        </div>
      </div>
    </div>
  )
}
