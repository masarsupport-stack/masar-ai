import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useTheme';

interface InsightCardProps {
  type: 'tip' | 'warning' | 'achievement';
  messageAr: string;
}

export default function InsightCard({ type, messageAr }: InsightCardProps) {
  const theme = useColors();
  const cfg = {
    tip: { icon: 'lightbulb' as const, color: theme.primary, bg: theme.primary + '15' },
    warning: { icon: 'warning' as const, color: theme.warning, bg: theme.warning + '15' },
    achievement: { icon: 'emoji-events' as const, color: theme.accent, bg: theme.accent + '15' },
  };
  const { icon, color, bg } = cfg[type];

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor: color + '30' }]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.message, { color: theme.textPrimary }]} numberOfLines={2}>{messageAr}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 10, marginBottom: 8 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  message: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 20 },
});
