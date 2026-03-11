// Initial default data for new users
// Used to seed user_progress, user_section_progress, and user_skill_map on first login

import {
  upsertUserProgress,
  upsertSectionProgress,
  upsertSkillMap,
  createInsight,
  fetchUserProgress,
} from './database';

export async function initializeUserData(userId: string): Promise<void> {
  // Check if user already has progress data
  const { data: existing } = await fetchUserProgress(userId);
  if (existing && existing.length > 0) return; // Already initialized

  // Seed exam progress for all 3 exams
  const examDefaults: Array<{
    exam_type: string;
    overall_score: number;
    predicted_score: number;
    readiness: number;
  }> = [
    { exam_type: 'step', overall_score: 0, predicted_score: 0, readiness: 0 },
    { exam_type: 'ielts', overall_score: 0, predicted_score: 0, readiness: 0 },
    { exam_type: 'psychometric', overall_score: 0, predicted_score: 0, readiness: 0 },
  ];

  for (const ep of examDefaults) {
    await upsertUserProgress(userId, ep.exam_type, {
      overall_score: ep.overall_score,
      predicted_score: ep.predicted_score,
      readiness: ep.readiness,
      total_questions: 0,
      correct_answers: 0,
      weekly_activity: [0, 0, 0, 0, 0, 0, 0],
    });
  }

  // Seed section progress
  const sectionDefaults = [
    { exam_type: 'step', section: 'Grammar', section_ar: 'القواعد', score: 0 },
    { exam_type: 'step', section: 'Vocabulary', section_ar: 'المفردات', score: 0 },
    { exam_type: 'step', section: 'Reading', section_ar: 'القراءة', score: 0 },
    { exam_type: 'step', section: 'Listening', section_ar: 'الاستماع', score: 0 },
    { exam_type: 'ielts', section: 'Reading', section_ar: 'القراءة', score: 0 },
    { exam_type: 'ielts', section: 'Writing', section_ar: 'الكتابة', score: 0 },
    { exam_type: 'ielts', section: 'Listening', section_ar: 'الاستماع', score: 0 },
    { exam_type: 'ielts', section: 'Speaking', section_ar: 'المحادثة', score: 0 },
    { exam_type: 'psychometric', section: 'Numerical', section_ar: 'التحليل العددي', score: 0 },
    { exam_type: 'psychometric', section: 'Verbal', section_ar: 'اللفظي', score: 0 },
    { exam_type: 'psychometric', section: 'Logical', section_ar: 'المنطقي', score: 0 },
    { exam_type: 'psychometric', section: 'Abstract', section_ar: 'التجريدي', score: 0 },
  ];

  for (const sp of sectionDefaults) {
    await upsertSectionProgress(userId, sp.exam_type, sp.section, sp.section_ar, {
      score: sp.score,
      trend: 'stable',
      weak_topics: [],
      strong_topics: [],
    });
  }

  // Seed default skill map
  const defaultSkills = [
    { skill: 'Present Tenses', skill_ar: 'الأزمنة الحاضرة', level: 0, category: 'weakness' },
    { skill: 'Articles', skill_ar: 'أدوات التعريف', level: 0, category: 'weakness' },
    { skill: 'Basic Math', skill_ar: 'الرياضيات الأساسية', level: 0, category: 'weakness' },
    { skill: 'Scanning', skill_ar: 'المسح السريع', level: 0, category: 'weakness' },
    { skill: 'Conditionals', skill_ar: 'الجمل الشرطية', level: 0, category: 'weakness' },
    { skill: 'Passive Voice', skill_ar: 'المبني للمجهول', level: 0, category: 'weakness' },
    { skill: 'Analogies', skill_ar: 'القياس', level: 0, category: 'weakness' },
    { skill: 'Inference', skill_ar: 'الاستنتاج', level: 0, category: 'weakness' },
    { skill: 'Cohesion', skill_ar: 'الترابط', level: 0, category: 'weakness' },
    { skill: 'Sequences', skill_ar: 'المتتاليات', level: 0, category: 'weakness' },
  ];

  await upsertSkillMap(userId, defaultSkills);

  // Welcome insight
  await createInsight(
    userId,
    'tip',
    'Welcome to MasarAI! Start with a diagnostic quiz to assess your level.',
    'مرحباً في مسار AI! ابدأ باختبار تشخيصي لتحديد مستواك.'
  );
}
