// AI Question Generation & Explanation Service
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

export interface AIQuestion {
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  topic: string;
  topic_ar: string;
  section: string;
  section_ar: string;
  difficulty: string;
  exam_type: string;
}

export async function generateAIQuestions(params: {
  examType: string;
  section?: string;
  difficulty?: string;
  count?: number;
  weakTopics?: string[];
}): Promise<{ questions: AIQuestion[]; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('generate-questions', {
      body: {
        examType: params.examType,
        section: params.section || null,
        difficulty: params.difficulty || 'intermediate',
        count: params.count || 5,
        weakTopics: params.weakTopics || [],
      },
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const text = await error.context?.text();
          const parsed = JSON.parse(text || '{}');
          msg = parsed.error || text || msg;
        } catch {
          msg = error.message;
        }
      }
      return { questions: [], error: msg };
    }

    return { questions: data?.questions || [], error: null };
  } catch (err: any) {
    return { questions: [], error: err.message || 'خطأ غير متوقع' };
  }
}

export async function getAIExplanation(params: {
  questionText: string;
  options: string[];
  correctAnswer: number;
  userAnswer: number;
  examType: string;
}): Promise<{ explanation: string; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('ai-explain', {
      body: params,
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const text = await error.context?.text();
          const parsed = JSON.parse(text || '{}');
          msg = parsed.error || text || msg;
        } catch {
          msg = error.message;
        }
      }
      return { explanation: '', error: msg };
    }

    return { explanation: data?.explanation || '', error: null };
  } catch (err: any) {
    return { explanation: '', error: err.message || 'خطأ غير متوقع' };
  }
}
