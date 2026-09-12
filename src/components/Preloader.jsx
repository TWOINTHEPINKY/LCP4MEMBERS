import { useEffect, useState } from 'react'
import LogoIcon from '../assets/icons/logo.svg?react'

export default function Preloader({ onComplete }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval)
          setTimeout(onComplete, 300)
          return 100
        }
        return p + Math.random() * 12
      })
    }, 120)
    return () => clearInterval(interval)
  }, [onComplete])

  return (
    <div className={`preloader ${progress >= 100 ? 'fade-out' : ''}`}>
      <div className="preloader-logo">
        <LogoIcon className="preloader-logo-svg" />
      </div>
      <div className="preloader-bar">
        <div className="preloader-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
      </div>
      <div className="preloader-text">LIZARD CONNOR'S PIPES</div>
    </div>
  )
}