const SUPPORTED_LANGUAGES = new Set(['en', 'cn'])

// 只根据浏览器 locale 推断默认语言，项目不处理时区。
export function detectDefaultLanguage(browser = navigator) {
    const languages = [browser?.language, ...(browser?.languages || [])]
        .filter(Boolean)
        .map((language) => String(language).replace(/_/g, '-'))
    const regions = languages
        .map((language) => language.match(/-([A-Z]{2})(?:-|$)/i)?.[1])
        .filter(Boolean)
        .map((region) => region.toUpperCase())
    if (regions.includes('CN')) return 'cn'
    if (regions.length) return 'en'
    return languages.some((language) => language.toLowerCase().startsWith('zh'))
        ? 'cn'
        : 'en'
}

export function isSupportedLanguage(language) {
    return SUPPORTED_LANGUAGES.has(language)
}

export function getInitialLanguage() {
    const storedLanguage = localStorage.getItem('language')
    return isSupportedLanguage(storedLanguage)
        ? storedLanguage
        : detectDefaultLanguage()
}

export function saveLanguagePreference(language) {
    if (isSupportedLanguage(language)) localStorage.setItem('language', language)
}

export function updateDocumentLanguage(language) {
    document.documentElement.lang = language === 'cn' ? 'zh-CN' : 'en'
}