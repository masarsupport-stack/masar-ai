import React from 'react';
import { Text, Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useTheme';

interface QuizOptionProps {
  text: string;
  index: number;
  selected: boolean;
  isCorrect?: boolean;
  showResult: boolean;
  onPress: () => void;
}

const letters = ['A', 'B', 'C', 'D'];

export default function QuizOption({ text, index, selected, isCorrect, showResult, onPress }: QuizOptionProps) {
  const theme = useColors();

  const getBorderColor = () => {
    if (!showResult) return selected ? theme.primary : theme.border;
    if (isCorrect) return theme.success;
    if (selected && !isCorrect) return theme.error;
    return theme.border;
  };

  const getBgColor = () => {
    if (!showResult) return selected ? theme.primary + '15' : theme.surface;
    if (isCorrect) return theme.success + '12';
    if (selected && !isCorrect) return theme.error + '12';
    return theme.surface;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={showResult}
      style={({ pressed }) => [
        styles.container,
        { borderColor: getBorderColor(), backgroundColor: getBgColor(), opacity: pressed && !showResult ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.letter, {
        backgroundColor: showResult && isCorrect ? theme.success + '20' : showResult && selected && !isCorrect ? theme.error + '20' : selected ? theme.primary + '20' : theme.surfaceLight,
      }]}>
        <Text style={[styles.letterText, {
          color: showResult && isCorrect ? theme.success : showResult && selected && !isCorrect ? theme.error : selected ? theme.primary : theme.textSecondary,
        }]}>{letters[index]}</Text>
      </View>
      <Text style={[styles.text, { color: theme.textPrimary }]} numberOfLines={3}>{text}</Text>
      {showResult && isCorrect ? <MaterialIcons name="check-circle" size={22} color={theme.success} /> : null}
      {showResult && selected && !isCorrect ? <MaterialIcons name="cancel" size={22} color={theme.error} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1.5, gap: 12, marginBottom: 10 },
  letter: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  letterText: { fontSize: 15, fontWeight: '700' },
  text: { fontSize: 15, fontWeight: '500', lineHeight: 22, flex: 1 },
});
