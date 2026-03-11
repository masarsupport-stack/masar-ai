import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, conversationHistory } = await req.json();
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user profile for personalized support
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('name_ar, email, ai_score, streak, total_sessions, diagnostic_completed')
      .eq('id', user.id)
      .single();

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userName = profile?.name_ar || user.email?.split('@')[0] || 'المستخدم';
    const userContext = profile
      ? `اسم المستخدم: ${userName}, النقاط: ${profile.ai_score}, السلسلة: ${profile.streak} يوم, الجلسات: ${profile.total_sessions}, أكمل التشخيص: ${profile.diagnostic_completed ? 'نعم' : 'لا'}`
      : '';

    const systemPrompt = `أنت "مساعد مسار" — سكرتير ذكي ودعم فني لتطبيق مسار AI للتحضير للاختبارات (STEP, IELTS, السيكومتري).

مهامك:
1. الرد على الاستفسارات حول التطبيق وكيفية استخدامه
2. المساعدة في حل المشاكل التقنية (تسجيل الدخول، الاشتراك، الدفع)
3. تقديم نصائح دراسية مخصصة
4. استقبال الشكاوى والاقتراحات بشكل لطيف ومهني
5. شرح المزايا المختلفة (الاختبار التشخيصي، الخطة اليومية، الأسئلة الذكية)

معلومات المستخدم الحالي: ${userContext}

قواعد:
- تحدث بالعربية دائماً
- كن ودوداً ومحترفاً
- إذا كانت المشكلة تحتاج تدخل بشري، اطلب من المستخدم التواصل عبر: support@masarai.app
- لا تشارك معلومات شخصية أو حساسة
- اجعل ردودك مختصرة ومفيدة (لا تزيد عن 200 كلمة)
- إذا سُئلت عن شيء خارج نطاق التطبيق، وجّه المستخدم بلطف

الأسعار الحالية: $2 شهرياً للنسخة المميزة
البريد الإلكتروني للدعم: support@masarai.app`;

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history if available
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    messages.push({ role: 'user', content: message });

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI API error:', errText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content ?? 'عذراً، لم أتمكن من معالجة طلبك. يرجى المحاولة مرة أخرى.';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Support function error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
