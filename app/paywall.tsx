import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useAlert } from '@/template';
import { useSubscription } from '../hooks/useSubscription';
import { useColors } from '../hooks/useTheme';

interface FeatureRow { label: string; free: string | boolean; premium: string | boolean; icon: keyof typeof MaterialIcons.glyphMap; }

const FEATURES: FeatureRow[] = [
  { label: 'أسئلة يومية', free: '10 أسئلة', premium: 'غير محدودة', icon: 'quiz' },
  { label: 'اختبارات تجريبية', free: '1 شهرياً', premium: 'غير محدودة', icon: 'assignment' },
  { label: 'تقارير تحليلية', free: false, premium: true, icon: 'analytics' },
  { label: 'تقييم الكتابة بالذكاء الاصطناعي', free: false, premium: true, icon: 'auto-awesome' },
  { label: 'تحليل المحادثة والنطق', free: false, premium: true, icon: 'mic' },
  { label: 'خطة تطوير شخصية', free: false, premium: true, icon: 'route' },
  { label: 'خريطة المهارات التفصيلية', free: false, premium: true, icon: 'map' },
  { label: 'توقع الدرجة بالذكاء الاصطناعي', free: false, premium: true, icon: 'trending-up' },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const theme = useColors();
  const {
    subscribed, isTrial, trialDaysLeft, trialEndDate, subscriptionEnd,
    purchaseSubscription, restorePurchases, checkSubscription,
    loading: subLoading, iapReady,
  } = useSubscription();
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleSubscribe = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPurchaseLoading(true);
    const { error } = await purchaseSubscription();
    setPurchaseLoading(false);
    if (error) showAlert('خطأ', error);
  }, [purchaseSubscription, showAlert]);

  const handleRestore = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRestoreLoading(true);
    const { error } = await restorePurchases();
    setRestoreLoading(false);
    if (error) {
      showAlert('استعادة المشتريات', error);
    } else {
      showAlert('تم', 'تم استعادة اشتراكك بنجاح');
    }
  }, [restorePurchases, showAlert]);

  const handleRefreshStatus = useCallback(async () => {
    Haptics.selectionAsync();
    setRefreshing(true);
    await checkSubscription();
    setRefreshing(false);
  }, [checkSubscription]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const renderFeatureValue = (value: string | boolean, isPremium: boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <View style={[styles.checkCircle, isPremium && { backgroundColor: theme.success }]}><MaterialIcons name="check" size={14} color={isPremium ? '#FFF' : theme.success} /></View>
      ) : (
        <View style={[styles.crossCircle, { backgroundColor: theme.surfaceLight }]}><MaterialIcons name="close" size={14} color={theme.textMuted} /></View>
      );
    }
    return <Text style={[styles.featureValueText, { color: theme.textSecondary }, isPremium && { color: theme.primary, fontWeight: '700' }]}>{value}</Text>;
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.statusBar} />
      <Pressable style={[styles.closeBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => { Haptics.selectionAsync(); router.back(); }} hitSlop={12}>
        <MaterialIcons name="close" size={24} color={theme.textSecondary} />
      </Pressable>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Image source={require('../assets/images/premium-crown.png')} style={styles.heroImage} contentFit="contain" transition={300} />
          <Text style={[styles.heroTitle, { color: theme.accent }]}>مسار AI Premium</Text>
          <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>أطلق العنان لقدراتك مع المحلل الذكي</Text>
        </View>

        {/* Free Trial Banner */}
        {isTrial ? (
          <View style={styles.trialBanner}>
            <LinearGradient colors={[theme.primary + '18', theme.accent + '10']} style={[styles.trialBannerGradient, { borderColor: theme.primary + '35' }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.trialBannerRow}>
                <View style={[styles.trialBannerIcon, { backgroundColor: theme.primary + '20' }]}>
                  <MaterialIcons name="card-giftcard" size={28} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.trialBannerTitle, { color: theme.primary }]}>فترة تجريبية مجانية</Text>
                  <Text style={[styles.trialBannerSub, { color: theme.textSecondary }]}>جميع المزايا مفعّلة مجاناً</Text>
                </View>
              </View>

              <View style={[styles.trialCountdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.trialCountdownInner}>
                  <MaterialIcons name="schedule" size={20} color={trialDaysLeft <= 7 ? theme.warning : theme.primary} />
                  <Text style={[styles.trialDaysNumber, { color: trialDaysLeft <= 7 ? theme.warning : theme.primary }]}>{trialDaysLeft}</Text>
                  <Text style={[styles.trialDaysLabel, { color: theme.textSecondary }]}>يوم متبقي</Text>
                </View>
                <View style={[styles.trialProgressTrack, { backgroundColor: theme.surfaceLight }]}>
                  <View style={[styles.trialProgressFill, { width: `${Math.max(5, (trialDaysLeft / 30) * 100)}%`, backgroundColor: trialDaysLeft <= 7 ? theme.warning : theme.primary }]} />
                </View>
                {trialEndDate ? <Text style={[styles.trialEndText, { color: theme.textMuted }]}>تنتهي في {formatDate(trialEndDate)}</Text> : null}
              </View>

              {trialDaysLeft <= 7 ? (
                <View style={[styles.trialWarning, { backgroundColor: theme.warning + '12', borderColor: theme.warning + '25' }]}>
                  <MaterialIcons name="info" size={18} color={theme.warning} />
                  <Text style={[styles.trialWarningText, { color: theme.warning }]}>
                    {trialDaysLeft <= 3 ? 'فترتك التجريبية تنتهي قريباً جداً! اشترك الآن لتستمر بدون انقطاع.' : 'فترتك التجريبية تقترب من النهاية. اشترك للاستمرار بكامل المزايا.'}
                  </Text>
                </View>
              ) : null}
            </LinearGradient>
          </View>
        ) : subscribed && !isTrial ? (
          <View style={styles.activeBanner}>
            <LinearGradient colors={[theme.success + '20', theme.success + '08']} style={[styles.activeBannerGradient, { borderColor: theme.success + '35' }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.activeBannerRow}>
                <View style={[styles.activeBannerIcon, { backgroundColor: theme.success + '20' }]}><MaterialIcons name="verified" size={24} color={theme.success} /></View>
                <View style={{ flex: 1 }}><Text style={[styles.activeBannerTitle, { color: theme.success }]}>اشتراكك فعّال</Text>{subscriptionEnd ? <Text style={[styles.activeBannerSub, { color: theme.textSecondary }]}>ينتهي في {formatDate(subscriptionEnd)}</Text> : null}</View>
              </View>
              <Pressable style={[styles.manageBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]} onPress={handleRefreshStatus} disabled={refreshing}>
                {refreshing ? <ActivityIndicator size="small" color={theme.primary} /> : <><MaterialIcons name="refresh" size={18} color={theme.primary} /><Text style={[styles.manageBtnText, { color: theme.primary }]}>تحديث حالة الاشتراك</Text></>}
              </Pressable>
            </LinearGradient>
          </View>
        ) : null}

        {/* Pricing - show for trial users (to subscribe early) and non-subscribed */}
        {!subscribed || isTrial ? (
          <View style={styles.pricingContainer}>
            <LinearGradient colors={[theme.primary + '15', theme.primaryDark + '08']} style={[styles.pricingCard, { borderColor: theme.primary + '35' }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={[styles.pricingBadge, { backgroundColor: theme.accent + '18', borderColor: theme.accent + '30' }]}>
                <MaterialIcons name="local-offer" size={14} color={theme.accent} />
                <Text style={[styles.pricingBadgeText, { color: theme.accent }]}>{isTrial ? 'اشترك مبكراً' : 'عرض خاص'}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={[styles.priceCurrency, { color: theme.textPrimary }]}>$</Text>
                <Text style={[styles.priceAmount, { color: theme.textPrimary }]}>2</Text>
                <View style={styles.pricePeriod}>
                  <Text style={[styles.pricePeriodText, { color: theme.textSecondary }]}>فقط</Text>
                  <Text style={[styles.pricePeriodText, { color: theme.textSecondary }]}>/ شهر</Text>
                </View>
              </View>
              <Text style={[styles.pricePerMonth, { color: theme.primary }]}>عبر Google Play — إلغاء في أي وقت</Text>

              <View style={[styles.googlePlayBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <MaterialIcons name="shop" size={20} color="#34A853" />
                <Text style={[styles.googlePlayText, { color: theme.textPrimary }]}>Google Play Billing</Text>
              </View>

              <View style={[styles.priceDivider, { backgroundColor: theme.border }]} />
              <View style={styles.priceHighlights}>
                {['وصول كامل للمحلل الذكي', 'اختبارات وتمارين بلا حدود', 'تقارير تحليلية مفصّلة'].map((text) => (
                  <View key={text} style={styles.highlightRow}><MaterialIcons name="check-circle" size={18} color={theme.success} /><Text style={[styles.highlightText, { color: theme.textPrimary }]}>{text}</Text></View>
                ))}
              </View>
            </LinearGradient>
          </View>
        ) : null}

        <View style={styles.comparisonSection}>
          <Text style={[styles.comparisonTitle, { color: theme.textPrimary }]}>مقارنة المزايا</Text>
          <View style={[styles.tableHeader, { backgroundColor: theme.surfaceLight }]}>
            <Text style={[styles.tableHeaderLabel, { color: theme.textSecondary }]}>الميزة</Text>
            <Text style={[styles.tableHeaderFree, { color: theme.textMuted }]}>مجاني</Text>
            <Text style={[styles.tableHeaderPremium, { color: theme.accent }]}>Premium</Text>
          </View>
          {FEATURES.map((feature, idx) => (
            <View key={feature.label} style={[styles.tableRow, { backgroundColor: idx % 2 === 0 ? theme.surface + 'CC' : theme.surface, borderColor: theme.border }, idx === FEATURES.length - 1 && styles.tableRowLast]}>
              <View style={styles.featureLabelCol}><MaterialIcons name={feature.icon} size={18} color={theme.textSecondary} /><Text style={[styles.featureLabelText, { color: theme.textPrimary }]} numberOfLines={2}>{feature.label}</Text></View>
              <View style={styles.featureValueCol}>{renderFeatureValue(feature.free, false)}</View>
              <View style={styles.featureValueCol}>{renderFeatureValue(feature.premium, true)}</View>
            </View>
          ))}
        </View>

        {/* Free Trial Info Card */}
        <View style={styles.trialInfoSection}>
          <View style={[styles.trialInfoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MaterialIcons name="card-giftcard" size={28} color={theme.primary} />
            <Text style={[styles.trialInfoTitle, { color: theme.textPrimary }]}>شهر مجاني لكل مستخدم جديد</Text>
            <Text style={[styles.trialInfoText, { color: theme.textSecondary }]}>سجّل حسابك واستمتع بجميع مزايا Premium مجاناً لمدة 30 يوماً كاملة، بدون الحاجة لبطاقة دفع.</Text>
          </View>
        </View>

        <View style={styles.trustSection}>
          <View style={[styles.trustCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MaterialIcons name="shield" size={28} color={theme.primary} />
            <Text style={[styles.trustTitle, { color: theme.textPrimary }]}>ضمان آمن</Text>
            <Text style={[styles.trustText, { color: theme.textSecondary }]}>دفع آمن عبر Google Play — حماية مشتريات Google</Text>
          </View>
        </View>

        <View style={styles.socialProof}>
          {[{ value: '+5,000', label: 'طالب مشترك' }, { value: '4.8', label: 'تقييم التطبيق' }, { value: '92%', label: 'نسبة النجاح' }].map((stat) => (
            <View key={stat.label} style={styles.proofItem}><Text style={[styles.proofValue, { color: theme.primary }]}>{stat.value}</Text><Text style={[styles.proofLabel, { color: theme.textSecondary }]}>{stat.label}</Text></View>
          ))}
        </View>
      </ScrollView>

      {/* Subscribe / Restore buttons */}
      {!subscribed || isTrial ? (
        <View style={[styles.stickyBottom, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: theme.background, borderTopColor: theme.border }]}>
          <Pressable
            style={({ pressed }) => [styles.subscribeBtn, { ...theme.shadow.elevated }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={handleSubscribe}
            disabled={purchaseLoading}
          >
            <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.subscribeBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {purchaseLoading ? <ActivityIndicator size="small" color="#FFF" /> : (
                <>
                  <MaterialIcons name="workspace-premium" size={22} color="#FFF" />
                  <Text style={styles.subscribeBtnText}>{isTrial ? 'اشترك الآن — $2 شهرياً' : 'اشترك الآن — $2 شهرياً'}</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.restoreBtn, { borderColor: theme.border }, pressed && { opacity: 0.7 }]}
            onPress={handleRestore}
            disabled={restoreLoading}
          >
            {restoreLoading ? (
              <ActivityIndicator size="small" color={theme.textSecondary} />
            ) : (
              <Text style={[styles.restoreBtnText, { color: theme.textSecondary }]}>استعادة المشتريات السابقة</Text>
            )}
          </Pressable>

          <Text style={[styles.termsText, { color: theme.textMuted }]}>
            {isTrial ? 'اشترك مبكراً لضمان استمرار الوصول بعد انتهاء الفترة التجريبية' : 'الاشتراك يُجدد تلقائياً عبر Google Play — يمكنك الإلغاء في أي وقت'}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  closeBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 16, right: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heroSection: { alignItems: 'center', paddingTop: 16, paddingBottom: 4, paddingHorizontal: 24 },
  heroImage: { width: 140, height: 140, marginBottom: 12 },
  heroTitle: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  heroSubtitle: { fontSize: 15, textAlign: 'center', marginTop: 6, lineHeight: 22 },
  // Trial Banner
  trialBanner: { paddingHorizontal: 20, paddingTop: 20 },
  trialBannerGradient: { borderRadius: 20, padding: 20, borderWidth: 1.5 },
  trialBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  trialBannerIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  trialBannerTitle: { fontSize: 18, fontWeight: '700' },
  trialBannerSub: { fontSize: 13, marginTop: 2 },
  trialCountdown: { borderRadius: 14, padding: 16, borderWidth: 1, alignItems: 'center', gap: 10 },
  trialCountdownInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trialDaysNumber: { fontSize: 32, fontWeight: '700' },
  trialDaysLabel: { fontSize: 15, fontWeight: '600' },
  trialProgressTrack: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  trialProgressFill: { height: 6, borderRadius: 3 },
  trialEndText: { fontSize: 11, fontWeight: '500' },
  trialWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 14, borderWidth: 1, marginTop: 12 },
  trialWarningText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '500' },
  // Active Banner
  activeBanner: { paddingHorizontal: 20, paddingTop: 20 },
  activeBannerGradient: { borderRadius: 20, padding: 20, borderWidth: 1.5 },
  activeBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  activeBannerIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  activeBannerTitle: { fontSize: 18, fontWeight: '700' },
  activeBannerSub: { fontSize: 13, marginTop: 2 },
  manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  manageBtnText: { fontSize: 14, fontWeight: '700' },
  pricingContainer: { paddingHorizontal: 20, paddingTop: 20 },
  pricingCard: { borderRadius: 20, padding: 24, borderWidth: 1.5, alignItems: 'center' },
  pricingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
  pricingBadgeText: { fontSize: 12, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  priceCurrency: { fontSize: 24, fontWeight: '700' },
  priceAmount: { fontSize: 64, fontWeight: '700', lineHeight: 72 },
  pricePeriod: { marginLeft: 6 },
  pricePeriodText: { fontSize: 14, fontWeight: '500' },
  pricePerMonth: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  googlePlayBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  googlePlayText: { fontSize: 14, fontWeight: '600' },
  priceDivider: { width: '80%', height: 1, marginVertical: 18 },
  priceHighlights: { gap: 10, width: '100%' },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  highlightText: { fontSize: 14, fontWeight: '500' },
  comparisonSection: { paddingHorizontal: 20, paddingTop: 28 },
  comparisonTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  tableHeaderLabel: { flex: 1.4, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  tableHeaderFree: { flex: 0.8, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  tableHeaderPremium: { flex: 0.8, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderLeftWidth: 1, borderRightWidth: 1 },
  tableRowLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14, borderBottomWidth: 1 },
  featureLabelCol: { flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureLabelText: { fontSize: 13, fontWeight: '500', flex: 1 },
  featureValueCol: { flex: 0.8, alignItems: 'center', justifyContent: 'center' },
  featureValueText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,185,129,0.18)' },
  crossCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  // Trial Info
  trialInfoSection: { paddingHorizontal: 20, paddingTop: 24 },
  trialInfoCard: { borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, gap: 8 },
  trialInfoTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  trialInfoText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  trustSection: { paddingHorizontal: 20, paddingTop: 16 },
  trustCard: { borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, gap: 8 },
  trustTitle: { fontSize: 15, fontWeight: '700' },
  trustText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  socialProof: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  proofItem: { alignItems: 'center' },
  proofValue: { fontSize: 22, fontWeight: '700' },
  proofLabel: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  stickyBottom: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  subscribeBtn: { borderRadius: 16, overflow: 'hidden' },
  subscribeBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 16 },
  subscribeBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  restoreBtn: { alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 12, borderWidth: 1, marginTop: 10 },
  restoreBtnText: { fontSize: 14, fontWeight: '600' },
  termsText: { fontSize: 11, textAlign: 'center', marginTop: 10 },
});
