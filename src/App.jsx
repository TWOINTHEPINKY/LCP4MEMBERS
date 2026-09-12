import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

import LogoIcon from './assets/icons/logo.svg?react'
import SunIcon from './assets/icons/sun.svg?react'
import MoonIcon from './assets/icons/moon.svg?react'
import CompIcon from './assets/icons/comp.svg?react'
import ShtIcon from './assets/icons/sht.svg?react'
import LizIcon from './assets/icons/liz.svg?react'

import Preloader from './components/Preloader'
import Toast from './components/Toast'
import CookieBanner from './components/CookieBanner'
import ErrorBoundary from './components/ErrorBoundary'

const translations = {
  en: {
    slogan: "We are no longer talking about treating diseases here. We are talking about the pursuit of perfection!",
    connect: "Connect",
    featuresTitle: "Why Lizard Connor's Pipes",
    featuresSubtitle: "Technologies that work for you while you focus on what matters",
    accountBtn: "Account",
    footer: "© 2026 Lizard Connor's Pipes. All rights reserved.",
    share: "Share",
    shareCopied: "Link copied!",
    themeChanged: "Theme changed",
    features: [
      { icon: CompIcon, title: "All Platforms & Speed", desc: "Lightning-fast performance across Windows, macOS, iOS, Android, and Linux with zero lag or buffering." },
      { icon: ShtIcon, title: "Strict No-logs Policy", desc: "We never store or share data about your online activity. Complete anonymity is guaranteed." },
      { icon: LizIcon, title: "Adaptive Protocol", desc: "Smart, seamless switching between protocols for maximum stability on any network." }
    ]
  },
  ru: {
    slogan: "Мы здесь больше не говорим о лечении болезней. Мы говорим о стремлении к совершенству!",
    connect: "Подключить",
    featuresTitle: "Почему Lizard Connor's Pipes",
    featuresSubtitle: "Технологии, которые работают на вас, пока вы занимаетесь своими делами",
    accountBtn: "Кабинет",
    footer: "© 2026 Lizard Connor's Pipes. Все права защищены.",
    share: "Поделиться",
    shareCopied: "Ссылка скопирована!",
    themeChanged: "Тема изменена",
    features: [
      { icon: CompIcon, title: "Все платформы и скорость", desc: "Молниеносная работа на Windows, macOS, iOS, Android и Linux без задержек и буферизации." },
      { icon: ShtIcon, title: "No-logs политика", desc: "Мы никогда не храним и не передаём данные о вашей активности. Полная анонимность гарантирована." },
      { icon: LizIcon, title: "Адаптивный протокол", desc: "Умное и незаметное переключение между протоколами для максимальной стабильности в любой сети." }
    ]
  }
}

const MatrixRain = () => {
  const [columns, setColumns] = useState([])
  useEffect(() => {
    const cols = []
    const columnCount = Math.floor(window.innerWidth / 12)
    for (let i = 0; i < columnCount; i++) {
      const length = Math.floor(Math.random() * 25) + 15
      let chars = ''
      for (let j = 0; j < length; j++) chars += Math.random() > 0.5 ? '1' : '0'
      cols.push({
        id: `${i}-${Date.now()}`,
        chars,
        left: `${(i * 12) + Math.random() * 6}px`,
        delay: `${Math.random() * 15}s`,
        duration: `${4 + Math.random() * 8}s`
      })
    }
    setColumns(cols)
  }, [])
  return (
    <div className="matrix-rain">
      {columns.map((col) => (
        <div key={col.id} className="matrix-column" style={{ left: col.left, animationDelay: col.delay, animationDuration: col.duration }}>
          {col.chars}
        </div>
      ))}
    </div>
  )
}

const GreenParticles = ({ particles }) => (
  <>
    {particles.map((p) => (
      <div key={p.id} className="green-particle" style={{ left: p.startX, top: p.startY, '--end-x': `${p.endX}px`, '--end-y': `${p.endY}px`, animationDelay: `${p.delay}s` }} />
    ))}
  </>
)

const CursorTrail = () => {
  const [dots, setDots] = useState([])

  useEffect(() => {
    const handleMove = (e) => {
      setDots((prev) => [
        ...prev.slice(-15),
        { id: Date.now() + Math.random(), x: e.clientX, y: e.clientY }
      ])
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => prev.slice(1))
    }, 80)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="cursor-trail">
      {dots.map((dot, i) => (
        <div key={dot.id} className="trail-dot" style={{ left: dot.x, top: dot.y, opacity: (i + 1) / Math.max(dots.length, 1) * 0.6 }} />
      ))}
    </div>
  )
}

