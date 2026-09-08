import { useState, useEffect } from 'react'
import './App.css'

const translations = {
  en: {
    slogan: "We are no longer talking about treating diseases here. We are talking about the pursuit of perfection!",
    connect: "Connect",
    featuresTitle: "Why Lizard Connor's Pipes",
    featuresSubtitle: "Technologies that work for you while you focus on what matters",
    accountBtn: "Account",
    footer: "© 2026 Lizard Connor's Pipes. All rights reserved.",
    features: [
      { icon: "", title: "AES-256 Encryption", desc: "Military-grade encryption for every data packet." },
      { icon: "⚡", title: "Lightning Speed", desc: "Optimized servers worldwide. No lag, no buffering." },
      { icon: "🌍", title: "50+ Locations", desc: "Bypass geo-restrictions and access content from anywhere." },
      { icon: "🚫", title: "No-logs Policy", desc: "We don't store or share data about your activity." },
      { icon: "📱", title: "All Platforms", desc: "Windows, macOS, iOS, Android, Linux. One app." },
      { icon: "🦎", title: "Adaptive Protocol", desc: "Smart switching between protocols for max stability." }
    ]
  },
  ru: {
    slogan: "Мы здесь больше не говорим о лечении болезней. Мы говорим о стремлении к совершенству!",
    connect: "Подключить",
    featuresTitle: "Почему Lizard Connor's Pipes",
    featuresSubtitle: "Технологии, которые работают на вас, пока вы занимаетесь своими делами",
    accountBtn: "Кабинет",
    footer: "© 2026 Lizard Connor's Pipes. Все права защищены.",
    features: [
      { icon: "🔒", title: "Шифрование AES-256", desc: "Военный уровень шифрования для каждого пакета данных." },
      { icon: "⚡", title: "Молниеносная скорость", desc: "Оптимизированные серверы по всему миру. Без задержек." },
      { icon: "🌍", title: "50+ локаций", desc: "Обходите географические ограничения и получайте доступ откуда угодно." },
      { icon: "🚫", title: "No-logs политика", desc: "Мы не храним и не передаём данные о вашей активности." },
      { icon: "📱", title: "Все платформы", desc: "Windows, macOS, iOS, Android, Linux. Одно приложение." },
      { icon: "🦎", title: "Адаптивный протокол", desc: "Умное переключение между протоколами для стабильности." }
    ]
  }
}

// Matrix Rain Component
const MatrixRain = () => {
  const [columns, setColumns] = useState([])
  const [isScrolling, setIsScrolling] = useState(false)

  useEffect(() => {
    // Generate random matrix columns
    const cols = []
    const columnCount = Math.floor(window.innerWidth / 20)
    
    for (let i = 0; i < columnCount; i++) {
      const length = Math.floor(Math.random() * 15) + 10
      let chars = ''
      for (let j = 0; j < length; j++) {
        chars += Math.random() > 0.5 ? '1' : '0'
      }
      cols.push({
        id: i,
        chars,
        left: `${i * 20}px`,
        delay: `${Math.random() * 10}s`,
        duration: `${3 + Math.random() * 5}s`
      })
    }
    setColumns(cols)

    // Scroll detection
    let scrollTimeout
    const handleScroll = () => {
      setIsScrolling(true)
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => setIsScrolling(false), 150)
    }
    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [])

  return (
    <div className={`matrix-rain ${isScrolling ? 'scrolling' : ''}`}>
      {columns.map((col) => (
        <div
          key={col.id}
          className="matrix-column"
          style={{
            left: col.left,
            animationDelay: col.delay,
            animationDuration: col.duration,
          }}
        >
          {col.chars}
        </div>
      ))}
    </div>
  )
}

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'moss')
  const [lang, setLang] = useState('en')
  const [fading, setFading] = useState(false)

  const t = translations[lang]

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleLanguage = () => {
    setFading(true)
    setTimeout(() => {
      setLang(lang === 'en' ? 'ru' : 'en')
      setFading(false)
    }, 400)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Animation on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    )

    const fadeElements = document.querySelectorAll('.fade-in')
    fadeElements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [lang])

  return (
    <div className="app">
      {/* Matrix Rain Background */}
      <MatrixRain />

      {/* Header */}
      <header>
        <div className="header-inner">
          <a href="#" className="logo">
            <div className="logo-icon"></div>
            <span className="logo-text">LIZARD CONNOR'S PIPES</span>
          </a>
          <div className="header-right">
            <div className="theme-switcher">
              <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>☀</button>
              <button className={`theme-btn ${theme === 'moss' ? 'active' : ''}`} onClick={() => setTheme('moss')}></button>
              <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}></button>
            </div>
            <button className="account-btn">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>{t.accountBtn}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg-pattern"></div>
        <div className="hero-content">
          <h1>
            <span className="quote-mark">"</span>
            <span className={`lang-slogan ${fading ? 'fading' : ''}`}>{t.slogan}</span>
            <span className="quote-mark">"</span>
          </h1>
          <div className="hero-buttons">
            <a href="#" className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/></svg>
              {t.connect}
            </a>
          </div>
          <button className="lang-toggle" onClick={toggleLanguage}>
            <span className={lang === 'en' ? 'lang-active' : ''}>EN</span>
            <span className="lang-divider">/</span>
            <span className={lang === 'ru' ? 'lang-active' : ''}>RU</span>
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="section-header fade-in">
          <h2>{t.featuresTitle}</h2>
          <p>{t.featuresSubtitle}</p>
        </div>
        <div className="features-grid">
          {t.features.map((f, i) => (
            <div key={i} className="feature-card fade-in">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Scroll to Top Arrow */}
      <div className="scroll-to-top" onClick={scrollToTop}>
        <svg viewBox="0 0 24 24">
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
      </div>

      {/* Footer */}
      <footer>
        <p>{t.footer}</p>
      </footer>
    </div>
  )
}

export default App