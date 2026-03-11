import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getSupabaseClient, useAlert } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useColors } from '../hooks/useTheme';

interface AdminStats { totalUsers: number; diagnosticCompleted: number; totalAttempts: number; totalQuestions: number; avgScore: number; todayAttempts: number; examDistribution: Record<string, number>; recentUsers: any[]; topUsers: any[]; }

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const theme = useColors();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'top'>('overview');

  const fetchStats = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error: fnError } = await supabase.functions.invoke('admin-stats');
      if (fnError) { let msg = fnError.message; if (fnError instanceof FunctionsHttpError) { try { const t = await fnError.context?.text(); const p = JSON.parse(t || '{}'); msg = p.error || t || msg; } catch {} } setError(msg); return; }
      setStats(data);
    } catch (err: any) { setError(err.message || 'خطأ غير متوقع'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textSecondary, marginTop: 12 }}>جاري تحميل الإحصائيات...</Text>
      </View>
    </SafeAreaView>
  );

  if (error) return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
          <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>لوحة التحكم</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <MaterialIcons name="admin-panel-settings" size={56} color={theme.error} />
        <Text style={{ color: theme.error, fontSize: 16, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>{error.includes('Admin') ? 'صلاحيات المدير غير متوفرة' : error}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 8, textAlign: 'center' }}>يجب أن يكون حسابك مُعيّن كمدير</Text>
        <Pressable style={[styles.retryBtn, { backgroundColor: theme.primary }]} onPress={() => router.back()}><Text style={styles.retryBtnText}>العودة</Text></Pressable>
      </View>
    </SafeAreaView>
  );

  if (!stats) return null;
  const examNames: Record<string, string> = { step: 'ستيب', ielts: 'آيلتس', psychometric: 'سيكومتري' };
  const totalExamAttempts = Object.values(stats.examDistribution).reduce((s, v) => s + v, 0) || 1;

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
          <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>لوحة تحكم المدير</Text>
        <Pressable onPress={fetchStats} hitSlop={12} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
          <MaterialIcons name="refresh" size={22} color={theme.primary} />
        </Pressable>
      </View>

      <View style={[styles.tabsRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {(['overview', 'users', 'top'] as const).map(tab => (
          <Pressable key={tab} style={[styles.tab, activeTab === tab && [styles.tabActive, { backgroundColor: theme.primary }]]} onPress={() => { Haptics.selectionAsync(); setActiveTab(tab); }}>
            <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === tab && styles.tabTextActive]}>{tab === 'overview' ? 'نظرة عامة' : tab === 'users' ? 'المستخدمون' : 'الأفضل'}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' ? (
          <>
            <View style={styles.statsGrid}>
              {[
                { label: 'المستخدمون', value: stats.totalUsers, icon: 'people' as const, color: theme.primary },
                { label: 'أكملوا التشخيص', value: stats.diagnosticCompleted, icon: 'check-circle' as const, color: theme.success },
                { label: 'محاولات الاختبار', value: stats.totalAttempts, icon: 'assignment' as const, color: theme.secondary },
                { label: 'الأسئلة', value: stats.totalQuestions, icon: 'quiz' as const, color: theme.accent },
                { label: 'متوسط النتيجة', value: `${stats.avgScore}%`, icon: 'trending-up' as const, color: theme.warning },
                { label: 'محاولات اليوم', value: stats.todayAttempts, icon: 'today' as const, color: theme.primary },
              ].map(stat => (
                <View key={stat.label} style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={[styles.statIconWrap, { backgroundColor: stat.color + '15' }]}><MaterialIcons name={stat.icon} size={22} color={stat.color} /></View>
                  <Text style={[styles.statValue, { color: theme.textPrimary }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>توزيع الاختبارات</Text>
              <View style={[styles.distCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {Object.entries(stats.examDistribution).map(([exam, count]) => {
                  const pct = Math.round((count / totalExamAttempts) * 100);
                  const color = exam === 'step' ? '#06B6D4' : exam === 'ielts' ? '#8B5CF6' : '#F59E0B';
                  return (
                    <View key={exam} style={styles.distRow}>
                      <View style={[styles.distDot, { backgroundColor: color }]} />
                      <Text style={[styles.distLabel, { color: theme.textPrimary }]}>{examNames[exam] || exam}</Text>
                      <View style={[styles.distBarTrack, { backgroundColor: theme.surfaceLight }]}><View style={[styles.distBarFill, { width: `${pct}%`, backgroundColor: color }]} /></View>
                      <Text style={[styles.distValue, { color }]}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        ) : activeTab === 'users' ? (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>المستخدمون ({stats.recentUsers.length})</Text>
            {stats.recentUsers.map((u: any) => (
              <View key={u.id} style={[styles.userCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.userAvatar, { backgroundColor: theme.primary + '25' }]}><Text style={[styles.userAvatarText, { color: theme.primary }]}>{(u.name_ar || u.email || '?')[0]}</Text></View>
                <View style={{ flex: 1 }}><Text style={[styles.userName, { color: theme.textPrimary }]}>{u.name_ar || u.username || 'بدون اسم'}</Text><Text style={[styles.userEmail, { color: theme.textSecondary }]}>{u.email}</Text></View>
                <View style={styles.userStats}><Text style={[styles.userScore, { color: theme.primary }]}>{u.ai_score || 0}</Text><Text style={[styles.userScoreLabel, { color: theme.textMuted }]}>AI</Text></View>
                {u.diagnostic_completed ? <MaterialIcons name="check-circle" size={16} color={theme.success} /> : <MaterialIcons name="radio-button-unchecked" size={16} color={theme.textMuted} />}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>أفضل المستخدمين</Text>
            {stats.topUsers.map((u: any, i: number) => (
              <View key={u.id} style={[styles.topCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.rankBadge, { backgroundColor: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : theme.surfaceLight }]}>
                  <Text style={[styles.rankText, { color: i < 3 ? '#000' : theme.textPrimary }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}><Text style={[styles.topName, { color: theme.textPrimary }]}>{u.name_ar || u.email?.split('@')[0] || 'مجهول'}</Text><Text style={[styles.topMeta, { color: theme.textSecondary }]}>{u.total_sessions || 0} جلسة • {u.streak || 0} يوم</Text></View>
                <View style={styles.topScoreWrap}><Text style={[styles.topScore, { color: theme.primary }]}>{u.ai_score || 0}</Text><Text style={[styles.topScoreLabel, { color: theme.textMuted }]}>AI</Text></View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  tabsRow: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 12, padding: 3, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: {},
  tabText: { fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 20 },
  statCard: { flexBasis: '31%', flexGrow: 1, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, gap: 6 },
  statIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  sectionBlock: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  distCard: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 12 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  distDot: { width: 10, height: 10, borderRadius: 5 },
  distLabel: { fontSize: 13, fontWeight: '500', width: 60 },
  distBarTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  distBarFill: { height: 8, borderRadius: 4 },
  distValue: { fontSize: 14, fontWeight: '700', width: 36, textAlign: 'right' },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 8 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontSize: 16, fontWeight: '700' },
  userName: { fontSize: 14, fontWeight: '600' },
  userEmail: { fontSize: 11, marginTop: 1 },
  userStats: { alignItems: 'center' },
  userScore: { fontSize: 18, fontWeight: '700' },
  userScoreLabel: { fontSize: 9, fontWeight: '600' },
  topCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 8 },
  rankBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 14, fontWeight: '700' },
  topName: { fontSize: 15, fontWeight: '600' },
  topMeta: { fontSize: 12, marginTop: 2 },
  topScoreWrap: { alignItems: 'center' },
  topScore: { fontSize: 24, fontWeight: '700' },
  topScoreLabel: { fontSize: 9, fontWeight: '600' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
