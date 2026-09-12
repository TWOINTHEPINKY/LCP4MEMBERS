import { useState, useEffect } from 'react'

export default function CookieBanner() {
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
        <p>🍪 We use cookies to improve your experience. By continuing, you agree to our use of cookies.</p>
        <div className="cookie-buttons">
          <button className="cookie-accept" onClick={accept}>Accept</button>
        </div>
      </div>
    </div>
  )
}