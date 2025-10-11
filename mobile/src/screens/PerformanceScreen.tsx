import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getMyPerformanceReviews,
  submitSelfReview,
  PerformanceReview,
} from '../api/performance';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

export default function PerformanceScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [reviewData, setReviewData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const data = await getMyPerformanceReviews();
      setReviews(data);
    } catch (error) {
      console.error('Failed to load performance reviews:', error);
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

  const handleStartReview = (review: PerformanceReview) => {
    setSelectedReview(review);
    setReviewData(review.selfReviewData || {});
  };

  const handleSubmitReview = async () => {
    if (!selectedReview) return;

    setSubmitting(true);
    try {
      await submitSelfReview(selectedReview.id, reviewData);
      Alert.alert('Success', 'Your self-review has been submitted');
      setSelectedReview(null);
      setReviewData({});
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading performance reviews..." />;
  }

  const statusVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'info';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const pendingReviews = reviews.filter((r) => r.status === 'PENDING' || r.status === 'IN_PROGRESS');
  const completedReviews = reviews.filter((r) => r.status === 'COMPLETED');

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Pending Reviews */}
        {pendingReviews.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Reviews</Text>
              <Badge text={`${pendingReviews.length} pending`} variant="warning" size="small" />
            </View>

            {pendingReviews.map((review) => (
              <Card key={review.id}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewIcon}>
                    <Ionicons name="bar-chart-outline" size={24} color="#3b82f6" />
                  </View>
                  <View style={styles.reviewHeaderText}>
                    <Text style={styles.reviewTitle}>
                      {review.template?.title || `${review.type} Review`}
                    </Text>
                    <Text style={styles.reviewType}>{review.type}</Text>
                  </View>
                  <Badge text={review.status} variant={statusVariant(review.status)} size="small" />
                </View>

                <View style={styles.reviewDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#64748b" />
                    <Text style={styles.detailText}>
                      Period: {new Date(review.reviewPeriodStart).toLocaleDateString()} -{' '}
                      {new Date(review.reviewPeriodEnd).toLocaleDateString()}
                    </Text>
                  </View>
                  {review.dueDate && (
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={16} color="#64748b" />
                      <Text style={styles.detailText}>
                        Due: {new Date(review.dueDate).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  {review.reviewer && (
                    <View style={styles.detailRow}>
                      <Ionicons name="person-outline" size={16} color="#64748b" />
                      <Text style={styles.detailText}>
                        Reviewer: {review.reviewer.firstName} {review.reviewer.lastName}
                      </Text>
                    </View>
                  )}
                </View>

                <Button
                  title={review.selfReviewData ? 'Continue Review' : 'Start Self-Review'}
                  onPress={() => handleStartReview(review)}
                  variant="primary"
                  size="medium"
                  style={{ marginTop: 12 }}
                />
              </Card>
            ))}
          </View>
        )}

        {/* Completed Reviews */}
        {completedReviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed Reviews</Text>
            {completedReviews.map((review) => (
              <Card key={review.id}>
                <View style={styles.reviewHeader}>
                  <View style={[styles.reviewIcon, styles.reviewIconCompleted]}>
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  </View>
                  <View style={styles.reviewHeaderText}>
                    <Text style={styles.reviewTitle}>
                      {review.template?.title || `${review.type} Review`}
                    </Text>
                    <Text style={styles.reviewType}>
                      Completed on {new Date(review.updatedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  {review.finalScore && (
                    <View style={styles.scoreContainer}>
                      <Text style={styles.scoreValue}>{review.finalScore}</Text>
                      <Text style={styles.scoreLabel}>Score</Text>
                    </View>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Empty State */}
        {reviews.length === 0 && (
          <EmptyState
            icon="bar-chart-outline"
            title="No performance reviews"
            description="Your performance reviews will appear here"
          />
        )}
      </ScrollView>

      {/* Review Modal */}
      {selectedReview && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedReview(null)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedReview(null)}>
                <Ionicons name="close" size={28} color="#0f172a" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Self-Review</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              <Card style={styles.infoCard}>
                <Text style={styles.infoTitle}>
                  {selectedReview.template?.title || 'Performance Review'}
                </Text>
                <Text style={styles.infoSubtitle}>
                  Review Period: {new Date(selectedReview.reviewPeriodStart).toLocaleDateString()} -{' '}
                  {new Date(selectedReview.reviewPeriodEnd).toLocaleDateString()}
                </Text>
              </Card>

              {/* Sample Review Questions */}
              <View style={styles.questionSection}>
                <Text style={styles.questionTitle}>1. Key Accomplishments</Text>
                <Text style={styles.questionDescription}>
                  What were your major achievements during this review period?
                </Text>
                <TextInput
                  style={styles.textArea}
                  value={reviewData.accomplishments || ''}
                  onChangeText={(text) =>
                    setReviewData((prev) => ({ ...prev, accomplishments: text }))
                  }
                  placeholder="Describe your key accomplishments..."
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.questionSection}>
                <Text style={styles.questionTitle}>2. Areas for Improvement</Text>
                <Text style={styles.questionDescription}>
                  What areas would you like to develop or improve?
                </Text>
                <TextInput
                  style={styles.textArea}
                  value={reviewData.improvements || ''}
                  onChangeText={(text) =>
                    setReviewData((prev) => ({ ...prev, improvements: text }))
                  }
                  placeholder="Identify areas for growth..."
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.questionSection}>
                <Text style={styles.questionTitle}>3. Goals for Next Period</Text>
                <Text style={styles.questionDescription}>
                  What goals would you like to set for the next review period?
                </Text>
                <TextInput
                  style={styles.textArea}
                  value={reviewData.goals || ''}
                  onChangeText={(text) =>
                    setReviewData((prev) => ({ ...prev, goals: text }))
                  }
                  placeholder="Set your goals..."
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalActions}>
                <Button
                  title="Save Draft"
                  onPress={() => setSelectedReview(null)}
                  variant="outline"
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Submit Review"
                  onPress={handleSubmitReview}
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
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reviewIconCompleted: {
    backgroundColor: '#f0fdf4',
  },
  reviewHeaderText: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  reviewType: {
    fontSize: 13,
    color: '#64748b',
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3b82f6',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  reviewDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 8,
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
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  questionSection: {
    marginBottom: 24,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  questionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 20,
  },
  textArea: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 32,
  },
});