function App() {
  const getInitialTheme = () => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
    return 'light'
  }

  const [theme, setTheme] = useState(getInitialTheme())
  const [lang, setLang] = useState('en')
  const [fading, setFading] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [particles, setParticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [typewriterText, setTypewriterText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const connectBtnRef = useRef(null)
  const langBtnRef = useRef(null)

  const t = translations[lang]
  const fullText = t.slogan

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => { if (!localStorage.getItem('theme')) setTheme(e.matches ? 'dark' : 'light') }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Typewriter — плавнее (50ms вместо 25ms)
  useEffect(() => {
    if (!loading) {
      setTypewriterText('')
      setIsTyping(true)
      let i = 0
      const interval = setInterval(() => {
        if (i <= fullText.length) {
          setTypewriterText(fullText.slice(0, i))
          i++
        } else {
          setIsTyping(false)
          clearInterval(interval)
        }
      }, 50)
      return () => clearInterval(interval)
    }
  }, [lang, loading, fullText])

  useEffect(() => {
    if (loading) return
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible') }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )
    document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [lang, loading])

  const toggleLanguage = () => {
    setFading(true)
    setTimeout(() => { setLang(lang === 'en' ? 'ru' : 'en'); setFading(false) }, 400)
  }

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
    setToast(t.themeChanged)
  }

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const handleLogoClick = useCallback((e) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const newParticles = Array.from({ length: 20 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 20
      const distance = 800 + Math.random() * 400
      return { id: `${Date.now()}-${i}`, startX: centerX, startY: centerY, endX: centerX + Math.cos(angle) * distance, endY: centerY + Math.sin(angle) * distance, delay: Math.random() * 0.2 }
    })
    setParticles(newParticles)
    setTimeout(() => setParticles([]), 2200)
  }, [])

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: "Lizard Connor's Pipes", url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      setToast(t.shareCopied)
    }
  }

  const handleMagneticMove = (e, ref) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    ref.current.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`
  }
  const handleMagneticLeave = (ref) => {
    if (ref.current) ref.current.style.transform = 'translate(0, 0)'
  }

  const handleTiltMove = (e) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = (y - centerY) / 15
    const rotateY = (centerX - x) / 15
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`
  }
  const handleTiltLeave = (e) => {
    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)'
  }

  if (loading) return <Preloader onComplete={() => setLoading(false)} />

  return (
    <ErrorBoundary>
      <div className="app">
        <MatrixRain />
        <GreenParticles particles={particles} />
        <CursorTrail />

        <header>
          <div className="header-inner">
            <div className="logo" onClick={handleLogoClick} role="button" tabIndex="0" aria-label="Lizard Connor's Pipes logo">
              <div className="logo-icon"><LogoIcon className="logo-svg" /></div>
              <span className="logo-text">LIZARD CONNOR'S PIPES</span>
            </div>
            <div className="header-right">
              <div className="theme-switcher" role="radiogroup" aria-label="Theme selector">
                <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => handleThemeChange('light')} title="Light Theme" aria-label="Light theme" role="radio" aria-checked={theme === 'light'}>
                  <SunIcon className="theme-svg" />
                </button>
                <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => handleThemeChange('dark')} title="Dark Theme" aria-label="Dark theme" role="radio" aria-checked={theme === 'dark'}>
                  <MoonIcon className="theme-svg" />
                </button>
              </div>
              <button className="account-btn" aria-label="Account">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>{t.accountBtn}</span>
              </button>
            </div>
          </div>
        </header>

        <section className="hero">
          <div className="hero-bg-pattern"></div>
          <div className="hero-content">
            <h1>
              <span className="quote-mark">"</span>
              <span className={`lang-slogan ${fading ? 'fading' : ''}`}>
                {typewriterText}
                {isTyping && <span className="typewriter-cursor">|</span>}
              </span>
              <span className="quote-mark">"</span>
            </h1>
            <div className="hero-buttons">
              <a
                href="#"
                className="btn btn-primary magnetic-btn"
                ref={connectBtnRef}
                onMouseMove={(e) => handleMagneticMove(e, connectBtnRef)}
                onMouseLeave={() => handleMagneticLeave(connectBtnRef)}
                aria-label="Connect to VPN"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/></svg>
                <span>{t.connect}</span>
              </a>
              <button
                className="btn btn-secondary lang-toggle magnetic-btn"
                ref={langBtnRef}
                onClick={toggleLanguage}
                onMouseMove={(e) => handleMagneticMove(e, langBtnRef)}
                onMouseLeave={() => handleMagneticLeave(langBtnRef)}
                aria-label="Switch language"
              >
                <span className={lang === 'en' ? 'lang-active' : ''}>EN</span>
                <span className="lang-divider">/</span>
                <span className={lang === 'ru' ? 'lang-active' : ''}>RU</span>
              </button>
              <button className="btn btn-secondary share-btn" onClick={handleShare} aria-label="Share site">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span>{t.share}</span>
              </button>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="section-header fade-in">
            <h2>{t.featuresTitle}</h2>
            <p>{t.featuresSubtitle}</p>
          </div>
          <div className="features-grid">
            {t.features.map((f, i) => {
              const IconComponent = f.icon
              const svgClass = `feature-svg ${IconComponent === CompIcon ? 'comp-icon' : 'simple-icon'}`
              return (
                <div
                  key={i}
                  className="feature-card fade-in tilt-card"
                  onMouseMove={handleTiltMove}
                  onMouseLeave={handleTiltLeave}
                >
                  <div className="feature-icon"><IconComponent className={svgClass} /></div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              )
            })}
          </div>
        </section>

        <div className={`scroll-to-top ${showScrollTop ? 'visible' : 'hidden'}`} onClick={scrollToTop} role="button" tabIndex="0" aria-label="Scroll to top">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
        </div>

        <footer>
          <p>{t.footer}</p>
        </footer>

        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
        <CookieBanner />
      </div>
    </ErrorBoundary>
  )
}

export default App