import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';

import Card from '../../components/Card';
import Button from '../../components/Button';
import LoadingState from '../../components/LoadingState';
import { getEmployeeById, updateEmploymentDetails, EmployeeProfile } from '../../api/profile';

interface RouteParams {
  employeeId: string;
  canEdit: boolean;
}

interface FormData {
  jobTitle: string;
  department: string;
  employmentType: string;
  startDate: string;
  siteLocation: string;
  manager: string;
}

export default function EmploymentDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { employeeId, canEdit } = route.params as RouteParams;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [formData, setFormData] = useState<FormData>({
    jobTitle: '',
    department: '',
    employmentType: '',
    startDate: '',
    siteLocation: '',
    manager: '',
  });
  const [hasChanges, setHasChanges] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const data = await getEmployeeById(employeeId);
      if (data) {
        setProfile(data);
        const managerName = data.Manager 
          ? `${data.Manager.firstName || ''} ${data.Manager.lastName || ''}`.trim()
          : '';
        setFormData({
          jobTitle: data.jobTitle || '',
          department: data.Department?.name || '',
          employmentType: data.employmentType || '',
          startDate: data.startDate ? data.startDate.split('T')[0] : '',
          siteLocation: data.siteLocation || '',
          manager: managerName,
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load employment details');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      Alert.alert('No Changes', 'No changes to save');
      return;
    }

    try {
      setSaving(true);
      const result = await updateEmploymentDetails(employeeId, {
        jobTitle: formData.jobTitle,
        employmentType: formData.employmentType,
        startDate: formData.startDate,
        siteLocation: formData.siteLocation,
      });
      
      if (result.pendingApproval) {
        Alert.alert(
          'Pending Approval',
          'Your changes have been submitted for approval.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'Success',
          'Employment details updated successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
      setHasChanges(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const getEmploymentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'full-time': 'Full-time',
      'part-time': 'Part-time',
      'casual': 'Casual',
      'contractor': 'Contractor',
      'fixed-term': 'Fixed Term',
    };
    return types[type] || type;
  };

  if (loading) {
    return <LoadingState message="Loading employment details..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Job Information */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="briefcase-outline" size={20} color="#8b5cf6" />
            </View>
            <Text style={styles.cardTitle}>Job Information</Text>
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.label}>Job Title</Text>
            <TextInput
              style={[styles.input, !canEdit && styles.inputDisabled]}
              value={formData.jobTitle}
              onChangeText={(v) => handleChange('jobTitle', v)}
              editable={canEdit}
              placeholder="Enter job title"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.label}>Department</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="business-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={[styles.inputIconField, styles.inputDisabled]}
                value={formData.department}
                editable={false}
                placeholder="Department"
                placeholderTextColor="#94a3b8"
              />
            </View>
            {canEdit && (
              <Text style={styles.helperText}>
                Department changes require admin approval
              </Text>
            )}
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.label}>Reports To</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="person-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={[styles.inputIconField, styles.inputDisabled]}
                value={formData.manager}
                editable={false}
                placeholder="Manager"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        </Card>

        {/* Employment Details */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="document-text-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.cardTitle}>Employment Details</Text>
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.label}>Employment Type</Text>
            <TextInput
              style={[styles.input, !canEdit && styles.inputDisabled]}
              value={getEmploymentTypeLabel(formData.employmentType)}
              onChangeText={(v) => handleChange('employmentType', v)}
              editable={canEdit}
              placeholder="Full-time, Part-time, etc."
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.label}>Start Date</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="calendar-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={[styles.inputIconField, !canEdit && styles.inputDisabled]}
                value={formData.startDate}
                onChangeText={(v) => handleChange('startDate', v)}
                editable={canEdit}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.label}>Work Location</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="location-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={[styles.inputIconField, !canEdit && styles.inputDisabled]}
                value={formData.siteLocation}
                onChangeText={(v) => handleChange('siteLocation', v)}
                editable={canEdit}
                placeholder="Office location"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        </Card>

        {/* Employment Status Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
            </View>
            <Text style={styles.cardTitle}>Status</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Employment Status</Text>
            <View style={[
              styles.statusBadge,
              profile?.isActive ? styles.statusActive : styles.statusInactive
            ]}>
              <View style={[
                styles.statusDot,
                profile?.isActive ? styles.dotActive : styles.dotInactive
              ]} />
              <Text style={[
                styles.statusText,
                profile?.isActive ? styles.textActive : styles.textInactive
              ]}>
                {profile?.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Save Button */}
        {canEdit && (
          <View style={styles.buttonContainer}>
            <Button
              title={saving ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              disabled={saving || !hasChanges}
              variant={hasChanges ? 'primary' : 'secondary'}
              size="large"
            />
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  formFieldFull: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
  },
  inputIcon: {
    marginLeft: 14,
  },
  inputIconField: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  helperText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
    fontStyle: 'italic',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 15,
    color: '#475569',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: '#f1f5f9',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotActive: {
    backgroundColor: '#10b981',
  },
  dotInactive: {
    backgroundColor: '#94a3b8',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textActive: {
    color: '#10b981',
  },
  textInactive: {
    color: '#64748b',
  },
  buttonContainer: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  bottomPadding: {
    height: 40,
  },
});
