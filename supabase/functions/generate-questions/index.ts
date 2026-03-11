import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-QUESTIONS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');
    if (!apiKey || !baseUrl) throw new Error("OnSpace AI not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) throw new Error("User not authenticated");

    const { examType, section, difficulty, count = 5, weakTopics = [] } = await req.json();
    logStep("Request params", { examType, section, difficulty, count });

    const examNames: Record<string, string> = {
      step: "STEP English Test",
      ielts: "IELTS Academic",
      psychometric: "Psychometric Test"
    };

    const difficultyMap: Record<string, string> = {
      beginner: "easy (basic concepts, straightforward questions)",
      intermediate: "medium (requires understanding and application)",
      advanced: "hard (complex scenarios, multi-step reasoning)",
      expert: "very hard (tricky, requires deep mastery)"
    };

    const sectionContext = section ? `Focus on the "${section}" section.` : "Mix questions from different sections.";
    const weakContext = weakTopics.length > 0
      ? `The student is weak in these topics: ${weakTopics.join(", ")}. Generate questions that help them practice these areas.`
      : "";

    const prompt = `You are an expert ${examNames[examType] || examType} exam question writer for Saudi high school students.

Generate exactly ${count} multiple-choice questions for the ${examNames[examType] || examType}.
${sectionContext}
Difficulty level: ${difficultyMap[difficulty] || "medium"}
${weakContext}

CRITICAL RULES:
- Each question MUST have exactly 4 options (A, B, C, D)
- Only ONE correct answer per question
- Questions must be realistic exam-style
- For STEP/IELTS: questions in English
- For Psychometric: math/logic questions can use numbers, Arabic context is fine
- Explanations should be clear and educational, in Arabic
- Each question must have a specific topic tag

Return ONLY valid JSON array with this exact structure (no markdown, no extra text):
[
  {
    "question_text": "The question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0,
    "explanation": "شرح تفصيلي بالعربي لماذا هذه الإجابة صحيحة",
    "topic": "Topic Name in English",
    "topic_ar": "اسم الموضوع بالعربي",
    "section": "${section || 'General'}",
    "section_ar": "القسم بالعربي",
    "difficulty": "${difficulty || 'intermediate'}"
  }
]`;

    logStep("Calling OnSpace AI");

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert exam question generator. Always return valid JSON arrays only, no markdown formatting, no code blocks.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} - ${errText}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content ?? '';
    logStep("AI response received", { length: content.length });

    // Clean up response - remove markdown code blocks if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let questions;
    try {
      questions = JSON.parse(content);
    } catch {
      // Try to extract JSON array from the response
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        questions = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("AI returned empty or invalid questions");
    }

    // Validate and sanitize each question
    const validated = questions.map((q: any, i: number) => ({
      question_text: q.question_text || `Question ${i + 1}`,
      options: Array.isArray(q.options) && q.options.length === 4
        ? q.options
        : ["Option A", "Option B", "Option C", "Option D"],
      correct_answer: typeof q.correct_answer === 'number' && q.correct_answer >= 0 && q.correct_answer <= 3
        ? q.correct_answer
        : 0,
      explanation: q.explanation || "لا يوجد شرح",
      topic: q.topic || "General",
      topic_ar: q.topic_ar || "عام",
      section: q.section || section || "General",
      section_ar: q.section_ar || "عام",
      difficulty: q.difficulty || difficulty || "intermediate",
      exam_type: examType,
    }));

    logStep("Questions validated", { count: validated.length });

    return new Response(JSON.stringify({ questions: validated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
