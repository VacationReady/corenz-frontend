import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingStep } from '../../../api/onboarding';

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  required?: boolean;
  url?: string;
  notes?: string;
}

interface ChecklistStepProps {
  step: OnboardingStep;
  isCompleting: boolean;
  onComplete: (data: Record<string, any>) => void;
}

export default function ChecklistStep({
  step,
  isCompleting,
  onComplete,
}: ChecklistStepProps) {
  const getInitialItems = (): ChecklistItem[] => {
    const metadata = step.metadata || {};
    let items: any[] = [];
    
    switch (step.type) {
      case 'training-assignment':
        items = metadata.modules || [];
        break;
      case 'equipment-checklist':
        items = metadata.items || [];
        break;
      case 'system-access':
        items = metadata.systems || [];
        break;
      case 'compliance-training':
        items = metadata.courses || [];
        break;
      default:
        items = metadata.items || metadata.modules || metadata.systems || metadata.courses || [];
    }
    
    return items.map((item: any, index: number) => ({
      id: item.id || `item-${index}`,
      label: item.label || item.name || `Item ${index + 1}`,
      completed: item.completed || false,
      required: item.required !== false,
      url: item.url || item.link,
      notes: item.notes,
    }));
  };

  const [items, setItems] = useState<ChecklistItem[]>(getInitialItems);

  const toggleItem = useCallback((id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  }, []);

  const handleComplete = useCallback(() => {
    const dataKey = step.type === 'training-assignment' ? 'trainingModules'
      : step.type === 'equipment-checklist' ? 'equipmentChecklist'
      : step.type === 'system-access' ? 'systemAccess'
      : step.type === 'compliance-training' ? 'complianceCourses'
      : 'checklist';
    
    onComplete({ [dataKey]: items });
  }, [step.type, items, onComplete]);

  const openLink = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  const requiredItems = items.filter(item => item.required);
  const allRequiredComplete = requiredItems.every(item => item.completed);
  const completedCount = items.filter(item => item.completed).length;

  return (
    <View style={styles.container}>
      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>
          {completedCount} of {items.length} completed
        </Text>
        {requiredItems.length > 0 && (
          <Text style={styles.requiredText}>
            {requiredItems.filter(i => i.completed).length}/{requiredItems.length} required
          </Text>
        )}
      </View>

      <View style={styles.itemsList}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.item, item.completed && styles.itemCompleted]}
            onPress={() => toggleItem(item.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
              {item.completed && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </View>
            
            <View style={styles.itemContent}>
              <View style={styles.itemHeader}>
                <Text
                  style={[styles.itemLabel, item.completed && styles.itemLabelCompleted]}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
                {item.required && !item.completed && (
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredBadgeText}>Required</Text>
                  </View>
                )}
              </View>
              
              {item.notes && (
                <Text style={styles.itemNotes} numberOfLines={2}>
                  {item.notes}
                </Text>
              )}
              
              {item.url && (
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => openLink(item.url!)}
                >
                  <Ionicons name="open-outline" size={14} color="#3B82F6" />
                  <Text style={styles.linkText}>View resource</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {items.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="list-outline" size={32} color="#64748B" />
          <Text style={styles.emptyText}>No items configured</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.completeButton, !allRequiredComplete && styles.completeButtonDisabled]}
        onPress={handleComplete}
        disabled={!allRequiredComplete || isCompleting}
      >
        {isCompleting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.completeButtonText}>Save Progress</Text>
          </>
        )}
      </TouchableOpacity>
      
      {!allRequiredComplete && (
        <Text style={styles.helperText}>
          Complete all required items to continue
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  requiredText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  itemsList: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  itemCompleted: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  itemContent: {
    flex: 1,
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    lineHeight: 20,
  },
  itemLabelCompleted: {
    color: '#10B981',
  },
  requiredBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F59E0B',
    textTransform: 'uppercase',
  },
  itemNotes: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  linkText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  completeButtonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  helperText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
});
