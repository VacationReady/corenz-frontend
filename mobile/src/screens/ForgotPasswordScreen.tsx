import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { requestPasswordReset } from '../api/auth';
import { AuthStackParamList } from '../navigation/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ForgotPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation, route }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState(route.params?.prefillEmail ?? '');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (route.params?.prefillEmail) {
      setEmail(route.params.prefillEmail);
    }
  }, [route.params?.prefillEmail]);

  useEffect(() => {
    if (submitted) {
      pulseLoop.current?.stop();
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseLoop.current = null;
      pulseAnim.setValue(1);
    }

    return () => {
      pulseLoop.current?.stop();
    };
  }, [submitted, pulseAnim]);

  const handleSendReset = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Enter your work email to continue');
      setSubmitted(false);
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Enter a valid email address');
      setSubmitted(false);
      return;
    }

    setError('');
    setLoading(true);

    try {
      await requestPasswordReset(trimmedEmail);
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send reset email right now';
      setError(message);
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  };

  const primaryLabel = submitted ? 'Resend email' : 'Send reset link';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.wrapper}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.backgroundGlow} />
        <View style={[styles.backgroundGlow, styles.backgroundGlowSecondary]} />

        <View style={styles.content}>
          <View style={styles.heroSection}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backIcon}>←</Text>
              <Text style={styles.backText}>Back to sign in</Text>
            </TouchableOpacity>

            <Text style={styles.heroEyebrow}>Forgot password</Text>
            <Text style={styles.heroTitle}>We’ll get you back in</Text>
            <Text style={styles.heroSubtitle}>
              Enter your work email below and we’ll send everything you need to reset your password.
            </Text>

            {submitted ? (
              <Animated.View style={[styles.animationCard, { transform: [{ scale: pulseAnim }] }]}
              >
                <Text style={styles.animationEmoji}>📬</Text>
                <Text style={styles.animationTitle}>Check your inbox</Text>
                <Text style={styles.animationSubtitle}>
                  Reset instructions are on their way to {'\n'}
                  <Text style={styles.boldText}>{email.trim()}</Text>
                </Text>
              </Animated.View>
            ) : (
              <View style={[styles.animationCard, styles.animationCardMuted]}>
                <Text style={styles.animationEmoji}>✉️</Text>
                <Text style={styles.animationTitle}>Need a fresh link?</Text>
                <Text style={styles.animationSubtitle}>
                  We’ll deliver a secure reset email in seconds.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Work email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (error) setError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {submitted && !error ? (
              <Text style={styles.successCopy}>
                If the email matches an account, you’ll receive reset instructions shortly.
              </Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleSendReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
              )}
            </TouchableOpacity>

            {submitted ? (
              <TouchableOpacity
                style={styles.secondaryLink}
                onPress={() => setSubmitted(false)}
                disabled={loading}
              >
                <Text style={styles.secondaryLinkText}>Use a different email</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.secondaryLink, styles.backToLogin]}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.backToLoginText}>Remembered it? Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  backgroundGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#0f172a',
    top: -100,
    right: -80,
    opacity: 0.7,
  },
  backgroundGlowSecondary: {
    width: 220,
    height: 220,
    bottom: 40,
    left: -60,
    top: undefined,
    backgroundColor: '#1d4ed8',
    opacity: 0.35,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  heroSection: {
    marginBottom: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginBottom: 24,
  },
  backIcon: {
    fontSize: 18,
    color: '#cbd5f5',
    marginRight: 6,
  },
  backText: {
    color: '#cbd5f5',
    fontSize: 14,
    fontWeight: '600',
  },
  heroEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 12,
    fontWeight: '700',
    color: '#60a5fa',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#cbd5f5',
    marginTop: 12,
    lineHeight: 22,
  },
  animationCard: {
    marginTop: 28,
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#1d4ed8',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  animationCardMuted: {
    backgroundColor: '#0f172a',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  animationEmoji: {
    fontSize: 42,
    marginBottom: 12,
    textAlign: 'center',
  },
  animationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 6,
  },
  animationSubtitle: {
    fontSize: 14,
    color: '#cbd5f5',
    textAlign: 'center',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
    color: '#f8fafc',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  error: {
    marginTop: 10,
    color: '#dc2626',
    fontSize: 14,
  },
  successCopy: {
    marginTop: 12,
    fontSize: 14,
    color: '#15803d',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  secondaryLinkText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  backToLogin: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
  },
  backToLoginText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
});
