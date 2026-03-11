import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../hooks/useTheme';

interface SkillBarProps {
  skillAr: string;
  level: number;
  category: 'strength' | 'weakness' | 'improving';
}

export default function SkillBar({ skillAr, level, category }: SkillBarProps) {
  const theme = useColors();
  const color = category === 'strength' ? theme.success : category === 'improving' ? theme.accent : theme.error;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.skill, { color: theme.textPrimary }]}>{skillAr}</Text>
        <Text style={[styles.level, { color }]}>{level}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.surfaceLight }]}>
        <View style={[styles.fill, { width: `${level}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  skill: { fontSize: 13, fontWeight: '500' },
  level: { fontSize: 13, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
