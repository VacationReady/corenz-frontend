import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getPendingSurveys,
  getCompletedSurveys,
  submitSurveyResponse,
  Survey,
} from '../api/surveys';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

export default function SurveysScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingSurveys, setPendingSurveys] = useState<Survey[]>([]);
  const [completedSurveys, setCompletedSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [pending, completed] = await Promise.allSettled([
        getPendingSurveys(),
        getCompletedSurveys(),
      ]);

      if (pending.status === 'fulfilled') setPendingSurveys(pending.value);
      if (completed.status === 'fulfilled') setCompletedSurveys(completed.value);
    } catch (error) {
      console.error('Failed to load surveys:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleStartSurvey = (survey: Survey) => {
    setSelectedSurvey(survey);
    setResponses({});
  };

  const handleSubmitSurvey = async () => {
    if (!selectedSurvey) return;

    // Validate all required fields are answered
    const schema = selectedSurvey.formSchema;
    if (schema?.questions) {
      const unanswered = schema.questions.filter(
        (q: any) => q.required && !responses[q.id]
      );
      if (unanswered.length > 0) {
        Alert.alert('Error', 'Please answer all required questions');
        return;
      }
    }

    setSubmitting(true);
    try {
      await submitSurveyResponse(selectedSurvey.id, responses);
      Alert.alert('Success', 'Thank you for completing the survey!');
      setSelectedSurvey(null);
      setResponses({});
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit survey');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading surveys..." />;
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Pending Surveys */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Surveys</Text>
            <Badge text={`${pendingSurveys.length} new`} variant="warning" size="small" />
          </View>

          {pendingSurveys.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No pending surveys"
              description="You're all caught up!"
            />
          ) : (
            pendingSurveys.map((survey) => (
              <Card key={survey.id}>
                <View style={styles.surveyHeader}>
                  <View style={styles.surveyIcon}>
                    <Ionicons name="clipboard-outline" size={24} color="#3b82f6" />
                  </View>
                  <View style={styles.surveyHeaderText}>
                    <Text style={styles.surveyTitle}>{survey.title}</Text>
                    <Text style={styles.surveyType}>{survey.type}</Text>
                  </View>
                  {survey.anonymizationLevel && survey.anonymizationLevel !== 'public' && (
                    <View style={styles.anonymousBadge}>
                      <Ionicons name="shield-checkmark" size={14} color="#475569" />
                      <Text style={styles.anonymousBadgeText}>Anonymous</Text>
                    </View>
                  )}
                </View>

                {survey.description && (
                  <Text style={styles.surveyDescription}>{survey.description}</Text>
                )}

                {survey.endDate && (
                  <View style={styles.surveyMeta}>
                    <Ionicons name="time-outline" size={16} color="#64748b" />
                    <Text style={styles.surveyMetaText}>
                      Due: {new Date(survey.endDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                <Button
                  title="Start Survey"
                  onPress={() => handleStartSurvey(survey)}
                  variant="primary"
                  size="medium"
                  style={{ marginTop: 12 }}
                />
              </Card>
            ))
          )}
        </View>

        {/* Completed Surveys */}
        {completedSurveys.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed</Text>
            {completedSurveys.map((survey) => (
              <Card key={survey.id}>
                <View style={styles.surveyHeader}>
                  <View style={[styles.surveyIcon, styles.surveyIconCompleted]}>
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  </View>
                  <View style={styles.surveyHeaderText}>
                    <Text style={styles.surveyTitle}>{survey.title}</Text>
                    <Text style={styles.surveyType}>{survey.type}</Text>
                  </View>
                  <Badge text="Completed" variant="success" size="small" />
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Survey Modal */}
      {selectedSurvey && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedSurvey(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedSurvey(null)}>
                <Ionicons name="close" size={28} color="#0f172a" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedSurvey.title}</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Privacy Notice */}
              {selectedSurvey.anonymizationLevel && selectedSurvey.anonymizationLevel !== 'public' && (
                <View style={styles.privacyNotice}>
                  <View style={styles.privacyIcon}>
                    <Ionicons name="shield-checkmark" size={24} color="#fff" />
                  </View>
                  <View style={styles.privacyTextContainer}>
                    <Text style={styles.privacyTitle}>
                      {selectedSurvey.anonymizationLevel === 'full' && 'This survey is fully anonymous'}
                      {selectedSurvey.anonymizationLevel === 'department' && 'Anonymous by department'}
                      {selectedSurvey.anonymizationLevel === 'location' && 'Anonymous by location'}
                    </Text>
                    <Text style={styles.privacyText}>
                      {selectedSurvey.anonymizationLevel === 'full' && 
                        'Your identity is protected. Management cannot see who submitted which response.'
                      }
                      {selectedSurvey.anonymizationLevel === 'department' && 
                        'Your name is protected, but department may be visible in aggregated reports.'
                      }
                      {selectedSurvey.anonymizationLevel === 'location' && 
                        'Your name is protected, but location may be visible in aggregated reports.'
                      }
                    </Text>
                  </View>
                </View>
              )}

              {selectedSurvey.anonymizationLevel === 'public' && (
                <View style={[styles.privacyNotice, styles.publicNotice]}>
                  <View style={[styles.privacyIcon, styles.publicIcon]}>
                    <Ionicons name="eye" size={24} color="#fff" />
                  </View>
                  <View style={styles.privacyTextContainer}>
                    <Text style={[styles.privacyTitle, styles.publicTitle]}>Public survey</Text>
                    <Text style={[styles.privacyText, styles.publicText]}>
                      Your response will be visible to management with your name attached.
                    </Text>
                  </View>
                </View>
              )}

              {selectedSurvey.description && (
                <Text style={styles.modalDescription}>{selectedSurvey.description}</Text>
              )}

              {selectedSurvey.formSchema?.questions?.map((question: any, index: number) => (
                <View key={question.id} style={styles.questionContainer}>
                  <Text style={styles.questionLabel}>
                    {index + 1}. {question.label || question.text}
                    {question.required && <Text style={styles.requiredMark}> *</Text>}
                  </Text>

                  {question.type === 'text' || question.type === 'shortText' || question.type === 'textarea' || question.type === 'email' || question.type === 'phone' || question.type === 'number' ? (
                    <TextInput
                      style={styles.textInput}
                      value={responses[question.id] || ''}
                      onChangeText={(text) =>
                        setResponses((prev) => ({ ...prev, [question.id]: text }))
                      }
                      placeholder={question.placeholder || "Your answer"}
                      multiline={question.type === 'textarea' || question.type === 'text'}
                      numberOfLines={question.type === 'textarea' ? 6 : question.type === 'text' ? 4 : 1}
                      keyboardType={
                        question.type === 'email' ? 'email-address' :
                        question.type === 'phone' ? 'phone-pad' :
                        question.type === 'number' ? 'numeric' :
                        'default'
                      }
                      autoCapitalize={question.type === 'email' ? 'none' : 'sentences'}
                    />
                  ) : question.type === 'radio' || question.type === 'select' || question.type === 'chips' ? (
                    <View style={styles.optionsContainer}>
                      {(question.options || question.optionItems || []).map((option: any) => {
                        const optionValue = option.value || option;
                        const optionLabel = option.label || option;
                        return (
                          <TouchableOpacity
                            key={optionValue}
                            style={[
                              styles.radioOption,
                              responses[question.id] === optionValue &&
                                styles.radioOptionSelected,
                            ]}
                            onPress={() =>
                              setResponses((prev) => ({
                                ...prev,
                                [question.id]: optionValue,
                              }))
                            }
                          >
                            <View style={styles.radioCircle}>
                              {responses[question.id] === optionValue && (
                                <View style={styles.radioCircleSelected} />
                              )}
                            </View>
                            <Text style={styles.radioLabel}>{optionLabel}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : question.type === 'checkbox' || question.type === 'multiselect' ? (
                    <View style={styles.optionsContainer}>
                      {(question.options || question.optionItems || []).map((option: any) => {
                        const optionValue = option.value || option;
                        const optionLabel = option.label || option;
                        const isSelected = Array.isArray(responses[question.id]) 
                          ? responses[question.id].includes(optionValue)
                          : false;
                        return (
                          <TouchableOpacity
                            key={optionValue}
                            style={[
                              styles.radioOption,
                              isSelected && styles.radioOptionSelected,
                            ]}
                            onPress={() =>
                              setResponses((prev) => {
                                const currentValues = Array.isArray(prev[question.id]) ? prev[question.id] : [];
                                const newValues = isSelected
                                  ? currentValues.filter((v: any) => v !== optionValue)
                                  : [...currentValues, optionValue];
                                return { ...prev, [question.id]: newValues };
                              })
                            }
                          >
                            <View style={[styles.radioCircle, styles.checkboxCircle]}>
                              {isSelected && (
                                <Ionicons name="checkmark" size={14} color="#3b82f6" />
                              )}
                            </View>
                            <Text style={styles.radioLabel}>{optionLabel}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : question.type === 'switch' ? (
                    <TouchableOpacity
                      style={[
                        styles.switchContainer,
                        responses[question.id] && styles.switchContainerActive,
                      ]}
                      onPress={() =>
                        setResponses((prev) => ({
                          ...prev,
                          [question.id]: !prev[question.id],
                        }))
                      }
                    >
                      <Text style={styles.switchLabel}>
                        {responses[question.id] ? 'Yes' : 'No'}
                      </Text>
                    </TouchableOpacity>
                  ) : question.type === 'rating' ? (
                    <View style={styles.ratingContainer}>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <TouchableOpacity
                          key={rating}
                          onPress={() =>
                            setResponses((prev) => ({ ...prev, [question.id]: rating }))
                          }
                        >
                          <Ionicons
                            name={responses[question.id] >= rating ? 'star' : 'star-outline'}
                            size={40}
                            color={responses[question.id] >= rating ? '#f59e0b' : '#cbd5e1'}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : question.type === 'date' ? (
                    <TextInput
                      style={styles.textInput}
                      value={responses[question.id] || ''}
                      onChangeText={(text) =>
                        setResponses((prev) => ({ ...prev, [question.id]: text }))
                      }
                      placeholder="YYYY-MM-DD"
                    />
                  ) : (
                    <Text style={styles.unsupportedFieldType}>
                      Unsupported field type: {question.type}
                    </Text>
                  )}
                </View>
              ))}

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  onPress={() => setSelectedSurvey(null)}
                  variant="outline"
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Submit Survey"
                  onPress={handleSubmitSurvey}
                  variant="primary"
                  loading={submitting}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  surveyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  surveyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  surveyIconCompleted: {
    backgroundColor: '#f0fdf4',
  },
  surveyHeaderText: {
    flex: 1,
  },
  surveyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  surveyType: {
    fontSize: 13,
    color: '#64748b',
  },
  anonymousBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  anonymousBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 4,
  },
  surveyDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  surveyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  surveyMetaText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  requiredMark: {
    color: '#ef4444',
  },
  textInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 44,
  },
  unsupportedFieldType: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    color: '#991b1b',
    fontSize: 14,
  },
  optionsContainer: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  radioOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  radioLabel: {
    fontSize: 16,
    color: '#0f172a',
  },
  checkboxCircle: {
    borderRadius: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  switchContainerActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 32,
    marginBottom: 16,
  },
  privacyNotice: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  privacyIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  publicNotice: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  publicIcon: {
    backgroundColor: '#10b981',
  },
  publicTitle: {
    color: '#065f46',
  },
  publicText: {
    color: '#047857',
  },
});
