import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  getUnifiedActionItems,
  completeActionItem,
  approveLeaveRequest,
  declineLeaveRequest,
  approveChangeRequest,
  declineChangeRequest,
  approveTimesheet,
  rejectTimesheet,
  acknowledgeDocument,
  signDocument,
  getLeaveApprovalDetails,
  UnifiedActionItem,
  ActionItemCounts,
  ActionItemType,
  LeaveApprovalDetails,
} from '../api/action-items';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type FilterType = 'all' | 'approvals' | 'documents' | 'tasks';

interface ActionModalState {
  visible: boolean;
  item: UnifiedActionItem | null;
  action: 'approve' | 'decline' | 'view' | null;
}

const TYPE_CONFIG: Record<ActionItemType, { icon: string; color: string; bgColor: string; label: string }> = {
  SURVEY: { icon: 'clipboard-outline', color: '#8b5cf6', bgColor: '#f3e8ff', label: 'Survey' },
  DOCUMENT_SIGNATURE: { icon: 'create-outline', color: '#0ea5e9', bgColor: '#e0f2fe', label: 'Sign' },
  DOCUMENT_ACKNOWLEDGEMENT: { icon: 'document-text-outline', color: '#f59e0b', bgColor: '#fef3c7', label: 'Review' },
  LEAVE_APPROVAL: { icon: 'calendar-outline', color: '#10b981', bgColor: '#d1fae5', label: 'Leave' },
  TIMESHEET_APPROVAL: { icon: 'time-outline', color: '#6366f1', bgColor: '#e0e7ff', label: 'Timesheet' },
  CHANGE_REQUEST: { icon: 'swap-horizontal-outline', color: '#ec4899', bgColor: '#fce7f3', label: 'Change' },
  TASK: { icon: 'checkbox-outline', color: '#64748b', bgColor: '#f1f5f9', label: 'Task' },
  BULK_UPDATE_APPROVAL: { icon: 'people-outline', color: '#14b8a6', bgColor: '#ccfbf1', label: 'Bulk' },
  EXIT_INTERVIEW_FORM: { icon: 'exit-outline', color: '#f43f5e', bgColor: '#ffe4e6', label: 'Exit' },
};

