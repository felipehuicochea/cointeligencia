import { es } from './languages/es';
import { en } from './languages/en';
import * as SecureStore from 'expo-secure-store';

export type Language = 'es' | 'en';

export interface Translations {
  [key: string]: any;
}

const translations: Record<Language, Translations> = {
  es,
  en,
};

class I18nService {
  private currentLanguage: Language = 'es'; // Default to Spanish
  private translations: Translations = es;

  constructor() {
    this.loadLanguage();
  }

  private async loadLanguage() {
    try {
      const savedLanguage = await SecureStore.getItemAsync('app_language');
      if (savedLanguage && (savedLanguage === 'es' || savedLanguage === 'en')) {
        this.setLanguage(savedLanguage as Language);
      }
    } catch (error) {
      console.log('Could not load saved language, using default (Spanish)');
    }
  }

  async setLanguage(language: Language) {
    this.currentLanguage = language;
    this.translations = translations[language];
    
    try {
      await SecureStore.setItemAsync('app_language', language);
    } catch (error) {
      console.log('Could not save language preference');
    }
  }

  getCurrentLanguage(): Language {
    return this.currentLanguage;
  }

  getAvailableLanguages(): { code: Language; name: string }[] {
    return [
      { code: 'es', name: 'Español' },
      { code: 'en', name: 'English' },
    ];
  }

  t(key: string, params?: Record<string, any>): string {
    const keys = key.split('.');
    let value: any = this.translations;

    // Navigate through nested keys
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key; // Return the key if translation not found
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string: ${key}`);
      return key;
    }

    // Replace parameters in the string
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param] !== undefined ? params[param] : match;
      });
    }

    return value;
  }

  // Helper method for common translations
  common(key: string): string {
    return this.t(`common.${key}`);
  }

  // Helper method for login translations
  login(key: string): string {
    return this.t(`login.${key}`);
  }

  // Helper method for dashboard translations
  dashboard(key: string, params?: Record<string, any>): string {
    return this.t(`dashboard.${key}`, params);
  }

  // Helper method for settings translations
  settings(key: string, params?: Record<string, any>): string {
    return this.t(`settings.${key}`, params);
  }

  // Helper method for exchange dialog translations
  exchangeDialog(key: string): string {
    return this.t(`exchangeDialog.${key}`);
  }

  // Helper method for order size dialog translations
  orderSizeDialog(key: string): string {
    return this.t(`orderSizeDialog.${key}`);
  }

  // Helper method for trading translations
  trading(key: string): string {
    return this.t(`trading.${key}`);
  }

  // Helper method for exchange names
  exchange(key: string): string {
    return this.t(`exchanges.${key}`);
  }
}

export const i18n = new I18nService();

// Export a hook for React components
export const useTranslation = () => {
  return {
    t: i18n.t.bind(i18n),
    common: i18n.common.bind(i18n),
    login: i18n.login.bind(i18n),
    dashboard: i18n.dashboard.bind(i18n),
    settings: i18n.settings.bind(i18n),
    exchangeDialog: i18n.exchangeDialog.bind(i18n),
    orderSizeDialog: i18n.orderSizeDialog.bind(i18n),
    trading: i18n.trading.bind(i18n),
    exchange: i18n.exchange.bind(i18n),
    getCurrentLanguage: i18n.getCurrentLanguage.bind(i18n),
    getAvailableLanguages: i18n.getAvailableLanguages.bind(i18n),
    setLanguage: i18n.setLanguage.bind(i18n),
  };
};
