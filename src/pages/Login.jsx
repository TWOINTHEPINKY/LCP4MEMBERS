import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import LogoIcon from '../assets/icons/logo.svg?react'

export default function Login({ t, lang, toggleLanguage, theme, handleThemeChange }) {
  const navigate = useNavigate()
  const widgetContainerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Функция, которую вызовет Telegram после успешной авторизации
  useEffect(() => {
    window.onTelegramAuth = async (user) => {
      setIsLoading(true)
      setError('')
      try {
        // Отправляем данные пользователя на ваш FastAPI бэкенд
        const response = await fetch('http://localhost:8000/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        })

        if (!response.ok) throw new Error('Ошибка авторизации на сервере')

        const data = await response.json()
        
        // Сохраняем токен и данные пользователя
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        // Перенаправляем в личный кабинет (или на главную, если кабинет еще не готов)
        navigate('/dashboard') 
      } catch (err) {
        console.error(err)
        setError('Не удалось войти. Попробуйте еще раз или напишите в поддержку.')
      } finally {
        setIsLoading(false)
      }
    }

    // Динамическая загрузка скрипта Telegram Widget
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', 'connorsvpn_bot') // <-- ЗАМЕНИТЕ ЭТО
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '12')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-userpic', 'false')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.async = true

    if (widgetContainerRef.current) {
      widgetContainerRef.current.appendChild(script)
    }

    return () => {
      // Очистка при размонтировании
      if (widgetContainerRef.current) {
        widgetContainerRef.current.innerHTML = ''
      }
      delete window.onTelegramAuth
    }
  }, [navigate])

  return (
    <div className="login-container fade-in visible">
      <div className="login-card">
        <div className="login-header">
          <LogoIcon className="login-logo" />
          <h2>{lang === 'ru' ? 'Вход в аккаунт' : 'Account Login'}</h2>
          <p>{lang === 'ru' ? 'Быстрый и безопасный вход через Telegram' : 'Quick and secure login via Telegram'}</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="telegram-widget-wrapper" ref={widgetContainerRef}>
  {/* Сюда Telegram попытается вставить кнопку. Если не сможет, останется текст ниже */}
  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
    Если кнопка не появляется,{' '}
    <a href="https://t.me/connorsvpn_bot" target="_blank" rel="noopener noreferrer" className="bot-link">
      нажмите здесь, чтобы начать в Telegram
    </a>
  </p>
        </div>

        <div className="login-footer">
          <p>
            {lang === 'ru' ? 'Нет аккаунта?' : 'No account?'}{' '}
            <a href="https://t.me/connorsvpn_bot" target="_blank" rel="noopener noreferrer" className="bot-link">
              {lang === 'ru' ? 'Начните работу с нашим ботом' : 'Start with our bot'}
            </a>
          </p>
        </div>

        <button className="back-btn" onClick={() => navigate('/')}>
          ← {lang === 'ru' ? 'Вернуться на главную' : 'Back to Home'}
        </button>
      </div>
    </div>
  )
}