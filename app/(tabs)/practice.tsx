import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { config } from '../../constants/config';
import { useApp } from '../../contexts/AppContext';
import { useColors } from '../../hooks/useTheme';
import { generateAIQuestions } from '../../services/aiQuestions';
import SkillBar from '../../components/ui/SkillBar';

export default function PracticeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useColors();
  const { examProgress, selectedExam, setSelectedExam, practiceTests, skillMap, startQuiz, startQuizWithQuestions, loading } = useApp();
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  const examTypes = ['step', 'ielts', 'psychometric'] as const;
  const currentProgress = examProgress.find(ep => ep.examType === selectedExam);
  const examConfig = config.examTypes[selectedExam];
  const filteredTests = practiceTests.filter(t => t.examType === selectedExam);

  const handleStartQuiz = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setStartingQuiz(true);
    await startQuiz(selectedExam);
    setStartingQuiz(false);
    router.push('/quiz');
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>التدريب</Text>
        </View>

        <View style={styles.selectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {examTypes.map((type) => {
              const ec = config.examTypes[type];
              const isActive = type === selectedExam;
              return (
                <Pressable key={type} onPress={() => { Haptics.selectionAsync(); setSelectedExam(type); }}
                  style={[styles.chip, { backgroundColor: isActive ? ec.color : theme.surface, borderColor: isActive ? ec.color : theme.border }]}>
                  <MaterialIcons name={ec.icon} size={18} color={isActive ? '#FFF' : theme.textSecondary} />
                  <Text style={[styles.chipText, { color: isActive ? '#FFF' : theme.textSecondary }]}>{ec.nameAr}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {currentProgress && currentProgress.sectionsProgress.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>أقسام {examConfig.nameAr}</Text>
            <View style={styles.sectionsGrid}>
              {currentProgress.sectionsProgress.map((sp) => (
                <View key={sp.name} style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.sectionCardHeader}>
                    <Text style={[styles.sectionCardName, { color: theme.textPrimary }]}>{sp.nameAr}</Text>
                    <MaterialIcons name={sp.trend === 'up' ? 'trending-up' : sp.trend === 'down' ? 'trending-down' : 'trending-flat'} size={16} color={sp.trend === 'up' ? theme.success : sp.trend === 'down' ? theme.error : theme.textMuted} />
                  </View>
                  <Text style={[styles.sectionCardScore, { color: examConfig.color }]}>{sp.score}%</Text>
                  <View style={[styles.sectionBarTrack, { backgroundColor: theme.surfaceLight }]}>
                    <View style={[styles.sectionBarFill, { width: `${sp.score}%`, backgroundColor: examConfig.color }]} />
                  </View>
                  <View style={styles.topicsRow}>
                    {sp.weakTopics.slice(0, 1).map(t => (
                      <View key={t} style={[styles.topicBadge, { backgroundColor: theme.error + '15', borderColor: theme.error + '30' }]}>
                        <Text style={[styles.topicText, { color: theme.error }]}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Pressable style={[styles.quickStartBtn, { backgroundColor: examConfig.color, opacity: startingQuiz ? 0.7 : 1, marginBottom: 10 }]} onPress={handleStartQuiz} disabled={startingQuiz}>
            {startingQuiz ? <ActivityIndicator size="small" color="#FFF" /> : <MaterialIcons name="play-arrow" size={28} color="#FFF" />}
            <View style={{ flex: 1 }}>
              <Text style={styles.quickStartTitle}>تدريب تكيّفي سريع</Text>
              <Text style={styles.quickStartSub}>أسئلة من بنك الأسئلة</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
          </Pressable>

          <Pressable
            style={[styles.aiQuizBtn, { borderColor: examConfig.color + '60', backgroundColor: theme.surface, opacity: generatingAI ? 0.7 : 1 }]}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setGeneratingAI(true);
              try {
                const weakTopics = skillMap.filter(s => s.category === 'weakness').map(s => s.skill);
                const { questions: aiQuestions, error } = await generateAIQuestions({
                  examType: selectedExam,
                  difficulty: currentProgress && currentProgress.overallScore > 70 ? 'advanced' : currentProgress && currentProgress.overallScore > 40 ? 'intermediate' : 'beginner',
                  count: 8, weakTopics,
                });
                setGeneratingAI(false);
                if (error || !aiQuestions || aiQuestions.length === 0) {
                  // Fallback to database questions if AI fails
                  await handleStartQuiz();
                  return;
                }
                // Map AI questions to Quiz format and start quiz directly
                const mappedQuestions = aiQuestions.map((q, i) => ({
                  id: `ai-${Date.now()}-${i}`,
                  examType: selectedExam as 'step' | 'ielts' | 'psychometric',
                  section: q.section || 'General',
                  sectionAr: q.section_ar || 'عام',
                  difficulty: q.difficulty || 'intermediate',
                  questionText: q.question_text,
                  options: q.options,
                  correctAnswer: q.correct_answer,
                  explanation: q.explanation,
                  timeLimit: 45,
                  topic: q.topic || 'General',
                  topicAr: q.topic_ar || 'عام',
                }));
                startQuizWithQuestions(selectedExam, mappedQuestions);
                router.push('/quiz');
              } catch {
                setGeneratingAI(false);
                await handleStartQuiz();
              }
            }}
            disabled={generatingAI}
          >
            {generatingAI ? <ActivityIndicator size="small" color={examConfig.color} /> : <MaterialIcons name="auto-awesome" size={24} color={examConfig.color} />}
            <View style={{ flex: 1 }}>
              <Text style={[styles.quickStartTitle, { color: examConfig.color }]}>{generatingAI ? 'جاري توليد الأسئلة...' : 'أسئلة ذكية مولّدة بالـ AI'}</Text>
              <Text style={[styles.quickStartSub, { color: theme.textSecondary }]}>أسئلة جديدة مخصصة لنقاط ضعفك</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={20} color={examConfig.color} />
          </Pressable>
        </View>

        {skillMap.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>خريطتك المهارية</Text>
            <View style={[styles.skillCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.skillLegend}>
                {[{ dot: theme.success, text: 'نقاط قوة' }, { dot: theme.accent, text: 'تتحسن' }, { dot: theme.error, text: 'نقاط ضعف' }].map(l => (
                  <View key={l.text} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: l.dot }]} />
                    <Text style={[styles.legendText, { color: theme.textSecondary }]}>{l.text}</Text>
                  </View>
                ))}
              </View>
              {skillMap.sort((a, b) => b.level - a.level).slice(0, 8).map((s) => (
                <SkillBar key={s.skill} skillAr={s.skillAr} level={s.level} category={s.category} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>اختبارات تدريبية</Text>
          {filteredTests.length > 0 ? filteredTests.map((test) => (
            <Pressable key={test.id} onPress={handleStartQuiz} style={({ pressed }) => [styles.testCard, { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 }]}>
              <View style={[styles.testIcon, { backgroundColor: examConfig.color + '20' }]}>
                <MaterialIcons name="assignment" size={22} color={examConfig.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.testTitle, { color: theme.textPrimary }]}>{test.titleAr}</Text>
                <Text style={[styles.testMeta, { color: theme.textSecondary }]}>{test.questionCount} سؤال {"\u2022"} {test.duration} دقيقة {"\u2022"} {test.difficulty}</Text>
              </View>
              <MaterialIcons name="play-circle-outline" size={28} color={examConfig.color} />
            </Pressable>
          )) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="school" size={40} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد اختبارات متاحة حالياً</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: '700' },
  selectorContainer: { paddingTop: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '600' },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sectionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sectionCard: { flexBasis: '47%', flexGrow: 1, borderRadius: 14, padding: 14, borderWidth: 1 },
  sectionCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sectionCardName: { fontSize: 13, fontWeight: '600' },
  sectionCardScore: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  sectionBarTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  sectionBarFill: { height: 4, borderRadius: 2 },
  topicsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  topicBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  topicText: { fontSize: 10, fontWeight: '600' },
  quickStartBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 12 },
  quickStartTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  quickStartSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  skillCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  skillLegend: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },
  testCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, borderWidth: 1, gap: 12, marginBottom: 10 },
  testIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  testTitle: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  testMeta: { fontSize: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14 },
  aiQuizBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 12, borderWidth: 1.5 },
});
