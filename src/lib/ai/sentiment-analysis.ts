import { AI_PROVIDERS, getDefaultProvider } from '@/lib/ai-config';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'frustrated' | 'tired';
  score: number; // -1.0 to 1.0
  confidence: number; // 0.0 to 1.0
  emotions?: {
    frustration?: number;
    fatigue?: number;
    stress?: number;
    motivation?: number;
    confidence?: number;
  };
  detectedIssues?: string[];
  suggestions?: string[];
}

/**
 * Analyze sentiment of user text using AI
 */
export async function analyzeSentiment(
  text: string,
  userId?: string,
  context?: string
): Promise<SentimentResult> {
  const provider = getDefaultProvider();
  
  if (!provider.apiKey) {
    // Fallback to simple keyword-based analysis
    return simpleSentimentAnalysis(text);
  }

  try {
    const prompt = `تحليل المشاعر والحالة العاطفية للنص التالي بالعربية. يجب أن تحدد:
1. المشاعر الأساسية: إيجابي، سلبي، محايد، محبط، متعب
2. درجة المشاعر من -1.0 (سلبي جداً) إلى 1.0 (إيجابي جداً)
3. مستوى الثقة في التحليل من 0.0 إلى 1.0
4. المشاعر المكتشفة: إحباط، تعب، توتر، حافز، ثقة (كل منها من 0.0 إلى 1.0)
5. المشاكل المكتشفة (إن وجدت)
6. اقتراحات للدعم (إن كان هناك مشاعر سلبية)

النص: "${text}"

أجب بصيغة JSON فقط بهذا الشكل:
{
  "sentiment": "positive|negative|neutral|frustrated|tired",
  "score": -1.0 to 1.0,
  "confidence": 0.0 to 1.0,
  "emotions": {
    "frustration": 0.0 to 1.0,
    "fatigue": 0.0 to 1.0,
    "stress": 0.0 to 1.0,
    "motivation": 0.0 to 1.0,
    "confidence": 0.0 to 1.0
  },
  "detectedIssues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

    let result: SentimentResult;

    if (provider === AI_PROVIDERS.OPENAI) {
      const response = await fetch(provider.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            {
              role: 'system',
              content: 'أنت متخصص في تحليل المشاعر والعواطف. يجب أن تجيب بصيغة JSON فقط.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze sentiment');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      result = parseSentimentResponse(content);
    } else {
      // Gemini
      const response = await fetch(
        `${provider.baseUrl}${provider.model}:generateContent?key=${provider.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 500,
            },
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to analyze sentiment');
      }

      const data = await response.json();
      const content = data.candidates[0].content.parts[0].text;
      result = parseSentimentResponse(content);
    }

    // Save to database if userId provided
    if (userId) {
      await prisma.sentimentAnalysis.create({
        data: {
          userId,
          text,
          sentiment: result.sentiment,
          score: result.score,
          confidence: result.confidence,
          emotions: result.emotions || {},
          context: context || 'chat'
        }
      });
    }

    return result;
  } catch (error) {
    logger.error('Error analyzing sentiment:', error);
    // Fallback to simple analysis
    return simpleSentimentAnalysis(text);
  }
}

/**
 * Simple keyword-based sentiment analysis as fallback
 */
function simpleSentimentAnalysis(text: string): SentimentResult {
  const lowerText = text.toLowerCase();
  
  // Negative keywords
  const negativeKeywords = ['صعب', 'مستحيل', 'مش', 'لا', 'مشكلة', 'فشل', 'خطأ', 'محتاج', 'محتاج مساعدة'];
  const frustratedKeywords = ['محتاج', 'مش فاهم', 'مش عارف', 'مش عارف أعمل إيه', 'مش عارف', 'محتاج مساعدة'];
  const tiredKeywords = ['متعب', 'تعبان', 'مش قادر', 'مش هقدر', 'مش عايز', 'مش عايز أدرس'];
  
  // Positive keywords
  const positiveKeywords = ['تمام', 'ممتاز', 'رائع', 'شكراً', 'شكرا', 'تمام', 'حلو', 'زي الفل'];
  
  let score = 0;
  let sentiment: SentimentResult['sentiment'] = 'neutral';
  
  // Check for frustration
  if (frustratedKeywords.some(kw => lowerText.includes(kw))) {
    sentiment = 'frustrated';
    score = -0.6;
  }
  // Check for tiredness
  else if (tiredKeywords.some(kw => lowerText.includes(kw))) {
    sentiment = 'tired';
    score = -0.5;
  }
  // Check for negative
  else if (negativeKeywords.some(kw => lowerText.includes(kw))) {
    sentiment = 'negative';
    score = -0.4;
  }
  // Check for positive
  else if (positiveKeywords.some(kw => lowerText.includes(kw))) {
    sentiment = 'positive';
    score = 0.6;
  }
  
  return {
    sentiment,
    score,
    confidence: 0.5, // Lower confidence for simple analysis
    emotions: {
      frustration: sentiment === 'frustrated' ? 0.7 : 0,
      fatigue: sentiment === 'tired' ? 0.7 : 0,
      stress: sentiment === 'negative' || sentiment === 'frustrated' ? 0.5 : 0,
      motivation: sentiment === 'positive' ? 0.7 : 0.3,
      confidence: sentiment === 'positive' ? 0.6 : 0.4
    }
  };
}

/**
 * Parse AI response to extract sentiment data
 */
function parseSentimentResponse(content: string): SentimentResult {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    const parsed = JSON.parse(jsonStr);
    
    return {
      sentiment: parsed.sentiment || 'neutral',
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      emotions: parsed.emotions || {},
      detectedIssues: parsed.detectedIssues || [],
      suggestions: parsed.suggestions || []
    };
  } catch (error) {
    logger.error('Error parsing sentiment response:', error);
    return simpleSentimentAnalysis(content);
  }
}

/**
 * Get user's recent sentiment trends
 */
export async function getUserSentimentTrends(userId: string, days: number = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const analyses = await prisma.sentimentAnalysis.findMany({
    where: {
      userId,
      createdAt: {
        gte: since
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  if (analyses.length === 0) {
    return {
      averageScore: 0,
      dominantSentiment: 'neutral' as const,
      trends: []
    };
  }
  
  const averageScore = analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length;
  
  const sentimentCounts: Record<string, number> = {};
  analyses.forEach(a => {
    sentimentCounts[a.sentiment] = (sentimentCounts[a.sentiment] || 0) + 1;
  });
  
  const dominantSentiment = Object.entries(sentimentCounts)
    .sort((a, b) => b[1] - a[1])[0][0] as SentimentResult['sentiment'];
  
  return {
    averageScore,
    dominantSentiment,
    trends: analyses.map(a => ({
      date: a.createdAt,
      sentiment: a.sentiment,
      score: a.score
    }))
  };
}

