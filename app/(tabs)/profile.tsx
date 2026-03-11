import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth, useAlert } from '@/template';
import { config } from '../../constants/config';
import { useApp } from '../../contexts/AppContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useColors } from '../../hooks/useTheme';
import ProgressRing from '../../components/ui/ProgressRing';
import SkillBar from '../../components/ui/SkillBar';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useColors();
  const { user, examProgress, skillMap, loading } = useApp();
  const { user: authUser, logout, operationLoading } = useAuth();
  const { showAlert } = useAlert();
  const { subscribed, isTrial, trialDaysLeft } = useSubscription();
  const [activeExam, setActiveExam] = useState<'step' | 'ielts' | 'psychometric'>('step');

  const handleLogout = useCallback(() => {
    showAlert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تسجيل الخروج', style: 'destructive', onPress: async () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); const { error } = await logout(); if (error) showAlert('خطأ', error); } },
    ]);
  }, [logout, showAlert]);

  const currentProgress = examProgress.find(ep => ep.examType === activeExam);
  const examCfg = config.examTypes[activeExam];
  const strengths = skillMap.filter(s => s.category === 'strength');
  const weaknesses = skillMap.filter(s => s.category === 'weakness');

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{(user.nameAr || 'م')[0]}</Text>
            </View>
            {isTrial ? (
              <View style={[styles.planBadge, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '30' }]}>
                <MaterialIcons name="card-giftcard" size={14} color={theme.primary} />
                <Text style={[styles.planText, { color: theme.primary }]}>تجريبي · {trialDaysLeft} يوم</Text>
              </View>
            ) : subscribed ? (
              <View style={[styles.planBadge, { backgroundColor: theme.accent + '18', borderColor: theme.accent + '30' }]}>
                <MaterialIcons name="verified" size={14} color={theme.accent} />
                <Text style={[styles.planText, { color: theme.accent }]}>Premium</Text>
              </View>
            ) : (
              <View style={[styles.planBadge, { backgroundColor: theme.surfaceLight, borderColor: theme.border }]}>
                <Text style={[styles.planText, { color: theme.textSecondary }]}>مجاني</Text>
              </View>
            )}
          </View>
          <Text style={[styles.profileName, { color: theme.textPrimary }]}>{user.nameAr}</Text>
          <Text style={[styles.profileSub, { color: theme.textSecondary }]}>{authUser?.email || ''}</Text>

          <Pressable style={[styles.upgradeBtn, { backgroundColor: isTrial ? theme.primary + '14' : subscribed ? theme.success + '14' : theme.accent + '14', borderColor: isTrial ? theme.primary + '30' : subscribed ? theme.success + '30' : theme.accent + '30' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/paywall'); }}>
            <MaterialIcons name={isTrial ? 'card-giftcard' : subscribed ? 'verified' : 'workspace-premium'} size={18} color={isTrial ? theme.primary : subscribed ? theme.success : theme.accent} />
            <Text style={[styles.upgradeBtnText, { color: isTrial ? theme.primary : subscribed ? theme.success : theme.accent }]}>{isTrial ? `فترة تجريبية — ${trialDaysLeft} يوم متبقي` : subscribed ? 'إدارة الاشتراك' : 'ترقية للنسخة المميزة'}</Text>
            <MaterialIcons name="arrow-forward-ios" size={14} color={isTrial ? theme.primary : subscribed ? theme.success : theme.accent} />
          </Pressable>

          <View style={[styles.statsRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.primary }]}>{user.aiScore}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>AI Score</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.accent }]}>{user.streak}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>سلسلة الأيام</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.textPrimary }]}>{user.totalSessions}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>الجلسات</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.success }]}>{examProgress.reduce((sum, ep) => sum + ep.totalQuestions, 0)}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>الأسئلة</Text>
            </View>
          </View>
        </View>

        <View style={styles.switcherContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {(['step', 'ielts', 'psychometric'] as const).map((type) => {
              const ec = config.examTypes[type];
              const isActive = type === activeExam;
              return (
                <Pressable key={type} onPress={() => { Haptics.selectionAsync(); setActiveExam(type); }} style={[styles.switchChip, { backgroundColor: isActive ? ec.color : theme.surface, borderColor: isActive ? ec.color : theme.border }]}>
                  <Text style={[styles.switchText, { color: isActive ? '#FFF' : theme.textSecondary }]}>{ec.nameAr}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {currentProgress ? (
          <View style={styles.section}>
            <View style={[styles.predictCard, { backgroundColor: theme.surface, borderColor: examCfg.color + '40' }]}>
              <View style={styles.predictRow}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={[styles.predictLabel, { color: theme.textSecondary }]}>درجتك الحالية</Text>
                  <Text style={[styles.predictValue, { color: examCfg.color }]}>{activeExam === 'ielts' ? Number(currentProgress.overallScore || 0).toFixed(1) : Math.round(currentProgress.overallScore || 0)}</Text>
                </View>
                <View style={styles.predictArrow}><MaterialIcons name="arrow-forward" size={24} color={theme.textMuted} /></View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={[styles.predictLabel, { color: theme.textSecondary }]}>التوقع</Text>
                  <Text style={[styles.predictValue, { color: theme.success }]}>{activeExam === 'ielts' ? Number(currentProgress.predictedScore || 0).toFixed(1) : Math.round(currentProgress.predictedScore || 0)}</Text>
                </View>
              </View>
              <View style={styles.readinessRow}>
                <Text style={[styles.readinessLabel, { color: theme.textSecondary }]}>الجاهزية للاختبار</Text>
                <View style={[styles.readinessBar, { backgroundColor: theme.surfaceLight }]}>
                  <View style={[styles.readinessFill, { width: `${currentProgress.readiness}%`, backgroundColor: currentProgress.readiness >= 70 ? theme.success : currentProgress.readiness >= 40 ? theme.warning : theme.error }]} />
                </View>
                <Text style={[styles.readinessPercent, { color: currentProgress.readiness >= 70 ? theme.success : currentProgress.readiness >= 40 ? theme.warning : theme.error }]}>{currentProgress.readiness}%</Text>
              </View>
            </View>
          </View>
        ) : null}

        {currentProgress ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>تحليل الأقسام</Text>
            {currentProgress.sectionsProgress.map((sp) => (
              <View key={sp.name} style={[styles.sectionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.sectionRowHeader}>
                    <Text style={[styles.sectionName, { color: theme.textPrimary }]}>{sp.nameAr}</Text>
                    <MaterialIcons name={sp.trend === 'up' ? 'trending-up' : sp.trend === 'down' ? 'trending-down' : 'trending-flat'} size={14} color={sp.trend === 'up' ? theme.success : sp.trend === 'down' ? theme.error : theme.textMuted} />
                  </View>
                  <View style={[styles.sectionBarTrack, { backgroundColor: theme.surfaceLight }]}>
                    <View style={[styles.sectionBarFill, { width: `${sp.score}%`, backgroundColor: examCfg.color }]} />
                  </View>
                </View>
                <Text style={[styles.sectionScore, { color: examCfg.color }]}>{sp.score}%</Text>
              </View>
            ))}
          </View>
        ) : null}

        {strengths.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>نقاط القوة</Text>
            <View style={[styles.skillsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>{strengths.map((s) => <SkillBar key={s.skill} skillAr={s.skillAr} level={s.level} category={s.category} />)}</View>
          </View>
        ) : null}

        {weaknesses.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>نقاط الضعف — تحتاج تركيز</Text>
            <View style={[styles.skillsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>{weaknesses.map((s) => <SkillBar key={s.skill} skillAr={s.skillAr} level={s.level} category={s.category} />)}</View>
          </View>
        ) : null}

        <View style={[styles.section, { paddingBottom: 20 }]}>
          <View style={[styles.settingsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {[
              { icon: 'settings' as const, label: 'الإعدادات', sub: 'الملف الشخصي والتطبيق', route: '/settings', color: theme.textSecondary },
              { icon: 'privacy-tip' as const, label: 'سياسة الخصوصية', sub: 'الشروط والأحكام', route: '/privacy', color: theme.textSecondary },
              { icon: 'admin-panel-settings' as const, label: 'لوحة تحكم المدير', sub: 'إحصائيات وإدارة', route: '/admin', color: theme.textSecondary },
              { icon: 'support-agent' as const, label: 'الدعم الفني', sub: 'محادثة مع المساعد الذكي', route: '/support', color: theme.primary },
            ].map((item, i, arr) => (
              <Pressable key={item.route} style={[styles.settingsRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]} onPress={() => router.push(item.route as any)}>
                <MaterialIcons name={item.icon} size={22} color={item.color} />
                <View style={{ flex: 1 }}><Text style={[styles.settingsLabel, { color: theme.textPrimary }]}>{item.label}</Text><Text style={[styles.settingsSub, { color: theme.textSecondary }]}>{item.sub}</Text></View>
                <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>

          <Pressable style={[styles.logoutBtn, { backgroundColor: theme.error + '12', borderColor: theme.error + '30' }]} onPress={handleLogout} disabled={operationLoading}>
            {operationLoading ? <ActivityIndicator color={theme.error} size="small" /> : <MaterialIcons name="logout" size={20} color={theme.error} />}
            <Text style={[styles.logoutText, { color: theme.error }]}>تسجيل الخروج</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  profileHeader: { alignItems: 'center', paddingTop: 20, paddingBottom: 12, paddingHorizontal: 20 },
  avatarContainer: { alignItems: 'center', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#FFF' },
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: -10, borderWidth: 1 },
  planText: { fontSize: 11, fontWeight: '700' },
  profileName: { fontSize: 22, fontWeight: '700' },
  profileSub: { fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, borderRadius: 16, padding: 16, borderWidth: 1, width: '100%' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, height: 32 },
  switcherContainer: { paddingTop: 16 },
  switchChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  switchText: { fontSize: 13, fontWeight: '600' },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  predictCard: { borderRadius: 16, padding: 20, borderWidth: 1 },
  predictRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  predictLabel: { fontSize: 12, marginBottom: 4 },
  predictValue: { fontSize: 36, fontWeight: '700' },
  predictArrow: { paddingHorizontal: 12 },
  readinessRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readinessLabel: { fontSize: 12, width: 80 },
  readinessBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  readinessFill: { height: 6, borderRadius: 3 },
  readinessPercent: { fontSize: 14, fontWeight: '700', width: 40, textAlign: 'right' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 8 },
  sectionRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionName: { fontSize: 14, fontWeight: '600' },
  sectionBarTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  sectionBarFill: { height: 5, borderRadius: 3 },
  sectionScore: { fontSize: 20, fontWeight: '700', minWidth: 48, textAlign: 'right' },
  skillsCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  settingsCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  settingsLabel: { fontSize: 14, fontWeight: '600' },
  settingsSub: { fontSize: 12, marginTop: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  logoutText: { fontSize: 15, fontWeight: '700' },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginTop: 14, width: '100%', justifyContent: 'center' },
  upgradeBtnText: { fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'center' },
});
