import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { questionText, options, correctAnswer, userAnswer, examType } = await req.json();

    const isCorrect = userAnswer === correctAnswer;
    const correctOption = options[correctAnswer];
    const userOption = options[userAnswer];

    const prompt = `أنت مدرس خبير في اختبار ${examType === 'step' ? 'STEP' : examType === 'ielts' ? 'IELTS' : 'السيكومتري'}.

السؤال: ${questionText}

الخيارات:
${options.map((o: string, i: number) => `${i === correctAnswer ? '✅' : i === userAnswer ? '❌' : '  '} ${String.fromCharCode(65 + i)}) ${o}`).join('\n')}

الإجابة الصحيحة: ${String.fromCharCode(65 + correctAnswer)}) ${correctOption}
${!isCorrect ? `إجابة الطالب: ${String.fromCharCode(65 + userAnswer)}) ${userOption}` : 'الطالب أجاب بشكل صحيح!'}

قدم شرحاً تعليمياً مفصلاً بالعربية يتضمن:
1. لماذا الإجابة الصحيحة هي الصحيحة (شرح القاعدة أو المفهوم)
2. ${!isCorrect ? 'لماذا إجابة الطالب خاطئة وما الخطأ الشائع' : 'نصيحة لتعزيز الفهم'}
3. نصيحة سريعة للتذكر
4. مثال إضافي بسيط

اجعل الشرح مختصراً ومفيداً (لا يتجاوز 200 كلمة).`;

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'أنت مدرس ذكي ودود يشرح بوضوح وبساطة للطلاب السعوديين. اكتب بالعربية فقط.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI error: ${aiResponse.status} - ${errText}`);
    }

    const aiData = await aiResponse.json();
    const explanation = aiData.choices?.[0]?.message?.content ?? 'لا يوجد شرح متاح';

    return new Response(JSON.stringify({ explanation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
