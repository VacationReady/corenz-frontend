import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import Card from '../../components/Card';
import Badge from '../../components/Badge';
import LoadingState from '../../components/LoadingState';
import { getMyFullProfile, getEmployeeById, getUserRole, EmployeeProfile } from '../../api/profile';

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
  color: string;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  {
    id: 'personal',
    title: 'Personal Information',
    subtitle: 'Name, contact details, address',
    icon: 'person-outline',
    screen: 'PersonalInfo',
    color: '#3b82f6',
  },
  {
    id: 'employment',
    title: 'Employment Details',
    subtitle: 'Job role, department, start date',
    icon: 'briefcase-outline',
    screen: 'EmploymentDetails',
    color: '#8b5cf6',
  },
  {
    id: 'emergency',
    title: 'Emergency Contacts',
    subtitle: 'Emergency contact information',
    icon: 'call-outline',
    screen: 'EmergencyContacts',
    color: '#ef4444',
  },
  {
    id: 'bank',
    title: 'Bank & Payroll',
    subtitle: 'Bank account, tax, KiwiSaver',
    icon: 'card-outline',
    screen: 'BankPayroll',
    color: '#10b981',
    adminOnly: true,
  },
  {
    id: 'leave',
    title: 'Leave Balances',
    subtitle: 'Annual leave, sick leave, other',
    icon: 'calendar-outline',
    screen: 'LeaveBalances',
    color: '#f59e0b',
  },
  {
    id: 'documents',
    title: 'Documents',
    subtitle: 'Contracts, policies, certificates',
    icon: 'document-text-outline',
    screen: 'Documents',
    color: '#06b6d4',
  },
];

export default function ProfileOverviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = route.params as { employeeId?: string; isOwnProfile?: boolean } | undefined;
  
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState({ role: 'EMPLOYEE', isAdmin: false, isManager: false });

  const isOwnProfile = params?.isOwnProfile !== false;
  const employeeIdParam = params?.employeeId;

  const loadData = useCallback(async () => {
    try {
      const [roleData, profileData] = await Promise.all([
        getUserRole(),
        employeeIdParam ? getEmployeeById(employeeIdParam) : getMyFullProfile(),
      ]);
      
      setUserRole(roleData);
      setProfile(profileData);
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeIdParam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        loadData();
      }
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleMenuPress = (item: MenuItem) => {
    if (!profile) return;
    
    const canEdit = userRole.isAdmin || (isOwnProfile && item.id !== 'bank');
    
    navigation.navigate(item.screen, {
      employeeId: profile.id,
      canEdit,
    } as any);
  };

  const handleCall = async (phone: string) => {
    const url = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  const handleEmail = async (email: string) => {
    const url = `mailto:${email}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const getAvatarUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;
    if (!baseUrl) return null;
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  if (loading) {
    return <LoadingState message="Loading profile..." />;
  }

  if (!profile || !profile.User) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Profile not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fullName = `${profile.User.firstName || ''} ${profile.User.lastName || ''}`.trim() || 'Unknown';
  const avatarUrl = getAvatarUrl(profile.User.profileImageUrl);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Profile Header */}
      <LinearGradient
        colors={['#3b82f6', '#1d4ed8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{getInitials(profile.User.firstName, profile.User.lastName)}</Text>
            </View>
          )}
          <Badge
            text={profile.isActive ? 'Active' : 'Inactive'}
            variant={profile.isActive ? 'success' : 'neutral'}
            size="small"
            style={styles.statusBadge}
          />
        </View>
        
        <Text style={styles.name}>{fullName}</Text>
        {profile.jobTitle && <Text style={styles.jobTitle}>{profile.jobTitle}</Text>}
        
        <View style={styles.headerMeta}>
          {profile.Department && (
            <View style={styles.metaItem}>
              <Ionicons name="business-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.metaText}>{profile.Department.name}</Text>
            </View>
          )}
          {profile.siteLocation && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.metaText}>{profile.siteLocation}</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {profile.User.phone && (
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => handleCall(profile.User.phone!)}
            >
              <Ionicons name="call" size={20} color="#3b82f6" />
            </TouchableOpacity>
          )}
          {profile.User.email && (
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => handleEmail(profile.User.email!)}
            >
              <Ionicons name="mail" size={20} color="#3b82f6" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Contact Info Card */}
      <View style={styles.content}>
        <Card style={styles.contactCard}>
          <Text style={styles.cardTitle}>Contact Information</Text>
          
          {profile.User.email && (
            <TouchableOpacity style={styles.contactRow} onPress={() => handleEmail(profile.User.email!)}>
              <View style={[styles.contactIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="mail-outline" size={20} color="#3b82f6" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{profile.User.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
          
          {profile.User.phone && (
            <TouchableOpacity style={styles.contactRow} onPress={() => handleCall(profile.User.phone!)}>
              <View style={[styles.contactIcon, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="call-outline" size={20} color="#10b981" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{profile.User.phone}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </Card>

        {/* Menu Items */}
        <Text style={styles.sectionTitle}>Profile Sections</Text>
        
        {menuItems
          .filter(item => !item.adminOnly || userRole.isAdmin || isOwnProfile)
          .map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
          ))}

        {/* Role Badge for Admins */}
        {userRole.isAdmin && !isOwnProfile && (
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#8b5cf6" />
            <Text style={styles.adminBadgeText}>Viewing as Administrator</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  headerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 16,
    marginTop: -16,
  },
  contactCard: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  adminBadgeText: {
    fontSize: 13,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
