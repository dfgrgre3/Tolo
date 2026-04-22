import { AI_PROVIDERS, getDefaultProvider, isOpenAICompatible, AIProvider } from '@/lib/ai-config';
import { logger } from '@/lib/logger';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIRequestOptions {
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  systemMessage?: string;
  messages?: AIMessage[];
}

export class AIService {
  /**
   * General call to AI providers
   */
  static async call(promptOrMessages: string | AIMessage[], options: AIRequestOptions = {}): Promise<string> {
    const selectedProvider = options.provider 
      ? AI_PROVIDERS[options.provider.toUpperCase()] || getDefaultProvider()
      : getDefaultProvider();

    const messages: AIMessage[] = Array.isArray(promptOrMessages) 
      ? promptOrMessages 
      : [{ role: 'user', content: promptOrMessages }];

    if (isOpenAICompatible(selectedProvider.name)) {
      return this.callOpenAICompatible(messages, selectedProvider, options);
    } else {
      return this.callGemini(messages, selectedProvider, options);
    }
  }

  /**
   * Call OpenAI or OpenRouter (OpenAI compatible)
   */
  private static async callOpenAICompatible(
    messages: AIMessage[], 
    provider: AIProvider, 
    options: AIRequestOptions
  ): Promise<string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${provider.apiKey}`
    };

    if (provider.name === 'OpenRouter') {
      headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_SITE_URL || "https://tolo.education";
      headers["X-Title"] = "Tolo Education";
    }

    const payloadMessages = [];
    if (options.systemMessage) {
      payloadMessages.push({ role: "system", content: options.systemMessage });
    }
    
    // Add history messages
    payloadMessages.push(...messages);

    const body: any = {
      model: provider.model,
      messages: payloadMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1000,
    };

    if (options.responseFormat === 'json') {
      body.response_format = { type: "json_object" };
    }

    try {
      const response = await fetch(provider.baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error(`Error from ${provider.name}:`, errorData);
        // If it's a 4xx/5xx from OpenRouter, throw with details
        const details = errorData.error?.message || errorData.message || response.statusText;
        throw new Error(`AI Service Error (${provider.name}): ${details}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        logger.error(`Invalid response from ${provider.name}:`, data);
        throw new Error(`Invalid response from ${provider.name}`);
      }

      return data.choices[0].message.content;
    } catch (error) {
      logger.error(`Failed to call ${provider.name}:`, error);
      throw error;
    }
  }

  /**
   * Call Google Gemini API
   */
  private static async callGemini(
    messages: AIMessage[], 
    provider: AIProvider, 
    options: AIRequestOptions
  ): Promise<string> {
    const contents = [];
    
    // If there's a system message, we can't easily put it in 'contents' for Gemini v1beta model call
    // unless we use systemInstruction field (available in newer SDKs/endpoints)
    // For this implementation, we prepend it as a user message or use it as is if provided.
    
    if (options.systemMessage) {
      contents.push({
        role: "user",
        parts: [{ text: `System Instruction: ${options.systemMessage}` }]
      });
      contents.push({
        role: "model",
        parts: [{ text: "Understood. I will follow those instructions." }]
      });
    }

    // Convert messages to Gemini format
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    const body: any = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 1000,
        responseMimeType: options.responseFormat === 'json' ? "application/json" : "text/plain",
      }
    };

    try {
      const response = await fetch(`${provider.baseUrl}${provider.model}:generateContent?key=${provider.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error(`Error from Gemini:`, errorData);
        const details = errorData.error?.message || response.statusText;
        throw new Error(`AI Service Error (Gemini): ${details}`);
      }

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        logger.error(`Invalid response from Gemini:`, data);
        throw new Error(`Invalid response from Gemini`);
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      logger.error(`Failed to call Gemini:`, error);
      throw error;
    }
  }
}
