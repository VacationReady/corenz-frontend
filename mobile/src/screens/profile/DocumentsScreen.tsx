import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';

import Card from '../../components/Card';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';
import { getEmployeeDocuments, Document, getMyFullProfile } from '../../api/profile';

interface RouteParams {
  employeeId?: string;
}

export default function DocumentsScreen() {
  const route = useRoute();
  const params = (route.params || {}) as RouteParams;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(params.employeeId || null);

  useEffect(() => {
    const initializeEmployeeId = async () => {
      if (!employeeId) {
        try {
          const profile = await getMyFullProfile();
          if (profile?.id) {
            setEmployeeId(profile.id);
          }
        } catch (error) {
          console.error('Failed to fetch employee profile:', error);
          setLoading(false);
        }
      }
    };

    initializeEmployeeId();
  }, [employeeId]);

  const loadDocuments = useCallback(async () => {
    if (!employeeId) return;
    
    try {
      const data = await getEmployeeDocuments(employeeId);
      setDocuments(data);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

  const handleOpenDocument = async (doc: Document) => {
    if (!doc.fileUrl) {
      Alert.alert('Error', 'Document URL not available');
      return;
    }
    
    try {
      const canOpen = await Linking.canOpenURL(doc.fileUrl);
      if (canOpen) {
        await Linking.openURL(doc.fileUrl);
      } else {
        Alert.alert('Error', 'Cannot open this document');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const getDocumentIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('pdf')) return 'document-text';
    if (lowerType.includes('image') || lowerType.includes('jpg') || lowerType.includes('png')) return 'image';
    if (lowerType.includes('word') || lowerType.includes('doc')) return 'document';
    if (lowerType.includes('excel') || lowerType.includes('xls')) return 'grid';
    return 'document-outline';
  };

  const getDocumentColor = (category?: string | null): string => {
    if (!category) return '#3b82f6';
    const lowerCat = category.toLowerCase();
    if (lowerCat.includes('contract')) return '#10b981';
    if (lowerCat.includes('policy')) return '#8b5cf6';
    if (lowerCat.includes('certificate')) return '#f59e0b';
    if (lowerCat.includes('id') || lowerCat.includes('identity')) return '#ef4444';
    return '#3b82f6';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const groupDocumentsByCategory = (docs: Document[]) => {
    const groups: Record<string, Document[]> = {};
    docs.forEach(doc => {
      const category = doc.category || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(doc);
    });
    return groups;
  };

  if (loading) {
    return <LoadingState message="Loading documents..." />;
  }

  const groupedDocs = groupDocumentsByCategory(documents);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Summary */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="folder-outline" size={24} color="#3b82f6" />
            <Text style={styles.summaryValue}>{documents.length}</Text>
            <Text style={styles.summaryLabel}>Total Documents</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="layers-outline" size={24} color="#8b5cf6" />
            <Text style={styles.summaryValue}>{Object.keys(groupedDocs).length}</Text>
            <Text style={styles.summaryLabel}>Categories</Text>
          </View>
        </View>
      </Card>

      {documents.length === 0 && (
        <EmptyState
          icon="document-text-outline"
          title="No Documents"
          description="Documents will appear here when uploaded"
        />
      )}

      {Object.entries(groupedDocs).map(([category, docs]) => (
        <View key={category} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category}</Text>
          {docs.map((doc) => {
            const color = getDocumentColor(doc.category);
            return (
              <TouchableOpacity
                key={doc.id}
                style={styles.documentCard}
                onPress={() => handleOpenDocument(doc)}
                activeOpacity={0.7}
              >
                <View style={[styles.documentIcon, { backgroundColor: `${color}15` }]}>
                  <Ionicons name={getDocumentIcon(doc.type)} size={24} color={color} />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>{doc.name}</Text>
                  <Text style={styles.documentMeta}>
                    {doc.type} • {formatDate(doc.uploadedAt)}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={20} color="#94a3b8" />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  summaryCard: { marginHorizontal: 16, marginTop: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  summaryLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  categorySection: { marginTop: 24, paddingHorizontal: 16 },
  categoryTitle: { fontSize: 14, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  documentIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  documentInfo: { flex: 1 },
  documentName: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 2 },
  documentMeta: { fontSize: 12, color: '#64748b' },
  bottomPadding: { height: 40 },
});
