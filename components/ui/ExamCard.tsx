import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../../hooks/useTheme';

interface ExamCardProps {
  examType: 'step' | 'ielts' | 'psychometric';
  nameAr: string;
  name: string;
  score: number;
  readiness: number;
  predictedScore: number | string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  onPress: () => void;
}

export default function ExamCard({ examType, nameAr, name, score, readiness, predictedScore, icon, color, onPress }: ExamCardProps) {
  const theme = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { borderColor: theme.border, opacity: pressed ? 0.9 : 1 }]}>
      <LinearGradient colors={[color + '20', color + '08']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: color + '25' }]}>
            <MaterialIcons name={icon} size={24} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.nameAr, { color: theme.textPrimary }]}>{nameAr}</Text>
            <Text style={[styles.name, { color: theme.textSecondary }]}>{name}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.score, { color }]}>{Math.round(score || 0)}%</Text>
            <Text style={[styles.label, { color: theme.textMuted }]}>الدرجة الحالية</Text>
          </View>
        </View>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{typeof predictedScore === 'number' ? Math.round(predictedScore) : predictedScore}</Text>
            <Text style={[styles.metricLabel, { color: theme.textMuted }]}>التوقع</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: readiness >= 70 ? theme.success : readiness >= 40 ? theme.warning : theme.error }]}>{Math.round(readiness || 0)}%</Text>
            <Text style={[styles.metricLabel, { color: theme.textMuted }]}>الجاهزية</Text>
          </View>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.surfaceLight }]}>
          <View style={[styles.progressFill, { width: `${readiness}%`, backgroundColor: color }]} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, overflow: 'hidden', marginBottom: 12, borderWidth: 1 },
  gradient: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  iconContainer: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nameAr: { fontSize: 16, fontWeight: '700' },
  name: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  score: { fontSize: 24, fontWeight: '700' },
  label: { fontSize: 10, marginTop: 1 },
  metricsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: '700' },
  metricLabel: { fontSize: 11, marginTop: 2 },
  divider: { width: 1, height: 30 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
});
