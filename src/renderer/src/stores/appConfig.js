import { defineStore } from 'pinia';

import {
    getInitialLanguage,
    isSupportedLanguage,
    saveLanguagePreference,
    updateDocumentLanguage
} from '@/js/language';

const STORAGE_KEY = 'powerhub.appConfig.v1';
const THEME_OPTIONS = ['light', 'dark'];
const DENSITY_OPTIONS = ['comfortable', 'compact'];

export const defaultAppConfig = Object.freeze({
    appName: 'PowerHub',
    theme: 'light',
    language: 'cn',
    density: 'comfortable',
    sidebarCollapsed: false,
    requestTimeout: 30000,
    followRedirects: true,
    verifySSL: true,
    autoRefreshInterval: 15,
    saveRunHistory: true,
    historyRetention: 30,
    desktopNotifications: true,
    defaultHeaders: [
        {
            id: 'header-accept',
            key: 'Accept',
            value: 'application/json',
            enabled: true
        }
    ]
});

const cloneDefaultConfig = () => ({
    ...JSON.parse(JSON.stringify(defaultAppConfig)),
    language: getInitialLanguage()
});

const normalizeConfig = (config = {}) => {
    const defaults = cloneDefaultConfig();
    const source = config && typeof config === 'object' ? config : {};
    const language = isSupportedLanguage(source.language)
        ? source.language
        : defaults.language;
    const theme = THEME_OPTIONS.includes(source.theme)
        ? source.theme
        : defaults.theme;
    const density = DENSITY_OPTIONS.includes(source.density)
        ? source.density
        : defaults.density;
    const timeout = Number(source.requestTimeout);

    return {
        ...defaults,
        ...source,
        appName:
            typeof source.appName === 'string' && source.appName.trim()
                ? source.appName.trim()
                : defaults.appName,
        theme,
        language,
        density,
        sidebarCollapsed: Boolean(source.sidebarCollapsed),
        requestTimeout: Number.isFinite(timeout)
            ? Math.min(Math.max(timeout, 1000), 300000)
            : defaults.requestTimeout,
        followRedirects: source.followRedirects !== false,
        verifySSL: source.verifySSL !== false,
        autoRefreshInterval: Math.min(
            Math.max(
                Number(source.autoRefreshInterval) ||
                    defaults.autoRefreshInterval,
                5
            ),
            3600
        ),
        saveRunHistory: source.saveRunHistory !== false,
        historyRetention: Math.min(
            Math.max(
                Number(source.historyRetention) || defaults.historyRetention,
                1
            ),
            3650
        ),
        desktopNotifications: source.desktopNotifications !== false,
        defaultHeaders: Array.isArray(source.defaultHeaders)
            ? source.defaultHeaders
            : defaults.defaultHeaders
    };
};

const readStoredConfig = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return cloneDefaultConfig();
        return normalizeConfig(JSON.parse(raw));
    } catch {
        return cloneDefaultConfig();
    }
};

const persistConfig = (config) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
        // Ignore storage failures in private mode or restricted renderer contexts.
    }
};

export const useAppConfigStore = defineStore('appConfig', {
    state: () => ({
        config: readStoredConfig(),
        initialized: false,
        i18n: {}
    }),
    getters: {
        appName: (state) => state.config.appName,
        resolvedTheme: (state) => state.config.theme,
        appLanguage: (state) =>
            state.config.language === 'cn' ? 'cn' : 'en',
        isDark: (state) => state.config.theme === 'dark',
        local: (state) => (text) => {
            const entry = state.i18n[text];
            if (!entry) return text;
            const language = isSupportedLanguage(state.config.language)
                ? state.config.language
                : 'en';
            return entry[language] ?? entry.en ?? text;
        },
        formatDate: (state) => (value) => {
            if (!value) return '-';
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return '-';
            return new Intl.DateTimeFormat(
                state.config.language === 'cn' ? 'zh-CN' : 'en-US',
                {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                }
            ).format(date);
        }
    },
    actions: {
        applyDocumentConfig() {
            if (typeof document === 'undefined') return;
            document.documentElement.lang =
                this.config.language === 'cn' ? 'zh-CN' : 'en';
            document.documentElement.dataset.theme = this.config.theme;
            document.documentElement.dataset.density = this.config.density;
            document.documentElement.style.colorScheme = this.config.theme;
            document.title = `${this.config.appName} · API Scheduler`;
        },
        initialize() {
            if (this.initialized) return;
            this.config = readStoredConfig();
            this.applyDocumentConfig();
            updateDocumentLanguage(this.config.language);
            persistConfig(this.config);
            saveLanguagePreference(this.config.language);
            this.initialized = true;
        },
        updateConfig(patch = {}) {
            this.config = normalizeConfig({ ...this.config, ...patch });
            this.applyDocumentConfig();
            persistConfig(this.config);
            saveLanguagePreference(this.config.language);
        },
        reviseConfig(patch = {}) {
            this.updateConfig(patch);
        },
        reviseI18N(i18nData) {
            this.i18n = i18nData || {};
        },
        setTheme(theme) {
            this.updateConfig({
                theme: THEME_OPTIONS.includes(theme) ? theme : 'light'
            });
        },
        toggleTheme() {
            this.setTheme(this.config.theme === 'dark' ? 'light' : 'dark');
        },
        setLanguage(language) {
            this.updateConfig({
                language: isSupportedLanguage(language) ? language : 'cn'
            });
        },
        setSidebarCollapsed(collapsed) {
            this.updateConfig({ sidebarCollapsed: Boolean(collapsed) });
        },
        resetConfig() {
            this.config = cloneDefaultConfig();
            this.applyDocumentConfig();
            persistConfig(this.config);
            saveLanguagePreference(this.config.language);
        }
    }
});
