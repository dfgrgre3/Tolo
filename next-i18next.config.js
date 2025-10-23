/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    defaultLocale: 'ar',
    locales: ['ar', 'en'],
    localeDetection: true,
  },
  reloadOnPrerender: process.env.NODE_ENV === 'development',
  serializeConfig: false,
  use: [
    require('i18next').init({
      lng: 'ar',
      fallbackLng: 'ar',
      debug: process.env.NODE_ENV === 'development',

      interpolation: {
        escapeValue: false, // React already escapes values
      },

      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
      },

      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
        lookupLocalStorage: 'i18nextLng',
      },

      react: {
        useSuspense: false,
      },
    }),
  ],
};
