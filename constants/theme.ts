// MasarAI Design System
// Supports Dark and Light themes

const darkColors = {
  primary: '#06B6D4',
  primaryLight: '#22D3EE',
  primaryDark: '#0891B2',
  secondary: '#6366F1',
  secondaryLight: '#818CF8',
  secondaryDark: '#4F46E5',
  accent: '#F59E0B',
  accentLight: '#FBBF24',
  accentDark: '#D97706',
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  surface: '#1E293B',
  surfaceLight: '#334155',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  border: '#334155',
  borderLight: '#475569',
  step: '#06B6D4',
  ielts: '#8B5CF6',
  psychometric: '#F59E0B',
  statusBar: 'light' as const,
};

const lightColors = {
  primary: '#0891B2',
  primaryLight: '#06B6D4',
  primaryDark: '#0E7490',
  secondary: '#4F46E5',
  secondaryLight: '#6366F1',
  secondaryDark: '#4338CA',
  accent: '#D97706',
  accentLight: '#F59E0B',
  accentDark: '#B45309',
  background: '#F8FAFC',
  backgroundSecondary: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceLight: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  border: '#E2E8F0',
  borderLight: '#CBD5E1',
  step: '#0891B2',
  ielts: '#7C3AED',
  psychometric: '#D97706',
  statusBar: 'dark' as const,
};

const sharedValues = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  radius: {
    small: 8,
    medium: 12,
    large: 16,
    xl: 20,
    full: 9999,
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    elevated: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
  },
  typography: {
    heroData: { fontSize: 48, fontWeight: '700' as const },
    heroLabel: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 1 },
    cardTitle: { fontSize: 16, fontWeight: '600' as const },
    cardValue: { fontSize: 24, fontWeight: '700' as const },
    sectionHeader: { fontSize: 14, fontWeight: '600' as const },
    body: { fontSize: 15, fontWeight: '400' as const },
    caption: { fontSize: 13, fontWeight: '400' as const },
    questionText: { fontSize: 20, fontWeight: '600' as const },
    optionText: { fontSize: 16, fontWeight: '500' as const },
    scoreValue: { fontSize: 32, fontWeight: '700' as const },
    tabLabel: { fontSize: 11, fontWeight: '600' as const },
  },
};

export type ThemeMode = 'dark' | 'light';
export type ThemeColors = typeof darkColors;
export type AppTheme = ThemeColors & typeof sharedValues;

export function getThemeColors(mode: ThemeMode): ThemeColors {
  return mode === 'dark' ? darkColors : lightColors;
}

export function getFullTheme(mode: ThemeMode): AppTheme {
  const colors = mode === 'dark' ? darkColors : lightColors;
  return { ...colors, ...sharedValues };
}

// Default export for backward compatibility (dark theme)
export const theme: AppTheme = {
  ...darkColors,
  ...sharedValues,
};

export const lightTheme: AppTheme = {
  ...lightColors,
  ...sharedValues,
};
