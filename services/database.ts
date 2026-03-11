// MasarAI Database Service - Real data layer
import { getSupabaseClient } from '@/template';

function getClient() {
  return getSupabaseClient();
}

// ============ Types ============

export interface DBQuestion {
  id: string;
  exam_type: 'step' | 'ielts' | 'psychometric';
  section: string;
  section_ar: string;
  topic: string;
  topic_ar: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  question_text: string;
  correct_answer: number;
  explanation: string;
  time_limit: number;
  options: string[];
}

export interface DBPracticeTest {
  id: string;
  exam_type: 'step' | 'ielts' | 'psychometric';
  title: string;
  title_ar: string;
  question_count: number;
  duration: number;
  difficulty: string;
}

export interface DBUserProgress {
  exam_type: 'step' | 'ielts' | 'psychometric';
  overall_score: number;
  predicted_score: number;
  readiness: number;
  total_questions: number;
  correct_answers: number;
  weekly_activity: number[];
  last_practice: string | null;
}

export interface DBSectionProgress {
  exam_type: string;
  section: string;
  section_ar: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  weak_topics: string[];
  strong_topics: string[];
}

export interface DBSkillMapItem {
  skill: string;
  skill_ar: string;
  level: number;
  category: 'strength' | 'weakness' | 'improving';
}

export interface DBDailyPlan {
  id: string;
  day_number: number;
  plan_date: string;
  completed: boolean;
}

export interface DBDailyTask {
  id: string;
  plan_id: string;
  task_type: 'practice' | 'quiz' | 'review' | 'test';
  task_type_ar: string;
  title: string;
  title_ar: string;
  exam_type: 'step' | 'ielts' | 'psychometric';
  duration: number;
  completed: boolean;
  score: number | null;
}

export interface DBInsight {
  id: string;
  insight_type: 'tip' | 'warning' | 'achievement';
  message: string;
  message_ar: string;
  is_read: boolean;
  created_at: string;
}

// ============ Questions ============

export async function fetchQuestionsByExam(
  examType: 'step' | 'ielts' | 'psychometric',
  limit: number = 15
): Promise<{ data: DBQuestion[]; error: string | null }> {
  try {
    const supabase = getClient();
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_type', examType)
      .eq('is_active', true)
      .limit(limit);

    if (error) return { data: [], error: error.message };
    if (!questions || questions.length === 0) return { data: [], error: null };

    // Fetch options for these questions
    const questionIds = questions.map((q: any) => q.id);
    const { data: options, error: optErr } = await supabase
      .from('question_options')
      .select('*')
      .in('question_id', questionIds)
      .order('option_index', { ascending: true });

    if (optErr) return { data: [], error: optErr.message };

    // Merge options into questions
    const optionsByQuestion: Record<string, string[]> = {};
    (options || []).forEach((opt: any) => {
      if (!optionsByQuestion[opt.question_id]) {
        optionsByQuestion[opt.question_id] = [];
      }
      optionsByQuestion[opt.question_id][opt.option_index] = opt.option_text;
    });

    const merged: DBQuestion[] = questions.map((q: any) => ({
      id: q.id,
      exam_type: q.exam_type,
      section: q.section,
      section_ar: q.section_ar,
      topic: q.topic,
      topic_ar: q.topic_ar,
      difficulty: q.difficulty,
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      time_limit: q.time_limit,
      options: optionsByQuestion[q.id] || [],
    }));

    return { data: merged, error: null };
  } catch (e: any) {
    return { data: [], error: e.message || 'Unknown error' };
  }
}

export async function fetchQuestionsBySection(
  examType: string,
  section: string,
  limit: number = 10
): Promise<{ data: DBQuestion[]; error: string | null }> {
  try {
    const supabase = getClient();
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_type', examType)
      .eq('section', section)
      .eq('is_active', true)
      .limit(limit);

    if (error) return { data: [], error: error.message };
    if (!questions || questions.length === 0) return { data: [], error: null };

    const questionIds = questions.map((q: any) => q.id);
    const { data: options, error: optErr } = await supabase
      .from('question_options')
      .select('*')
      .in('question_id', questionIds)
      .order('option_index', { ascending: true });

    if (optErr) return { data: [], error: optErr.message };

    const optionsByQuestion: Record<string, string[]> = {};
    (options || []).forEach((opt: any) => {
      if (!optionsByQuestion[opt.question_id]) {
        optionsByQuestion[opt.question_id] = [];
      }
      optionsByQuestion[opt.question_id][opt.option_index] = opt.option_text;
    });

    const merged: DBQuestion[] = questions.map((q: any) => ({
      id: q.id,
      exam_type: q.exam_type,
      section: q.section,
      section_ar: q.section_ar,
      topic: q.topic,
      topic_ar: q.topic_ar,
      difficulty: q.difficulty,
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      time_limit: q.time_limit,
      options: optionsByQuestion[q.id] || [],
    }));

    return { data: merged, error: null };
  } catch (e: any) {
    return { data: [], error: e.message || 'Unknown error' };
  }
}

