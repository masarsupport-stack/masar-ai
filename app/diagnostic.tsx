import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withSpring,
  withDelay, FadeInDown, FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { config } from '../constants/config';
import { useAuth, useAlert } from '@/template';
import { fetchQuestionsByExam, upsertUserProgress, upsertSectionProgress, upsertSkillMap, updateUserStats, createInsight } from '../services/database';
import { useApp, Question } from '../contexts/AppContext';
import { useColors } from '../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProgressRing from '../components/ui/ProgressRing';
import QuizOption from '../components/ui/QuizOption';

type Phase = 'intro' | 'quiz' | 'analyzing' | 'results';

interface DiagnosticResult {
  examType: 'step' | 'ielts' | 'psychometric';
  total: number;
  correct: number;
  percent: number;
  sections: Record<string, { correct: number; total: number; sectionAr: string }>;
}

interface SkillResult {
  skill: string;
  skillAr: string;
  level: number;
  category: 'strength' | 'weakness' | 'improving';
}

export default function DiagnosticScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useColors();
  const { user: authUser } = useAuth();
  const { showAlert } = useAlert();
  const { refreshData } = useApp();

  const [phase, setPhase] = useState<Phase>('intro');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [skills, setSkills] = useState<SkillResult[]>([]);
  const [overallScore, setOverallScore] = useState(0);

  const progressWidth = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const resultOpacity = useSharedValue(0);

  const currentQuestion = questions[currentIndex];
  const examConfig = currentQuestion ? config.examTypes[currentQuestion.examType as keyof typeof config.examTypes] : null;
  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;

  const loadDiagnosticQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const [stepRes, ieltsRes, psyRes] = await Promise.all([
        fetchQuestionsByExam('step', 15),
        fetchQuestionsByExam('ielts', 15),
        fetchQuestionsByExam('psychometric', 15),
      ]);
      const allQuestions: Question[] = [];
      const mapQuestions = (data: any[]): Question[] =>
        data.map(q => ({ id: q.id, examType: q.exam_type, section: q.section, sectionAr: q.section_ar, difficulty: q.difficulty, questionText: q.question_text, options: q.options, correctAnswer: q.correct_answer, explanation: q.explanation, timeLimit: q.time_limit, topic: q.topic, topicAr: q.topic_ar }));
      if (stepRes.data.length > 0) allQuestions.push(...mapQuestions(stepRes.data));
      if (ieltsRes.data.length > 0) allQuestions.push(...mapQuestions(ieltsRes.data));
      if (psyRes.data.length > 0) allQuestions.push(...mapQuestions(psyRes.data));
      const shuffled = allQuestions.sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
      setAnswers(new Array(shuffled.length).fill(null));
    } catch (err) { console.error('Failed to load diagnostic questions:', err); } finally { setLoadingQuestions(false); }
  }, []);

  useEffect(() => {
    if (phase !== 'quiz' || showResult || !currentQuestion) return;
    if (timeLeft <= 0) { setShowResult(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); resultOpacity.value = withTiming(1, { duration: 300 }); return; }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, showResult, phase]);

  useEffect(() => {
    if (phase === 'quiz' && currentQuestion) {
      setTimeLeft(currentQuestion.timeLimit); setSelectedAnswer(null); setShowResult(false);
      progressWidth.value = withTiming(progress, { duration: 300 });
      cardScale.value = withSequence(withTiming(0.97, { duration: 100 }), withSpring(1, { damping: 15 }));
    }
  }, [currentIndex, phase]);

  const handleSelect = (index: number) => { if (showResult) return; Haptics.selectionAsync(); setSelectedAnswer(index); };

  const handleConfirm = () => {
    if (selectedAnswer === null || !currentQuestion) return;
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const newAnswers = [...answers]; newAnswers[currentIndex] = selectedAnswer; setAnswers(newAnswers);
    if (isCorrect) { setScore(prev => prev + 1); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
    else { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }
    setShowResult(true); resultOpacity.value = withTiming(1, { duration: 300 });
  };

  const handleNext = () => {
    resultOpacity.value = 0;
    if (currentIndex + 1 >= questions.length) { analyzeResults(); }
    else { setCurrentIndex(currentIndex + 1); }
  };

  // Exit handler - confirm before leaving
  const handleExit = useCallback(() => {
    if (phase === 'intro') {
      router.back();
      return;
    }
    showAlert(
      'الخروج من الاختبار التشخيصي',
      'هل أنت متأكد؟ سيتم فقدان تقدمك الحالي ولن يتم حفظ النتائج.',
      [
        { text: 'متابعة الاختبار', style: 'cancel' },
        {
          text: 'خروج', style: 'destructive',
          onPress: () => { router.back(); },
        },
      ]
    );
  }, [phase, router, showAlert]);

  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const analyzeResults = useCallback(async () => {
    setPhase('analyzing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    let prog = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => { prog += 2; setAnalyzeProgress(Math.min(prog, 95)); if (prog >= 95 && intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } }, 80);
    const examResults: DiagnosticResult[] = [];
    const examTypes: Array<'step' | 'ielts' | 'psychometric'> = ['step', 'ielts', 'psychometric'];
    for (const et of examTypes) {
      const examQs = questions.filter(q => q.examType === et);
      if (examQs.length === 0) continue;
      let correct = 0;
      const sections: Record<string, { correct: number; total: number; sectionAr: string }> = {};
      examQs.forEach((q) => {
        const qIdx = questions.indexOf(q); const ans = answers[qIdx]; const isCorrect = ans === q.correctAnswer;
        if (isCorrect) correct++;
        if (!sections[q.section]) { sections[q.section] = { correct: 0, total: 0, sectionAr: q.sectionAr }; }
        sections[q.section].total++; if (isCorrect) sections[q.section].correct++;
      });
      examResults.push({ examType: et, total: examQs.length, correct, percent: Math.round((correct / examQs.length) * 100), sections });
    }
    const skillResults: SkillResult[] = [];
    const topicScores: Record<string, { correct: number; total: number; topicAr: string }> = {};
    questions.forEach((q, i) => {
      const key = q.topic; if (!topicScores[key]) { topicScores[key] = { correct: 0, total: 0, topicAr: q.topicAr }; }
      topicScores[key].total++; if (answers[i] === q.correctAnswer) { topicScores[key].correct++; }
    });
    Object.entries(topicScores).forEach(([skill, data]) => {
      const pct = Math.round((data.correct / data.total) * 100);
      let category: 'strength' | 'weakness' | 'improving';
      if (pct >= 75) category = 'strength'; else if (pct <= 40) category = 'weakness'; else category = 'improving';
      skillResults.push({ skill, skillAr: data.topicAr, level: pct, category });
    });
    skillResults.sort((a, b) => b.level - a.level);
    const totalCorrect = examResults.reduce((sum, r) => sum + r.correct, 0);
    const totalQs = examResults.reduce((sum, r) => sum + r.total, 0);
    const overall = totalQs > 0 ? Math.round((totalCorrect / totalQs) * 100) : 0;

    if (authUser?.id) {
      try {
        for (const result of examResults) {
          await upsertUserProgress(authUser.id, result.examType, { overall_score: result.percent, predicted_score: Math.min(100, Math.round(result.percent * 1.15)), readiness: Math.min(100, result.percent), total_questions: result.total, correct_answers: result.correct, last_practice: new Date().toISOString() });
          for (const [section, data] of Object.entries(result.sections)) {
            const sectionPct = Math.round((data.correct / data.total) * 100);
            await upsertSectionProgress(authUser.id, result.examType, section, data.sectionAr, { score: sectionPct, trend: 'stable' });
          }
        }
        await upsertSkillMap(authUser.id, skillResults.map(s => ({ skill: s.skill, skill_ar: s.skillAr, level: s.level, category: s.category })));
        await updateUserStats(authUser.id, { ai_score: overall, total_sessions: 1 });
        const { getSupabaseClient: getSC } = await import('@/template');
        const supabase = getSC();
        await supabase.from('user_profiles').update({ diagnostic_completed: true }).eq('id', authUser.id);
        const strengths = skillResults.filter(s => s.category === 'strength');
        const weaknesses = skillResults.filter(s => s.category === 'weakness');
        if (strengths.length > 0) { const topStrength = strengths[0]; await createInsight(authUser.id, 'achievement', `Great job! You scored ${topStrength.level}% in ${topStrength.skill}.`, `أحسنت! حققت ${topStrength.level}% في ${topStrength.skillAr}. استمر بالتقدم!`); }
        if (weaknesses.length > 0) { const topWeak = weaknesses[0]; await createInsight(authUser.id, 'tip', `Focus on ${topWeak.skill} - it needs more practice.`, `ركّز على ${topWeak.skillAr} — تحتاج مزيداً من التدريب.`); }
      } catch (err) { console.error('Failed to save diagnostic results:', err); }
    }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setAnalyzeProgress(100); setResults(examResults); setSkills(skillResults); setOverallScore(overall);
    setTimeout(() => { setPhase('results'); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }, 600);
  }, [questions, answers, authUser?.id]);

  const handleStartQuiz = async () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); await loadDiagnosticQuestions(); setPhase('quiz'); };
  const handleFinish = async () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); await refreshData(); router.replace('/(tabs)'); };

  const handleSkipDiagnostic = useCallback(() => {
    showAlert(
      'تخطي الاختبار التشخيصي',
      'سيتم تعيين مستوى افتراضي (متوسط) لك. يمكنك إجراء الاختبار لاحقاً من صفحة الملف الشخصي.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تخطي', style: 'default',
          onPress: async () => {
            try {
              if (authUser?.id) {
                await AsyncStorage.setItem('@masarai_diagnostic_skipped_' + authUser.id, 'true');
              }
              await refreshData();
              router.replace('/(tabs)');
            } catch {
              router.replace('/(tabs)');
            }
          },
        },
      ]
    );
  }, [authUser?.id, showAlert, refreshData, router]);

  const progressBarStyle = useAnimatedStyle(() => ({ width: `${progressWidth.value * 100}%` }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const resultStyle = useAnimatedStyle(() => ({ opacity: resultOpacity.value }));

  // ===================== INTRO PHASE =====================
  if (phase === 'intro') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.introContent} showsVerticalScrollIndicator={false}>
          {/* Exit Button */}
          <Pressable onPress={handleExit} hitSlop={12} style={[styles.exitBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MaterialIcons name="close" size={22} color={theme.textSecondary} />
          </Pressable>

          <View style={styles.introIconWrap}>
            <LinearGradient colors={[theme.primary + '25', theme.secondary + '15']} style={styles.introIconGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <MaterialIcons name="psychology" size={56} color={theme.primary} />
            </LinearGradient>
          </View>
          <Text style={[styles.introTitle, { color: theme.textPrimary }]}>الاختبار التشخيصي</Text>
          <Text style={[styles.introSubtitle, { color: theme.textSecondary }]}>سنحدد مستواك في جميع الاختبارات لإنشاء خطة تدريب مخصصة لك</Text>

          <View style={styles.introCards}>
            {[
              { icon: 'school' as const, color: config.examTypes.step.color, title: 'STEP · ستيب', desc: 'أسئلة في القواعد، المفردات، والقراءة' },
              { icon: 'language' as const, color: config.examTypes.ielts.color, title: 'IELTS · آيلتس', desc: 'أسئلة في القراءة، الاستماع، والكتابة' },
              { icon: 'psychology' as const, color: config.examTypes.psychometric.color, title: 'سيكومتري', desc: 'تحليل عددي، لفظي، ومنطقي' },
            ].map((item) => (
              <View key={item.title} style={[styles.introCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.introCardIcon, { backgroundColor: item.color + '18' }]}><MaterialIcons name={item.icon} size={24} color={item.color} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.introCardTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.introCardDesc, { color: theme.textSecondary }]}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.introInfo, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.introInfoRow}><MaterialIcons name="timer" size={18} color={theme.textSecondary} /><Text style={[styles.introInfoText, { color: theme.textSecondary }]}>مدة تقريبية: 15-20 دقيقة</Text></View>
            <View style={styles.introInfoRow}><MaterialIcons name="auto-awesome" size={18} color={theme.primary} /><Text style={[styles.introInfoText, { color: theme.textSecondary }]}>سيحلل الذكاء الاصطناعي نتائجك تلقائياً</Text></View>
            <View style={styles.introInfoRow}><MaterialIcons name="trending-up" size={18} color={theme.success} /><Text style={[styles.introInfoText, { color: theme.textSecondary }]}>يحدد نقاط القوة والضعف لإنشاء خطتك</Text></View>
          </View>
        </ScrollView>
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]} onPress={handleStartQuiz} disabled={loadingQuestions}>
            <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.startBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loadingQuestions ? <ActivityIndicator color="#FFF" /> : <><MaterialIcons name="play-arrow" size={24} color="#FFF" /><Text style={styles.startBtnText}>ابدأ الاختبار التشخيصي</Text></>}
            </LinearGradient>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.skipDiagnosticBtn, { borderColor: theme.border }, pressed && { opacity: 0.7 }]} onPress={handleSkipDiagnostic}>
            <Text style={[styles.skipDiagnosticText, { color: theme.textSecondary }]}>تخطي الاختبار والبدء مباشرة</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ===================== ANALYZING PHASE =====================
  if (phase === 'analyzing') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.analyzeContainer}>
          <View style={[styles.analyzeIconWrap, { backgroundColor: theme.primary + '18' }]}><MaterialIcons name="auto-awesome" size={48} color={theme.primary} /></View>
          <Text style={[styles.analyzeTitle, { color: theme.textPrimary }]}>جاري تحليل النتائج...</Text>
          <Text style={[styles.analyzeSubtitle, { color: theme.textSecondary }]}>يقوم الذكاء الاصطناعي بتقييم أدائك</Text>
          <View style={[styles.analyzeBarTrack, { backgroundColor: theme.surfaceLight }]}><View style={[styles.analyzeBarFill, { width: `${analyzeProgress}%`, backgroundColor: theme.primary }]} /></View>
          <Text style={[styles.analyzePercent, { color: theme.primary }]}>{analyzeProgress}%</Text>
          <View style={styles.analyzeSteps}>
            {[{ label: 'تحليل الإجابات', done: analyzeProgress >= 30 }, { label: 'تقييم المستوى', done: analyzeProgress >= 60 }, { label: 'إنشاء خريطة المهارات', done: analyzeProgress >= 85 }, { label: 'تجهيز الخطة الشخصية', done: analyzeProgress >= 95 }].map((step) => (
              <View key={step.label} style={styles.analyzeStep}>
                <MaterialIcons name={step.done ? 'check-circle' : 'radio-button-unchecked'} size={18} color={step.done ? theme.success : theme.textMuted} />
                <Text style={[styles.analyzeStepText, { color: step.done ? theme.textPrimary : theme.textMuted }]}>{step.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ===================== RESULTS PHASE =====================
  if (phase === 'results') {
    const strengths = skills.filter(s => s.category === 'strength');
    const weaknesses = skills.filter(s => s.category === 'weakness');
    const improving = skills.filter(s => s.category === 'improving');

    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 90 }} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.resultsHeader}>
            <Text style={[styles.resultsTitle, { color: theme.textPrimary }]}>نتيجة التشخيص</Text>
            <ProgressRing progress={overallScore / 100} size={160} strokeWidth={12} color={overallScore >= 70 ? theme.success : overallScore >= 45 ? theme.warning : theme.error}>
              <Text style={[styles.resultsScore, { color: overallScore >= 70 ? theme.success : overallScore >= 45 ? theme.warning : theme.error }]}>{overallScore}%</Text>
              <Text style={[styles.resultsScoreLabel, { color: theme.textSecondary }]}>المستوى العام</Text>
            </ProgressRing>
            <Text style={[styles.resultsLevel, { color: theme.textSecondary }]}>
              {overallScore >= 80 ? 'متقدم — مستوى ممتاز!' : overallScore >= 60 ? 'متوسط — أساس جيد للتطوير' : overallScore >= 40 ? 'مبتدئ-متوسط — فرصة كبيرة للتحسن' : 'مبتدئ — لا تقلق، سنبني خطة مخصصة لك!'}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>نتائج الاختبارات</Text>
            {results.map((r) => {
              const ec = config.examTypes[r.examType];
              return (
                <View key={r.examType} style={[styles.examResultCard, { backgroundColor: theme.surface, borderColor: ec.color + '40' }]}>
                  <View style={styles.examResultHeader}>
                    <View style={[styles.examResultIcon, { backgroundColor: ec.color + '18' }]}><MaterialIcons name={ec.icon} size={22} color={ec.color} /></View>
                    <View style={{ flex: 1 }}><Text style={[styles.examResultName, { color: theme.textPrimary }]}>{ec.nameAr}</Text><Text style={[styles.examResultSub, { color: theme.textSecondary }]}>{r.correct} من {r.total} إجابة صحيحة</Text></View>
                    <Text style={[styles.examResultPercent, { color: ec.color }]}>{r.percent}%</Text>
                  </View>
                  <View style={styles.examSections}>
                    {Object.entries(r.sections).map(([section, data]) => {
                      const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                      return (
                        <View key={section} style={styles.sectionBarRow}>
                          <Text style={[styles.sectionBarLabel, { color: theme.textSecondary }]}>{data.sectionAr}</Text>
                          <View style={[styles.sectionBarTrack, { backgroundColor: theme.surfaceLight }]}><View style={[styles.sectionBarFill, { width: `${pct}%`, backgroundColor: ec.color }]} /></View>
                          <Text style={[styles.sectionBarValue, { color: ec.color }]}>{pct}%</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </Animated.View>

          {strengths.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.section}>
              <View style={styles.skillHeader}><MaterialIcons name="emoji-events" size={20} color={theme.success} /><Text style={[styles.sectionTitle, { marginBottom: 0, color: theme.textPrimary }]}>نقاط القوة</Text></View>
              <View style={styles.skillsGrid}>{strengths.map((s) => (
                <View key={s.skill} style={[styles.skillChip, { backgroundColor: theme.success + '15', borderColor: theme.success + '30' }]}><Text style={[styles.skillChipText, { color: theme.success }]}>{s.skillAr}</Text><Text style={[styles.skillChipLevel, { color: theme.success }]}>{s.level}%</Text></View>
              ))}</View>
            </Animated.View>
          ) : null}

          {weaknesses.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(700).duration(600)} style={styles.section}>
              <View style={styles.skillHeader}><MaterialIcons name="trending-down" size={20} color={theme.error} /><Text style={[styles.sectionTitle, { marginBottom: 0, color: theme.textPrimary }]}>تحتاج تركيز</Text></View>
              <View style={styles.skillsGrid}>{weaknesses.map((s) => (
                <View key={s.skill} style={[styles.skillChip, { backgroundColor: theme.error + '12', borderColor: theme.error + '25' }]}><Text style={[styles.skillChipText, { color: theme.error }]}>{s.skillAr}</Text><Text style={[styles.skillChipLevel, { color: theme.error }]}>{s.level}%</Text></View>
              ))}</View>
            </Animated.View>
          ) : null}

          {improving.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(900).duration(600)} style={styles.section}>
              <View style={styles.skillHeader}><MaterialIcons name="trending-up" size={20} color={theme.warning} /><Text style={[styles.sectionTitle, { marginBottom: 0, color: theme.textPrimary }]}>بحاجة تطوير</Text></View>
              <View style={styles.skillsGrid}>{improving.map((s) => (
                <View key={s.skill} style={[styles.skillChip, { backgroundColor: theme.warning + '12', borderColor: theme.warning + '25' }]}><Text style={[styles.skillChipText, { color: theme.warning }]}>{s.skillAr}</Text><Text style={[styles.skillChipLevel, { color: theme.warning }]}>{s.level}%</Text></View>
              ))}</View>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(1100).duration(600)} style={styles.section}>
            <View style={[styles.aiRecommendation, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '25' }]}>
              <View style={styles.aiRecommendationHeader}><MaterialIcons name="auto-awesome" size={22} color={theme.primary} /><Text style={[styles.aiRecommendationTitle, { color: theme.primary }]}>توصية المدرب الذكي</Text></View>
              <Text style={[styles.aiRecommendationText, { color: theme.textPrimary }]}>
                {overallScore >= 70 ? 'مستواك ممتاز! ننصحك بالتركيز على المواضيع المتقدمة وحل اختبارات تجريبية كاملة لتعزيز ثقتك.' : overallScore >= 45 ? 'لديك أساس جيد. ننصحك بتخصيص وقت يومي للمواضيع التي تحتاج تركيزاً.' : 'لا تقلق! خطتك الشخصية ستبدأ من الأساسيات. التزم بالتدريب اليومي وستلاحظ تحسناً سريعاً.'}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
        <View style={[styles.stickyBottom, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: theme.background, borderTopColor: theme.border }]}>
          <Pressable style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]} onPress={handleFinish}>
            <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.startBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.startBtnText}>ابدأ رحلة التعلّم</Text><MaterialIcons name="arrow-forward" size={22} color="#FFF" />
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ===================== QUIZ PHASE =====================
  if (!currentQuestion || !examConfig) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 12 }}>جاري تحميل الأسئلة...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* Header with Exit Button */}
      <View style={styles.quizHeader}>
        <Pressable onPress={handleExit} hitSlop={12} style={[styles.quizExitBtn, { backgroundColor: theme.surface }]}>
          <MaterialIcons name="close" size={22} color={theme.textSecondary} />
        </Pressable>
        <View style={styles.quizHeaderLeft}>
          <View style={[styles.examBadge, { backgroundColor: examConfig.color + '18' }]}>
            <MaterialIcons name={examConfig.icon} size={16} color={examConfig.color} />
            <Text style={[styles.examBadgeText, { color: examConfig.color }]}>{examConfig.nameAr}</Text>
          </View>
        </View>
        <Text style={[styles.questionCount, { color: theme.textSecondary }]}>{currentIndex + 1} / {questions.length}</Text>
        <View style={[styles.timerContainer, { backgroundColor: theme.surface }]}>
          <MaterialIcons name="timer" size={16} color={timeLeft <= 10 ? theme.error : theme.textSecondary} />
          <Text style={[styles.timerText, { color: timeLeft <= 10 ? theme.error : theme.textPrimary }]}>{timeLeft}s</Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: theme.surfaceLight }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: examConfig.color }, progressBarStyle]} />
      </View>

      <Animated.View style={[styles.content, cardStyle]}>
        <View style={styles.topicRow}>
          <View style={[styles.topicBadgeSmall, { backgroundColor: examConfig.color + '18' }]}><Text style={[styles.topicText, { color: examConfig.color }]}>{currentQuestion.topicAr}</Text></View>
          <View style={[styles.topicBadgeSmall, { backgroundColor: currentQuestion.difficulty === 'beginner' ? theme.success + '18' : currentQuestion.difficulty === 'intermediate' ? theme.warning + '18' : currentQuestion.difficulty === 'advanced' ? theme.error + '18' : theme.secondary + '18' }]}>
            <Text style={[styles.topicText, { color: currentQuestion.difficulty === 'beginner' ? theme.success : currentQuestion.difficulty === 'intermediate' ? theme.warning : currentQuestion.difficulty === 'advanced' ? theme.error : theme.secondary }]}>
              {currentQuestion.difficulty === 'beginner' ? 'مبتدئ' : currentQuestion.difficulty === 'intermediate' ? 'متوسط' : currentQuestion.difficulty === 'advanced' ? 'متقدم' : 'خبير'}
            </Text>
          </View>
        </View>
        <Text style={[styles.questionText, { color: theme.textPrimary }]}>{currentQuestion.questionText}</Text>
        <View style={styles.optionsContainer}>
          {currentQuestion.options.filter(o => o !== '').map((option, index) => (
            <QuizOption key={index} text={option} index={index} selected={selectedAnswer === index} isCorrect={index === currentQuestion.correctAnswer} showResult={showResult} onPress={() => handleSelect(index)} />
          ))}
        </View>
        {showResult ? (
          <Animated.View style={[styles.explanationCard, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '25' }, resultStyle]}>
            <MaterialIcons name="auto-awesome" size={18} color={theme.primary} />
            <Text style={[styles.explanationText, { color: theme.textPrimary }]}>{currentQuestion.explanation}</Text>
          </Animated.View>
        ) : null}
      </Animated.View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {!showResult ? (
          <Pressable style={[styles.confirmBtn, { backgroundColor: selectedAnswer !== null ? examConfig.color : theme.surfaceLight }]} onPress={handleConfirm} disabled={selectedAnswer === null}>
            <Text style={[styles.confirmBtnText, { color: selectedAnswer !== null ? '#FFF' : theme.textMuted }]}>تأكيد الإجابة</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.confirmBtn, { backgroundColor: examConfig.color }]} onPress={handleNext}>
            <Text style={styles.confirmBtnText}>{currentIndex + 1 >= questions.length ? 'تحليل النتائج' : 'السؤال التالي'}</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#FFF" />
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  // Exit button on intro
  exitBtn: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, zIndex: 10 },
  // Intro
  introContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, alignItems: 'center' },
  introIconWrap: { marginBottom: 24 },
  introIconGradient: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  introTitle: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  introSubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 24, marginTop: 8, paddingHorizontal: 12 },
  introCards: { width: '100%', gap: 12, marginTop: 32 },
  introCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 16, borderWidth: 1 },
  introCardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  introCardTitle: { fontSize: 15, fontWeight: '700' },
  introCardDesc: { fontSize: 13, marginTop: 2 },
  introInfo: { width: '100%', marginTop: 28, gap: 12, borderRadius: 16, padding: 18, borderWidth: 1 },
  introInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  introInfoText: { fontSize: 14, flex: 1 },
  // Quiz Header
  quizHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  quizExitBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quizHeaderLeft: { flex: 1 },
  examBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start' },
  examBadgeText: { fontSize: 13, fontWeight: '700' },
  questionCount: { fontSize: 13, fontWeight: '600' },
  timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  timerText: { fontSize: 16, fontWeight: '700' },
  progressTrack: { height: 3, marginHorizontal: 16, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  topicRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  topicBadgeSmall: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  topicText: { fontSize: 12, fontWeight: '600' },
  questionText: { fontSize: 18, fontWeight: '600', lineHeight: 28, marginBottom: 24 },
  optionsContainer: { gap: 0 },
  explanationCard: { flexDirection: 'row', gap: 10, borderRadius: 12, padding: 14, borderWidth: 1, marginTop: 8 },
  explanationText: { flex: 1, fontSize: 13, lineHeight: 20 },
  bottomBar: { paddingHorizontal: 20, paddingTop: 12 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 14 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  startBtn: { borderRadius: 16, overflow: 'hidden' },
  startBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 16 },
  startBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  skipDiagnosticBtn: { alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14, borderWidth: 1, marginTop: 10 },
  skipDiagnosticText: { fontSize: 15, fontWeight: '600' },
  // Analyzing
  analyzeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  analyzeIconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  analyzeTitle: { fontSize: 24, fontWeight: '700', marginBottom: 6 },
  analyzeSubtitle: { fontSize: 14, marginBottom: 32 },
  analyzeBarTrack: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  analyzeBarFill: { height: 8, borderRadius: 4 },
  analyzePercent: { fontSize: 14, fontWeight: '700', marginBottom: 32 },
  analyzeSteps: { width: '100%', gap: 14 },
  analyzeStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  analyzeStepText: { fontSize: 14, fontWeight: '500' },
  // Results
  resultsHeader: { alignItems: 'center', paddingTop: 24, paddingHorizontal: 24, gap: 16 },
  resultsTitle: { fontSize: 26, fontWeight: '700' },
  resultsScore: { fontSize: 40, fontWeight: '700' },
  resultsScoreLabel: { fontSize: 11, fontWeight: '600', marginTop: -4 },
  resultsLevel: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  examResultCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  examResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  examResultIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  examResultName: { fontSize: 16, fontWeight: '700' },
  examResultSub: { fontSize: 12, marginTop: 2 },
  examResultPercent: { fontSize: 28, fontWeight: '700' },
  examSections: { gap: 10 },
  sectionBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionBarLabel: { fontSize: 12, width: 80, fontWeight: '500' },
  sectionBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  sectionBarFill: { height: 6, borderRadius: 3 },
  sectionBarValue: { fontSize: 13, fontWeight: '700', width: 38, textAlign: 'right' },
  skillHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  skillChipText: { fontSize: 13, fontWeight: '600' },
  skillChipLevel: { fontSize: 12, fontWeight: '700' },
  aiRecommendation: { borderRadius: 16, padding: 18, borderWidth: 1 },
  aiRecommendationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  aiRecommendationTitle: { fontSize: 15, fontWeight: '700' },
  aiRecommendationText: { fontSize: 14, lineHeight: 22 },
  stickyBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
});
