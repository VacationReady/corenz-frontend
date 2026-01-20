import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import {
  OnboardingStep,
  completeOnboardingStep,
  acknowledgeDocument,
  uploadOnboardingDocument,
} from '../../api/onboarding';
import ChecklistStep from './steps/ChecklistStep';
import PayrollSetupStep from './steps/PayrollSetupStep';
import FillFormStep from './steps/FillFormStep';

interface OnboardingStepCardProps {
  step: OnboardingStep;
  employeeId: string;
  isCompleting: boolean;
  onComplete: () => void;
  onStartComplete: () => void;
  onEndComplete: () => void;
}

const STEP_COLORS: Record<string, [string, string]> = {
  'acknowledge-document': ['#3B82F6', '#1D4ED8'],
  'upload-document': ['#8B5CF6', '#6D28D9'],
  'collect-document': ['#F59E0B', '#D97706'],
  'fill-form': ['#10B981', '#059669'],
  'instructions': ['#6366F1', '#4F46E5'],
  'training-assignment': ['#EC4899', '#DB2777'],
  'equipment-checklist': ['#14B8A6', '#0D9488'],
  'system-access': ['#F97316', '#EA580C'],
  'manager-checkin': ['#06B6D4', '#0891B2'],
  'buddy-introduction': ['#84CC16', '#65A30D'],
  'compliance-training': ['#EF4444', '#DC2626'],
  'payroll-setup': ['#22C55E', '#16A34A'],
  'benefits-enrollment': ['#F43F5E', '#E11D48'],
  'probation-goals': ['#A855F7', '#9333EA'],
  'welcome-survey': ['#0EA5E9', '#0284C7'],
  'journey-automation': ['#64748B', '#475569'],
};

const STEP_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'acknowledge-document': 'document-text',
  'upload-document': 'cloud-upload',
  'collect-document': 'folder-open',
  'fill-form': 'create',
  'instructions': 'information-circle',
  'training-assignment': 'school',
  'equipment-checklist': 'hardware-chip',
  'system-access': 'key',
  'manager-checkin': 'people',
  'buddy-introduction': 'person-add',
  'compliance-training': 'shield-checkmark',
  'payroll-setup': 'card',
  'benefits-enrollment': 'heart',
  'probation-goals': 'flag',
  'welcome-survey': 'chatbubbles',
  'journey-automation': 'git-branch',
};

