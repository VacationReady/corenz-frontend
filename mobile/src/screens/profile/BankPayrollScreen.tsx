import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';

import Card from '../../components/Card';
import Button from '../../components/Button';
import LoadingState from '../../components/LoadingState';
import { getEmployeeById, updateBankPayroll, EmployeeProfile } from '../../api/profile';

interface RouteParams {
  employeeId: string;
  canEdit: boolean;
}

interface FormData {
  bankAccountNumber: string;
  irdNumber: string;
  taxCode: string;
  kiwiSaverEnrolled: boolean;
  kiwiSaverContribution: string;
  salaryAmount: string;
  hourlyRate: string;
}

export default function BankPayrollScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { employeeId, canEdit } = route.params as RouteParams;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [formData, setFormData] = useState<FormData>({
    bankAccountNumber: '',
    irdNumber: '',
    taxCode: '',
    kiwiSaverEnrolled: false,
    kiwiSaverContribution: '',
    salaryAmount: '',
    hourlyRate: '',
  });
  const [hasChanges, setHasChanges] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const data = await getEmployeeById(employeeId);
      if (data) {
        setProfile(data);
        setFormData({
          bankAccountNumber: data.bankAccountNumber || '',
          irdNumber: data.irdNumber || '',
          taxCode: data.taxCode || '',
          kiwiSaverEnrolled: data.kiwiSaverEnrolled || false,
          kiwiSaverContribution: data.kiwiSaverContribution?.toString() || '',
          salaryAmount: data.salaryAmount?.toString() || '',
          hourlyRate: data.hourlyRate?.toString() || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load bank & payroll details');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChange = (field: keyof FormData, value: string | boolean) => {
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
      const result = await updateBankPayroll(employeeId, {
        bankAccountNumber: formData.bankAccountNumber || undefined,
        irdNumber: formData.irdNumber || undefined,
        taxCode: formData.taxCode || undefined,
        kiwiSaverEnrolled: formData.kiwiSaverEnrolled,
        kiwiSaverContribution: formData.kiwiSaverContribution 
          ? parseFloat(formData.kiwiSaverContribution) 
          : undefined,
        salaryAmount: formData.salaryAmount 
          ? parseFloat(formData.salaryAmount) 
          : undefined,
        hourlyRate: formData.hourlyRate 
          ? parseFloat(formData.hourlyRate) 
          : undefined,
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
          'Bank & payroll details updated successfully',
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

  const formatCurrency = (value: string) => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(num);
  };

  if (loading) {
    return <LoadingState message="Loading bank & payroll details..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Sensitive Data Warning */}
        <View style={styles.warningBanner}>
          <Ionicons name="shield-checkmark" size={20} color="#f59e0b" />
          <Text style={styles.warningText}>
            This section contains sensitive financial information
          </Text>
        </View>

        {/* Bank Details */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="card-outline" size={20} color="#10b981" />
            </View>
            <Text style={styles.cardTitle}>Bank Details</Text>
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.label}>Bank Account Number</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="wallet-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={[styles.inputIconField, !canEdit && styles.inputDisabled]}
                value={formData.bankAccountNumber}
                onChangeText={(v) => handleChange('bankAccountNumber', v)}
                editable={canEdit}
                placeholder="XX-XXXX-XXXXXXX-XX"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.helperText}>
              Format: Bank-Branch-Account-Suffix
            </Text>
          </View>
        </Card>

        {/* Tax Information */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="document-text-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.cardTitle}>Tax Information</Text>
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.label}>IRD Number</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="finger-print-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={[styles.inputIconField, !canEdit && styles.inputDisabled]}
                value={formData.irdNumber}
                onChangeText={(v) => handleChange('irdNumber', v)}
                editable={canEdit}
                placeholder="XXX-XXX-XXX"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.label}>Tax Code</Text>
            <TextInput
              style={[styles.input, !canEdit && styles.inputDisabled]}
              value={formData.taxCode}
              onChangeText={(v) => handleChange('taxCode', v)}
              editable={canEdit}
              placeholder="e.g., M, ME, S, SH"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
            />
          </View>
        </Card>

        {/* KiwiSaver */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="trending-up-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.cardTitle}>KiwiSaver</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>KiwiSaver Enrolled</Text>
              <Text style={styles.switchDescription}>
                Employee is enrolled in KiwiSaver
              </Text>
            </View>
            <Switch
              value={formData.kiwiSaverEnrolled}
              onValueChange={(v) => handleChange('kiwiSaverEnrolled', v)}
              disabled={!canEdit}
              trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>

          {formData.kiwiSaverEnrolled && (
            <View style={styles.formFieldFull}>
              <Text style={styles.label}>Contribution Rate (%)</Text>
              <TextInput
                style={[styles.input, !canEdit && styles.inputDisabled]}
                value={formData.kiwiSaverContribution}
                onChangeText={(v) => handleChange('kiwiSaverContribution', v)}
                editable={canEdit}
                placeholder="3, 4, 6, 8, or 10"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
              <Text style={styles.helperText}>
                Standard rates: 3%, 4%, 6%, 8%, or 10%
              </Text>
            </View>
          )}
        </Card>

        {/* Compensation */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="cash-outline" size={20} color="#8b5cf6" />
            </View>
            <Text style={styles.cardTitle}>Compensation</Text>
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.label}>Annual Salary (NZD)</Text>
            <View style={styles.inputWithIcon}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={[styles.inputIconField, !canEdit && styles.inputDisabled]}
                value={formData.salaryAmount}
                onChangeText={(v) => handleChange('salaryAmount', v)}
                editable={canEdit}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
              />
            </View>
            {formData.salaryAmount && (
              <Text style={styles.formattedValue}>
                {formatCurrency(formData.salaryAmount)} per year
              </Text>
            )}
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.label}>Hourly Rate (NZD)</Text>
            <View style={styles.inputWithIcon}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={[styles.inputIconField, !canEdit && styles.inputDisabled]}
                value={formData.hourlyRate}
                onChangeText={(v) => handleChange('hourlyRate', v)}
                editable={canEdit}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
              />
            </View>
            {formData.hourlyRate && (
              <Text style={styles.formattedValue}>
                {formatCurrency(formData.hourlyRate)} per hour
              </Text>
            )}
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
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
  currencyPrefix: {
    marginLeft: 14,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
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
  },
  formattedValue: {
    fontSize: 13,
    color: '#10b981',
    marginTop: 6,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 13,
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
