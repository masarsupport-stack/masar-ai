import React, { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useColors } from '../hooks/useTheme';

interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date; }

const QUICK_ACTIONS = [
  { label: 'كيف أبدأ التدريب؟', icon: 'play-circle-outline' as const },
  { label: 'مشكلة في الاشتراك', icon: 'payment' as const },
  { label: 'كيف أحسن درجتي؟', icon: 'trending-up' as const },
  { label: 'مشكلة تقنية', icon: 'bug-report' as const },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', content: 'مرحباً بك! أنا مساعد مسار الذكي 🤖\n\nكيف يمكنني مساعدتك اليوم؟\n\n📧 support@masarai.app', timestamp: new Date() },
  ]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const supabase = getSupabaseClient();
      const conversationHistory = messages.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke('ai-support', { body: { message: text.trim(), conversationHistory } });
      let reply = 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى أو التواصل عبر support@masarai.app';
      if (error) {
        let errMsg = error.message;
        if (error instanceof FunctionsHttpError) { try { errMsg = await error.context?.text() || errMsg; } catch {} }
        console.error('Support error:', errMsg);
      } else if (data?.reply) { reply = data.reply; }
      setMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: 'assistant', content: reply, timestamp: new Date() }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: 'عذراً، حدث خطأ في الاتصال.', timestamp: new Date() }]);
    } finally { setSending(false); }
  }, [messages, sending]);

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
          <MaterialIcons name="arrow-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatar, { backgroundColor: theme.primary + '20' }]}>
            <MaterialIcons name="support-agent" size={22} color={theme.primary} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>الدعم الفني</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]}>مساعد مسار الذكي</Text>
          </View>
        </View>
        <Pressable onPress={() => { Haptics.selectionAsync(); setMessages([messages[0]]); }} hitSlop={12} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
          <MaterialIcons name="refresh" size={22} color={theme.textSecondary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.messagesContainer} showsVerticalScrollIndicator={false} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              {msg.role === 'assistant' ? (
                <View style={[styles.assistantIcon, { backgroundColor: theme.primary + '18' }]}>
                  <MaterialIcons name="smart-toy" size={16} color={theme.primary} />
                </View>
              ) : null}
              <View style={[styles.bubbleContent, msg.role === 'user' ? [styles.userContent, { backgroundColor: theme.primary }] : [styles.assistantContent, { backgroundColor: theme.surface, borderColor: theme.border }]]}>
                <Text style={[styles.messageText, msg.role === 'user' ? styles.userText : { color: theme.textPrimary }]}>{msg.content}</Text>
                <Text style={[styles.timeText, { color: theme.textMuted }]}>{msg.timestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </View>
          ))}
          {sending ? (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <View style={[styles.assistantIcon, { backgroundColor: theme.primary + '18' }]}>
                <MaterialIcons name="smart-toy" size={16} color={theme.primary} />
              </View>
              <View style={[styles.bubbleContent, styles.assistantContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.typingRow}><ActivityIndicator size="small" color={theme.primary} /><Text style={[styles.typingText, { color: theme.textMuted }]}>جاري الكتابة...</Text></View>
              </View>
            </View>
          ) : null}
          {messages.length <= 1 ? (
            <View style={styles.quickActions}>
              {QUICK_ACTIONS.map((action) => (
                <Pressable key={action.label} style={({ pressed }) => [styles.quickBtn, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '30' }, pressed && { opacity: 0.7 }]} onPress={() => sendMessage(action.label)}>
                  <MaterialIcons name={action.icon} size={18} color={theme.primary} />
                  <Text style={[styles.quickBtnText, { color: theme.primary }]}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
        <View style={[styles.emailBanner, { backgroundColor: theme.surfaceLight + '60' }]}>
          <MaterialIcons name="email" size={14} color={theme.textMuted} />
          <Text style={[styles.emailText, { color: theme.textMuted }]}>الدعم المباشر: support@masarai.app</Text>
        </View>
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12), borderTopColor: theme.border, backgroundColor: theme.background }]}>
          <TextInput style={[styles.input, { backgroundColor: theme.surface, color: theme.textPrimary, borderColor: theme.border }]} value={inputText} onChangeText={setInputText} placeholder="اكتب رسالتك..." placeholderTextColor={theme.textMuted} multiline maxLength={500} editable={!sending} />
          <Pressable style={[styles.sendBtn, { backgroundColor: theme.primary }, (!inputText.trim() || sending) && { opacity: 0.4 }]} onPress={() => sendMessage(inputText)} disabled={!inputText.trim() || sending}>
            <MaterialIcons name="send" size={22} color="#FFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSub: { fontSize: 11, marginTop: 1 },
  messagesContainer: { padding: 16, paddingBottom: 8, gap: 12 },
  messageBubble: { flexDirection: 'row', gap: 8, maxWidth: '88%' },
  userBubble: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  assistantBubble: { alignSelf: 'flex-start' },
  assistantIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  bubbleContent: { borderRadius: 16, padding: 12, paddingBottom: 6, maxWidth: '90%' },
  userContent: { borderBottomRightRadius: 4 },
  assistantContent: { borderWidth: 1, borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, lineHeight: 22 },
  userText: { color: '#FFF' },
  timeText: { fontSize: 10, marginTop: 4, textAlign: 'left' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { fontSize: 13 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  quickBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  quickBtnText: { fontSize: 13, fontWeight: '600' },
  emailBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  emailText: { fontSize: 11 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 10, gap: 8, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, borderWidth: 1, includeFontPadding: false, textAlign: 'right' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
