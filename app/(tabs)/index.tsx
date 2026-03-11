import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { config } from '../../constants/config';
import { useApp } from '../../contexts/AppContext';
import { useColors } from '../../hooks/useTheme';
import ProgressRing from '../../components/ui/ProgressRing';
import ExamCard from '../../components/ui/ExamCard';
import InsightCard from '../../components/ui/InsightCard';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useColors();
  const { user, examProgress, insights, selectedExam, setSelectedExam, dailyPlan, loading } = useApp();

  const completedTasks = dailyPlan.tasks.filter(t => t.completed).length;
  const totalTasks = dailyPlan.tasks.length;

  if (loading && examProgress.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 12, fontSize: 14 }}>جاري تحميل بياناتك...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: theme.textPrimary }]}>مرحباً، {user.nameAr} 👋</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>اليوم {dailyPlan.day} من خطتك التدريبية</Text>
          </View>
          <View style={[styles.streakBadge, { backgroundColor: theme.accent + '18', borderColor: theme.accent + '30' }]}>
            <MaterialIcons name="local-fire-department" size={18} color={theme.accent} />
            <Text style={[styles.streakText, { color: theme.accent }]}>{user.streak}</Text>
          </View>
        </View>

        {/* AI Score Hero */}
        <View style={styles.heroSection}>
          <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border, ...theme.shadow.elevated }]}>
            <View style={styles.heroLeft}>
              <ProgressRing
                progress={user.aiScore / 100}
                size={140}
                strokeWidth={10}
                color={theme.primary}
                trackColor={theme.surfaceLight}
              >
                <Text style={[styles.heroScore, { color: theme.primary }]}>{user.aiScore}</Text>
                <Text style={[styles.heroScoreLabel, { color: theme.textSecondary }]}>AI Score</Text>
              </ProgressRing>
            </View>
            <View style={styles.heroRight}>
              <View style={styles.heroStat}>
                <MaterialIcons name="trending-up" size={16} color={theme.success} />
                <Text style={[styles.heroStatLabel, { color: theme.textSecondary }]}>الجلسات</Text>
                <Text style={[styles.heroStatValue, { color: theme.textPrimary }]}>{user.totalSessions}</Text>
              </View>
              <View style={styles.heroStat}>
                <MaterialIcons name="check-circle" size={16} color={theme.primary} />
                <Text style={[styles.heroStatLabel, { color: theme.textSecondary }]}>مهام اليوم</Text>
                <Text style={[styles.heroStatValue, { color: theme.textPrimary }]}>{completedTasks}/{totalTasks}</Text>
              </View>
              <View style={styles.heroStat}>
                <MaterialIcons name="local-fire-department" size={16} color={theme.accent} />
                <Text style={[styles.heroStatLabel, { color: theme.textSecondary }]}>سلسلة الأيام</Text>
                <Text style={[styles.heroStatValue, { color: theme.textPrimary }]}>{user.streak} يوم</Text>
              </View>
              <Pressable
                style={[styles.startBtn, { backgroundColor: theme.primary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/(tabs)/practice');
                }}
              >
                <Text style={styles.startBtnText}>ابدأ التدريب</Text>
                <MaterialIcons name="arrow-forward" size={16} color="#FFF" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* AI Insights */}
        {insights.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>تنبيهات المدرب الذكي</Text>
            {insights.slice(0, 3).map((insight) => (
              <InsightCard key={insight.id} type={insight.type} messageAr={insight.messageAr} />
            ))}
          </View>
        ) : null}

        {/* Exam Progress Cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>تقدّمك في الاختبارات</Text>
          {examProgress.map((ep) => {
            const examCfg = config.examTypes[ep.examType];
            return (
              <ExamCard
                key={ep.examType}
                examType={ep.examType}
                nameAr={examCfg.nameAr}
                name={examCfg.name}
                score={ep.overallScore}
                readiness={ep.readiness}
                predictedScore={ep.examType === 'ielts' ? ep.predictedScore.toFixed(1) : ep.predictedScore}
                icon={examCfg.icon}
                color={examCfg.color}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedExam(ep.examType);
                  router.push('/(tabs)/practice');
                }}
              />
            );
          })}
        </View>

        {/* Weekly Activity — aggregated from all exams */}
        {examProgress.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>نشاطك هذا الأسبوع</Text>
            <View style={[styles.weekChart, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {(['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب']).map((day, i) => {
                // Sum weekly activity across all exams
                const value = examProgress.reduce((sum, ep) => {
                  const weekArr = ep.weeklyActivity && ep.weeklyActivity.length === 7 ? ep.weeklyActivity : [0,0,0,0,0,0,0];
                  return sum + (weekArr[i] || 0);
                }, 0);
                const allValues = Array.from({ length: 7 }, (_, idx) =>
                  examProgress.reduce((sum, ep) => {
                    const w = ep.weeklyActivity && ep.weeklyActivity.length === 7 ? ep.weeklyActivity : [0,0,0,0,0,0,0];
                    return sum + (w[idx] || 0);
                  }, 0)
                );
                const maxVal = Math.max(...allValues, 1);
                const height = (value / maxVal) * 100;
                const isToday = i === new Date().getDay();
                return (
                  <View key={day} style={styles.barCol}>
                    <View style={[styles.barTrack, { backgroundColor: theme.surfaceLight }]}>
                      <View style={[styles.barFill, { height: `${height}%`, backgroundColor: isToday ? theme.accent : theme.primary }]} />
                    </View>
                    <Text style={[styles.barLabel, { color: isToday ? theme.primary : theme.textMuted, fontWeight: isToday ? '700' : '600' }]}>{day}</Text>
                    <Text style={[styles.barValue, { color: theme.textSecondary }]}>{value}</Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.weekSummary}>
              <View style={styles.weekSummaryItem}>
                <MaterialIcons name="fitness-center" size={14} color={theme.primary} />
                <Text style={[styles.weekSummaryText, { color: theme.textSecondary }]}>
                  {examProgress.reduce((sum, ep) => sum + ep.totalQuestions, 0)} سؤال تم حلّها
                </Text>
              </View>
              <View style={styles.weekSummaryItem}>
                <MaterialIcons name="check-circle" size={14} color={theme.success} />
                <Text style={[styles.weekSummaryText, { color: theme.textSecondary }]}>
                  {examProgress.reduce((sum, ep) => sum + ep.correctAnswers, 0)} إجابة صحيحة
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  greeting: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  streakText: { fontSize: 16, fontWeight: '700' },
  heroSection: { paddingHorizontal: 20, paddingTop: 16 },
  heroCard: { flexDirection: 'row', borderRadius: 20, padding: 20, borderWidth: 1 },
  heroLeft: { alignItems: 'center', justifyContent: 'center' },
  heroScore: { fontSize: 42, fontWeight: '700', marginTop: -2 },
  heroScoreLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginTop: -2 },
  heroRight: { flex: 1, marginLeft: 20, justifyContent: 'center', gap: 8 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroStatLabel: { fontSize: 12, flex: 1 },
  heroStatValue: { fontSize: 14, fontWeight: '700' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  startBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  weekChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderRadius: 16, padding: 16, paddingTop: 20, borderWidth: 1, height: 180 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barTrack: { width: 24, flex: 1, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 6 },
  barFill: { width: '100%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, fontWeight: '600' },
  barValue: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  weekSummary: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  weekSummaryItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weekSummaryText: { fontSize: 12, fontWeight: '500' },
});
