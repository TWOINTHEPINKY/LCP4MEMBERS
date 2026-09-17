const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://82.27.77.44:8000' : '')).trim().replace(/\/+$/, '')
const TOKEN_KEY = 'lcp_access_token'
const CHALLENGE_KEY = 'lcp_login_challenge'

export class ApiError extends Error {
  constructor(code, status = 0) {
    super(code)
    this.code = code
    this.status = status
  }
}

export async function apiRequest(path, { signal, headers, ...options } = {}) {
  if (!API_URL) throw new ApiError('configuration')
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  const timeout = setTimeout(abort, 10000)
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options, headers, signal: controller.signal, cache: 'no-store', credentials: 'omit',
    })
    const data = await response.json()
    if (!response.ok) throw new ApiError(typeof data.detail === 'string' ? data.detail : 'backend', response.status)
    return data
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (error instanceof ApiError) throw error
    throw new ApiError('network')
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

// TODO: Once frontend/backend share one production domain, replace localStorage
// with a Secure HttpOnly cookie (and appropriate CSRF protection).
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const removeToken = () => localStorage.removeItem(TOKEN_KEY)

export function readChallenge() {
  try {
    const item = JSON.parse(sessionStorage.getItem(CHALLENGE_KEY))
    return item && /^[A-Za-z0-9_-]{32}$/.test(item.login_id) && typeof item.browser_token === 'string'
      && Number.isFinite(item.expiresAt) && item.expiresAt > Date.now() ? item : null
  } catch {
    return null
  }
}

export function rememberChallenge(challenge) {
  try {
    if (challenge) sessionStorage.setItem(CHALLENGE_KEY, JSON.stringify(challenge))
    else sessionStorage.removeItem(CHALLENGE_KEY)
  } catch {
    // In-memory polling still works when sessionStorage is unavailable.
  }
}

export const authText = {
  ru: {
    title: 'Вход в аккаунт', description: 'Подтвердите вход через нашего Telegram-бота, чтобы открыть кабинет.',
    login: 'Войти через Telegram', starting: 'Создаём ссылку…', open: 'Откройте Telegram и подтвердите вход',
    pending: 'Ожидаем подтверждение…', reopen: 'Открыть Telegram',
    returnHere: 'После подтверждения вернитесь в эту вкладку сайта.',
    cancelled: 'Вход отменён', expired: 'Ссылка истекла, попробуйте снова', retry: 'Попробовать снова',
    consumed: 'Ссылка уже использована. Начните вход заново.',
    network: 'Не удалось связаться с сервером. Проверьте соединение и попробуйте снова.',
    backend: 'Сервис входа недоступен. Попробуйте позже.',
    configuration: 'Сервис входа ещё не настроен. Попробуйте позже.',
    storage: 'Не удалось сохранить вход. Разрешите хранение данных сайта и попробуйте снова.',
    home: 'Вернуться на главную', account: 'Личный кабинет', loading: 'Загружаем профиль…',
    firstName: 'Имя', username: 'Имя пользователя', noUsername: 'Не указано', logout: 'Выйти',
  },
  en: {
    title: 'Account Login', description: 'Confirm your login through our Telegram bot to open your account.',
    login: 'Login with Telegram', starting: 'Creating login link…', open: 'Open Telegram and confirm your login',
    pending: 'Waiting for confirmation…', reopen: 'Open Telegram',
    returnHere: 'After confirming, return to this browser tab.',
    cancelled: 'Login cancelled', expired: 'This link has expired. Please try again', retry: 'Try again',
    consumed: 'This link has already been used. Please start a new login.',
    network: 'Could not reach the server. Check your connection and try again.',
    backend: 'Login is unavailable. Please try again later.',
    configuration: 'Login is not configured yet. Please try again later.',
    storage: 'Could not save your login. Allow site storage and try again.',
    home: 'Back to Home', account: 'Your Account', loading: 'Loading your profile…',
    firstName: 'First name', username: 'Username', noUsername: 'Not set', logout: 'Logout',
  },
}

export function authError(error) {
  if (['unknown_challenge', 'expired'].includes(error.code)) return 'expired'
  if (['cancelled', 'consumed', 'network', 'configuration'].includes(error.code)) return error.code
  return 'backend'
}
