import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingStep } from '../../../api/onboarding';

interface PayrollField {
  id: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  fieldType?: string;
  options?: string[];
}

interface PayrollSetupStepProps {
  step: OnboardingStep;
  employeeId: string;
  isCompleting: boolean;
  onComplete: (data: Record<string, any>) => void;
}

const KIWISAVER_STATUS_LABELS: Record<string, string> = {
  enrolled: 'Enrolled',
  opted_out: 'Opted out',
  contributions_holiday: 'Contributions holiday',
};

const KIWISAVER_RATE_LABELS: Record<string, string> = {
  '0.03': '3%',
  '0.04': '4%',
  '0.06': '6%',
  '0.08': '8%',
  '0.10': '10%',
};

export default function PayrollSetupStep({
  step,
  employeeId,
  isCompleting,
  onComplete,
}: PayrollSetupStepProps) {
  const metadata = step.metadata || {};
  const fields: PayrollField[] = metadata.fields || [];
  const instructions = metadata.instructions || '';

  const getInitialValues = (): Record<string, string> => {
    const values: Record<string, string> = {};
    fields.forEach(field => {
      values[field.id] = field.defaultValue || '';
    });
    return values;
  };

  const [values, setValues] = useState<Record<string, string>>(getInitialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedSelect, setExpandedSelect] = useState<string | null>(null);

  const validateIRDNumber = (value: string): boolean => {
    const cleaned = value.replace(/[\s-]/g, '');
    if (!/^\d{8,9}$/.test(cleaned)) return false;
    
    const weights8 = [3, 2, 7, 6, 5, 4, 3, 2];
    const weights9 = [3, 2, 7, 6, 5, 4, 3, 2, 1];
    
    const digits = cleaned.split('').map(Number);
    const weights = digits.length === 8 ? weights8 : weights9;
    
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * weights[i];
    }
    
    return sum % 11 === 0;
  };

  const validateField = (field: PayrollField, value: string): string | null => {
    if (field.required && !value.trim()) {
      return `${field.label} is required`;
    }
    
    if (field.fieldType === 'irdNumber' && value.trim()) {
      if (!validateIRDNumber(value)) {
        return 'Please enter a valid IRD number';
      }
    }
    
    return null;
  };

  const handleChange = useCallback((fieldId: string, value: string) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
  }, []);

  const handleSelectOption = useCallback((fieldId: string, value: string) => {
    handleChange(fieldId, value);
    setExpandedSelect(null);
  }, [handleChange]);

  const handleComplete = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    fields.forEach(field => {
      const error = validateField(field, values[field.id] || '');
      if (error) {
        newErrors[field.id] = error;
      }
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onComplete({ payrollData: values });
  }, [fields, values, onComplete]);

  const renderField = (field: PayrollField) => {
    const value = values[field.id] || '';
    const error = errors[field.id];
    const isSelect = field.fieldType === 'select' || 
                     field.fieldType === 'kiwiSaverStatus' || 
                     field.fieldType === 'kiwiSaverEmployeeRate';
    
    const getOptions = (): { value: string; label: string }[] => {
      if (field.fieldType === 'kiwiSaverStatus') {
        return Object.entries(KIWISAVER_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }));
      }
      if (field.fieldType === 'kiwiSaverEmployeeRate') {
        return Object.entries(KIWISAVER_RATE_LABELS).map(([v, l]) => ({ value: v, label: l }));
      }
      return (field.options || []).map(o => ({ value: o, label: o }));
    };

    const getDisplayValue = (): string => {
      if (!value) return '';
      if (field.fieldType === 'kiwiSaverStatus') {
        return KIWISAVER_STATUS_LABELS[value] || value;
      }
      if (field.fieldType === 'kiwiSaverEmployeeRate') {
        return KIWISAVER_RATE_LABELS[value] || value;
      }
      return value;
    };

    if (isSelect) {
      const options = getOptions();
      const isExpanded = expandedSelect === field.id;
      
      return (
        <View key={field.id} style={styles.fieldContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{field.label}</Text>
            {field.required && <Text style={styles.requiredStar}>*</Text>}
          </View>
          
          <TouchableOpacity
            style={[styles.selectButton, error && styles.inputError]}
            onPress={() => setExpandedSelect(isExpanded ? null : field.id)}
          >
            <Text style={[styles.selectButtonText, !value && styles.placeholder]}>
              {getDisplayValue() || field.placeholder || 'Select...'}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#64748B"
            />
          </TouchableOpacity>
          
          {isExpanded && (
            <View style={styles.optionsList}>
              {options.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    value === option.value && styles.optionItemSelected,
                  ]}
                  onPress={() => handleSelectOption(field.id, option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      value === option.value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {value === option.value && (
                    <Ionicons name="checkmark" size={18} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      );
    }

    return (
      <View key={field.id} style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{field.label}</Text>
          {field.required && <Text style={styles.requiredStar}>*</Text>}
        </View>
        
        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={value}
          onChangeText={(text) => handleChange(field.id, text)}
          placeholder={field.placeholder}
          placeholderTextColor="#64748B"
          keyboardType={field.fieldType === 'number' ? 'numeric' : 'default'}
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  };

  const requiredFields = fields.filter(f => f.required);
  const allRequiredFilled = requiredFields.every(f => values[f.id]?.trim());

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {instructions && (
        <View style={styles.instructionsBox}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.instructionsText}>{instructions}</Text>
        </View>
      )}

      <View style={styles.fieldsContainer}>
        {fields.map(renderField)}
      </View>

      {fields.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={32} color="#64748B" />
          <Text style={styles.emptyText}>No payroll fields configured</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.completeButton, !allRequiredFilled && styles.completeButtonDisabled]}
        onPress={handleComplete}
        disabled={!allRequiredFilled || isCompleting}
      >
        {isCompleting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.completeButtonText}>Submit Payroll Details</Text>
          </>
        )}
      </TouchableOpacity>
      
      {!allRequiredFilled && (
        <Text style={styles.helperText}>
          Please fill in all required fields
        </Text>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  fieldsContainer: {
    gap: 16,
  },
  fieldContainer: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  requiredStar: {
    fontSize: 14,
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  placeholder: {
    color: '#64748B',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  optionsList: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  optionItemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  optionText: {
    fontSize: 16,
    color: '#CBD5E1',
  },
  optionTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
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
    backgroundColor: '#22C55E',
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
