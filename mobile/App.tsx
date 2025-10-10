import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Alert } from 'react-native';
import { useState } from 'react';

export default function App() {
  const [apiStatus, setApiStatus] = useState('Not tested');
  const [apiUrl, setApiUrl] = useState(process.env.EXPO_PUBLIC_API_BASE_URL || 'Not set');

  const testApiConnection = async () => {
    try {
      setApiStatus('Testing...');
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/health`);
      if (response.ok) {
        setApiStatus('✅ Connected!');
      } else {
        setApiStatus('❌ Server error');
      }
    } catch (error) {
      setApiStatus('❌ Connection failed');
      Alert.alert('Error', `Failed to connect: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PeopleCore Mobile</Text>
      <Text style={styles.subtitle}>HR Platform on Mobile</Text>
      
      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>API URL:</Text>
        <Text style={styles.infoValue}>{apiUrl}</Text>
      </View>
      
      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Status:</Text>
        <Text style={styles.infoValue}>{apiStatus}</Text>
      </View>
      
      <Button 
        title="Test API Connection" 
        onPress={testApiConnection}
        color="#007AFF"
      />
      
      <Text style={styles.note}>
        This is a test screen. The app is working! 🎉
      </Text>
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  infoBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  note: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});
