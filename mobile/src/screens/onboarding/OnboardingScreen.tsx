import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getOnboardingStatus,
  OnboardingInstance,
  OnboardingStep,
  OnboardingStatus,
} from '../../api/onboarding';
import OnboardingStepCard from '../../components/onboarding/OnboardingStepCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingScreenProps {
  employeeId: string;
  employeeName?: string;
  onComplete: () => void;
  onLogout: () => void;
}

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

export default function OnboardingScreen({
  employeeId,
  employeeName = 'there',
  onComplete,
  onLogout,
}: OnboardingScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [completingStep, setCompletingStep] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const fetchOnboarding = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await getOnboardingStatus(employeeId);
      setStatus(result);
      
      if (result.hasOnboarding && result.instance) {
        const steps = result.instance.steps;
        const firstIncomplete = steps.findIndex(s => s.status !== 'completed');
        setActiveStepIndex(firstIncomplete >= 0 ? firstIncomplete : steps.length - 1);
        
        // Animate progress bar
        const percent = result.progress?.percent || 0;
        Animated.spring(progressAnim, {
          toValue: percent / 100,
          useNativeDriver: false,
          friction: 8,
        }).start();
        
        // Check if just completed
        if (result.isComplete) {
          triggerCelebration();
        }
      } else if (!result.hasOnboarding || result.isComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('[OnboardingScreen] Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeId, onComplete, progressAnim]);

  useEffect(() => {
    fetchOnboarding();
  }, [fetchOnboarding]);

  const triggerCelebration = () => {
    setShowCelebration(true);
    Animated.sequence([
      Animated.timing(celebrationAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
    ]).start(() => {
      onComplete();
    });
  };

  const handleStepComplete = useCallback(async () => {
    await fetchOnboarding(true);
  }, [fetchOnboarding]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOnboarding(true);
  }, [fetchOnboarding]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading your onboarding...</Text>
      </SafeAreaView>
    );
  }

  if (!status?.instance) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="alert-circle" size={64} color="#F59E0B" />
        <Text style={styles.errorTitle}>No Onboarding Found</Text>
        <Text style={styles.errorText}>
          Your onboarding hasn't been set up yet. Please contact your HR team.
        </Text>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { instance, progress } = status;
  const steps = instance.steps.sort((a, b) => a.order - b.order);
  const activeStep = steps[activeStepIndex];
  const completedCount = progress?.completed || 0;
  const totalSteps = progress?.total || steps.length;
  const percent = progress?.percent || 0;

  if (showCelebration) {
    return (
      <SafeAreaView style={styles.celebrationContainer}>
        <LinearGradient
          colors={['#059669', '#10B981', '#34D399']}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.celebrationContent,
            {
              opacity: celebrationAnim,
              transform: [
                {
                  scale: celebrationAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.celebrationIcon}>
            <Ionicons name="trophy" size={80} color="#FCD34D" />
          </View>
          <Text style={styles.celebrationTitle}>🎉 You're All Set!</Text>
          <Text style={styles.celebrationText}>
            Congratulations, {employeeName}! You've completed all your onboarding tasks.
          </Text>
          <Text style={styles.celebrationSubtext}>Welcome to the team!</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Hi, {employeeName}!</Text>
            <Text style={styles.headerSubtitle}>
              Complete your onboarding tasks to get started
            </Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutIcon}>
            <Ionicons name="log-out-outline" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
      >
        {/* Active Step Card */}
        {activeStep && (
          <OnboardingStepCard
            step={activeStep}
            employeeId={employeeId}
            isCompleting={completingStep === (activeStep.instanceStepId || activeStep.id)}
            onComplete={handleStepComplete}
            onStartComplete={() => setCompletingStep(activeStep.instanceStepId || activeStep.id)}
            onEndComplete={() => setCompletingStep(null)}
          />
        )}

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{percent}% Complete</Text>
            <Text style={styles.progressCount}>
              {completedCount} of {totalSteps} tasks
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>

        {/* Step Timeline */}
        <View style={styles.timeline}>
          {steps.map((step, index) => {
            const isActive = index === activeStepIndex;
            const isCompleted = step.status === 'completed';
            const isPending = !isActive && !isCompleted;
            const colors = STEP_COLORS[step.type] || ['#64748B', '#475569'];
            const icon = STEP_ICONS[step.type] || 'ellipse';

            return (
              <TouchableOpacity
                key={step.id}
                style={[
                  styles.timelineItem,
                  isActive && styles.timelineItemActive,
                ]}
                onPress={() => {
                  if (isCompleted || index <= activeStepIndex) {
                    setActiveStepIndex(index);
                  }
                }}
                disabled={isPending && index > activeStepIndex}
              >
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineIcon,
                      isCompleted && styles.timelineIconCompleted,
                      isActive && { backgroundColor: colors[0] },
                      isPending && styles.timelineIconPending,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    ) : (
                      <Ionicons
                        name={icon}
                        size={16}
                        color={isActive ? '#fff' : '#64748B'}
                      />
                    )}
                  </View>
                  {index < steps.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        isCompleted && styles.timelineLineCompleted,
                      ]}
                    />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text
                    style={[
                      styles.timelineLabel,
                      isActive && styles.timelineLabelActive,
                      isCompleted && styles.timelineLabelCompleted,
                    ]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                  <Text style={styles.timelineStatus}>
                    {isCompleted ? 'Completed' : isActive ? 'In Progress' : 'Pending'}
                  </Text>
                </View>
                {isActive && (
                  <View style={[styles.activeIndicator, { backgroundColor: colors[0] }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  errorText: {
    marginTop: 8,
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoutIcon: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  progressSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressCount: {
    fontSize: 13,
    color: '#64748B',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  timeline: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 2,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  timelineItemActive: {
    backgroundColor: '#F1F5F9',
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  timelineIconCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  timelineIconPending: {
    opacity: 0.5,
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  timelineLineCompleted: {
    backgroundColor: '#10B981',
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  timelineLabelActive: {
    color: '#0F172A',
  },
  timelineLabelCompleted: {
    color: '#10B981',
  },
  timelineStatus: {
    fontSize: 11,
    color: '#94A3B8',
  },
  activeIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  bottomSpacer: {
    height: 40,
  },
  celebrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationContent: {
    alignItems: 'center',
    padding: 32,
  },
  celebrationIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  celebrationTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  celebrationText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 8,
  },
  celebrationSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
