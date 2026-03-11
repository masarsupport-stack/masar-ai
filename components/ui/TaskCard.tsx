import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useTheme';

interface TaskCardProps {
  titleAr: string;
  typeAr: string;
  examType: 'step' | 'ielts' | 'psychometric';
  duration: number;
  completed: boolean;
  score?: number;
  onPress: () => void;
}

const typeIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  'تدريب': 'fitness-center',
  'اختبار قصير': 'quiz',
  'مراجعة': 'auto-stories',
  'اختبار': 'assignment',
};

export default function TaskCard({ titleAr, typeAr, examType, duration, completed, score, onPress }: TaskCardProps) {
  const theme = useColors();
  const examColors = { step: theme.step, ielts: theme.ielts, psychometric: theme.psychometric };
  const color = examColors[examType];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { opacity: pressed ? 0.85 : 1, borderLeftColor: color, backgroundColor: theme.surface },
        completed && styles.completed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
        {completed ? (
          <MaterialIcons name="check-circle" size={22} color={theme.success} />
        ) : (
          <MaterialIcons name={typeIcons[typeAr] || 'assignment'} size={22} color={color} />
        )}
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.textPrimary }, completed && { textDecorationLine: 'line-through', color: theme.textMuted }]}>{titleAr}</Text>
        <View style={styles.meta}>
          <Text style={[styles.type, { color: theme.textSecondary }]}>{typeAr}</Text>
          <Text style={[styles.dot, { color: theme.textMuted }]}>•</Text>
          <Text style={[styles.duration, { color: theme.textSecondary }]}>{duration} دقيقة</Text>
          {score != null ? (
            <>
              <Text style={[styles.dot, { color: theme.textMuted }]}>•</Text>
              <Text style={[styles.score, { color: score >= 80 ? theme.success : theme.warning }]}>{score}%</Text>
            </>
          ) : null}
        </View>
      </View>
      {!completed ? <MaterialIcons name="play-circle-filled" size={32} color={color} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderLeftWidth: 3, gap: 12, marginBottom: 10 },
  completed: { opacity: 0.7 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  type: { fontSize: 11, fontWeight: '500' },
  dot: { fontSize: 11 },
  duration: { fontSize: 11 },
  score: { fontSize: 12, fontWeight: '700' },
});
