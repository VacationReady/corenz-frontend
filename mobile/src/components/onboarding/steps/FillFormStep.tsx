import React, { useState, useEffect, useCallback } from 'react';
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
import { OnboardingStep, getFormSchema } from '../../../api/onboarding';

interface FormField {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  description?: string;
}

interface FillFormStepProps {
  step: OnboardingStep;
  employeeId: string;
  isCompleting: boolean;
  onComplete: (data: Record<string, any>) => void;
}

export default function FillFormStep({
  step,
  employeeId,
  isCompleting,
  onComplete,
}: FillFormStepProps) {
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedSelect, setExpandedSelect] = useState<string | null>(null);

  useEffect(() => {
    loadFormSchema();
  }, [step.formId]);

  const loadFormSchema = async () => {
    if (!step.formId) {
      // Use inline form fields if no formId
      if (step.metadata?.fields) {
        const inlineFields = (step.metadata.fields as any[]).map((f, i) => ({
          id: f.id || `field-${i}`,
          label: f.label || `Field ${i + 1}`,
          type: f.type || 'text',
          required: f.required !== false,
          placeholder: f.placeholder || '',
          options: f.options,
          description: f.description,
        }));
        setFields(inlineFields);
      }
      setLoading(false);
      return;
    }

    try {
      const result = await getFormSchema(step.formId);
      if (result.success && result.schema) {
        const formFields = parseFormSchema(result.schema);
        setFields(formFields);
      }
    } catch (error) {
      console.error('[FillFormStep] Error loading form:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseFormSchema = (schema: any): FormField[] => {
    // Handle different form schema formats
    if (schema.pages && Array.isArray(schema.pages)) {
      // Multi-page form
      return schema.pages.flatMap((page: any) => 
        (page.fields || []).map((f: any) => normalizeField(f))
      );
    }
    
    if (schema.fields && Array.isArray(schema.fields)) {
      return schema.fields.map((f: any) => normalizeField(f));
    }
    
    if (schema.schema?.properties) {
      // JSON Schema format
      return Object.entries(schema.schema.properties).map(([key, prop]: [string, any]) => ({
        id: key,
        label: prop.title || key,
        type: mapJsonSchemaType(prop.type, prop.format),
        required: schema.schema.required?.includes(key) || false,
        placeholder: prop.description || '',
        options: prop.enum?.map((v: string) => ({ value: v, label: v })),
      }));
    }
    
    return [];
  };

  const normalizeField = (f: any): FormField => ({
    id: f.id || f.name || `field-${Math.random().toString(36).substr(2, 9)}`,
    label: f.label || f.title || f.name || 'Field',
    type: f.type || f.fieldType || 'text',
    required: f.required !== false,
    placeholder: f.placeholder || f.description || '',
    options: f.options?.map((o: any) => 
      typeof o === 'string' ? { value: o, label: o } : { value: o.value, label: o.label || o.value }
    ),
    description: f.description || f.helpText,
  });

  const mapJsonSchemaType = (type: string, format?: string): string => {
    if (format === 'date') return 'date';
    if (format === 'email') return 'email';
    if (type === 'number' || type === 'integer') return 'number';
    if (type === 'boolean') return 'checkbox';
    return 'text';
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

  const validateFields = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    fields.forEach(field => {
      if (field.required && !values[field.id]?.trim()) {
        newErrors[field.id] = `${field.label} is required`;
      }
      
      if (field.type === 'email' && values[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(values[field.id])) {
          newErrors[field.id] = 'Please enter a valid email address';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleComplete = useCallback(() => {
    if (!validateFields()) {
      return;
    }
    onComplete({ formResponse: values });
  }, [values, onComplete]);

  const renderField = (field: FormField) => {
    const value = values[field.id] || '';
    const error = errors[field.id];
    const isSelect = field.type === 'select' || field.type === 'dropdown' || !!field.options;

    if (isSelect && field.options) {
      const isExpanded = expandedSelect === field.id;
      const selectedOption = field.options.find(o => o.value === value);
      
      return (
        <View key={field.id} style={styles.fieldContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{field.label}</Text>
            {field.required && <Text style={styles.requiredStar}>*</Text>}
          </View>
          
          {field.description && (
            <Text style={styles.fieldDescription}>{field.description}</Text>
          )}
          
          <TouchableOpacity
            style={[styles.selectButton, error && styles.inputError]}
            onPress={() => setExpandedSelect(isExpanded ? null : field.id)}
          >
            <Text style={[styles.selectButtonText, !value && styles.placeholder]}>
              {selectedOption?.label || field.placeholder || 'Select...'}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#64748B"
            />
          </TouchableOpacity>
          
          {isExpanded && (
            <View style={styles.optionsList}>
              {field.options.map(option => (
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

    if (field.type === 'textarea' || field.type === 'longtext') {
      return (
        <View key={field.id} style={styles.fieldContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{field.label}</Text>
            {field.required && <Text style={styles.requiredStar}>*</Text>}
          </View>
          
          {field.description && (
            <Text style={styles.fieldDescription}>{field.description}</Text>
          )}
          
          <TextInput
            style={[styles.textArea, error && styles.inputError]}
            value={value}
            onChangeText={(text) => handleChange(field.id, text)}
            placeholder={field.placeholder}
            placeholderTextColor="#64748B"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          
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
        
        {field.description && (
          <Text style={styles.fieldDescription}>{field.description}</Text>
        )}
        
        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={value}
          onChangeText={(text) => handleChange(field.id, text)}
          placeholder={field.placeholder}
          placeholderTextColor="#64748B"
          keyboardType={
            field.type === 'number' ? 'numeric' :
            field.type === 'email' ? 'email-address' :
            field.type === 'phone' ? 'phone-pad' :
            'default'
          }
          autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
          autoCorrect={field.type !== 'email'}
        />
        
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading form...</Text>
      </View>
    );
  }

  const requiredFields = fields.filter(f => f.required);
  const allRequiredFilled = requiredFields.every(f => values[f.id]?.trim());

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {step.metadata?.guidance && (
        <View style={styles.guidanceBox}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.guidanceText}>{step.metadata.guidance}</Text>
        </View>
      )}

      <View style={styles.fieldsContainer}>
        {fields.map(renderField)}
      </View>

      {fields.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={32} color="#64748B" />
          <Text style={styles.emptyText}>No form fields configured</Text>
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
            <Text style={styles.completeButtonText}>Submit Form</Text>
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  guidanceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  guidanceText: {
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
  fieldDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -4,
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
  textArea: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    minHeight: 100,
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
    backgroundColor: '#10B981',
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
