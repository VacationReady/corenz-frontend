import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import { getStoredSession, getSession, signOut } from './src/api/auth';
import { getOnboardingStatus, OnboardingStatus } from './src/api/onboarding';
import { OnboardingScreen } from './src/screens/onboarding';

type AppState = 'loading' | 'unauthenticated' | 'onboarding' | 'authenticated';

interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  companyId?: string;
  employeeId?: string;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);

  useEffect(() => {
    console.log("🚀 App starting...");
    console.log("🌐 EXPO_PUBLIC_API_BASE_URL:", process.env.EXPO_PUBLIC_API_BASE_URL);
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const storedToken = await getStoredSession();
      if (!storedToken) {
        setAppState('unauthenticated');
        return;
      }

      const session = await getSession();
      if (!session?.user) {
        setAppState('unauthenticated');
        return;
      }

      setSessionUser(session.user);
      
      // Check onboarding status if user has an employeeId
      if (session.user.employeeId) {
        await checkOnboardingStatus(session.user.employeeId);
      } else {
        // No employee record - go directly to app (admin users, etc.)
        setAppState('authenticated');
      }
    } catch (error) {
      console.log('Authentication check failed:', error);
      setAppState('unauthenticated');
    }
  };

  const checkOnboardingStatus = async (employeeId: string) => {
    try {
      const status = await getOnboardingStatus(employeeId);
      setOnboardingStatus(status);
      
      if (status.hasOnboarding && !status.isComplete) {
        // User has pending onboarding
        setAppState('onboarding');
      } else {
        // No onboarding or already complete
        setAppState('authenticated');
      }
    } catch (error) {
      console.log('Onboarding check failed:', error);
      // On error, allow access to app
      setAppState('authenticated');
    }
  };

  const handleLoginSuccess = useCallback(async () => {
    setAppState('loading');
    
    try {
      const session = await getSession();
      if (!session?.user) {
        setAppState('unauthenticated');
        return;
      }

      setSessionUser(session.user);
      
      if (session.user.employeeId) {
        await checkOnboardingStatus(session.user.employeeId);
      } else {
        setAppState('authenticated');
      }
    } catch (error) {
      console.log('Post-login check failed:', error);
      setAppState('authenticated');
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    console.log('✅ Onboarding completed!');
    setAppState('authenticated');
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.log('Logout error:', error);
    }
    setSessionUser(null);
    setOnboardingStatus(null);
    setAppState('unauthenticated');
  }, []);

  // Loading state
  if (appState === 'loading') {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading...</Text>
          <StatusBar style="auto" />
        </View>
      </SafeAreaProvider>
    );
  }

  // Unauthenticated - show login
  if (appState === 'unauthenticated') {
    return (
      <SafeAreaProvider>
        <AuthNavigator onLoginSuccess={handleLoginSuccess} />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    );
  }

  // Onboarding required
  if (appState === 'onboarding' && sessionUser?.employeeId) {
    const firstName = sessionUser.name?.split(' ')[0] || 'there';
    return (
      <SafeAreaProvider>
        <OnboardingScreen
          employeeId={sessionUser.employeeId}
          employeeName={firstName}
          onComplete={handleOnboardingComplete}
          onLogout={handleLogout}
        />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  // Authenticated - show main app
  return (
    <SafeAreaProvider>
      <AppNavigator onLogout={handleLogout} />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94A3B8',
  },
});
