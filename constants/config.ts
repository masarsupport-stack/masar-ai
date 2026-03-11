// MasarAI Configuration
export const config = {
  appName: 'MasarAI',
  appNameAr: 'مسار AI',
  tagline: 'مدربك الذكي للاختبارات',
  version: '1.0.0',

  // Exam types
  examTypes: {
    step: {
      id: 'step',
      name: 'STEP',
      nameAr: 'ستيب',
      color: '#06B6D4',
      icon: 'school' as const,
      maxScore: 100,
      sections: ['Grammar', 'Vocabulary', 'Reading', 'Listening'],
      sectionsAr: ['القواعد', 'المفردات', 'القراءة', 'الاستماع'],
    },
    ielts: {
      id: 'ielts',
      name: 'IELTS',
      nameAr: 'آيلتس',
      color: '#8B5CF6',
      icon: 'language' as const,
      maxScore: 9,
      sections: ['Reading', 'Writing', 'Listening', 'Speaking'],
      sectionsAr: ['القراءة', 'الكتابة', 'الاستماع', 'المحادثة'],
    },
    psychometric: {
      id: 'psychometric',
      name: 'Psychometric',
      nameAr: 'سيكومتري',
      color: '#F59E0B',
      icon: 'psychology' as const,
      maxScore: 100,
      sections: ['Numerical', 'Verbal', 'Logical', 'Abstract'],
      sectionsAr: ['التحليل العددي', 'اللفظي', 'المنطقي', 'التجريدي'],
    },
  },

  // Difficulty levels
  difficultyLevels: ['beginner', 'intermediate', 'advanced', 'expert'] as const,

  // Daily plan
  dailyPlanDays: 30,

  // Free tier limits
  freeTierLimits: {
    questionsPerDay: 10,
    practiceTests: 1,
    aiAnalysis: false,
  },
};
