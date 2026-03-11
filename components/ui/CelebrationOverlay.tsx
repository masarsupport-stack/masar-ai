import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
  withSequence, withSpring, runOnJS, Easing,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useTheme';

const DEFAULT_WIDTH = 375;
const DEFAULT_HEIGHT = 750;

interface ConfettiPieceProps { index: number; color: string; startX: number; delay: number; }

function ConfettiPiece({ index, color, startX, delay, screenHeight }: ConfettiPieceProps & { screenHeight: number }) {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(startX);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  useEffect(() => {
    const targetX = startX + (Math.random() - 0.5) * 160;
    const targetY = screenHeight * 0.5 + Math.random() * 200;
    const rotTarget = (Math.random() - 0.5) * 720;
    scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
    translateY.value = withDelay(delay, withTiming(targetY, { duration: 1800, easing: Easing.out(Easing.quad) }));
    translateX.value = withDelay(delay, withTiming(targetX, { duration: 1800, easing: Easing.out(Easing.quad) }));
    rotation.value = withDelay(delay, withTiming(rotTarget, { duration: 1800 }));
    opacity.value = withDelay(delay + 1200, withTiming(0, { duration: 600 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { rotate: `${rotation.value}deg` }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const isCircle = index % 3 === 0;
  const isRect = index % 3 === 1;
  const size = 6 + Math.random() * 6;

  return (
    <Animated.View style={[{ position: 'absolute', width: isRect ? size * 2.5 : size, height: size, backgroundColor: color, borderRadius: isCircle ? size / 2 : 2, top: 0, left: 0 }, style]} />
  );
}

interface CelebrationOverlayProps { visible: boolean; onFinish: () => void; taskName?: string; score?: number; }

const CONFETTI_COLORS = ['#06B6D4', '#22D3EE', '#F59E0B', '#FBBF24', '#10B981', '#34D399', '#8B5CF6', '#A78BFA', '#EF4444', '#FB923C', '#EC4899', '#14B8A6'];

export default function CelebrationOverlay({ visible, onFinish, taskName, score }: CelebrationOverlayProps) {
  const theme = useColors();
  const [screenDims, setScreenDims] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });

  useEffect(() => {
    const update = () => { const w = Dimensions.get('window'); setScreenDims({ width: Math.max(1, w.width), height: Math.max(1, w.height) }); };
    update();
    const sub = Dimensions.addEventListener('change', update);
    return () => sub?.remove();
  }, []);

  const overlayOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const checkRotation = useSharedValue(-90);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(0.8);

  const dismiss = useCallback(() => {
    overlayOpacity.value = withTiming(0, { duration: 300 }, () => { runOnJS(onFinish)(); });
  }, [onFinish]);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 200 });
      ringScale.value = withDelay(100, withTiming(3, { duration: 600, easing: Easing.out(Easing.quad) }));
      ringOpacity.value = withDelay(100, withSequence(withTiming(0.6, { duration: 100 }), withTiming(0, { duration: 500 })));
      checkScale.value = withDelay(150, withSequence(withSpring(1.3, { damping: 6, stiffness: 200 }), withSpring(1, { damping: 10 })));
      checkRotation.value = withDelay(150, withSpring(0, { damping: 12, stiffness: 120 }));
      textOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
      textTranslateY.value = withDelay(400, withSpring(0, { damping: 12 }));
      const timer = setTimeout(dismiss, 2000);
      return () => clearTimeout(timer);
    } else {
      overlayOpacity.value = 0; checkScale.value = 0; checkRotation.value = -90; textOpacity.value = 0; textTranslateY.value = 20; ringScale.value = 0; ringOpacity.value = 0.8;
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }, { rotate: `${checkRotation.value}deg` }] }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value, transform: [{ translateY: textTranslateY.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: ringScale.value }], opacity: ringOpacity.value }));

  if (!visible) return null;

  const confettiPieces = Array.from({ length: 40 }, (_, i) => ({
    index: i, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length], startX: screenDims.width * 0.5 + (Math.random() - 0.5) * 40, delay: Math.random() * 300,
  }));

  return (
    <Animated.View style={[styles.overlay, { backgroundColor: theme.background + 'CC' }, overlayStyle]} pointerEvents="none">
      {confettiPieces.map((p) => <ConfettiPiece key={p.index} index={p.index} color={p.color} startX={p.startX} delay={p.delay} screenHeight={screenDims.height} />)}
      <Animated.View style={[styles.ring, { borderColor: theme.primary }, ringStyle]} />
      <View style={styles.centerContent}>
        <Animated.View style={[styles.checkCircle, { backgroundColor: theme.success, ...theme.shadow.elevated }, checkStyle]}>
          <MaterialIcons name="check" size={48} color="#FFF" />
        </Animated.View>
        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text style={[styles.celebrationTitle, { color: theme.textPrimary }]}>أحسنت!</Text>
          {taskName ? <Text style={[styles.celebrationSub, { color: theme.textSecondary }]}>{taskName}</Text> : null}
          {score != null ? (
            <View style={[styles.scoreBadge, { backgroundColor: theme.accent + '20', borderColor: theme.accent + '40' }]}>
              <MaterialIcons name="star" size={16} color={theme.accent} />
              <Text style={[styles.scoreText, { color: theme.accent }]}>{score}%</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 999, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 3 },
  centerContent: { alignItems: 'center', gap: 16 },
  checkCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  textContainer: { alignItems: 'center', gap: 6 },
  celebrationTitle: { fontSize: 28, fontWeight: '700' },
  celebrationSub: { fontSize: 15, textAlign: 'center', maxWidth: 240 },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginTop: 4 },
  scoreText: { fontSize: 18, fontWeight: '700' },
});
