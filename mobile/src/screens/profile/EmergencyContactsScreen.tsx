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
import { useRoute } from '@react-navigation/native';

import Card from '../../components/Card';
import Button from '../../components/Button';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';
import {
  getEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  EmergencyContact,
} from '../../api/profile';

interface RouteParams {
  employeeId: string;
  canEdit: boolean;
}

interface ContactFormData extends Omit<EmergencyContact, 'id'> {
  id?: string;
  isNew?: boolean;
  hasChanges?: boolean;
}

export default function EmergencyContactsScreen() {
  const route = useRoute();
  const { employeeId, canEdit } = route.params as RouteParams;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactFormData[]>([]);

  const loadContacts = useCallback(async () => {
    try {
      const data = await getEmergencyContacts(employeeId);
      setContacts(data.map(c => ({ ...c, isNew: false, hasChanges: false })));
    } catch (error) {
      console.error('Failed to load contacts:', error);
      Alert.alert('Error', 'Failed to load emergency contacts');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleAddContact = () => {
    const newContact: ContactFormData = {
      id: `new_${Date.now()}`,
      name: '',
      relationship: '',
      phone: '',
      email: '',
      isNew: true,
      hasChanges: true,
    };
    setContacts(prev => [...prev, newContact]);
  };

  const handleChange = (index: number, field: keyof EmergencyContact, value: string) => {
    setContacts(prev => prev.map((c, i) => 
      i === index ? { ...c, [field]: value, hasChanges: true } : c
    ));
  };

  const handleSave = async (index: number) => {
    const contact = contacts[index];
    if (!contact.name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }

    try {
      setSaving(contact.id || `index_${index}`);
      
      if (contact.isNew) {
        await createEmergencyContact(employeeId, {
          name: contact.name,
          relationship: contact.relationship,
          phone: contact.phone,
          email: contact.email,
        });
        Alert.alert('Success', 'Emergency contact added');
      } else {
        await updateEmergencyContact(employeeId, {
          id: contact.id!,
          name: contact.name,
          relationship: contact.relationship,
          phone: contact.phone,
          email: contact.email,
        });
        Alert.alert('Success', 'Emergency contact updated');
      }
      
      await loadContacts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save contact');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (index: number) => {
    const contact = contacts[index];
    
    if (contact.isNew) {
      setContacts(prev => prev.filter((_, i) => i !== index));
      return;
    }

    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(contact.id!);
              await deleteEmergencyContact(employeeId, contact.id!);
              Alert.alert('Success', 'Emergency contact deleted');
              await loadContacts();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete contact');
            } finally {
              setSaving(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingState message="Loading emergency contacts..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Header with Add Button */}
        {canEdit && (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.addButton} onPress={handleAddContact}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Contact</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {contacts.length === 0 && (
          <EmptyState
            icon="call-outline"
            title="No Emergency Contacts"
            description={canEdit ? "Add emergency contacts for safety" : "No emergency contacts on file"}
          />
        )}

        {/* Contact Cards */}
        {contacts.map((contact, index) => (
          <Card key={contact.id || index} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.cardIcon, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="person-outline" size={20} color="#ef4444" />
                </View>
                <Text style={styles.cardTitle}>
                  {contact.isNew ? 'New Contact' : contact.name || 'Contact'}
                </Text>
              </View>
              {contact.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>New</Text>
                </View>
              )}
            </View>

            <View style={styles.formFieldFull}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={[styles.input, !canEdit && styles.inputDisabled]}
                value={contact.name}
                onChangeText={(v) => handleChange(index, 'name', v)}
                editable={canEdit}
                placeholder="Contact name"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formFieldFull}>
              <Text style={styles.label}>Relationship</Text>
              <TextInput
                style={[styles.input, !canEdit && styles.inputDisabled]}
                value={contact.relationship || ''}
                onChangeText={(v) => handleChange(index, 'relationship', v)}
                editable={canEdit}
                placeholder="e.g., Spouse, Parent, Sibling"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formFieldFull}>
              <Text style={styles.label}>Phone</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="call-outline" size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={[styles.inputIconField, !canEdit && styles.inputDisabled]}
                  value={contact.phone || ''}
                  onChangeText={(v) => handleChange(index, 'phone', v)}
                  editable={canEdit}
                  keyboardType="phone-pad"
                  placeholder="+64 21 234 5678"
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
                  value={contact.email || ''}
                  onChangeText={(v) => handleChange(index, 'email', v)}
                  editable={canEdit}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="email@example.com"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Action Buttons */}
            {canEdit && (
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(index)}
                  disabled={saving === contact.id}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.saveButton,
                    !contact.hasChanges && styles.saveButtonDisabled,
                  ]}
                  onPress={() => handleSave(index)}
                  disabled={saving === contact.id || !contact.hasChanges}
                >
                  {saving === contact.id ? (
                    <Text style={styles.saveButtonText}>Saving...</Text>
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.saveButtonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Card>
        ))}

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
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  newBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
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
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  saveButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
