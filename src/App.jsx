import { useState, useEffect, useRef } from 'react'
import './App.css'

const translations = {
  en: {
    slogan: "We are no longer talking about treating diseases here. We are talking about the pursuit of perfection!",
    connect: "Connect",
    telegram: "Learn more on Telegram",
    featuresTitle: "Why Lizard Connor's Pipes",
    featuresSubtitle: "Technologies that work for you while you focus on what matters",
    accountBtn: "Account",
    joinUs: "Join Us",
    joinSubtitle: "Stay updated, get promo codes, and connect with the community",
    channel: "Telegram Channel",
    chat: "Telegram Chat",
    personalAccount: "Personal Account",
    accountDesc: "Manage your subscription, devices, and security settings in one place",
    signIn: "Sign In",
    footer: "© 2024 Lizard Connor's Pipes. All rights reserved.",
    features: [
      { icon: "🔒", title: "AES-256 Encryption", desc: "Military-grade encryption for every data packet." },
      { icon: "⚡", title: "Lightning Speed", desc: "Optimized servers worldwide. No lag, no buffering." },
      { icon: "🦎", title: "50+ Locations", desc: "Bypass geo-restrictions and access content from anywhere." },
      { icon: "🚫", title: "No-logs Policy", desc: "We don't store or share data about your activity." },
      { icon: "📱", title: "All Platforms", desc: "Windows, macOS, iOS, Android, Linux. One app." },
      { icon: "🦎", title: "Adaptive Protocol", desc: "Smart switching between protocols for max stability." }
    ]
  },
  ru: {
    slogan: "Мы здесь больше не говорим о лечении болезней. Мы говорим о стремлении к совершенству!",
    connect: "Подключить",
    telegram: "Узнать больше в Telegram",
    featuresTitle: "Почему Lizard Connor's Pipes",
    featuresSubtitle: "Технологии, которые работают на вас, пока вы занимаетесь своими делами",
    accountBtn: "Кабинет",
    joinUs: "Присоединяйтесь",
    joinSubtitle: "Будьте в курсе обновлений, получайте промокоды и общайтесь с сообществом",
    channel: "Telegram канал",
    chat: "Telegram чат",
    personalAccount: "Личный кабинет",
    accountDesc: "Управляйте подпиской, устройствами и настройками безопасности в одном месте",
    signIn: "Войти",
    footer: "© 2024 Lizard Connor's Pipes. Все права защищены.",
    features: [
      { icon: "🦎", title: "Шифрование AES-256", desc: "Военный уровень шифрования для каждого пакета данных." },
      { icon: "⚡", title: "Молниеносная скорость", desc: "Оптимизированные серверы по всему миру. Без задержек." },
      { icon: "🌍", title: "50+ локаций", desc: "Обходите географические ограничения и получайте доступ откуда угодно." },
      { icon: "🚫", title: "No-logs политика", desc: "Мы не храним и не передаём данные о вашей активности." },
      { icon: "📱", title: "Все платформы", desc: "Windows, macOS, iOS, Android, Linux. Одно приложение." },
      { icon: "🦎", title: "Адаптивный протокол", desc: "Умное переключение между протоколами для стабильности." }
    ]
  }
}

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'moss')
  const [lang, setLang] = useState('en')
  const [fading, setFading] = useState(false)
  const [cursorVisible, setCursorVisible] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })

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

  const handleMouseMove = (e) => setCursorPos({ x: e.clientX, y: e.clientY })

  // Анимация появления блоков при скролле
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
    <div className={`app ${cursorVisible ? 'cursor-lizard' : ''}`} onMouseMove={handleMouseMove}>
      {/* Курсор-ящерица */}
      <div className={`lizard-cursor ${cursorVisible ? 'active' : ''}`} style={{ left: cursorPos.x, top: cursorPos.y }}>
        <svg viewBox="0 0 64 64" fill="none">
          <path d="M48 16C50 14 52 14 54 16C56 18 56 20 54 22C52 24 50 24 48 22C46 20 46 18 48 16Z" fill="#5A8A6E"/>
          <path d="M44 20C42 18 38 16 34 18C30 20 28 24 26 28C24 32 22 36 20 38C18 40 16 42 14 42C12 42 10 40 10 38C10 36 12 34 14 34C16 34 18 36 18 38" stroke="#5A8A6E" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="50" cy="18" r="1.5" fill="white"/>
        </svg>
      </div>

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
              <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>🌙</button>
            </div>
            <button className="account-btn" onMouseEnter={() => setCursorVisible(true)} onMouseLeave={() => setCursorVisible(false)}>
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
            <a href="#" className="btn btn-primary" onMouseEnter={() => setCursorVisible(true)} onMouseLeave={() => setCursorVisible(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/></svg>
              {t.connect}
            </a>
            <a href="#" className="btn btn-secondary" onMouseEnter={() => setCursorVisible(true)} onMouseLeave={() => setCursorVisible(false)}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
              {t.telegram}
            </a>
          </div>
          <button className="lang-toggle" onClick={toggleLanguage} onMouseEnter={() => setCursorVisible(true)} onMouseLeave={() => setCursorVisible(false)}>
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
            <div key={i} className="feature-card fade-in" onMouseEnter={() => setCursorVisible(true)} onMouseLeave={() => setCursorVisible(false)}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Telegram */}
      <section className="telegram-section">
        <div className="telegram-container fade-in">
          <h2>{t.joinUs}</h2>
          <p>{t.joinSubtitle}</p>
          <div className="telegram-buttons">
            <button className="telegram-btn primary" onMouseEnter={() => setCursorVisible(true)} onMouseLeave={() => setCursorVisible(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
              {t.channel}
            </button>
            <button className="telegram-btn secondary" onMouseEnter={() => setCursorVisible(true)} onMouseLeave={() => setCursorVisible(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
              {t.chat}
            </button>
          </div>
        </div>
      </section>

      {/* Account */}
      <section className="account-section">
        <div className="account-card fade-in">
          <h3>{t.personalAccount}</h3>
          <p>{t.accountDesc}</p>
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onMouseEnter={() => setCursorVisible(true)} onMouseLeave={() => setCursorVisible(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {t.signIn}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <p>{t.footer}</p>
      </footer>
    </div>
  )
}

export default App