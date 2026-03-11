import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import { useColors } from '../../hooks/useTheme';
import TaskCard from '../../components/ui/TaskCard';
import ProgressRing from '../../components/ui/ProgressRing';
import CelebrationOverlay from '../../components/ui/CelebrationOverlay';
import { useCelebrationSound } from '../../hooks/useCelebrationSound';
import { useAuth } from '@/template';

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useColors();
  const { dailyPlan, completeTask, startQuiz, updateStreak, loading } = useApp();
  const { user: authUser } = useAuth();
  const { playSuccess } = useCelebrationSound();
  const [celebration, setCelebration] = useState<{ visible: boolean; taskName?: string; score?: number }>({ visible: false });
  const [startingQuiz, setStartingQuiz] = useState(false);

  const completedCount = dailyPlan.tasks.filter(t => t.completed).length;
  const totalCount = dailyPlan.tasks.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const triggerCelebration = useCallback((taskName: string, score?: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playSuccess();
    setCelebration({ visible: true, taskName, score });
  }, [playSuccess]);

  const handleTaskPress = async (task: typeof dailyPlan.tasks[0]) => {
    if (task.completed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (task.type === 'quiz' || task.type === 'test' || task.type === 'practice') {
      setStartingQuiz(true);
      await startQuiz(task.examType);
      setStartingQuiz(false);
      router.push('/quiz');
    } else {
      const taskScore = completeTask(task.id);
      triggerCelebration(task.titleAr, taskScore);
      // Check if all tasks completed
      const nowCompleted = dailyPlan.tasks.filter(t => t.completed || t.id === task.id).length;
      if (nowCompleted === dailyPlan.tasks.length) {
        updateStreak();
      }
    }
  };

  if (loading && totalCount === 0) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 12, fontSize: 14 }}>جاري تحميل خطتك...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>خطتك اليومية</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>اليوم {dailyPlan.day} من 30</Text>
        </View>

        <View style={styles.heroContainer}>
          <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border, ...theme.shadow.elevated }]}>
            <ProgressRing progress={progress} size={120} strokeWidth={10} color={progress >= 1 ? theme.success : theme.primary} trackColor={theme.surfaceLight}>
              <Text style={[styles.heroPercent, { color: theme.primary }]}>{Math.round(progress * 100)}%</Text>
            </ProgressRing>
            <View style={styles.heroInfo}>
              <Text style={[styles.heroLabel, { color: theme.textSecondary }]}>تقدّم اليوم</Text>
              <Text style={[styles.heroCount, { color: theme.textPrimary }]}>{completedCount} من {totalCount} مهام</Text>
              <View style={styles.timeRow}>
                <MaterialIcons name="schedule" size={14} color={theme.textSecondary} />
                <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                  {dailyPlan.tasks.filter(t => !t.completed).reduce((a, b) => a + b.duration, 0)} دقيقة متبقية
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>الخطة التدريبية (30 يوم)</Text>
          <View style={[styles.planBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.planDays}>
              {Array.from({ length: 30 }, (_, i) => {
                const dayNum = i + 1;
                const isPast = dayNum < dailyPlan.day;
                const isCurrent = dayNum === dailyPlan.day;
                return (
                  <View key={i} style={[styles.planDot, {
                    backgroundColor: isPast ? theme.success : isCurrent ? theme.primary : theme.surfaceLight,
                    width: isCurrent ? 12 : 8, height: isCurrent ? 12 : 8, borderRadius: isCurrent ? 6 : 4,
                  }]} />
                );
              })}
            </View>
            <View style={styles.planLabels}>
              <Text style={[styles.planLabel, { color: theme.textMuted }]}>اليوم 1</Text>
              <Text style={[styles.planLabel, { color: theme.primary }]}>اليوم {dailyPlan.day}</Text>
              <Text style={[styles.planLabel, { color: theme.textMuted }]}>اليوم 30</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>مهام اليوم</Text>
          {totalCount > 0 ? dailyPlan.tasks.map((task) => (
            <TaskCard key={task.id} titleAr={task.titleAr} typeAr={task.typeAr} examType={task.examType} duration={task.duration} completed={task.completed} score={task.score} onPress={() => handleTaskPress(task)} />
          )) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-note" size={40} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد مهام لهذا اليوم</Text>
            </View>
          )}
        </View>

        {completedCount === totalCount && totalCount > 0 ? (
          <View style={[styles.completeCard, { backgroundColor: theme.accent + '12', borderColor: theme.accent + '30' }]}>
            <MaterialIcons name="emoji-events" size={40} color={theme.accent} />
            <Text style={[styles.completeTitle, { color: theme.textPrimary }]}>أحسنت! أكملت جميع المهام</Text>
            <Text style={[styles.completeSubtext, { color: theme.textSecondary }]}>عد غداً لمواصلة خطتك التدريبية</Text>
          </View>
        ) : null}
      </ScrollView>
      <CelebrationOverlay visible={celebration.visible} onFinish={() => setCelebration({ visible: false })} taskName={celebration.taskName} score={celebration.score} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  heroContainer: { paddingHorizontal: 20, paddingTop: 16 },
  heroCard: { flexDirection: 'row', borderRadius: 20, padding: 20, borderWidth: 1, alignItems: 'center', gap: 20 },
  heroPercent: { fontSize: 28, fontWeight: '700' },
  heroInfo: { flex: 1, gap: 6 },
  heroLabel: { fontSize: 14, fontWeight: '600' },
  heroCount: { fontSize: 22, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12 },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  planBar: { borderRadius: 14, padding: 16, borderWidth: 1 },
  planDays: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginBottom: 12 },
  planDot: { width: 8, height: 8, borderRadius: 4 },
  planLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  planLabel: { fontSize: 10, fontWeight: '600' },
  completeCard: { margin: 20, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, gap: 8 },
  completeTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  completeSubtext: { fontSize: 13, textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14 },
});
