import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '../hooks/useTheme';

const SECTIONS = [
  { title: 'مقدمة', icon: 'info' as const, content: 'مرحباً بك في تطبيق مسار AI. نحن نلتزم بحماية خصوصيتك وبياناتك الشخصية.' },
  { title: 'البيانات التي نجمعها', icon: 'storage' as const, content: '• البريد الإلكتروني وكلمة المرور\n• نتائج الاختبارات ومستوى التقدم\n• خريطة المهارات\n• بيانات الاستخدام\n• معلومات الاشتراك والدفع' },
  { title: 'كيف نستخدم بياناتك', icon: 'analytics' as const, content: '• تخصيص خطة التدريب\n• تحليل أدائك وتقديم توصيات ذكية\n• تحسين تجربة التطبيق\n• إرسال إشعارات التذكير\n• لا نبيع أو نشارك بياناتك' },
  { title: 'الذكاء الاصطناعي', icon: 'auto-awesome' as const, content: 'نستخدم تقنيات الذكاء الاصطناعي لتوليد أسئلة مخصصة وتقديم شروحات تفصيلية بشكل آمن.' },
  { title: 'حماية البيانات', icon: 'shield' as const, content: '• تشفير البيانات أثناء النقل والتخزين\n• خوادم آمنة مع سياسات وصول صارمة\n• مراجعة أمنية دورية' },
  { title: 'حقوقك', icon: 'person' as const, content: '• الوصول إلى بياناتك وتعديلها\n• طلب حذف حسابك نهائياً\n• إلغاء الاشتراك في أي وقت\n• التحكم في الإشعارات' },
  { title: 'التواصل معنا', icon: 'email' as const, content: 'البريد الإلكتروني: support@masarai.app\nداخل التطبيق: قسم المساعدة' },
];

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useColors();

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
          <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>سياسة الخصوصية</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.updatedBadge}>
          <MaterialIcons name="update" size={14} color={theme.textMuted} />
          <Text style={[styles.updatedText, { color: theme.textMuted }]}>آخر تحديث: مارس 2026</Text>
        </View>
        {SECTIONS.map((section) => (
          <View key={section.title} style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: theme.primary + '15' }]}>
                <MaterialIcons name={section.icon} size={18} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{section.title}</Text>
            </View>
            <Text style={[styles.sectionContent, { color: theme.textSecondary }]}>{section.content}</Text>
          </View>
        ))}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>باستخدامك لتطبيق مسار AI، فإنك توافق على شروط سياسة الخصوصية هذه.</Text>
          <Text style={[styles.footerCopy, { color: theme.textMuted }]}>© 2026 MasarAI. جميع الحقوق محفوظة.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  updatedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 12 },
  updatedText: { fontSize: 12 },
  section: { marginHorizontal: 20, marginBottom: 16, borderRadius: 14, padding: 18, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionContent: { fontSize: 14, lineHeight: 24 },
  footer: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 16, gap: 8 },
  footerText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  footerCopy: { fontSize: 11 },
});
