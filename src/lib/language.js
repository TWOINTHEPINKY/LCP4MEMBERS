const LANGUAGE_KEY = 'lcp_language'

export function getSavedLanguage() {
  try {
    const language = localStorage.getItem(LANGUAGE_KEY)
    return language === 'en' || language === 'ru' ? language : 'ru'
  } catch {
    return 'ru'
  }
}

export function saveLanguage(language) {
  if (language !== 'ru' && language !== 'en') return
  try {
    localStorage.setItem(LANGUAGE_KEY, language)
  } catch {
    // The current visit can still change language when storage is unavailable.
  }
}
