import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { AI_PROVIDERS, validateApiKey } from "@/lib/ai-config";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const body = await req.json();
        const { subjectId, year, lesson, difficulty, questionCount, provider } = body;

        if (!subjectId || !year || !lesson) {
          return badRequestResponse("«·—Ã«¡  Ê›Ì— «·„«œ… Ê«·”‰… «·œ—«”Ì… Ê«·œ—”");
        }

        const numQuestions = questionCount || 10;
        const selectedProvider = provider === "openai" ? AI_PROVIDERS.OPENAI : AI_PROVIDERS.GEMINI;

        if (!validateApiKey(selectedProvider === AI_PROVIDERS.OPENAI ? "OPENAI" : "GEMINI")) {
          return badRequestResponse(`„› «Õ API ·‹ ${selectedProvider.name} €Ì— „ÂÌ√`);
        }

        const systemPrompt = `√‰  „”«⁄œ –ﬂ«¡ «’ÿ‰«⁄Ì „ Œ’’ ›Ì ≈‰‘«¡ «·«„ Õ«‰«  «· ⁄·Ì„Ì… ·„‰’…  Ê·Ê.
„Â„ ﬂ ÂÌ ≈‰‘«¡ «„ Õ«‰ ·„«œ… „⁄—›Â« ${subjectId} ··”‰… «·œ—«”Ì… ${year}° „⁄ «· —ﬂÌ“ ⁄·Ï œ—” ${lesson}.
${difficulty ? `„” ÊÏ «·’⁄Ê»…: ${difficulty}` : ""}
ﬁ„ »≈‰‘«¡ ${numQuestions} √”∆·… „ ‰Ê⁄… («Œ Ì«— „‰ „ ⁄œœ° ’Õ √Ê Œÿ√° ≈Ã«»«  ﬁ’Ì—…).
·ﬂ· ”ƒ«·° ﬁ„ » Ê›Ì—:
1. ‰’ «·”ƒ«·
2. «·ŒÌ«—«  (·√”∆·… «·«Œ Ì«— „‰ „ ⁄œœ)
3. «·≈Ã«»… «·’ÕÌÕ…
4. ‘—Õ „ÊÃ“ ··≈Ã«»…

ÌÃ» √‰  ﬂÊ‰ «·√”∆·… „‰«”»… ··„” ÊÏ «·œ—«”Ì Ê €ÿÌ «·„›«ÂÌ„ «·—∆Ì”Ì… ··œ—” «·„Õœœ.
ﬁ„ » ‰ŸÌ„ «·≈Ã«»… ﬂ‹ JSON „⁄ «·„’›Ê›«  «· «·Ì…:
{
  "questions": [
    {
      "question": "‰’ «·”ƒ«·",
      "type": "multiple_choice|true_false|short_answer",
      "options": ["ŒÌ«— 1", "ŒÌ«— 2", "ŒÌ«— 3", "ŒÌ«— 4"],
      "correctAnswer": "«·≈Ã«»… «·’ÕÌÕ…",
      "explanation": "‘—Õ „ÊÃ“ ··≈Ã«»…"
    }
  ]
}`;

        let examContent = "";

        if (selectedProvider === AI_PROVIDERS.OPENAI) {
          const response = await fetch(selectedProvider.baseUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${selectedProvider.apiKey}`,
            },
            body: JSON.stringify({
              model: selectedProvider.model,
              messages: [{ role: "system", content: systemPrompt }],
              temperature: 0.7,
              max_tokens: 4000,
            }),
          });

          if (!response.ok) {
            throw new Error("›‘· «·« ’«· »‹ OpenAI");
          }

          const data = await response.json();
          examContent = data.choices?.[0]?.message?.content ?? "";
        } else {
          const response = await fetch(`${selectedProvider.baseUrl}${selectedProvider.model}:generateContent?key=${selectedProvider.apiKey}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: systemPrompt }],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 4000,
              },
            }),
          });

          if (!response.ok) {
            throw new Error("›‘· «·« ’«· »‹ Gemini");
          }

          const data = await response.json();
          examContent = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        }

        try {
          const jsonMatch = examContent.match(/\{[\s\S]*\}/);
          const cleanJson = jsonMatch ? jsonMatch[0] : examContent;
          const examData = JSON.parse(cleanJson);

          await prisma.aiGeneratedContent.create({
            data: {
              userId: authUser.userId,
              type: "EXAM",
              title: `«„ Õ«‰ –ﬂ«¡ «’ÿ‰«⁄Ì: ${lesson}`,
              subjectId,
              content: cleanJson,
              metadata: JSON.stringify({ provider: selectedProvider.name, difficulty, year }),
            },
          });

          return successResponse({
            questions: examData.questions,
            provider: selectedProvider.name,
          });
        } catch {
          return successResponse({
            examContent,
            provider: selectedProvider.name,
            warning: "›‘·  Õ·Ì· JSON°  „ ≈—Ã«⁄ «·„Õ ÊÏ «·Œ«„",
          });
        }
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
