import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useAuth, useAlert } from '@/template';
import { useColors } from '../hooks/useTheme';

type AuthMode = 'login' | 'register';
type RegisterStep = 'form' | 'otp';

export default function LoginScreen() {
  const { sendOTP, verifyOTPAndLogin, signInWithPassword, operationLoading } = useAuth();
  const { showAlert } = useAlert();
  const theme = useColors();
  const [mode, setMode] = useState<AuthMode>('login');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = useCallback(() => { setEmail(''); setPassword(''); setConfirmPassword(''); setOtp(''); setPhone(''); setRegisterStep('form'); setShowPassword(false); }, []);
  const switchMode = useCallback((newMode: AuthMode) => { Haptics.selectionAsync(); setMode(newMode); resetForm(); }, [resetForm]);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) { showAlert('تنبيه', 'يرجى إدخال البريد الإلكتروني وكلمة المرور'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await signInWithPassword(email.trim(), password);
    if (error) showAlert('خطأ في تسجيل الدخول', error);
  }, [email, password, signInWithPassword, showAlert]);

  const handleSendOTP = useCallback(async () => {
    if (!email.trim()) { showAlert('تنبيه', 'يرجى إدخال البريد الإلكتروني'); return; }
    if (!password.trim() || password.length < 6) { showAlert('تنبيه', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (password !== confirmPassword) { showAlert('تنبيه', 'كلمات المرور غير متطابقة'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await sendOTP(email.trim());
    if (error) { showAlert('خطأ', error); return; }
    showAlert('تم الإرسال', 'تم إرسال رمز التحقق إلى بريدك الإلكتروني');
    setRegisterStep('otp');
  }, [email, password, confirmPassword, sendOTP, showAlert]);

  const handleVerifyOTP = useCallback(async () => {
    if (!otp.trim()) { showAlert('تنبيه', 'يرجى إدخال رمز التحقق'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await verifyOTPAndLogin(email.trim(), otp.trim(), { password });
    if (error) { showAlert('خطأ في التحقق', error); return; }
    if (phone.trim()) {
      try { const { getSupabaseClient } = await import('@/template'); const supabase = getSupabaseClient(); const { data: { user: newUser } } = await supabase.auth.getUser(); if (newUser) await supabase.from('user_profiles').update({ phone: phone.trim() }).eq('id', newUser.id); } catch {}
    }
  }, [email, otp, password, verifyOTPAndLogin, showAlert, phone]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.statusBar} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.heroSection}>
            <Image source={require('../assets/images/hero-brain.png')} style={styles.heroImage} contentFit="contain" transition={300} />
            <Text style={[styles.appName, { color: theme.textPrimary }]}>مسار AI</Text>
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>مدربك الذكي للاختبارات</Text>
          </View>

          <View style={[styles.modeSwitcher, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {(['login', 'register'] as const).map(m => (
              <Pressable key={m} style={[styles.modeTab, mode === m && [styles.modeTabActive, { backgroundColor: theme.primary }]]} onPress={() => switchMode(m)}>
                <Text style={[styles.modeTabText, { color: theme.textSecondary }, mode === m && styles.modeTabTextActive]}>{m === 'login' ? 'تسجيل الدخول' : 'حساب جديد'}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.formContainer}>
            {mode === 'login' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>البريد الإلكتروني</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <MaterialIcons name="email" size={20} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput style={[styles.input, { color: theme.textPrimary }]} placeholder="example@email.com" placeholderTextColor={theme.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textAlign="left" />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>كلمة المرور</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <MaterialIcons name="lock" size={20} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput style={[styles.input, { color: theme.textPrimary }]} placeholder="******" placeholderTextColor={theme.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} textAlign="left" />
                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}><MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color={theme.textMuted} /></Pressable>
                  </View>
                </View>
                <Pressable style={[styles.primaryBtn, { backgroundColor: theme.primary }, operationLoading && styles.btnDisabled]} onPress={handleLogin} disabled={operationLoading}>
                  {operationLoading ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.primaryBtnText}>تسجيل الدخول</Text><MaterialIcons name="arrow-forward" size={20} color="#FFF" /></>}
                </Pressable>
              </>
            ) : registerStep === 'form' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>البريد الإلكتروني</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <MaterialIcons name="email" size={20} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput style={[styles.input, { color: theme.textPrimary }]} placeholder="example@email.com" placeholderTextColor={theme.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textAlign="left" />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>كلمة المرور</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <MaterialIcons name="lock" size={20} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput style={[styles.input, { color: theme.textPrimary }]} placeholder="6 أحرف على الأقل" placeholderTextColor={theme.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} textAlign="left" />
                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}><MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color={theme.textMuted} /></Pressable>
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>رقم الجوال</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <MaterialIcons name="phone" size={20} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput style={[styles.input, { color: theme.textPrimary }]} placeholder="05XXXXXXXX" placeholderTextColor={theme.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" textAlign="left" />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>تأكيد كلمة المرور</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <MaterialIcons name="lock-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput style={[styles.input, { color: theme.textPrimary }]} placeholder="أعد إدخال كلمة المرور" placeholderTextColor={theme.textMuted} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} textAlign="left" />
                  </View>
                </View>
                <Pressable style={[styles.primaryBtn, { backgroundColor: theme.primary }, operationLoading && styles.btnDisabled]} onPress={handleSendOTP} disabled={operationLoading}>
                  {operationLoading ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.primaryBtnText}>إرسال رمز التحقق</Text><MaterialIcons name="send" size={20} color="#FFF" /></>}
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.otpHeader}>
                  <View style={[styles.otpIconCircle, { backgroundColor: theme.primary + '18' }]}><MaterialIcons name="mark-email-read" size={32} color={theme.primary} /></View>
                  <Text style={[styles.otpTitle, { color: theme.textPrimary }]}>تحقق من بريدك</Text>
                  <Text style={[styles.otpSubtitle, { color: theme.textSecondary }]}>أرسلنا رمز تحقق مكون من 4 أرقام إلى{'\n'}<Text style={{ color: theme.primary, fontWeight: '600' }}>{email}</Text></Text>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>رمز التحقق</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <MaterialIcons name="pin" size={20} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput style={[styles.input, { color: theme.textPrimary, letterSpacing: 8, fontSize: 24, fontWeight: '700' }]} placeholder="0000" placeholderTextColor={theme.textMuted} value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={4} textAlign="center" />
                  </View>
                </View>
                <Pressable style={[styles.primaryBtn, { backgroundColor: theme.primary }, operationLoading && styles.btnDisabled]} onPress={handleVerifyOTP} disabled={operationLoading}>
                  {operationLoading ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.primaryBtnText}>تأكيد وإنشاء الحساب</Text><MaterialIcons name="check-circle" size={20} color="#FFF" /></>}
                </Pressable>
                <Pressable style={styles.backBtn} onPress={() => setRegisterStep('form')}>
                  <MaterialIcons name="arrow-back" size={18} color={theme.textSecondary} />
                  <Text style={[styles.backBtnText, { color: theme.textSecondary }]}>تعديل البريد الإلكتروني</Text>
                </Pressable>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.featuresRow}>
              {[{ icon: 'auto-awesome' as const, label: 'تحليل ذكي' }, { icon: 'school' as const, label: 'STEP & IELTS' }, { icon: 'trending-up' as const, label: 'تتبع التقدم' }].map((item) => (
                <View key={item.label} style={styles.featureItem}>
                  <MaterialIcons name={item.icon} size={16} color={theme.primary} />
                  <Text style={[styles.featureText, { color: theme.textMuted }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
  heroSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  heroImage: { width: 100, height: 100, marginBottom: 12 },
  appName: { fontSize: 32, fontWeight: '700' },
  tagline: { fontSize: 14, marginTop: 4 },
  modeSwitcher: { flexDirection: 'row', borderRadius: 14, padding: 4, marginTop: 24, borderWidth: 1 },
  modeTab: { flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center' },
  modeTabActive: {},
  modeTabText: { fontSize: 15, fontWeight: '600' },
  modeTabTextActive: { color: '#FFF' },
  formContainer: { marginTop: 24, gap: 16 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, includeFontPadding: false },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 14, marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  otpHeader: { alignItems: 'center', gap: 8, marginBottom: 8 },
  otpIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  otpTitle: { fontSize: 22, fontWeight: '700' },
  otpSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  backBtnText: { fontSize: 14, fontWeight: '500' },
  footer: { marginTop: 'auto', paddingTop: 32 },
  featuresRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featureText: { fontSize: 12, fontWeight: '500' },
});
