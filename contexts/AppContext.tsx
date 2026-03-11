import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/template';
import {
  fetchQuestionsByExam,
  fetchPracticeTests,
  fetchUserProgress,
  fetchSectionProgress,
  fetchSkillMap,
  fetchOrCreateDailyPlan,
  fetchInsights,
  fetchUserStats,
  upsertUserProgress,
  upsertSectionProgress,
  completeTaskInDB,
  saveQuizAttempt,
  saveQuestionResponses,
  updateUserStats,
  DBQuestion,
  DBPracticeTest,
  DBUserProgress,
  DBSectionProgress,
  DBSkillMapItem,
  DBDailyPlan,
  DBDailyTask,
  DBInsight,
} from '../services/database';
import { initializeUserData } from '../services/initialData';
import { sendTaskCompletionNotification, sendStreakNotification } from '../services/notifications';

// Mapped types for UI compatibility
export interface ExamProgress {
  examType: 'step' | 'ielts' | 'psychometric';
  overallScore: number;
  predictedScore: number;
  readiness: number;
  totalQuestions: number;
  correctAnswers: number;
  weeklyActivity: number[];
  lastPractice: string;
  sectionsProgress: SectionProgress[];
}

export interface SectionProgress {
  name: string;
  nameAr: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  weakTopics: string[];
  strongTopics: string[];
}

export interface SkillMapItem {
  skill: string;
  skillAr: string;
  level: number;
  category: 'strength' | 'weakness' | 'improving';
}

export interface DailyPlan {
  day: number;
  date: string;
  tasks: DailyTask[];
  completed: boolean;
}

export interface DailyTask {
  id: string;
  type: 'practice' | 'quiz' | 'review' | 'test';
  typeAr: string;
  title: string;
  titleAr: string;
  examType: 'step' | 'ielts' | 'psychometric';
  duration: number;
  completed: boolean;
  score?: number;
}

export interface AIInsight {
  id: string;
  type: 'tip' | 'warning' | 'achievement';
  message: string;
  messageAr: string;
  timestamp: string;
}

export interface PracticeTest {
  id: string;
  examType: 'step' | 'ielts' | 'psychometric';
  title: string;
  titleAr: string;
  questionCount: number;
  duration: number;
  difficulty: string;
}

export interface UserProfile {
  id: string;
  nameAr: string;
  aiScore: number;
  streak: number;
  totalSessions: number;
}

export interface Question {
  id: string;
  examType: 'step' | 'ielts' | 'psychometric';
  section: string;
  sectionAr: string;
  difficulty: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  timeLimit: number;
  topic: string;
  topicAr: string;
}

export interface QuizState {
  examType: 'step' | 'ielts' | 'psychometric';
  questions: Question[];
  currentIndex: number;
  answers: (number | null)[];
  score: number;
  isComplete: boolean;
  timeLeft: number;
}

