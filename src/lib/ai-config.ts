export interface AIProvider {
  name: string;
  apiKey: string | undefined;
  baseUrl: string;
  model: string;
  version?: string;
}

// تكوين مقدمي خدمات الذكاء الاصطناعي
export const AI_PROVIDERS: Record<string, AIProvider> = {
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
  },
  OPENROUTER: {
    name: 'OpenRouter',
    apiKey: process.env.OPENROUTER_API_KEY,
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'qwen/qwen3.6-plus:free',
  }
};

// الحصول على موفر الذكاء الاصطناعي الافتراضي
export const getDefaultProvider = () => {
  // استخدام OpenRouter كخيار افتراضي (Qwen)
  return AI_PROVIDERS.OPENROUTER;
};

// دالة مساعدة للتحقق من صحة مفتاح API
export const validateApiKey = (providerKey: string) => {
  const provider = AI_PROVIDERS[providerKey as keyof typeof AI_PROVIDERS];
  if (!provider) return false;
  const apiKey = provider.apiKey;
  return apiKey && apiKey !== '';
};

// دالة لمعرفة ما إذا كان الموفر يستخدم بروتوكول OpenAI (OpenAI, OpenRouter, etc.)
export const isOpenAICompatible = (providerName: string) => {
  return providerName === 'OpenAI' || providerName === 'OpenRouter';
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

