import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AlertProvider, AuthProvider } from '@/template';
import { AppProvider } from '../contexts/AppContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useTheme } from '../hooks/useTheme';
import { useNotifications } from '../hooks/useNotifications';

function NotificationInitializer({ children }: { children: React.ReactNode }) {
  useNotifications();
  return <>{children}</>;
}

function ThemedStatusBar() {
  const { colors } = useTheme();
  return <StatusBar style={colors.statusBar} />;
}

export default function RootLayout() {
  return (
    <AlertProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <ThemeProvider>
          <ThemedStatusBar />
          <AppProvider>
            <SubscriptionProvider>
            <NotificationInitializer>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="onboarding"
                options={{
                  headerShown: false,
                  animation: 'fade',
                }}
              />
              <Stack.Screen
                name="diagnostic"
                options={{
                  headerShown: false,
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen
                name="quiz"
                options={{
                  presentation: 'fullScreenModal',
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen
                name="paywall"
                options={{
                  presentation: 'fullScreenModal',
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen
                name="settings"
                options={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="privacy"
                options={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="admin"
                options={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="support"
                options={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              />
            </Stack>
            </NotificationInitializer>
            </SubscriptionProvider>
          </AppProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </AlertProvider>
  );
}
