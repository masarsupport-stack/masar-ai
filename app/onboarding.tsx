import React, { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, FlatList, ViewToken } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '../hooks/useTheme';

const ONBOARDING_KEY = '@masarai_onboarding_done';

interface OnboardingSlide {
  id: string;
  image: any;
  title: string;
  subtitle: string;
  icon: string;
  gradient: [string, string];
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useColors();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const [screenWidth, setScreenWidth] = useState(() => {
    const w = Dimensions.get('window').width;
    return Math.max(1, w);
  });

  React.useEffect(() => {
    const update = () => {
      const w = Dimensions.get('window').width;
      setScreenWidth(Math.max(1, w));
    };
    const sub = Dimensions.addEventListener('change', update);
    return () => sub?.remove();
  }, []);

  const slides: OnboardingSlide[] = [
    {
      id: '1',
      image: require('@/assets/images/onboarding-1.png'),
      title: 'مدرّب ذكي بالذكاء الاصطناعي',
      subtitle: 'يحلل أداءك ويبني خطة تدريب مخصصة تتكيف مع مستواك وتتطور معك يومياً',
      icon: 'auto-awesome',
      gradient: [theme.primary + '20', theme.secondary + '10'],
    },
    {
      id: '2',
      image: require('@/assets/images/onboarding-2.png'),
      title: 'خطة 30 يوم شخصية',
      subtitle: 'تدريبات يومية مصممة خصيصاً لك في اختبارات STEP وIELTS والسيكومتري',
      icon: 'route',
      gradient: [theme.secondary + '20', theme.accent + '10'],
    },
    {
      id: '3',
      image: require('@/assets/images/onboarding-3.png'),
      title: 'تابع تقدمك وحقق أهدافك',
      subtitle: 'إحصائيات مفصلة وخريطة مهارات تُظهر نقاط قوتك وفرص التحسن',
      icon: 'emoji-events',
      gradient: [theme.accent + '20', theme.success + '10'],
    },
  ];

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = useCallback(() => {
    Haptics.selectionAsync();
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      completeOnboarding();
    }
  }, [activeIndex]);

  const handleSkip = useCallback(() => {
    Haptics.selectionAsync();
    completeOnboarding();
  }, []);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {}
    router.replace('/login');
  };

  const renderSlide = useCallback(({ item, index }: { item: OnboardingSlide; index: number }) => {
    return (
      <View style={[styles.slide, { width: screenWidth }]}>
        <LinearGradient
          colors={item.gradient as [string, string]}
          style={[styles.imageContainer, { width: screenWidth }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Image
            source={item.image}
            style={{ width: screenWidth * 0.78, height: screenWidth * 0.85 }}
            contentFit="contain"
            transition={300}
          />
        </LinearGradient>
        <View style={styles.textContainer}>
          <Animated.Text
            entering={FadeInUp.delay(200).duration(500)}
            style={[styles.slideTitle, { color: theme.textPrimary }]}
          >
            {item.title}
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(350).duration(500)}
            style={[styles.slideSubtitle, { color: theme.textSecondary }]}
          >
            {item.subtitle}
          </Animated.Text>
        </View>
      </View>
    );
  }, [theme, screenWidth]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* Skip button */}
      <Animated.View entering={FadeIn.delay(500)} style={styles.skipContainer}>
        <Pressable
          onPress={handleSkip}
          hitSlop={12}
          style={({ pressed }) => [
            styles.skipBtn,
            { backgroundColor: theme.surface, borderColor: theme.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>تخطي</Text>
        </Pressable>
      </Animated.View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
        onScroll={(e) => {
          scrollX.value = e.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
        style={styles.flatList}
      />

      {/* Bottom section */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {slides.map((_, i) => {
            const isActive = i === activeIndex;
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive ? theme.primary : theme.surfaceLight,
                    width: isActive ? 28 : 8,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Button */}
        <Pressable
          style={({ pressed }) => [
            styles.nextBtn,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleNext}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryDark]}
            style={styles.nextBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextBtnText}>
              {activeIndex === slides.length - 1 ? 'ابدأ الآن' : 'التالي'}
            </Text>
            {activeIndex === slides.length - 1 ? null : (
              <View style={styles.nextArrow}>
                <Text style={styles.nextArrowText}>←</Text>
              </View>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  skipContainer: {
    position: 'absolute',
    top: 8,
    left: 20,
    zIndex: 10,
  },
  skipBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  flatList: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
  },
  imageContainer: {
    height: 400,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },

  textContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 28,
    alignItems: 'center',
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 36,
  },
  slideSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 12,
  },
  bottomSection: {
    paddingHorizontal: 24,
    gap: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
  },
  nextBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  nextArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextArrowText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
