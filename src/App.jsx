import { useState, useEffect, useCallback } from 'react'
import './App.css'

// Импорт SVG как React-компонентов
import LogoIcon from './assets/icons/logo.svg?react'
import SunIcon from './assets/icons/sun.svg?react'
import MoonIcon from './assets/icons/moon.svg?react'
import CompIcon from './assets/icons/comp.svg?react'
import ShtIcon from './assets/icons/sht.svg?react'
import LizIcon from './assets/icons/liz.svg?react'

const translations = {
  en: {
    slogan: "We are no longer talking about treating diseases here. We are talking about the pursuit of perfection!",
    connect: "Connect",
    featuresTitle: "Why Lizard Connor's Pipes",
    featuresSubtitle: "Technologies that work for you while you focus on what matters",
    accountBtn: "Account",
    footer: "© 2026 Lizard Connor's Pipes. All rights reserved.",
    features: [
      { 
        icon: CompIcon, 
        title: "All Platforms & Speed", 
        desc: "Lightning-fast performance across Windows, macOS, iOS, Android, and Linux with zero lag or buffering." 
      },
      { 
        icon: ShtIcon, 
        title: "Strict No-logs Policy", 
        desc: "We never store or share data about your online activity. Complete anonymity is guaranteed." 
      },
      { 
        icon: LizIcon, 
        title: "Adaptive Protocol", 
        desc: "Smart, seamless switching between protocols for maximum stability on any network." 
      }
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
      { 
        icon: CompIcon, 
        title: "Все платформы и скорость", 
        desc: "Молниеносная работа на Windows, macOS, iOS, Android и Linux без задержек и буферизации." 
      },
      { 
        icon: ShtIcon, 
        title: "No-logs политика", 
        desc: "Мы никогда не храним и не передаём данные о вашей активности. Полная анонимность гарантирована." 
      },
      { 
        icon: LizIcon, 
        title: "Адаптивный протокол", 
        desc: "Умное и незаметное переключение между протоколами для максимальной стабильности в любой сети." 
      }
    ]
  }
}

// Matrix Rain Component
const MatrixRain = () => {
  const [columns, setColumns] = useState([])

  useEffect(() => {
    const generateColumns = () => {
      const cols = []
      const columnCount = Math.floor(window.innerWidth / 12)
      
      for (let i = 0; i < columnCount; i++) {
        const length = Math.floor(Math.random() * 25) + 15
        let chars = ''
        for (let j = 0; j < length; j++) {
          chars += Math.random() > 0.5 ? '1' : '0'
        }
        cols.push({
          id: `${i}-${Date.now()}`,
          chars,
          left: `${(i * 12) + Math.random() * 6}px`,
          delay: `${Math.random() * 15}s`,
          duration: `${4 + Math.random() * 8}s`
        })
      }
      setColumns(cols)
    }

    generateColumns()
  }, [])

  return (
    <div className="matrix-rain">
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

// Green Particles Component
const GreenParticles = ({ particles, onRemove }) => {
  useEffect(() => {
    if (particles.length === 0) return
    const timer = setTimeout(() => onRemove(), 2000)
    return () => clearTimeout(timer)
  }, [particles, onRemove])

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className="green-particle"
          style={{
            left: p.startX,
            top: p.startY,
            '--end-x': `${p.endX}px`,
            '--end-y': `${p.endY}px`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </>
  )
}

function App() {
  // Определяем тему: сохранённая пользователем, либо системная, либо light по умолчанию
const getInitialTheme = () => {
  const saved = localStorage.getItem('theme')
  if (saved) return saved
  
  // Проверяем системные настройки
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

const [theme, setTheme] = useState(getInitialTheme())
  const [lang, setLang] = useState('en')
  const [fading, setFading] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [particles, setParticles] = useState([])

  const t = translations[lang]

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Scroll handler for arrow visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  // Green particles on logo click
  const handleLogoClick = useCallback((e) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const newParticles = Array.from({ length: 20 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 20
      const distance = 800 + Math.random() * 400
      return {
        id: `${Date.now()}-${i}`,
        startX: centerX,
        startY: centerY,
        endX: centerX + Math.cos(angle) * distance,
        endY: centerY + Math.sin(angle) * distance,
        delay: Math.random() * 0.2,
      }
    })

    setParticles(newParticles)
    setTimeout(() => setParticles([]), 2200)
  }, [])

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

  // Слушаем изменения системной темы (только если пользователь не выбрал свою)
useEffect(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  const handleChange = (e) => {
    // Меняем тему только если пользователь ещё не выбрал свою вручную
    if (!localStorage.getItem('theme')) {
      setTheme(e.matches ? 'dark' : 'light')
    }
  }
  
  mediaQuery.addEventListener('change', handleChange)
  return () => mediaQuery.removeEventListener('change', handleChange)
}, [])

  return (
    <div className="app">
      <MatrixRain />
      <GreenParticles particles={particles} onRemove={() => setParticles([])} />

      {/* Header */}
      <header>
        <div className="header-inner">
          <div className="logo" onClick={handleLogoClick}>
            <div className="logo-icon">
              <LogoIcon className="logo-svg" />
            </div>
            <span className="logo-text">LIZARD CONNOR'S PIPES</span>
          </div>
          <div className="header-right">
            <div className="theme-switcher">
              <button 
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`} 
                onClick={() => setTheme('light')}
                title="Light Theme"
              >
                <SunIcon className="theme-svg" />
              </button>
              <button 
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} 
                onClick={() => setTheme('dark')}
                title="Dark Theme"
              >
                <MoonIcon className="theme-svg" />
              </button>
            </div>
            <button className="account-btn">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/>
              </svg>
              <span>{t.connect}</span>
            </a>
            <button className="btn btn-secondary lang-toggle" onClick={toggleLanguage}>
              <span className={lang === 'en' ? 'lang-active' : ''}>EN</span>
              <span className="lang-divider">/</span>
              <span className={lang === 'ru' ? 'lang-active' : ''}>RU</span>
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="section-header fade-in">
          <h2>{t.featuresTitle}</h2>
          <p>{t.featuresSubtitle}</p>
        </div>
        <div className="features-grid">
          {t.features.map((f, i) => {
            const IconComponent = f.icon;
            const svgClass = `feature-svg ${IconComponent === CompIcon ? 'comp-icon' : 'simple-icon'}`;
            return (
              <div key={i} className="feature-card fade-in">
                <div className="feature-icon">
                  <IconComponent className={svgClass} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Scroll to Top Arrow */}
      <div className={`scroll-to-top ${showScrollTop ? 'visible' : 'hidden'}`} onClick={scrollToTop}>
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