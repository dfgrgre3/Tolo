import { NextRequest, NextResponse } from "next/server";
import { AI_PROVIDERS, getDefaultProvider, validateApiKey } from "@/lib/ai-config";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { analyzeSentiment } from "@/lib/ai/sentiment-analysis";
import { prisma } from '@/lib/db';
import { verifyToken } from "@/lib/auth-service";
import { logger } from '@/lib/logger';
import { 
  parseRequestBody, 
  createStandardErrorResponse, 
  createSuccessResponse,
  addSecurityHeaders 
} from '@/app/api/auth/_helpers';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
  try {
    // Parse request body with timeout protection using standardized helper
    const bodyResult = await parseRequestBody<{
      messages?: any[];
      provider?: string;
      userId?: string;
    }>(req, {
      maxSize: 10240, // 10KB max for chat messages
      required: true,
    });

    if (!bodyResult.success) {
      return bodyResult.error;
    }

    const { messages, provider, userId } = bodyResult.data;
    
    // Try to get userId from token if not provided
    let actualUserId = userId;
    if (!actualUserId) {
      const decodedToken = verifyToken(req);
      if (decodedToken) {
        actualUserId = decodedToken.userId;
      }
    }

    // طھط­ط¯ظٹط¯ ظ…ظ‚ط¯ظ… ط§ظ„ط®ط¯ظ…ط©
    const selectedProvider = provider === 'openai' ? AI_PROVIDERS.OPENAI : AI_PROVIDERS.GEMINI;

    if (!validateApiKey(selectedProvider === AI_PROVIDERS.OPENAI ? 'OPENAI' : 'GEMINI')) {
      const response = NextResponse.json(
        { error: `ظ…ظپطھط§ط­ API ظ„ظ€ ${selectedProvider.name} ط؛ظٹط± ظ…ظ‡ظٹط£`, code: 'API_KEY_MISSING' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }

    if (!messages || !Array.isArray(messages)) {
      const response = NextResponse.json(
        { error: "ط§ظ„ط±ط³ط§ط¦ظ„ ط؛ظٹط± طµط§ظ„ط­ط©", code: 'INVALID_MESSAGES' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Analyze sentiment of the last user message
    let sentiment = null;
    let sentimentAwareContext = "";
    
    if (actualUserId && messages.length > 0) {
      const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
      if (lastUserMessage) {
        try {
          sentiment = await analyzeSentiment(lastUserMessage.content, actualUserId, 'chat');
          
          // Add sentiment-aware context
          if (sentiment.sentiment === 'frustrated' || sentiment.sentiment === 'tired') {
            sentimentAwareContext = `ظ…ظ„ط§ط­ط¸ط© ظ…ظ‡ظ…ط©: ط§ظ„ظ…ط³طھط®ط¯ظ… ظٹط¨ط¯ظˆ ${sentiment.sentiment === 'frustrated' ? 'ظ…ط­ط¨ط·ط§ظ‹' : 'ظ…طھط¹ط¨ط§ظ‹'}. ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† ط£ظƒط«ط± طھظپظ‡ظ…ط§ظ‹ ظˆطھظ‚ط¯ظٹظ… ط¯ط¹ظ… ط¥ط¶ط§ظپظٹ. `;
            if (sentiment.suggestions && sentiment.suggestions.length > 0) {
              sentimentAwareContext += `ط§ظ‚طھط±ط§ط­ط§طھ ط§ظ„ط¯ط¹ظ…: ${sentiment.suggestions.join(', ')}. `;
            }
          }
          
          // Save chat message with sentiment
          await prisma.aiChatMessage.create({
            data: {
              userId: actualUserId,
              role: 'user',
              content: lastUserMessage.content,
              sentiment: sentiment.sentiment,
              metadata: {
                score: sentiment.score,
                confidence: sentiment.confidence,
                emotions: sentiment.emotions
              }
            }
          });
        } catch (error) {
          logger.error('Error analyzing sentiment:', error);
        }
      }
    }

    // ط¥ط¶ط§ظپط© ط±ط³ط§ظ„ط© ط§ظ„ظ†ط¸ط§ظ… ظ„طھط¹ط±ظٹظپ ط´ط®طµظٹط© ط§ظ„ظ…ط³ط§ط¹ط¯ ظ…ط¹ طھط­ظ„ظٹظ„ ط§ظ„ظ…ط´ط§ط¹ط±
    const systemMessage = {
      role: "system",
      content: `${sentimentAwareContext}ط£ظ†طھ ظ…ط³ط§ط¹ط¯ ط°ظƒط§ط، ط§طµط·ظ†ط§ط¹ظٹ ظ…طھط®طµطµ ظپظٹ ط§ظ„طھط¹ظ„ظٹظ… ظˆط§ظ„ط¥ط±ط´ط§ط¯ ط§ظ„ط£ظƒط§ط¯ظٹظ…ظٹ ظ„ظ…ظ†طµط© ط«ظ†ط§ظˆظٹ. ظ…ظ‡ظ…طھظƒ ظ‡ظٹ ظ…ط³ط§ط¹ط¯ط© ط§ظ„ط·ظ„ط§ط¨ ظپظٹ ط¯ط±ط§ط³طھظ‡ظ… ظˆط§ظ„ط¥ط¬ط§ط¨ط© ط¹ظ„ظ‰ ط£ط³ط¦ظ„طھظ‡ظ… ط¨ط·ط±ظٹظ‚ط© ظˆط§ط¶ط­ط© ظˆظ…ظپظٹط¯ط©. ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† ط¥ط¬ط§ط¨ط§طھظƒ ط¯ظ‚ظٹظ‚ط© ظˆظ…طھظ†ط§ط³ط¨ط© ظ…ط¹ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„طھط¹ظ„ظٹظ…ظٹ ظ„ظ„ط·ط§ظ„ط¨. ط¥ط°ط§ ظ„ظ… طھظƒظ† ظ…طھط£ظƒط¯ط§ظ‹ ظ…ظ† ط¥ط¬ط§ط¨ط© ط³ط¤ط§ظ„ ظ…ط§طŒ ظپظ…ظ† ط§ظ„ط£ظپط¶ظ„ ط£ظ† طھط¹طھط±ظپ ط¨ط°ظ„ظƒ ط¨ط¯ظ„ط§ظ‹ ظ…ظ† طھظ‚ط¯ظٹظ… ظ…ط¹ظ„ظˆظ…ط§طھ ط®ط§ط·ط¦ط©. ظƒظ† ط¯ط§ط¦ظ…ط§ظ‹ ط¯ط§ط¹ظ…ط§ظ‹ ظˆظ…ط´ط¬ط¹ط§ظ‹طŒ ط®ط§طµط© ط¥ط°ط§ ظƒط§ظ† ط§ظ„ظ…ط³طھط®ط¯ظ… ظٹط¨ط¯ظˆ ظ…ط­ط¨ط·ط§ظ‹ ط£ظˆ ظ…طھط¹ط¨ط§ظ‹.`
    };

    let aiMessage = "";

    if (selectedProvider === AI_PROVIDERS.OPENAI) {
      // ط§ط³طھط®ط¯ط§ظ… OpenAI API
      const response = await fetch(selectedProvider.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${selectedProvider.apiKey}`
        },
        body: JSON.stringify({
          model: selectedProvider.model,
          messages: [systemMessage, ...messages],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error("Error from OpenAI:", errorData);
        const errorResponse = NextResponse.json({
          message: "ط¹ط°ط±ط§ظ‹طŒ ظٹظˆط§ط¬ظ‡ ط§ظ„ظ…ط³ط§ط¹ط¯ ط§ظ„ط°ظƒظٹ ط¨ط¹ط¶ ط§ظ„طµط¹ظˆط¨ط§طھ ط§ظ„طھظ‚ظ†ظٹط© ط­ط§ظ„ظٹط§ظ‹. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹ ط£ظˆ ط§ظ„طھظˆط§طµظ„ ظ…ط¹ ظپط±ظٹظ‚ ط§ظ„ط¯ط¹ظ….",
          code: 'AI_SERVICE_ERROR'
        }, { status: 500 });
        return addSecurityHeaders(errorResponse);
      }

      const data = await response.json();
      aiMessage = data.choices[0].message.content;
    } else {
      // ط§ط³طھط®ط¯ط§ظ… Google Gemini API
      const geminiMessages = [
        systemMessage,
        ...messages
      ].map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));

      const response = await fetch(`${selectedProvider.baseUrl}${selectedProvider.model}:generateContent?key=${selectedProvider.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000,
          },
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error("Error from Gemini:", errorData);
        const errorResponse = NextResponse.json({
          message: "ط¹ط°ط±ط§ظ‹طŒ ظٹظˆط§ط¬ظ‡ ط§ظ„ظ…ط³ط§ط¹ط¯ ط§ظ„ط°ظƒظٹ ط¨ط¹ط¶ ط§ظ„طµط¹ظˆط¨ط§طھ ط§ظ„طھظ‚ظ†ظٹط© ط­ط§ظ„ظٹط§ظ‹. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹ ط£ظˆ ط§ظ„طھظˆط§طµظ„ ظ…ط¹ ظپط±ظٹظ‚ ط§ظ„ط¯ط¹ظ….",
          code: 'AI_SERVICE_ERROR'
        }, { status: 500 });
        return addSecurityHeaders(errorResponse);
      }

      const data = await response.json();
      aiMessage = data.candidates[0].content.parts[0].text;
    }

    // Save assistant message if userId exists
    if (actualUserId) {
      await prisma.aiChatMessage.create({
        data: {
          userId: actualUserId,
          role: 'assistant',
          content: aiMessage,
          metadata: {
            provider: selectedProvider.name,
            sentiment: sentiment?.sentiment || null
          }
        }
      });
    }

    return createSuccessResponse({ 
      message: aiMessage,
      sentiment: sentiment ? {
        sentiment: sentiment.sentiment,
        score: sentiment.score,
        suggestions: sentiment.suggestions
      } : null
    });
  } catch (error) {
    logger.error("Error in AI chat API:", error);
    return createStandardErrorResponse(
      error,
      "ط­ط¯ط« ط®ط·ط£ ظپظٹ ظ…ط¹ط§ظ„ط¬ط© ط·ظ„ط¨ظƒ"
    );
  }
  });
}