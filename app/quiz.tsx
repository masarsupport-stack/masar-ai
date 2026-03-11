import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withSpring } from 'react-native-reanimated';
import { config } from '../constants/config';
import { useApp } from '../contexts/AppContext';
import { useColors } from '../hooks/useTheme';
import { getAIExplanation } from '../services/aiQuestions';
import ProgressRing from '../components/ui/ProgressRing';
import QuizOption from '../components/ui/QuizOption';

export default function QuizScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useColors();
  const { quizState, answerQuestion, nextQuestion, resetQuiz, refreshData } = useApp();
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const progressWidth = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const resultOpacity = useSharedValue(0);

  const currentQuestion = quizState?.questions[quizState.currentIndex];
  const examCfg = quizState ? config.examTypes[quizState.examType] : null;
  const progress = quizState ? (quizState.currentIndex + 1) / quizState.questions.length : 0;

  useEffect(() => {
    if (currentQuestion) {
      setTimeLeft(currentQuestion.timeLimit); setSelectedAnswer(null); setShowResult(false);
      progressWidth.value = withTiming(progress, { duration: 300 });
      cardScale.value = withSequence(withTiming(0.97, { duration: 100 }), withSpring(1, { damping: 15 }));
    }
  }, [quizState?.currentIndex]);

  useEffect(() => {
    if (showResult || !currentQuestion || quizState?.isComplete) return;
    if (timeLeft <= 0) { setShowResult(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); resultOpacity.value = withTiming(1, { duration: 300 }); return; }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, showResult, quizState?.isComplete]);

  const handleConfirm = async () => {
    if (selectedAnswer === null || !currentQuestion) return;
    answerQuestion(selectedAnswer);
    setShowResult(true); setAiExplanation(null);
    if (selectedAnswer === currentQuestion.correctAnswer) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    resultOpacity.value = withTiming(1, { duration: 300 });
    setLoadingExplanation(true);
    const { explanation } = await getAIExplanation({ questionText: currentQuestion.questionText, options: currentQuestion.options, correctAnswer: currentQuestion.correctAnswer, userAnswer: selectedAnswer, examType: quizState!.examType });
    setAiExplanation(explanation || null); setLoadingExplanation(false);
  };

  const handleNext = () => { resultOpacity.value = 0; setAiExplanation(null); nextQuestion(); };
  const handleClose = useCallback(async () => { const wasComplete = quizState?.isComplete; resetQuiz(); if (wasComplete) await refreshData(); router.back(); }, [quizState?.isComplete, resetQuiz, refreshData, router]);

  const progressBarStyle = useAnimatedStyle(() => ({ width: `${progressWidth.value * 100}%` }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const resultStyle = useAnimatedStyle(() => ({ opacity: resultOpacity.value }));

  if (quizState?.isComplete) {
    const scorePercent = Math.round((quizState.score / quizState.questions.length) * 100);
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.completeContainer}>
          <Image source={require('../assets/images/achievement.png')} style={styles.completeImage} contentFit="contain" />
          <Text style={[styles.completeTitle, { color: theme.textPrimary }]}>انتهى الاختبار!</Text>
          <ProgressRing progress={scorePercent / 100} size={160} strokeWidth={12} color={scorePercent >= 80 ? theme.success : scorePercent >= 60 ? theme.warning : theme.error}>
            <Text style={[styles.completeScore, { color: scorePercent >= 80 ? theme.success : scorePercent >= 60 ? theme.warning : theme.error }]}>{scorePercent}%</Text>
          </ProgressRing>
          <Text style={[styles.completeDetail, { color: theme.textSecondary }]}>{quizState.score} إجابة صحيحة من {quizState.questions.length}</Text>
          <View style={styles.completeStats}>
            <View style={styles.completeStat}><MaterialIcons name="check-circle" size={20} color={theme.success} /><Text style={[styles.completeStatText, { color: theme.textPrimary }]}>صحيحة: {quizState.score}</Text></View>
            <View style={styles.completeStat}><MaterialIcons name="cancel" size={20} color={theme.error} /><Text style={[styles.completeStatText, { color: theme.textPrimary }]}>خاطئة: {quizState.questions.length - quizState.score}</Text></View>
          </View>
          <Pressable style={[styles.completeBtn, { backgroundColor: theme.primary }]} onPress={handleClose}><Text style={styles.completeBtnText}>العودة للوحة التحكم</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentQuestion || !examCfg) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <MaterialIcons name="quiz" size={48} color={theme.textMuted} />
          <Text style={{ color: theme.textSecondary, fontSize: 16 }}>لا يوجد اختبار حالياً</Text>
          <Pressable style={{ backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }} onPress={() => router.back()}><Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>العودة</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={handleClose} hitSlop={12} style={[styles.closeBtn, { backgroundColor: theme.surface }]}><MaterialIcons name="close" size={24} color={theme.textSecondary} /></Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.examBadge, { color: examCfg.color }]}>{examCfg.nameAr}</Text>
          <Text style={[styles.questionCount, { color: theme.textSecondary }]}>{quizState!.currentIndex + 1} / {quizState!.questions.length}</Text>
        </View>
        <View style={[styles.timerContainer, { backgroundColor: theme.surface }]}>
          <MaterialIcons name="timer" size={16} color={timeLeft <= 10 ? theme.error : theme.textSecondary} />
          <Text style={[styles.timerText, { color: timeLeft <= 10 ? theme.error : theme.textPrimary }]}>{timeLeft}s</Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: theme.surfaceLight }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: examCfg.color }, progressBarStyle]} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Animated.View style={cardStyle}>
        <View style={styles.topicRow}>
          <View style={[styles.topicBadge, { backgroundColor: examCfg.color + '18' }]}><Text style={[styles.topicText, { color: examCfg.color }]}>{currentQuestion.topicAr}</Text></View>
          <View style={[styles.diffBadge, { backgroundColor: currentQuestion.difficulty === 'beginner' ? theme.success + '18' : currentQuestion.difficulty === 'intermediate' ? theme.warning + '18' : currentQuestion.difficulty === 'advanced' ? theme.error + '18' : theme.secondary + '18' }]}>
            <Text style={[styles.diffText, { color: currentQuestion.difficulty === 'beginner' ? theme.success : currentQuestion.difficulty === 'intermediate' ? theme.warning : currentQuestion.difficulty === 'advanced' ? theme.error : theme.secondary }]}>
              {currentQuestion.difficulty === 'beginner' ? 'مبتدئ' : currentQuestion.difficulty === 'intermediate' ? 'متوسط' : currentQuestion.difficulty === 'advanced' ? 'متقدم' : 'خبير'}
            </Text>
          </View>
        </View>
        <Text style={[styles.questionText, { color: theme.textPrimary }]}>{currentQuestion.questionText}</Text>
        <View style={styles.optionsContainer}>
          {currentQuestion.options.filter(o => o !== '').map((option, index) => (
            <QuizOption key={index} text={option} index={index} selected={selectedAnswer === index} isCorrect={index === currentQuestion.correctAnswer} showResult={showResult} onPress={() => { if (!showResult) { Haptics.selectionAsync(); setSelectedAnswer(index); } }} />
          ))}
        </View>
        {showResult ? (
          <Animated.View style={[styles.explanationCard, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '25' }, resultStyle]}>
            <MaterialIcons name="auto-awesome" size={18} color={theme.primary} />
            <Text style={[styles.explanationText, { color: theme.textPrimary }]}>{currentQuestion.explanation}</Text>
          </Animated.View>
        ) : null}
        {showResult && (loadingExplanation || aiExplanation) ? (
          <View style={[styles.aiExplainCard, { backgroundColor: theme.secondary + '10', borderColor: theme.secondary + '20' }]}>
            <View style={styles.aiExplainHeader}>
              <MaterialIcons name="psychology" size={18} color={theme.secondary} />
              <Text style={[styles.aiExplainTitle, { color: theme.secondary }]}>شرح المدرب الذكي</Text>
              {loadingExplanation ? <ActivityIndicator size="small" color={theme.secondary} /> : null}
            </View>
            {aiExplanation ? <Text style={[styles.aiExplainText, { color: theme.textPrimary }]}>{aiExplanation}</Text> : <Text style={[styles.aiExplainLoading, { color: theme.textMuted }]}>جاري تحليل إجابتك بالذكاء الاصطناعي...</Text>}
          </View>
        ) : null}
      </Animated.View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {!showResult ? (
          <Pressable style={[styles.actionBtn, { backgroundColor: selectedAnswer !== null ? examCfg.color : theme.surfaceLight }]} onPress={handleConfirm} disabled={selectedAnswer === null}>
            <Text style={[styles.actionBtnText, { color: selectedAnswer !== null ? '#FFF' : theme.textMuted }]}>تأكيد الإجابة</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.actionBtn, { backgroundColor: examCfg.color }]} onPress={handleNext}>
            <Text style={styles.actionBtnText}>{quizState!.currentIndex + 1 >= quizState!.questions.length ? 'عرض النتيجة' : 'السؤال التالي'}</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#FFF" />
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  closeBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  examBadge: { fontSize: 14, fontWeight: '700' },
  questionCount: { fontSize: 12, marginTop: 2 },
  timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  timerText: { fontSize: 16, fontWeight: '700' },
  progressTrack: { height: 3, marginHorizontal: 16, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  topicRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  topicBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  topicText: { fontSize: 12, fontWeight: '600' },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  diffText: { fontSize: 12, fontWeight: '600' },
  questionText: { fontSize: 18, fontWeight: '600', lineHeight: 28, marginBottom: 24 },
  optionsContainer: { gap: 0 },
  explanationCard: { flexDirection: 'row', gap: 10, borderRadius: 12, padding: 14, borderWidth: 1, marginTop: 8 },
  explanationText: { flex: 1, fontSize: 13, lineHeight: 20 },
  aiExplainCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginTop: 10 },
  aiExplainHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  aiExplainTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  aiExplainText: { fontSize: 13, lineHeight: 22 },
  aiExplainLoading: { fontSize: 12, fontStyle: 'italic' },
  bottomBar: { paddingHorizontal: 20, paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 14 },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  completeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  completeImage: { width: 120, height: 120, marginBottom: 8 },
  completeTitle: { fontSize: 28, fontWeight: '700' },
  completeScore: { fontSize: 36, fontWeight: '700' },
  completeDetail: { fontSize: 16, marginTop: 4 },
  completeStats: { flexDirection: 'row', gap: 24, marginTop: 8 },
  completeStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  completeStatText: { fontSize: 14, fontWeight: '600' },
  completeBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 16 },
  completeBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