// ============ Practice Tests ============

export async function fetchPracticeTests(
  examType?: string
): Promise<{ data: DBPracticeTest[]; error: string | null }> {
  try {
    const supabase = getClient();
    let query = supabase
      .from('practice_tests')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (examType) {
      query = query.eq('exam_type', examType);
    }

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };

    return {
      data: (data || []).map((t: any) => ({
        id: t.id,
        exam_type: t.exam_type,
        title: t.title,
        title_ar: t.title_ar,
        question_count: t.question_count,
        duration: t.duration,
        difficulty: t.difficulty,
      })),
      error: null,
    };
  } catch (e: any) {
    return { data: [], error: e.message || 'Unknown error' };
  }
}

// ============ User Progress ============

export async function fetchUserProgress(
  userId: string
): Promise<{ data: DBUserProgress[]; error: string | null }> {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId);

    if (error) return { data: [], error: error.message };

    return {
      data: (data || []).map((p: any) => ({
        exam_type: p.exam_type,
        overall_score: Number(p.overall_score),
        predicted_score: Number(p.predicted_score),
        readiness: p.readiness,
        total_questions: p.total_questions,
        correct_answers: p.correct_answers,
        weekly_activity: p.weekly_activity || [],
        last_practice: p.last_practice,
      })),
      error: null,
    };
  } catch (e: any) {
    return { data: [], error: e.message || 'Unknown error' };
  }
}

export async function upsertUserProgress(
  userId: string,
  examType: string,
  updates: Partial<{
    overall_score: number;
    predicted_score: number;
    readiness: number;
    total_questions: number;
    correct_answers: number;
    weekly_activity: number[];
    last_practice: string;
  }>
): Promise<{ error: string | null }> {
  try {
    const supabase = getClient();
    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        exam_type: examType,
        ...updates,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,exam_type' });

    return { error: error ? error.message : null };
  } catch (e: any) {
    return { error: e.message || 'Unknown error' };
  }
}

// ============ Section Progress ============

export async function fetchSectionProgress(
  userId: string,
  examType?: string
): Promise<{ data: DBSectionProgress[]; error: string | null }> {
  try {
    const supabase = getClient();
    let query = supabase
      .from('user_section_progress')
      .select('*')
      .eq('user_id', userId);

    if (examType) {
      query = query.eq('exam_type', examType);
    }

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };

    return {
      data: (data || []).map((s: any) => ({
        exam_type: s.exam_type,
        section: s.section,
        section_ar: s.section_ar,
        score: s.score,
        trend: s.trend,
        weak_topics: s.weak_topics || [],
        strong_topics: s.strong_topics || [],
      })),
      error: null,
    };
  } catch (e: any) {
    return { data: [], error: e.message || 'Unknown error' };
  }
}

