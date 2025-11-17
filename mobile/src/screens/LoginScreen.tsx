import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { signInWithCredentials, requestPasswordReset } from '../api/auth';
import ApiConnectivityStatus from '../components/ApiConnectivityStatus';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signInWithCredentials(email.trim(), password);
      onLoginSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (forgotSent) {
      pulseLoop.current?.stop();
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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
  }, [forgotSent, pulseAnim]);

  const handleOpenForgot = () => {
    setForgotOpen(true);
    setForgotEmail((prev) => prev || email);
    setForgotError('');
  };

  const resetForgotState = () => {
    setForgotOpen(false);
    setForgotLoading(false);
    setForgotSent(false);
    setForgotError('');
  };

  const sendResetEmail = async () => {
    const trimmedEmail = forgotEmail.trim();

    if (!trimmedEmail) {
      setForgotError('Enter your work email to continue');
      setForgotSent(false);
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setForgotError('Enter a valid email address');
      setForgotSent(false);
      return;
    }

    setForgotError('');
    setForgotLoading(true);

    try {
      await requestPasswordReset(trimmedEmail);
      setForgotSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send reset email right now';
      setForgotError(message);
      setForgotSent(false);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>PeopleCore</Text>
        <Text style={styles.subtitle}>HR Management System</Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              editable={!loading}
              onSubmitEditing={handleLogin}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {forgotOpen ? (
            <View style={styles.forgotCard}>
              {!forgotSent ? (
                <>
                  <Text style={styles.forgotTitle}>Forgot password?</Text>
                  <Text style={styles.forgotDescription}>
                    We&apos;ll email you a secure link to reset your password.
                  </Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Work email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      editable={!forgotLoading}
                    />
                  </View>
                  {forgotError ? <Text style={styles.error}>{forgotError}</Text> : null}
                  <TouchableOpacity
                    style={[styles.button, forgotLoading && styles.buttonDisabled]}
                    onPress={sendResetEmail}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Send reset link</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryLinkButton} onPress={resetForgotState}>
                    <Text style={styles.secondaryLinkText}>Back to sign in</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Animated.View style={[styles.checkEmailCard, { transform: [{ scale: pulseAnim }] }]}> 
                    <Text style={styles.envelopeIcon}>📬</Text>
                    <Text style={styles.checkEmailTitle}>Check your inbox</Text>
                    <Text style={styles.checkEmailSubtitle}>
                      We sent reset instructions to {forgotEmail.trim()}
                    </Text>
                  </Animated.View>
                  {forgotError ? <Text style={styles.error}>{forgotError}</Text> : null}
                  <TouchableOpacity
                    style={[styles.button, forgotLoading && styles.buttonDisabled]}
                    onPress={sendResetEmail}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Resend email</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryLinkButton}
                    onPress={() => {
                      setForgotSent(false);
                      setForgotError('');
                    }}
                  >
                    <Text style={styles.secondaryLinkText}>Use a different email</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <TouchableOpacity style={styles.linkButton} onPress={handleOpenForgot}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>
          )}
        </View>

        <ApiConnectivityStatus />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  forgotCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  forgotTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  forgotDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 16,
    textAlign: 'center',
  },
  secondaryLinkButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  secondaryLinkText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '500',
  },
  checkEmailCard: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
  },
  envelopeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  checkEmailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  checkEmailSubtitle: {
    fontSize: 14,
    color: '#1e3a8a',
    textAlign: 'center',
    marginTop: 4,
  },
});