interface AppContextType {
  user: UserProfile;
  examProgress: ExamProgress[];
  dailyPlan: DailyPlan;
  skillMap: SkillMapItem[];
  insights: AIInsight[];
  practiceTests: PracticeTest[];
  selectedExam: 'step' | 'ielts' | 'psychometric';
  setSelectedExam: (exam: 'step' | 'ielts' | 'psychometric') => void;
  quizState: QuizState | null;
  startQuiz: (examType: 'step' | 'ielts' | 'psychometric') => Promise<void>;
  startQuizWithQuestions: (examType: 'step' | 'ielts' | 'psychometric', questions: Question[]) => void;
  answerQuestion: (answerIndex: number) => void;
  nextQuestion: () => void;
  resetQuiz: () => void;
  completeTask: (taskId: string) => number;
  updateStreak: () => void;
  refreshData: () => Promise<void>;
  diagnosticCompleted: boolean;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_USER: UserProfile = {
  id: '',
  nameAr: 'مستخدم',
  aiScore: 0,
  streak: 0,
  totalSessions: 0,
};

const DEFAULT_PLAN: DailyPlan = {
  day: 1,
  date: new Date().toISOString().split('T')[0],
  tasks: [],
  completed: false,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [examProgress, setExamProgress] = useState<ExamProgress[]>([]);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan>(DEFAULT_PLAN);
  const [skillMap, setSkillMap] = useState<SkillMapItem[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [practiceTests, setPracticeTests] = useState<PracticeTest[]>([]);
  const [selectedExam, setSelectedExam] = useState<'step' | 'ielts' | 'psychometric'>('step');
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(false);
  const [diagnosticCompleted, setDiagnosticCompleted] = useState(false);

  const loadAllData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      // Initialize user data if first time
      await initializeUserData(userId);

      // Fetch all data in parallel
      const [
        statsResult,
        progressResult,
        sectionsResult,
        skillsResult,
        planResult,
        insightsResult,
        testsResult,
      ] = await Promise.all([
        fetchUserStats(userId),
        fetchUserProgress(userId),
        fetchSectionProgress(userId),
        fetchSkillMap(userId),
        fetchOrCreateDailyPlan(userId),
        fetchInsights(userId),
        fetchPracticeTests(),
      ]);

      // Check diagnostic status
      try {
        const supabase = (await import('@/template')).getSupabaseClient();
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('diagnostic_completed')
          .eq('id', userId)
          .single();
        setDiagnosticCompleted(profileData?.diagnostic_completed === true);
      } catch {
        setDiagnosticCompleted(false);
      }

      // Update user stats
      if (statsResult.data) {
        setUser({
          id: userId,
          nameAr: statsResult.data.name_ar,
          aiScore: statsResult.data.ai_score,
          streak: statsResult.data.streak,
          totalSessions: statsResult.data.total_sessions,
        });
      } else {
        setUser(prev => ({ ...prev, id: userId }));
      }

      // Merge progress with sections
      const examTypes: Array<'step' | 'ielts' | 'psychometric'> = ['step', 'ielts', 'psychometric'];
      const mergedProgress: ExamProgress[] = examTypes.map(et => {
        const prog = progressResult.data.find(p => p.exam_type === et);
        const sects = sectionsResult.data.filter(s => s.exam_type === et);
        return {
          examType: et,
          overallScore: prog?.overall_score || 0,
          predictedScore: prog?.predicted_score || 0,
          readiness: prog?.readiness || 0,
          totalQuestions: prog?.total_questions || 0,
          correctAnswers: prog?.correct_answers || 0,
          weeklyActivity: prog?.weekly_activity || [0, 0, 0, 0, 0, 0, 0],
          lastPractice: prog?.last_practice || '',
          sectionsProgress: sects.map(s => ({
            name: s.section,
            nameAr: s.section_ar,
            score: s.score,
            trend: s.trend,
            weakTopics: s.weak_topics,
            strongTopics: s.strong_topics,
          })),
        };
      });
      setExamProgress(mergedProgress);

      // Skill map
      setSkillMap(
        skillsResult.data.map(s => ({
          skill: s.skill,
          skillAr: s.skill_ar,
          level: s.level,
          category: s.category,
        }))
      );

      // Daily plan
      if (planResult.plan) {
        setDailyPlan({
          day: planResult.plan.day_number,
          date: planResult.plan.plan_date,
          completed: planResult.plan.completed,
          tasks: planResult.tasks.map(t => ({
            id: t.id,
            type: t.task_type as any,
            typeAr: t.task_type_ar,
            title: t.title,
            titleAr: t.title_ar,
            examType: t.exam_type as any,
            duration: t.duration,
            completed: t.completed,
            score: t.score || undefined,
          })),
        });
      }

      // Insights
      setInsights(
        insightsResult.data.map(i => ({
          id: i.id,
          type: i.insight_type,
          message: i.message,
          messageAr: i.message_ar,
          timestamp: i.created_at,
        }))
      );

      // Practice tests
      setPracticeTests(
        testsResult.data.map(t => ({
          id: t.id,
          examType: t.exam_type,
          title: t.title,
          titleAr: t.title_ar,
          questionCount: t.question_count,
          duration: t.duration,
          difficulty: t.difficulty,
        }))
      );
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync with auth state
  useEffect(() => {
    if (authUser?.id) {
      loadAllData(authUser.id);
    } else {
      // Reset to defaults on logout
      setUser(DEFAULT_USER);
      setExamProgress([]);
      setDailyPlan(DEFAULT_PLAN);
      setSkillMap([]);
      setInsights([]);
      setPracticeTests([]);
      setQuizState(null);
      setDiagnosticCompleted(false);
    }
  }, [authUser?.id, loadAllData]);

  const refreshData = useCallback(async () => {
    if (authUser?.id) {
      await loadAllData(authUser.id);
    }
  }, [authUser?.id, loadAllData]);

  const startQuiz = useCallback(async (examType: 'step' | 'ielts' | 'psychometric') => {
    const { data: dbQuestions } = await fetchQuestionsByExam(examType);
    if (!dbQuestions || dbQuestions.length === 0) return;

    // Shuffle questions
    const shuffled = [...dbQuestions].sort(() => Math.random() - 0.5);

    const questions: Question[] = shuffled.map(q => ({
      id: q.id,
      examType: q.exam_type,
      section: q.section,
      sectionAr: q.section_ar,
      difficulty: q.difficulty,
      questionText: q.question_text,
      options: q.options,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      timeLimit: q.time_limit,
      topic: q.topic,
      topicAr: q.topic_ar,
    }));

    setQuizState({
      examType,
      questions,
      currentIndex: 0,
      answers: new Array(questions.length).fill(null),
      score: 0,
      isComplete: false,
      timeLeft: questions[0]?.timeLimit || 45,
    });
  }, []);

  const answerQuestion = useCallback((answerIndex: number) => {
    setQuizState(prev => {
      if (!prev || prev.isComplete) return prev;
      const q = prev.questions[prev.currentIndex];
      const isCorrect = answerIndex === q.correctAnswer;
      const newAnswers = [...prev.answers];
      newAnswers[prev.currentIndex] = answerIndex;
      return {
        ...prev,
        answers: newAnswers,
        score: isCorrect ? prev.score + 1 : prev.score,
      };
    });
  }, []);

  // Use refs to avoid stale closure values in nextQuestion
  const examProgressRef = React.useRef(examProgress);
  const userRef = React.useRef(user);
  React.useEffect(() => { examProgressRef.current = examProgress; }, [examProgress]);
  React.useEffect(() => { userRef.current = user; }, [user]);

  const nextQuestion = useCallback(() => {
    setQuizState(prev => {
      if (!prev) return prev;
      const nextIdx = prev.currentIndex + 1;
      if (nextIdx >= prev.questions.length) {
        // Quiz complete — save results asynchronously
        const finalScore = prev.score;
        const totalQ = prev.questions.length;
        const pct = Math.round((finalScore / totalQ) * 100);
        const currentExamProgress = examProgressRef.current;
        const currentUser = userRef.current;

        if (authUser?.id) {
          // Only save quiz attempt/responses for real DB questions (not AI-generated)
          const isAIQuiz = prev.questions.some(q => q.id.startsWith('ai-'));
          if (!isAIQuiz) {
            saveQuizAttempt(authUser.id, prev.examType, totalQ, finalScore, pct).then(async (result) => {
              if (result.attemptId) {
                const responses = prev.questions.map((q, i) => ({
                  question_id: q.id,
                  selected_answer: prev.answers[i] ?? -1,
                  is_correct: prev.answers[i] === q.correctAnswer,
                }));
                await saveQuestionResponses(result.attemptId, authUser.id, responses);
              }
            });
          }

          // Update progress (works for both AI and DB questions)
          const currentProg = currentExamProgress.find(ep => ep.examType === prev.examType);
          if (currentProg) {
            const newTotal = currentProg.totalQuestions + totalQ;
            const newCorrect = currentProg.correctAnswers + finalScore;
            const newOverall = currentProg.overallScore === 0
              ? pct
              : Math.round((currentProg.overallScore * 0.6) + (pct * 0.4));
            // Predicted score: overall trend + recent performance boost
            const recentBoost = pct > currentProg.overallScore ? Math.round((pct - currentProg.overallScore) * 0.3) : 0;
            const newPredicted = Math.min(100, newOverall + recentBoost + Math.round(newTotal * 0.1));
            const newReadiness = Math.min(100, Math.round((newCorrect / Math.max(newTotal, 1)) * 100));

            // Update weekly activity - increment today's count
            const dayOfWeek = new Date().getDay(); // 0=Sun
            const existingWeekly = currentProg.weeklyActivity && currentProg.weeklyActivity.length === 7
              ? [...currentProg.weeklyActivity]
              : [0, 0, 0, 0, 0, 0, 0];
            existingWeekly[dayOfWeek] = (existingWeekly[dayOfWeek] || 0) + 1;

            upsertUserProgress(authUser.id, prev.examType, {
              overall_score: newOverall,
              predicted_score: newPredicted,
              readiness: newReadiness,
              total_questions: newTotal,
              correct_answers: newCorrect,
              weekly_activity: existingWeekly,
              last_practice: new Date().toISOString(),
            });

            // Update section progress
            const sectionScores: Record<string, { correct: number; total: number; sectionAr: string }> = {};
            prev.questions.forEach((q, i) => {
              if (!sectionScores[q.section]) {
                sectionScores[q.section] = { correct: 0, total: 0, sectionAr: q.sectionAr };
              }
              sectionScores[q.section].total++;
              if (prev.answers[i] === q.correctAnswer) {
                sectionScores[q.section].correct++;
              }
            });

            Object.entries(sectionScores).forEach(([section, data]) => {
              const sectionPct = Math.round((data.correct / data.total) * 100);
              const existing = currentProg.sectionsProgress.find(s => s.name === section);
              const oldScore = existing?.score || 0;
              const newScore = oldScore === 0 ? sectionPct : Math.round((oldScore * 0.6) + (sectionPct * 0.4));
              const trend = newScore > oldScore + 3 ? 'up' : newScore < oldScore - 3 ? 'down' : 'stable';

              upsertSectionProgress(authUser.id, prev.examType, section, data.sectionAr, {
                score: newScore,
                trend,
              });
            });

            // Update skill map from quiz topics
            const topicScores: Record<string, { correct: number; total: number; topicAr: string }> = {};
            prev.questions.forEach((q, i) => {
              if (!topicScores[q.topic]) topicScores[q.topic] = { correct: 0, total: 0, topicAr: q.topicAr };
              topicScores[q.topic].total++;
              if (prev.answers[i] === q.correctAnswer) topicScores[q.topic].correct++;
            });
            const skillUpdates = Object.entries(topicScores).map(([skill, data]) => {
              const skillPct = Math.round((data.correct / data.total) * 100);
              let cat: string;
              if (skillPct >= 75) cat = 'strength';
              else if (skillPct <= 40) cat = 'weakness';
              else cat = 'improving';
              return { skill, skill_ar: data.topicAr, level: skillPct, category: cat };
            });
            if (skillUpdates.length > 0) {
              upsertSkillMap(authUser.id, skillUpdates);
            }
          }

          // Update user stats: total_sessions + recalculate AI Score from all exam progress
          const newSessions = (currentUser.totalSessions || 0) + 1;
          const allProgress = currentExamProgress;
          const totalScoreSum = allProgress.reduce((sum, ep) => sum + ep.overallScore, 0);
          const activeExams = allProgress.filter(ep => ep.totalQuestions > 0).length;
          // AI Score = weighted avg of exams with activity, factor in new quiz
          const baseAiScore = activeExams > 0 ? Math.round(totalScoreSum / Math.max(activeExams, 1)) : 0;
          const aiBoost = Math.min(10, Math.round(newSessions * 0.5)); // small boost for consistency
          const newAiScore = Math.min(100, Math.max(baseAiScore + aiBoost, pct));

          updateUserStats(authUser.id, {
            total_sessions: newSessions,
            ai_score: newAiScore,
          });

          // Auto-update streak based on daily plan or quiz activity
          const today = new Date().toISOString().split('T')[0];
          const lastPractice = currentExamProgress.find(ep => ep.examType === prev.examType)?.lastPractice;
          const lastDate = lastPractice ? new Date(lastPractice).toISOString().split('T')[0] : null;
          if (lastDate !== today) {
            // First quiz of today — increment streak
            const newStreak = (currentUser.streak || 0) + 1;
            updateUserStats(authUser.id, { streak: newStreak });
            sendStreakNotification(newStreak);
          }
        }

        return { ...prev, isComplete: true };
      } else {
        return {
          ...prev,
          currentIndex: nextIdx,
          timeLeft: prev.questions[nextIdx]?.timeLimit || 45,
        };
      }
    });
  }, [authUser?.id]);

  const startQuizWithQuestions = useCallback((examType: 'step' | 'ielts' | 'psychometric', questions: Question[]) => {
    if (!questions || questions.length === 0) return;
    setQuizState({
      examType,
      questions,
      currentIndex: 0,
      answers: new Array(questions.length).fill(null),
      score: 0,
      isComplete: false,
      timeLeft: questions[0]?.timeLimit || 45,
    });
  }, []);

  const resetQuiz = useCallback(() => setQuizState(null), []);

  const completeTask = useCallback((taskId: string): number => {
    const score = Math.floor(Math.random() * 20) + 75;
    setDailyPlan(prev => {
      const task = prev.tasks.find(t => t.id === taskId);
      if (task) {
        sendTaskCompletionNotification(task.titleAr, score);
      }
      return {
        ...prev,
        tasks: prev.tasks.map(t =>
          t.id === taskId ? { ...t, completed: true, score } : t
        ),
      };
    });
    completeTaskInDB(taskId, score);
    return score;
  }, []);

  const updateStreak = useCallback(() => {
    const newStreak = user.streak + 1;
    setUser(prev => ({ ...prev, streak: newStreak }));
    if (authUser?.id) {
      updateUserStats(authUser.id, { streak: newStreak });
    }
    // Send streak milestone notification
    sendStreakNotification(newStreak);
  }, [user.streak, authUser?.id]);

  return (
    <AppContext.Provider value={{
      user, examProgress, dailyPlan, skillMap, insights, practiceTests,
      selectedExam, setSelectedExam,
      quizState, startQuiz, startQuizWithQuestions, answerQuestion, nextQuestion, resetQuiz,
      completeTask, updateStreak, refreshData, diagnosticCompleted, loading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
