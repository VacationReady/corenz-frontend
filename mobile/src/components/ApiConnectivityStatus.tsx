import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;

type Status = 'checking' | 'online' | 'offline' | 'slow';

const STATUS_STYLES: Record<Status, { label: string; color: string }> = {
  checking: { label: 'Checking connectivity…', color: '#f59e0b' },
  online: { label: 'API reachable', color: '#22c55e' },
  slow: { label: 'API slow but reachable', color: '#f59e0b' },
  offline: { label: 'Cannot reach API', color: '#ef4444' },
};

export default function ApiConnectivityStatus() {
  const [status, setStatus] = useState<Status>('checking');
  const [message, setMessage] = useState('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const statusConfig = STATUS_STYLES[status];

  const runConnectivityCheck = useCallback(async () => {
    if (!API_BASE_URL) {
      console.warn("⚠️ No API base URL configured. Set EXPO_PUBLIC_API_BASE_URL in mobile/.env");
      setStatus('offline');
      setMessage('Set EXPO_PUBLIC_API_BASE_URL in mobile/.env to point at your backend.');
      return;
    }

    setStatus('checking');
    setMessage('');
    console.log('🔍 Checking API connectivity at', `${API_BASE_URL}/api/auth/csrf`);

    const controller = new AbortController();
    const startTime = Date.now();
    // Use a longer timeout (15s) and track response time
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/csrf`, {
        method: 'GET',
        signal: controller.signal,
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`Received HTTP ${response.status}`);
      }

      // If response took more than 5 seconds, mark as slow
      if (responseTime > 5000) {
        setStatus('slow');
        setMessage(`API responded in ${(responseTime / 1000).toFixed(1)}s - connection is slow`);
        console.log(`⚠️ Connectivity check succeeded but slow (${responseTime}ms)`);
      } else {
        setStatus('online');
        setMessage('Successfully reached API');
        console.log('✅ Connectivity check succeeded');
      }
      setLastChecked(new Date());
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Timeout isn't necessarily a failure - the API might still be reachable
        // Just mark as slow and let the user try to login
        setStatus('slow');
        setMessage('Initial check timed out. The API may still be reachable - try logging in.');
        console.warn('⏱️ Connectivity check timed out - API may still be reachable');
      } else {
        setMessage(
          'Unable to contact the API. Ensure the server is running and your phone is on the same network.'
        );
        console.error('❌ Connectivity check failed:', error);
        setStatus('offline');
      }
      setLastChecked(new Date());
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    runConnectivityCheck();
  }, [runConnectivityCheck]);

  const timestampLabel = useMemo(() => {
    if (!lastChecked) {
      return 'never';
    }
    return lastChecked.toLocaleTimeString();
  }, [lastChecked]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
        <Text style={styles.statusText}>{statusConfig.label}</Text>
      </View>

      <Text style={styles.detailText}>Base URL: {API_BASE_URL ?? 'Not configured'}</Text>
      <Text style={styles.detailText}>Last checked: {timestampLabel}</Text>
      {message ? <Text style={styles.detailText}>{message}</Text> : null}

      <TouchableOpacity style={styles.retryButton} onPress={runConnectivityCheck}>
        <Text style={styles.retryText}>Retry connectivity check</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontWeight: '600',
    color: '#0f172a',
  },
  detailText: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
  retryText: {
    color: '#2563eb',
    fontWeight: '600',
    textAlign: 'center',
  },
});