export async function upsertSectionProgress(
  userId: string,
  examType: string,
  section: string,
  sectionAr: string,
  updates: Partial<{
    score: number;
    trend: string;
    weak_topics: string[];
    strong_topics: string[];
  }>
): Promise<{ error: string | null }> {
  try {
    const supabase = getClient();
    const { error } = await supabase
      .from('user_section_progress')
      .upsert({
        user_id: userId,
        exam_type: examType,
        section,
        section_ar: sectionAr,
        ...updates,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,exam_type,section' });

    return { error: error ? error.message : null };
  } catch (e: any) {
    return { error: e.message || 'Unknown error' };
  }
}

// ============ Skill Map ============

export async function fetchSkillMap(
  userId: string
): Promise<{ data: DBSkillMapItem[]; error: string | null }> {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('user_skill_map')
      .select('*')
      .eq('user_id', userId)
      .order('level', { ascending: false });

    if (error) return { data: [], error: error.message };

    return {
      data: (data || []).map((s: any) => ({
        skill: s.skill,
        skill_ar: s.skill_ar,
        level: s.level,
        category: s.category,
      })),
      error: null,
    };
  } catch (e: any) {
    return { data: [], error: e.message || 'Unknown error' };
  }
}

export async function upsertSkillMap(
  userId: string,
  skills: Array<{ skill: string; skill_ar: string; level: number; category: string }>
): Promise<{ error: string | null }> {
  try {
    const supabase = getClient();
    const rows = skills.map(s => ({
      user_id: userId,
      skill: s.skill,
      skill_ar: s.skill_ar,
      level: s.level,
      category: s.category,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('user_skill_map')
      .upsert(rows, { onConflict: 'user_id,skill' });

    return { error: error ? error.message : null };
  } catch (e: any) {
    return { error: e.message || 'Unknown error' };
  }
}

// ============ Daily Plan ============

export async function fetchOrCreateDailyPlan(
  userId: string
): Promise<{ plan: DBDailyPlan | null; tasks: DBDailyTask[]; error: string | null }> {
  try {
    const supabase = getClient();
    const today = new Date().toISOString().split('T')[0];

    // Check for today's plan
    const { data: existing, error: selErr } = await supabase
      .from('user_daily_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_date', today)
      .limit(1);

    if (selErr) return { plan: null, tasks: [], error: selErr.message };

    let plan: any = existing && existing.length > 0 ? existing[0] : null;

    if (!plan) {
      // Count existing plans to determine day number
      const { count } = await supabase
        .from('user_daily_plans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const dayNumber = (count || 0) + 1;

      const { data: newPlan, error: insErr } = await supabase
        .from('user_daily_plans')
        .insert({ user_id: userId, day_number: dayNumber, plan_date: today, completed: false })
        .select()
        .single();

      if (insErr) return { plan: null, tasks: [], error: insErr.message };
      plan = newPlan;

      // Generate tasks for the new plan
      const defaultTasks = generateDailyTasks(dayNumber);
      const taskRows = defaultTasks.map(t => ({
        plan_id: plan.id,
        user_id: userId,
        task_type: t.task_type,
        task_type_ar: t.task_type_ar,
        title: t.title,
        title_ar: t.title_ar,
        exam_type: t.exam_type,
        duration: t.duration,
        completed: false,
      }));

      const { error: taskErr } = await supabase
        .from('user_daily_tasks')
        .insert(taskRows);

      if (taskErr) return { plan: plan, tasks: [], error: taskErr.message };
    }

    // Fetch tasks
    const { data: tasks, error: taskSelErr } = await supabase
      .from('user_daily_tasks')
      .select('*')
      .eq('plan_id', plan.id)
      .order('created_at', { ascending: true });

    if (taskSelErr) return { plan, tasks: [], error: taskSelErr.message };

    return {
      plan: {
        id: plan.id,
        day_number: plan.day_number,
        plan_date: plan.plan_date,
        completed: plan.completed,
      },
      tasks: (tasks || []).map((t: any) => ({
        id: t.id,
        plan_id: t.plan_id,
        task_type: t.task_type,
        task_type_ar: t.task_type_ar,
        title: t.title,
        title_ar: t.title_ar,
        exam_type: t.exam_type,
        duration: t.duration,
        completed: t.completed,
        score: t.score,
      })),
      error: null,
    };
  } catch (e: any) {
    return { plan: null, tasks: [], error: e.message || 'Unknown error' };
  }
}

export async function completeTaskInDB(
  taskId: string,
  score: number
): Promise<{ error: string | null }> {
  try {
    const supabase = getClient();
    const { error } = await supabase
      .from('user_daily_tasks')
      .update({ completed: true, score })
      .eq('id', taskId);

    return { error: error ? error.message : null };
  } catch (e: any) {
    return { error: e.message || 'Unknown error' };
  }
}

// ============ Quiz Attempts ============

export async function saveQuizAttempt(
  userId: string,
  examType: string,
  totalQuestions: number,
  correctAnswers: number,
  scorePercent: number,
  timeTaken?: number
): Promise<{ attemptId: string | null; error: string | null }> {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('user_quiz_attempts')
      .insert({
        user_id: userId,
        exam_type: examType,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        score_percent: scorePercent,
        time_taken: timeTaken || null,
      })
      .select('id')
      .single();

    if (error) return { attemptId: null, error: error.message };
    return { attemptId: data?.id || null, error: null };
  } catch (e: any) {
    return { attemptId: null, error: e.message || 'Unknown error' };
  }
}

export async function saveQuestionResponses(
  attemptId: string,
  userId: string,
  responses: Array<{
    question_id: string;
    selected_answer: number;
    is_correct: boolean;
    time_spent?: number;
  }>
): Promise<{ error: string | null }> {
  try {
    const supabase = getClient();
    const rows = responses.map(r => ({
      attempt_id: attemptId,
      user_id: userId,
      question_id: r.question_id,
      selected_answer: r.selected_answer,
      is_correct: r.is_correct,
      time_spent: r.time_spent || null,
    }));

    const { error } = await supabase
      .from('user_question_responses')
      .insert(rows);

    return { error: error ? error.message : null };
  } catch (e: any) {
    return { error: e.message || 'Unknown error' };
  }
}

// ============ AI Insights ============

export async function fetchInsights(
  userId: string,
  limit: number = 10
): Promise<{ data: DBInsight[]; error: string | null }> {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return { data: [], error: error.message };

    return {
      data: (data || []).map((i: any) => ({
        id: i.id,
        insight_type: i.insight_type,
        message: i.message,
        message_ar: i.message_ar,
        is_read: i.is_read,
        created_at: i.created_at,
      })),
      error: null,
    };
  } catch (e: any) {
    return { data: [], error: e.message || 'Unknown error' };
  }
}

export async function createInsight(
  userId: string,
  type: 'tip' | 'warning' | 'achievement',
  message: string,
  messageAr: string
): Promise<{ error: string | null }> {
  try {
    const supabase = getClient();
    const { error } = await supabase
      .from('ai_insights')
      .insert({ user_id: userId, insight_type: type, message, message_ar: messageAr });

    return { error: error ? error.message : null };
  } catch (e: any) {
    return { error: e.message || 'Unknown error' };
  }
}

// ============ User Profile Stats ============

export async function fetchUserStats(userId: string): Promise<{
  data: { ai_score: number; streak: number; total_sessions: number; name_ar: string } | null;
  error: string | null;
}> {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('ai_score, streak, total_sessions, name_ar, username, email')
      .eq('id', userId)
      .single();

    if (error) return { data: null, error: error.message };

    return {
      data: {
        ai_score: data?.ai_score || 0,
        streak: data?.streak || 0,
        total_sessions: data?.total_sessions || 0,
        name_ar: data?.name_ar || data?.username || data?.email?.split('@')[0] || 'مستخدم',
      },
      error: null,
    };
  } catch (e: any) {
    return { data: null, error: e.message || 'Unknown error' };
  }
}

export async function updateUserStats(
  userId: string,
  updates: Partial<{ ai_score: number; streak: number; total_sessions: number; name_ar: string }>
): Promise<{ error: string | null }> {
  try {
    const supabase = getClient();
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    return { error: error ? error.message : null };
  } catch (e: any) {
    return { error: e.message || 'Unknown error' };
  }
}

// ============ Helpers ============

function generateDailyTasks(dayNumber: number): Array<{
  task_type: string;
  task_type_ar: string;
  title: string;
  title_ar: string;
  exam_type: string;
  duration: number;
}> {
  const examCycle: Array<'step' | 'ielts' | 'psychometric'> = ['step', 'ielts', 'psychometric'];
  const primaryExam = examCycle[(dayNumber - 1) % 3];

  const taskTemplates = [
    {
      task_type: 'practice',
      task_type_ar: 'تدريب',
      templates: [
        { title: 'Grammar Practice', title_ar: 'تدريب القواعد', exam: 'step', duration: 10 },
        { title: 'Vocabulary Builder', title_ar: 'بناء المفردات', exam: 'step', duration: 8 },
        { title: 'Reading Practice', title_ar: 'تدريب القراءة', exam: 'ielts', duration: 15 },
        { title: 'Numerical Training', title_ar: 'تدريب عددي', exam: 'psychometric', duration: 12 },
        { title: 'Logical Reasoning', title_ar: 'التفكير المنطقي', exam: 'psychometric', duration: 10 },
      ],
    },
    {
      task_type: 'quiz',
      task_type_ar: 'اختبار قصير',
      templates: [
        { title: 'Quick Grammar Quiz', title_ar: 'اختبار قواعد سريع', exam: 'step', duration: 5 },
        { title: 'Vocabulary Quiz', title_ar: 'اختبار مفردات', exam: 'step', duration: 5 },
        { title: 'Listening Quiz', title_ar: 'اختبار استماع', exam: 'ielts', duration: 8 },
        { title: 'Pattern Quiz', title_ar: 'اختبار أنماط', exam: 'psychometric', duration: 5 },
      ],
    },
    {
      task_type: 'review',
      task_type_ar: 'مراجعة',
      templates: [
        { title: 'Review Weak Topics', title_ar: 'مراجعة نقاط الضعف', exam: 'step', duration: 10 },
        { title: 'Error Analysis', title_ar: 'تحليل الأخطاء', exam: 'ielts', duration: 10 },
        { title: 'Review Mistakes', title_ar: 'مراجعة الأخطاء', exam: 'psychometric', duration: 10 },
      ],
    },
    {
      task_type: 'test',
      task_type_ar: 'اختبار',
      templates: [
        { title: 'Mini Assessment', title_ar: 'تقييم مصغر', exam: 'step', duration: 20 },
        { title: 'Section Test', title_ar: 'اختبار قسم', exam: 'ielts', duration: 15 },
        { title: 'Logic Test', title_ar: 'اختبار منطق', exam: 'psychometric', duration: 15 },
      ],
    },
  ];

  const tasks: Array<{
    task_type: string;
    task_type_ar: string;
    title: string;
    title_ar: string;
    exam_type: string;
    duration: number;
  }> = [];

  // Add 2 practice tasks with primary exam focus
  const practiceTemplates = taskTemplates[0].templates.filter(t => t.exam === primaryExam);
  const practicePick = practiceTemplates.length > 0 ? practiceTemplates[0] : taskTemplates[0].templates[0];
  tasks.push({
    task_type: 'practice',
    task_type_ar: 'تدريب',
    title: practicePick.title,
    title_ar: practicePick.title_ar,
    exam_type: practicePick.exam,
    duration: practicePick.duration,
  });

  // Add a quiz
  const quizTemplates = taskTemplates[1].templates.filter(t => t.exam === primaryExam);
  const quizPick = quizTemplates.length > 0 ? quizTemplates[0] : taskTemplates[1].templates[0];
  tasks.push({
    task_type: 'quiz',
    task_type_ar: 'اختبار قصير',
    title: quizPick.title,
    title_ar: quizPick.title_ar,
    exam_type: quizPick.exam,
    duration: quizPick.duration,
  });

  // Add a practice from secondary exam
  const secondaryExam = examCycle[dayNumber % 3];
  const secondaryTemplates = taskTemplates[0].templates.filter(t => t.exam === secondaryExam);
  const secondaryPick = secondaryTemplates.length > 0 ? secondaryTemplates[0] : taskTemplates[0].templates[2];
  tasks.push({
    task_type: 'practice',
    task_type_ar: 'تدريب',
    title: secondaryPick.title,
    title_ar: secondaryPick.title_ar,
    exam_type: secondaryPick.exam,
    duration: secondaryPick.duration,
  });

  // Add a review
  const reviewTemplates = taskTemplates[2].templates;
  const reviewPick = reviewTemplates[(dayNumber - 1) % reviewTemplates.length];
  tasks.push({
    task_type: 'review',
    task_type_ar: 'مراجعة',
    title: reviewPick.title,
    title_ar: reviewPick.title_ar,
    exam_type: reviewPick.exam,
    duration: reviewPick.duration,
  });

  // Add a test on every 3rd day
  if (dayNumber % 3 === 0) {
    const testTemplates = taskTemplates[3].templates;
    const testPick = testTemplates[(dayNumber / 3 - 1) % testTemplates.length];
    tasks.push({
      task_type: 'test',
      task_type_ar: 'اختبار',
      title: testPick.title,
      title_ar: testPick.title_ar,
      exam_type: testPick.exam,
      duration: testPick.duration,
    });
  }

  return tasks;
}