export default function OnboardingStepCard({
  step,
  employeeId,
  isCompleting,
  onComplete,
  onStartComplete,
  onEndComplete,
}: OnboardingStepCardProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const colors = STEP_COLORS[step.type] || ['#64748B', '#475569'];
  const icon = STEP_ICONS[step.type] || 'ellipse';

  const handleComplete = useCallback(async (data?: Record<string, any>) => {
    onStartComplete();
    try {
      const stepId = step.instanceStepId || step.id;
      const result = await completeOnboardingStep(stepId, data);
      
      if (result.success) {
        onComplete();
      } else {
        Alert.alert('Error', result.error || 'Failed to complete step');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      onEndComplete();
    }
  }, [step, onComplete, onStartComplete, onEndComplete]);

  const handleAcknowledgeDocument = useCallback(async () => {
    if (!step.document?.id) {
      await handleComplete();
      return;
    }

    onStartComplete();
    try {
      const ackResult = await acknowledgeDocument(step.document.id);
      if (!ackResult.success) {
        Alert.alert('Error', ackResult.error || 'Failed to acknowledge document');
        onEndComplete();
        return;
      }
      
      const stepId = step.instanceStepId || step.id;
      const result = await completeOnboardingStep(stepId);
      
      if (result.success) {
        onComplete();
      } else {
        Alert.alert('Error', result.error || 'Failed to complete step');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      onEndComplete();
    }
  }, [step, handleComplete, onStartComplete, onEndComplete, onComplete]);

  const handleUploadDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      setUploading(true);
      onStartComplete();

      const category = step.metadata?.category || 'Onboarding';
      const uploadResult = await uploadOnboardingDocument(
        {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        },
        employeeId,
        category
      );

      if (!uploadResult.success) {
        Alert.alert('Error', uploadResult.error || 'Failed to upload document');
        setUploading(false);
        onEndComplete();
        return;
      }

      const stepId = step.instanceStepId || step.id;
      const completeResult = await completeOnboardingStep(stepId, {
        documentId: uploadResult.documentId,
      });

      if (completeResult.success) {
        onComplete();
      } else {
        Alert.alert('Error', completeResult.error || 'Failed to complete step');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
      onEndComplete();
    }
  }, [step, employeeId, onComplete, onStartComplete, onEndComplete]);

  const openDocument = useCallback(() => {
    if (step.document?.url) {
      Linking.openURL(step.document.url);
    }
  }, [step.document]);

  const renderStepContent = () => {
    switch (step.type) {
      case 'acknowledge-document':
        return (
          <View style={styles.stepContent}>
            {step.document?.url && (
              <TouchableOpacity style={styles.documentPreview} onPress={openDocument}>
                <Ionicons name="document-text" size={32} color="#3B82F6" />
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName}>{step.document.name}</Text>
                  <Text style={styles.documentAction}>Tap to view document</Text>
                </View>
                <Ionicons name="open-outline" size={20} color="#64748B" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.checkbox, acknowledged && styles.checkboxChecked]}
              onPress={() => setAcknowledged(!acknowledged)}
            >
              {acknowledged && <Ionicons name="checkmark" size={16} color="#fff" />}
            </TouchableOpacity>
            <Text style={styles.acknowledgementText}>
              {step.metadata?.acknowledgementText || 'I have read and acknowledge this document'}
            </Text>
            
            <TouchableOpacity
              style={[styles.completeButton, !acknowledged && styles.completeButtonDisabled]}
              onPress={handleAcknowledgeDocument}
              disabled={!acknowledged || isCompleting}
            >
              {isCompleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.completeButtonText}>Mark Complete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );

      case 'upload-document':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.instructionText}>
              {step.metadata?.instructions || 'Upload a PDF, JPG, or PNG copy of the document.'}
            </Text>
            
            <TouchableOpacity
              style={styles.uploadArea}
              onPress={handleUploadDocument}
              disabled={uploading || isCompleting}
            >
              {uploading || isCompleting ? (
                <ActivityIndicator color="#8B5CF6" size="large" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={48} color="#8B5CF6" />
                  <Text style={styles.uploadText}>Tap to select a file</Text>
                  <Text style={styles.uploadSubtext}>PDF, JPG, or PNG</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );

      case 'instructions':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.instructionText}>
              {step.instruction || step.metadata?.instructions || 'Please review the information above.'}
            </Text>
            
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => handleComplete()}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                  <Text style={styles.completeButtonText}>
                    {step.metadata?.buttonLabel || 'Continue'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );

      case 'training-assignment':
      case 'equipment-checklist':
      case 'system-access':
      case 'compliance-training':
        return (
          <ChecklistStep
            step={step}
            isCompleting={isCompleting}
            onComplete={handleComplete}
          />
        );

      case 'payroll-setup':
        return (
          <PayrollSetupStep
            step={step}
            employeeId={employeeId}
            isCompleting={isCompleting}
            onComplete={handleComplete}
          />
        );

      case 'fill-form':
        return (
          <FillFormStep
            step={step}
            employeeId={employeeId}
            isCompleting={isCompleting}
            onComplete={handleComplete}
          />
        );

      case 'buddy-introduction':
      case 'manager-checkin':
      case 'benefits-enrollment':
      case 'probation-goals':
      case 'welcome-survey':
      case 'collect-document':
      case 'journey-automation':
      default:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.instructionText}>
              {step.instruction || 'Complete this step to continue.'}
            </Text>
            
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => handleComplete()}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.completeButtonText}>Mark Complete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerIcon}>
          <Ionicons name={icon} size={28} color="#fff" />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.stepLabel}>{step.label}</Text>
          <Text style={styles.stepType}>
            {step.type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </Text>
        </View>
      </LinearGradient>
      
      <View style={styles.body}>
        {step.instruction && step.type !== 'instructions' && (
          <Text style={styles.description}>{step.instruction}</Text>
        )}
        {renderStepContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  stepType: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  body: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  description: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 20,
  },
  stepContent: {
    gap: 16,
  },
  instructionText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  documentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  documentAction: {
    fontSize: 13,
    color: '#3B82F6',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  acknowledgementText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    marginLeft: 8,
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
    backgroundColor: '#CBD5E1',
    opacity: 0.6,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
});
