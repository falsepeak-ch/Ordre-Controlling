import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ca from './locales/ca.json';
import es from './locales/es.json';
import en from './locales/en.json';

export const SUPPORTED_LOCALES = [
  { code: 'ca', label: 'Català' },
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code'];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ca: { translation: ca },
      es: { translation: es },
      en: { translation: en },
    },
    fallbackLng: 'ca',
    supportedLngs: ['ca', 'es', 'en'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'ordre.locale',
      caches: ['localStorage'],
    },
    returnNull: false,
  });

function syncDocumentLang(lng: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', lng);
  }
}

i18n.on('languageChanged', syncDocumentLang);
if (i18n.resolvedLanguage) syncDocumentLang(i18n.resolvedLanguage);

export function setLocale(code: LocaleCode): void {
  void i18n.changeLanguage(code);
}

export default i18n;
