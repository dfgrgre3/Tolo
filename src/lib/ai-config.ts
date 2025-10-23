// تكوين مقدمي خدمات الذكاء الاصطناعي
export const AI_PROVIDERS = {
  OPENAI: {
    name: 'OpenAI',
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4',
  },
  GEMINI: {
    name: 'Google Gemini',
    apiKey: process.env.GEMINI_API_KEY,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',
    model: 'gemini-2.0-flash',
    version: '2.0'
  }
};

// الحصول على موفر الذكاء الاصطناعي الافتراضي
export const getDefaultProvider = () => {
  // استخدام Gemini 2.0 Flash كخيار افتراضي للموقع بأكمله
  return AI_PROVIDERS.GEMINI;
};

// دالة مساعدة للتحقق من صحة مفتاح API
export const validateApiKey = (provider: keyof typeof AI_PROVIDERS) => {
  const apiKey = AI_PROVIDERS[provider].apiKey;
  return apiKey && apiKey !== '';
};

// دالة للحصول على معلومات عن موفر Gemini
export const getGeminiInfo = () => {
  return {
    name: AI_PROVIDERS.GEMINI.name,
    model: AI_PROVIDERS.GEMINI.model,
    version: AI_PROVIDERS.GEMINI.version,
    description: 'Gemini 2.0 Flash هو أحدث نموذج لغوي من جوجل يتميز بسرعة الاستجابة العالية وقدرات متقدمة في فهم اللغة الطبيعية وتوليد النصوص.'
  };
};