import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth, useAlert, getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useApp } from '../contexts/AppContext';
import { useTheme, useColors } from '../hooks/useTheme';
import { isNotificationsEnabled, setNotificationsEnabled, getScheduledCount, requestNotificationPermissions, scheduleDailyReminders } from '../services/notifications';
import { updateUserStats } from '../services/database';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user: authUser, logout, operationLoading } = useAuth();
  const { showAlert } = useAlert();
  const { user } = useApp();
  const { mode, toggleTheme } = useTheme();
  const theme = useColors();
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);

  // Load notification state on mount
  useEffect(() => {
    let mounted = true;
    const loadNotifState = async () => {
      const enabled = await isNotificationsEnabled();
      const { status } = await (await import('expo-notifications')).getPermissionsAsync();
      const count = await getScheduledCount();
      if (mounted) {
        setNotifEnabled(enabled);
        setPermissionGranted(status === 'granted');
        setScheduledCount(count);
      }
    };
    loadNotifState();
    return () => { mounted = false; };
  }, []);

  const toggleNotifications = useCallback(async () => {
    const newState = !notifEnabled;
    setNotifEnabled(newState);
    await setNotificationsEnabled(newState);
    if (newState) {
      const granted = await requestNotificationPermissions();
      setPermissionGranted(granted);
      if (granted) await scheduleDailyReminders();
    }
    const count = await getScheduledCount();
    setScheduledCount(count);
  }, [notifEnabled]);
  const [nameAr, setNameAr] = useState(user.nameAr || '');
  const [phone, setPhone] = useState('');
  const [phoneLoaded, setPhoneLoaded] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Sync nameAr when user data loads
  useEffect(() => {
    if (user.nameAr) setNameAr(user.nameAr);
  }, [user.nameAr]);

  // Load phone from database on mount
  useEffect(() => {
    if (authUser?.id && !phoneLoaded) {
      const loadPhone = async () => {
        try {
          const supabase = getSupabaseClient();
          const { data } = await supabase.from('user_profiles').select('phone').eq('id', authUser.id).single();
          if (data?.phone) setPhone(data.phone);
        } catch {}
        setPhoneLoaded(true);
      };
      loadPhone();
    }
  }, [authUser?.id, phoneLoaded]);

  const handleSaveName = useCallback(async () => {
    if (!nameAr.trim() || !authUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSavingName(true);
    const { error } = await updateUserStats(authUser.id, { name_ar: nameAr.trim() });
    setSavingName(false);
    if (error) showAlert('خطأ', error);
    else showAlert('تم الحفظ', 'تم تحديث الاسم بنجاح');
  }, [nameAr, authUser?.id, showAlert]);

  const handleSavePhone = useCallback(async () => {
    if (!phone.trim() || !authUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSavingPhone(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('user_profiles').update({ phone: phone.trim() }).eq('id', authUser.id);
      setSavingPhone(false);
      if (error) showAlert('خطأ', error.message);
      else showAlert('تم الحفظ', 'تم تحديث رقم الجوال بنجاح');
    } catch (e: any) { setSavingPhone(false); showAlert('خطأ', e.message || 'فشل حفظ الرقم'); }
  }, [phone, authUser?.id, showAlert]);

  const handleDeleteAccount = useCallback(() => {
    showAlert('حذف الحساب نهائياً', 'هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'نعم، احذف حسابي', style: 'destructive', onPress: async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setDeletingAccount(true);
        try {
          const supabase = getSupabaseClient();
          const { error } = await supabase.functions.invoke('delete-account');
          if (error) {
            let msg = error.message;
            if (error instanceof FunctionsHttpError) { try { msg = await error.context?.text() || msg; } catch {} }
            showAlert('خطأ', msg); setDeletingAccount(false); return;
          }
          await logout();
        } catch (err: any) { showAlert('خطأ', err.message || 'فشل حذف الحساب'); setDeletingAccount(false); }
      }},
    ]);
  }, [showAlert, logout]);

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
          <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>الإعدادات</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>الملف الشخصي</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>الاسم</Text>
              <View style={styles.inputRow}>
                <TextInput style={[styles.input, { backgroundColor: theme.surfaceLight, color: theme.textPrimary }]} value={nameAr} onChangeText={setNameAr} placeholder="أدخل اسمك" placeholderTextColor={theme.textMuted} />
                <Pressable style={[styles.saveBtn, { backgroundColor: theme.primary }, (!nameAr.trim() || savingName) && { opacity: 0.5 }]} onPress={handleSaveName} disabled={!nameAr.trim() || savingName}>
                  {savingName ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>حفظ</Text>}
                </Pressable>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>رقم الجوال</Text>
              <View style={styles.inputRow}>
                <TextInput style={[styles.input, { backgroundColor: theme.surfaceLight, color: theme.textPrimary }]} value={phone} onChangeText={setPhone} placeholder="05XXXXXXXX" placeholderTextColor={theme.textMuted} keyboardType="phone-pad" />
                <Pressable style={[styles.saveBtn, { backgroundColor: theme.primary }, (!phone.trim() || savingPhone) && { opacity: 0.5 }]} onPress={handleSavePhone} disabled={!phone.trim() || savingPhone}>
                  {savingPhone ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>حفظ</Text>}
                </Pressable>
              </View>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={18} color={theme.textMuted} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>{authUser?.email || 'غير متوفر'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>إعدادات التطبيق</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Pressable style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]} onPress={() => { Haptics.selectionAsync(); toggleNotifications(); }}>
              <MaterialIcons name="notifications" size={20} color={notifEnabled ? theme.primary : theme.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>الإشعارات</Text>
                {notifEnabled ? <Text style={[styles.settingHint, { color: theme.textMuted }]}>{permissionGranted ? `${scheduledCount} تذكير مجدول` : 'يرجى السماح من إعدادات الجهاز'}</Text> : null}
              </View>
              <View style={[styles.toggleTrack, { backgroundColor: notifEnabled ? theme.primary : theme.surfaceLight }]}>
                <View style={[styles.toggleThumb, { backgroundColor: notifEnabled ? '#FFF' : theme.textMuted, alignSelf: notifEnabled ? 'flex-end' : 'flex-start' }]} />
              </View>
            </Pressable>
            <Pressable style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <MaterialIcons name="language" size={20} color={theme.textSecondary} />
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>اللغة</Text>
              <Text style={[styles.settingValue, { color: theme.textSecondary }]}>العربية</Text>
              <MaterialIcons name="chevron-right" size={18} color={theme.textMuted} />
            </Pressable>
            <Pressable style={styles.settingRow} onPress={() => { Haptics.selectionAsync(); toggleTheme(); }}>
              <MaterialIcons name={mode === 'dark' ? 'dark-mode' : 'light-mode'} size={20} color={theme.textSecondary} />
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>المظهر</Text>
              <Text style={[styles.settingValue, { color: theme.textSecondary }]}>{mode === 'dark' ? 'داكن' : 'فاتح'}</Text>
              <MaterialIcons name="swap-horiz" size={18} color={theme.primary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>الدعم</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Pressable style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]} onPress={() => router.push('/support')}>
              <MaterialIcons name="support-agent" size={20} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>الدعم الفني</Text>
                <Text style={[styles.settingHint, { color: theme.textMuted }]}>محادثة مع المساعد الذكي</Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color={theme.textMuted} />
            </Pressable>
            <View style={styles.settingRow}>
              <MaterialIcons name="email" size={20} color={theme.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>البريد الإلكتروني</Text>
                <Text style={[styles.settingHint, { color: theme.primary }]}>support@masarai.app</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>القانوني</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Pressable style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]} onPress={() => router.push('/privacy')}>
              <MaterialIcons name="privacy-tip" size={20} color={theme.textSecondary} />
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>سياسة الخصوصية</Text>
              <MaterialIcons name="chevron-right" size={18} color={theme.textMuted} />
            </Pressable>
            <Pressable style={styles.settingRow} onPress={() => router.push('/privacy')}>
              <MaterialIcons name="description" size={20} color={theme.textSecondary} />
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>شروط الاستخدام</Text>
              <MaterialIcons name="chevron-right" size={18} color={theme.textMuted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.error }]}>منطقة الخطر</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.error + '30' }]}>
            <View style={styles.dangerInfo}>
              <MaterialIcons name="warning" size={24} color={theme.error} />
              <Text style={[styles.dangerText, { color: theme.textSecondary }]}>حذف الحساب سيؤدي إلى إزالة جميع بياناتك بشكل نهائي.</Text>
            </View>
            <Pressable style={[styles.deleteBtn, { backgroundColor: theme.error + '12', borderColor: theme.error + '30' }]} onPress={handleDeleteAccount} disabled={deletingAccount}>
              {deletingAccount ? <ActivityIndicator size="small" color={theme.error} /> : (
                <><MaterialIcons name="delete-forever" size={20} color={theme.error} /><Text style={[styles.deleteBtnText, { color: theme.error }]}>حذف حسابي نهائياً</Text></>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: theme.textMuted }]}>مسار AI - الإصدار 1.0.0</Text>
          <Text style={[styles.appInfoText, { color: theme.textMuted }]}>صنع بحب في السعودية 🇸🇦</Text>
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
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginLeft: 4 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  inputGroup: { padding: 16 },
  inputLabel: { fontSize: 12, marginBottom: 8, fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, height: 44, borderRadius: 10, paddingHorizontal: 14, fontSize: 15, includeFontPadding: false },
  saveBtn: { height: 44, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  infoText: { fontSize: 14 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  settingLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  settingValue: { fontSize: 13, fontWeight: '500' },
  settingHint: { fontSize: 11, marginTop: 2 },
  toggleTrack: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center', paddingHorizontal: 2 },
  toggleThumb: { width: 24, height: 24, borderRadius: 12 },
  dangerInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 16, paddingBottom: 8 },
  dangerText: { flex: 1, fontSize: 13, lineHeight: 20 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, marginTop: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  deleteBtnText: { fontSize: 15, fontWeight: '700' },
  appInfo: { alignItems: 'center', paddingTop: 32, gap: 4 },
  appInfoText: { fontSize: 12 },
});
