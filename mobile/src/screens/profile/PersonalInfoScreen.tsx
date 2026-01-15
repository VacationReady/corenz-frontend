import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';

import Card from '../../components/Card';
import Button from '../../components/Button';
import LoadingState from '../../components/LoadingState';
import { getEmployeeById, updatePersonalInfo, EmployeeProfile } from '../../api/profile';

interface RouteParams {
  employeeId: string;
  canEdit: boolean;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  pronouns: string;
  addressStreet: string;
  addressCity: string;
  addressPostcode: string;
  addressCountry: string;
}

export default function PersonalInfoScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { employeeId, canEdit } = route.params as RouteParams;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    pronouns: '',
    addressStreet: '',
    addressCity: '',
    addressPostcode: '',
    addressCountry: '',
  });
  const [hasChanges, setHasChanges] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const data = await getEmployeeById(employeeId);
      if (data) {
        setProfile(data);
        setFormData({
          firstName: data.User.firstName || '',
          lastName: data.User.lastName || '',
          email: data.User.email || '',
          phone: data.User.phone || '',
          dateOfBirth: data.User.dateOfBirth ? data.User.dateOfBirth.split('T')[0] : '',
          pronouns: data.User.pronouns || '',
          addressStreet: data.User.addressStreet || '',
          addressCity: data.User.addressCity || '',
          addressPostcode: data.User.addressPostcode || '',
          addressCountry: data.User.addressCountry || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
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
      const result = await updatePersonalInfo(employeeId, formData);
      
      if (result.pendingApproval) {
        Alert.alert(
          'Pending Approval',
          'Your changes have been submitted for approval.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'Success',
          'Personal information updated successfully',
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

  if (loading) {
    return <LoadingState message="Loading personal information..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Basic Details */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="person-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.cardTitle}>Basic Details</Text>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={[styles.input, !canEdit && styles.inputDisabled]}
                value={formData.firstName}
                onChangeText={(v) => handleChange('firstName', v)}
                editable={canEdit}
                placeholder="Enter first name"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={[styles.input, !canEdit && styles.inputDisabled]}
                value={formData.lastName}
                onChangeText={(v) => handleChange('lastName', v)}
                editable={canEdit}
                placeholder="Enter last name"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={[styles.inputIconField, !canEdit && styles.inputDisabled]}
                value={formData.email}
                onChangeText={(v) => handleChange('email', v)}
                editable={canEdit}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="email@example.com"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.label}>Phone</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="call-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={[styles.inputIconField, !canEdit && styles.inputDisabled]}
                value={formData.phone}
                onChangeText={(v) => handleChange('phone', v)}
                editable={canEdit}
                keyboardType="phone-pad"
                placeholder="+64 21 234 5678"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Date of Birth</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="calendar-outline" size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={[styles.inputIconField, !canEdit && styles.inputDisabled]}
                  value={formData.dateOfBirth}
                  onChangeText={(v) => handleChange('dateOfBirth', v)}
                  editable={canEdit}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={styles.label}>Pronouns</Text>
              <TextInput
                style={[styles.input, !canEdit && styles.inputDisabled]}
                value={formData.pronouns}
                onChangeText={(v) => handleChange('pronouns', v)}
                editable={canEdit}
                placeholder="e.g., She/Her"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        </Card>

        {/* Address */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="location-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.cardTitle}>Address</Text>
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.label}>Street Address</Text>
            <TextInput
              style={[styles.input, !canEdit && styles.inputDisabled]}
              value={formData.addressStreet}
              onChangeText={(v) => handleChange('addressStreet', v)}
              editable={canEdit}
              placeholder="123 Main Street"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={[styles.input, !canEdit && styles.inputDisabled]}
                value={formData.addressCity}
                onChangeText={(v) => handleChange('addressCity', v)}
                editable={canEdit}
                placeholder="Wellington"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.label}>Postcode</Text>
              <TextInput
                style={[styles.input, !canEdit && styles.inputDisabled]}
                value={formData.addressPostcode}
                onChangeText={(v) => handleChange('addressPostcode', v)}
                editable={canEdit}
                placeholder="6011"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.label}>Country</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="globe-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={[styles.inputIconField, !canEdit && styles.inputDisabled]}
                value={formData.addressCountry}
                onChangeText={(v) => handleChange('addressCountry', v)}
                editable={canEdit}
                placeholder="New Zealand"
                placeholderTextColor="#94a3b8"
              />
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
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formField: {
    flex: 1,
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
  buttonContainer: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  bottomPadding: {
    height: 40,
  },
});