export default function ActionItemsScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<UnifiedActionItem[]>([]);
  const [counts, setCounts] = useState<ActionItemCounts>({ total: 0, surveys: 0, approvals: 0, timesheets: 0, documents: 0, changeRequests: 0, tasks: 0 });
  const [filter, setFilter] = useState<FilterType>('all');
  const [processing, setProcessing] = useState<string | null>(null);
  const [modal, setModal] = useState<ActionModalState>({ visible: false, item: null, action: null });
  const [declineReason, setDeclineReason] = useState('');
  const [leaveDetails, setLeaveDetails] = useState<LeaveApprovalDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { items: data, counts: itemCounts } = await getUnifiedActionItems();
      setItems(data);
      setCounts(itemCounts);
    } catch (error) {
      console.error('Failed to load action items:', error);
      Alert.alert('Error', 'Failed to load action items. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const handleAction = async (item: UnifiedActionItem, action: 'approve' | 'decline' | 'complete') => {
    setProcessing(item.id);
    
    try {
      switch (item.type) {
        case 'LEAVE_APPROVAL':
          if (action === 'approve') {
            await approveLeaveRequest(item.metadata?.decisionId || item.id);
            Alert.alert('Success', 'Leave request approved');
          } else if (action === 'decline') {
            if (!declineReason.trim()) {
              Alert.alert('Required', 'Please provide a reason for declining');
              setProcessing(null);
              return;
            }
            await declineLeaveRequest(item.metadata?.decisionId || item.id, declineReason);
            Alert.alert('Success', 'Leave request declined');
          }
          break;

        case 'CHANGE_REQUEST':
          if (action === 'approve') {
            await approveChangeRequest(item.metadata?.requestId || item.id);
            Alert.alert('Success', 'Change request approved');
          } else if (action === 'decline') {
            if (!declineReason.trim()) {
              Alert.alert('Required', 'Please provide a reason for declining');
              setProcessing(null);
              return;
            }
            await declineChangeRequest(item.metadata?.requestId || item.id, declineReason);
            Alert.alert('Success', 'Change request declined');
          }
          break;

        case 'TIMESHEET_APPROVAL':
          if (action === 'approve') {
            await approveTimesheet(item.metadata?.timesheetId);
            Alert.alert('Success', 'Timesheet approved');
          } else if (action === 'decline') {
            if (!declineReason.trim()) {
              Alert.alert('Required', 'Please provide a reason for rejecting');
              setProcessing(null);
              return;
            }
            await rejectTimesheet(item.metadata?.timesheetId, declineReason);
            Alert.alert('Success', 'Timesheet rejected');
          }
          break;

        case 'DOCUMENT_ACKNOWLEDGEMENT':
          await acknowledgeDocument(item.metadata?.documentId || item.id);
          Alert.alert('Success', 'Document acknowledged');
          break;

        case 'DOCUMENT_SIGNATURE':
          // For now, open in browser for signature - mobile signature capture would be a future enhancement
          const docUrl = item.metadata?.documentUrl;
          if (docUrl) {
            Alert.alert(
              'Sign Document',
              'Document signing requires the desktop app for the best experience. Would you like to open it in your browser?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open', onPress: () => Linking.openURL(docUrl) },
              ]
            );
          } else {
            Alert.alert('Info', 'Please sign this document on the desktop app for the best experience.');
          }
          setProcessing(null);
          return;

        case 'SURVEY':
          // Navigate to survey completion
          if (item.metadata?.surveyId) {
            navigation.navigate('Surveys', { surveyId: item.metadata.surveyId, actionItemId: item.metadata.actionItemId });
          } else {
            Alert.alert('Error', 'Survey data not available');
          }
          setProcessing(null);
          return;

        case 'EXIT_INTERVIEW_FORM':
          // Open exit interview form
          if (item.metadata?.formLink) {
            Linking.openURL(item.metadata.formLink);
          } else if (item.metadata?.completionTokenHash) {
            Alert.alert('Info', 'Please complete this form on the desktop app.');
          }
          setProcessing(null);
          return;

        default:
          // Generic task completion
          if (action === 'complete') {
            await completeActionItem(item.metadata?.actionItemId || item.id);
            Alert.alert('Success', 'Task completed');
          }
      }

      removeItem(item.id);
      setModal({ visible: false, item: null, action: null });
      setDeclineReason('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Action failed. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const openActionModal = async (item: UnifiedActionItem, action: 'approve' | 'decline' | 'view') => {
    setModal({ visible: true, item, action });
    setDeclineReason('');
    
    // Fetch detailed leave approval information if viewing a leave request
    if (action === 'view' && item.type === 'LEAVE_APPROVAL' && item.metadata?.decisionId) {
      setLoadingDetails(true);
      try {
        const details = await getLeaveApprovalDetails(item.metadata.decisionId);
        setLeaveDetails(details);
      } catch (error) {
        console.error('Failed to load leave details:', error);
        // Continue showing modal even if details fail to load
      } finally {
        setLoadingDetails(false);
      }
    } else {
      setLeaveDetails(null);
    }
  };

  const getFilteredItems = useCallback(() => {
    switch (filter) {
      case 'approvals':
        return items.filter(i => ['LEAVE_APPROVAL', 'TIMESHEET_APPROVAL', 'CHANGE_REQUEST', 'BULK_UPDATE_APPROVAL'].includes(i.type));
      case 'documents':
        return items.filter(i => ['DOCUMENT_SIGNATURE', 'DOCUMENT_ACKNOWLEDGEMENT'].includes(i.type));
      case 'tasks':
        return items.filter(i => ['SURVEY', 'TASK', 'EXIT_INTERVIEW_FORM'].includes(i.type));
      default:
        return items;
    }
  }, [items, filter]);

  const filteredItems = getFilteredItems();

  if (loading) {
    return <LoadingState message="Loading your action items..." />;
  }

  const renderTypeIcon = (type: ActionItemType, size: number = 20) => {
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.TASK;
    return (
      <View style={[styles.typeIconContainer, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon as any} size={size} color={config.color} />
      </View>
    );
  };

  const renderActionItem = (item: UnifiedActionItem) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.TASK;
    const isApprovalType = ['LEAVE_APPROVAL', 'TIMESHEET_APPROVAL', 'CHANGE_REQUEST', 'BULK_UPDATE_APPROVAL'].includes(item.type);
    const isDocumentType = ['DOCUMENT_SIGNATURE', 'DOCUMENT_ACKNOWLEDGEMENT'].includes(item.type);
    const isProcessing = processing === item.id;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.itemCard}
        onPress={() => openActionModal(item, 'view')}
        activeOpacity={0.7}
      >
        <View style={styles.itemContent}>
          {/* Left: Type Icon */}
          <View style={styles.itemLeft}>
            {renderTypeIcon(item.type, 22)}
            {item.urgent && <View style={styles.urgentDot} />}
          </View>

          {/* Center: Content */}
          <View style={styles.itemCenter}>
            <View style={styles.itemTitleRow}>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.typeBadge, { backgroundColor: config.bgColor }]}>
                <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
              </View>
            </View>
            {item.subtitle && (
              <Text style={styles.itemSubtitle} numberOfLines={1}>{item.subtitle}</Text>
            )}
            {item.dueDate && (
              <View style={styles.dueDateRow}>
                <Ionicons name="time-outline" size={12} color="#94a3b8" />
                <Text style={styles.dueDateText}>
                  Due {new Date(item.dueDate).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.itemActions}>
          {isApprovalType ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={() => openActionModal(item, 'decline')}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Ionicons name="close" size={18} color="#ef4444" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={() => handleAction(item, 'approve')}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Ionicons name="checkmark" size={18} color="#10b981" />
                )}
              </TouchableOpacity>
            </>
          ) : isDocumentType ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.primaryBtn]}
              onPress={() => handleAction(item, 'complete')}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{item.actionLabel || 'Review'}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.primaryBtn]}
              onPress={() => handleAction(item, 'complete')}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{item.actionLabel || 'Complete'}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderDeclineModal = () => {
    if (!modal.item || modal.action !== 'decline') return null;
    const config = TYPE_CONFIG[modal.item.type] || TYPE_CONFIG.TASK;

    return (
      <Modal
        visible={modal.visible && modal.action === 'decline'}
        transparent
        animationType="slide"
        onRequestClose={() => setModal({ visible: false, item: null, action: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="close-circle-outline" size={28} color="#ef4444" />
              </View>
              <Text style={styles.modalTitle}>Decline Request</Text>
              <Text style={styles.modalSubtitle}>{modal.item.title}</Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Reason for declining *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Please provide a reason..."
                placeholderTextColor="#94a3b8"
                value={declineReason}
                onChangeText={setDeclineReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModal({ visible: false, item: null, action: null })}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#ef4444' }]}
                onPress={() => handleAction(modal.item!, 'decline')}
                disabled={processing === modal.item?.id}
              >
                {processing === modal.item?.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderDetailModal = () => {
    if (!modal.item || modal.action !== 'view') return null;
    const config = TYPE_CONFIG[modal.item.type] || TYPE_CONFIG.TASK;
    const isApprovalType = ['LEAVE_APPROVAL', 'TIMESHEET_APPROVAL', 'CHANGE_REQUEST', 'BULK_UPDATE_APPROVAL'].includes(modal.item.type);
    const isLeaveApproval = modal.item.type === 'LEAVE_APPROVAL';

    return (
      <Modal
        visible={modal.visible && modal.action === 'view'}
        transparent
        animationType="slide"
        onRequestClose={() => setModal({ visible: false, item: null, action: null })}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={[styles.modalIcon, { backgroundColor: config.bgColor }]}>
                  <Ionicons name={config.icon as any} size={28} color={config.color} />
                </View>
                <Text style={styles.modalTitle}>{modal.item.title}</Text>
                {modal.item.subtitle && (
                  <Text style={styles.modalSubtitle}>{modal.item.subtitle}</Text>
                )}
              </View>

              <View style={styles.modalBody}>
                {loadingDetails && isLeaveApproval ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Loading details...</Text>
                  </View>
                ) : isLeaveApproval && leaveDetails ? (
                  // Enhanced leave approval details
                  <>
                    {/* Employee Info */}
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Employee</Text>
                      <View style={styles.employeeCard}>
                        <Text style={styles.employeeName}>{leaveDetails.employee.name}</Text>
                        <Text style={styles.employeeEmail}>{leaveDetails.employee.email}</Text>
                        {leaveDetails.employee.department && (
                          <View style={styles.departmentBadge}>
                            <Ionicons name="business-outline" size={12} color="#64748b" />
                            <Text style={styles.departmentText}>{leaveDetails.employee.department}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Leave Details */}
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Leave Details</Text>
                      <View style={styles.leaveDetailsCard}>
                        <View style={styles.leaveTypeRow}>
                          <View style={[styles.leaveTypeDot, { backgroundColor: leaveDetails.leaveType.color || '#10b981' }]} />
                          <Text style={styles.leaveTypeName}>{leaveDetails.leaveType.name}</Text>
                          <View style={styles.daysBadge}>
                            <Text style={styles.daysText}>{leaveDetails.dates.requestedDays} {leaveDetails.dates.requestedDays === 1 ? 'day' : 'days'}</Text>
                          </View>
                        </View>
                        <View style={styles.datesRow}>
                          <Text style={styles.dateText}>{new Date(leaveDetails.dates.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                          <Ionicons name="arrow-forward" size={14} color="#94a3b8" />
                          <Text style={styles.dateText}>{new Date(leaveDetails.dates.end).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Reason */}
                    {leaveDetails.reason && (
                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Reason</Text>
                        <View style={styles.reasonCard}>
                          <Text style={styles.reasonText}>{leaveDetails.reason}</Text>
                        </View>
                      </View>
                    )}

                    {/* Balance Impact */}
                    {leaveDetails.balance && (
                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Balance Impact</Text>
                        <View style={styles.balanceCard}>
                          <View style={styles.balanceGrid}>
                            <View style={styles.balanceItem}>
                              <Text style={styles.balanceLabel}>Allowance</Text>
                              <Text style={styles.balanceValue}>{leaveDetails.balance.totalDays}</Text>
                            </View>
                            <View style={styles.balanceItem}>
                              <Text style={styles.balanceLabel}>Used</Text>
                              <Text style={styles.balanceValue}>{leaveDetails.dates.requestedDays}</Text>
                            </View>
                            <View style={styles.balanceItem}>
                              <Text style={styles.balanceLabel}>Current</Text>
                              <Text style={[styles.balanceValue, styles.balanceCurrent]}>{leaveDetails.balance.remainingDays}</Text>
                            </View>
                            <View style={styles.balanceItem}>
                              <Text style={styles.balanceLabel}>After</Text>
                              <Text style={[styles.balanceValue, leaveDetails.balance.remainingAfterApproval < 0 ? styles.balanceNegative : styles.balancePositive]}>
                                {leaveDetails.balance.remainingAfterApproval}
                              </Text>
                            </View>
                          </View>
                          {leaveDetails.balance.remainingAfterApproval < 0 && (
                            <View style={styles.warningBox}>
                              <Ionicons name="warning-outline" size={16} color="#ef4444" />
                              <Text style={styles.warningText}>
                                Approving will result in {Math.abs(leaveDetails.balance.remainingAfterApproval)} days deficit
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Team Overlap */}
                    {leaveDetails.departmentColleagues.length > 0 ? (
                      <View style={styles.detailSection}>
                        <View style={styles.sectionTitleRow}>
                          <Text style={styles.sectionTitle}>Team Overlap</Text>
                          <View style={styles.overlapBadge}>
                            <Text style={styles.overlapCount}>{leaveDetails.departmentColleagues.length}</Text>
                          </View>
                        </View>
                        <View style={styles.colleaguesCard}>
                          {leaveDetails.departmentColleagues.slice(0, 5).map((colleague) => (
                            <View key={colleague.id} style={styles.colleagueRow}>
                              <View style={styles.colleagueInfo}>
                                <Text style={styles.colleagueName}>{colleague.name}</Text>
                                <View style={styles.colleagueLeaveType}>
                                  <View style={[styles.colleagueDot, { backgroundColor: colleague.leaveColor || '#10b981' }]} />
                                  <Text style={styles.colleagueLeaveText}>{colleague.leaveType}</Text>
                                </View>
                              </View>
                              <Text style={styles.colleagueDates}>
                                {new Date(colleague.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(colleague.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </Text>
                            </View>
                          ))}
                          {leaveDetails.departmentColleagues.length > 5 && (
                            <Text style={styles.moreColleagues}>+{leaveDetails.departmentColleagues.length - 5} more</Text>
                          )}
                        </View>
                      </View>
                    ) : leaveDetails.employee.department ? (
                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Team Overlap</Text>
                        <View style={styles.noOverlapCard}>
                          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                          <Text style={styles.noOverlapText}>No other team members off</Text>
                        </View>
                      </View>
                    ) : null}
                  </>
                ) : (
                  // Standard details for non-leave items
                  <>
                    {modal.item.description && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Description</Text>
                        <Text style={styles.detailValue}>{modal.item.description}</Text>
                      </View>
                    )}
                    
                    {modal.item.type === 'LEAVE_APPROVAL' && modal.item.metadata && (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Employee</Text>
                          <Text style={styles.detailValue}>{modal.item.metadata.employeeName}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Leave Type</Text>
                          <Text style={styles.detailValue}>{modal.item.metadata.leaveType}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Dates</Text>
                          <Text style={styles.detailValue}>
                            {new Date(modal.item.metadata.startDate).toLocaleDateString()} - {new Date(modal.item.metadata.endDate).toLocaleDateString()}
                          </Text>
                        </View>
                      </>
                    )}

                    {modal.item.type === 'CHANGE_REQUEST' && modal.item.metadata && (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Employee</Text>
                          <Text style={styles.detailValue}>{modal.item.metadata.employeeName}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Section</Text>
                          <Text style={styles.detailValue}>{modal.item.metadata.section}</Text>
                        </View>
                      </>
                    )}

                    {modal.item.dueDate && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Due Date</Text>
                        <Text style={[styles.detailValue, modal.item.urgent && styles.urgentText]}>
                          {new Date(modal.item.dueDate).toLocaleDateString()}
                          {modal.item.urgent && ' (Urgent)'}
                        </Text>
                      </View>
                    )}

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Priority</Text>
                      <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(modal.item.priority) + '20' }]}>
                        <Text style={[styles.priorityText, { color: getPriorityColor(modal.item.priority) }]}>
                          {modal.item.priority}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setModal({ visible: false, item: null, action: null })}
                >
                  <Text style={styles.modalCancelText}>Close</Text>
                </TouchableOpacity>
                
                {isApprovalType ? (
                  <>
                    <TouchableOpacity
                      style={[styles.modalConfirmBtn, { backgroundColor: '#ef4444', flex: 1, marginRight: 8 }]}
                      onPress={() => {
                        setModal({ ...modal, action: 'decline' });
                      }}
                    >
                      <Text style={styles.modalConfirmText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalConfirmBtn, { backgroundColor: '#10b981', flex: 1 }]}
                      onPress={() => handleAction(modal.item!, 'approve')}
                      disabled={processing === modal.item?.id}
                    >
                      {processing === modal.item?.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.modalConfirmText}>Approve</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, { backgroundColor: config.color }]}
                    onPress={() => handleAction(modal.item!, 'complete')}
                    disabled={processing === modal.item?.id}
                  >
                    {processing === modal.item?.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.modalConfirmText}>{modal.item.actionLabel || 'Complete'}</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Action Items</Text>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>{counts.total}</Text>
          </View>
        </View>
        
        {/* Category Pills */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          <TouchableOpacity
            style={[styles.categoryPill, filter === 'all' && styles.categoryPillActive]}
            onPress={() => setFilter('all')}
          >
            <Ionicons name="apps-outline" size={16} color={filter === 'all' ? '#fff' : '#64748b'} />
            <Text style={[styles.categoryPillText, filter === 'all' && styles.categoryPillTextActive]}>
              All ({counts.total})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.categoryPill, filter === 'approvals' && styles.categoryPillActive]}
            onPress={() => setFilter('approvals')}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={filter === 'approvals' ? '#fff' : '#64748b'} />
            <Text style={[styles.categoryPillText, filter === 'approvals' && styles.categoryPillTextActive]}>
              Approvals ({counts.approvals + counts.timesheets + counts.changeRequests})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.categoryPill, filter === 'documents' && styles.categoryPillActive]}
            onPress={() => setFilter('documents')}
          >
            <Ionicons name="document-outline" size={16} color={filter === 'documents' ? '#fff' : '#64748b'} />
            <Text style={[styles.categoryPillText, filter === 'documents' && styles.categoryPillTextActive]}>
              Documents ({counts.documents})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.categoryPill, filter === 'tasks' && styles.categoryPillActive]}
            onPress={() => setFilter('tasks')}
          >
            <Ionicons name="checkbox-outline" size={16} color={filter === 'tasks' ? '#fff' : '#64748b'} />
            <Text style={[styles.categoryPillText, filter === 'tasks' && styles.categoryPillTextActive]}>
              Tasks ({counts.surveys + counts.tasks})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Items List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
      >
        {filteredItems.length === 0 ? (
          <EmptyState
            icon="checkmark-done-outline"
            title="All caught up!"
            description={
              filter === 'all'
                ? 'You have no pending action items'
                : `No ${filter} items pending`
            }
          />
        ) : (
          filteredItems.map(renderActionItem)
        )}
        
        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Modals */}
      {renderDeclineModal()}
      {renderDetailModal()}
    </View>
  );
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'URGENT': return '#ef4444';
    case 'HIGH': return '#f59e0b';
    case 'MEDIUM': return '#3b82f6';
    case 'LOW': return '#64748b';
    default: return '#64748b';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  totalBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  totalBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  categoryPillActive: {
    backgroundColor: '#3b82f6',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryPillTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  itemContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  itemLeft: {
    position: 'relative',
    marginRight: 12,
  },
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
  itemCenter: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    marginTop: 4,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  declineBtn: {
    backgroundColor: '#fef2f2',
  },
  approveBtn: {
    backgroundColor: '#f0fdf4',
  },
  primaryBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  modalBody: {
    padding: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#0f172a',
    minHeight: 100,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  urgentText: {
    color: '#ef4444',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  detailSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  employeeCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  departmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  departmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  leaveDetailsCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  leaveTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  leaveTypeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  leaveTypeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  daysBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369a1',
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  reasonCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reasonText: {
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
  balanceCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  balanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  balanceCurrent: {
    color: '#0ea5e9',
  },
  balancePositive: {
    color: '#10b981',
  },
  balanceNegative: {
    color: '#ef4444',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '500',
  },
  overlapBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  overlapCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },
  colleaguesCard: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  colleagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 6,
  },
  colleagueInfo: {
    flex: 1,
    marginRight: 8,
  },
  colleagueName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  colleagueLeaveType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  colleagueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  colleagueLeaveText: {
    fontSize: 12,
    color: '#64748b',
  },
  colleagueDates: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  moreColleagues: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '600',
    paddingVertical: 8,
  },
  noOverlapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  noOverlapText: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '500',
  },
});
