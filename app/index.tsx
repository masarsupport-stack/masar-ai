import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { AuthRouter, useAuth } from '@/template';
import { Redirect } from 'expo-router';
import { getSupabaseClient } from '@/template';
import { useColors } from '../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@masarai_onboarding_done';

function AuthenticatedRedirect() {
  const { user } = useAuth();
  const theme = useColors();
  const [checking, setChecking] = useState(true);
  const [diagnosticDone, setDiagnosticDone] = useState(false);
  const [diagnosticSkipped, setDiagnosticSkipped] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setChecking(false);
      return;
    }

    const checkDiagnostic = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('user_profiles')
          .select('diagnostic_completed')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setDiagnosticDone(data.diagnostic_completed === true);
        }
        // Check if user skipped diagnostic
        const skipped = await AsyncStorage.getItem('@masarai_diagnostic_skipped_' + user.id);
        if (skipped === 'true') {
          setDiagnosticSkipped(true);
        }
      } catch {
        // Default to tabs if check fails
        setDiagnosticDone(true);
      } finally {
        setChecking(false);
      }
    };

    checkDiagnostic();
  }, [user?.id]);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textSecondary, marginTop: 12, fontSize: 14 }}>جاري التحميل...</Text>
      </View>
    );
  }

  if (!diagnosticDone && !diagnosticSkipped) {
    return <Redirect href="/diagnostic" />;
  }

  return <Redirect href="/(tabs)" />;
}

function OnboardingCheck() {
  const theme = useColors();
  const [checking, setChecking] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const done = await AsyncStorage.getItem(ONBOARDING_KEY);
        setOnboardingDone(done === 'true');
      } catch {
        setOnboardingDone(true);
      } finally {
        setChecking(false);
      }
    };
    check();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <AuthRouter loginRoute="/login">
      <AuthenticatedRedirect />
    </AuthRouter>
  );
}

export default function RootScreen() {
  return <OnboardingCheck />;
}
