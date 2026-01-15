import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyTeam, getAllEmployees, Employee } from '../api/team';
import Card from '../components/Card';
import Badge from '../components/Badge';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

export default function TeamScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'team' | 'directory'>('team');

  const loadData = async () => {
    try {
      if (view === 'team') {
        const teamData = await getMyTeam();
        setEmployees(teamData);
        setFilteredEmployees(teamData);
      } else {
        const allData = await getAllEmployees({ status: 'active' });
        setEmployees(allData);
        setFilteredEmployees(allData);
      }
    } catch (error) {
      console.error('Failed to load team data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [view]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = employees.filter(
        (emp) =>
          emp.firstName.toLowerCase().includes(query) ||
          emp.lastName.toLowerCase().includes(query) ||
          emp.email?.toLowerCase().includes(query) ||
          emp.jobTitle?.toLowerCase().includes(query) ||
          emp.department?.toLowerCase().includes(query)
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [searchQuery, employees]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleEmail = async (email: string) => {
    const url = `mailto:${email}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to open email app');
    }
  };

  const handleCall = async (phone: string) => {
    const url = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to make phone call');
    }
  };

  const handleMessage = async (phone: string) => {
    const url = `sms:${phone}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to open messaging app');
    }
  };

  const getAvatarUrl = (profileImage?: string) => {
    if (!profileImage) return null;
    if (profileImage.startsWith('http')) return profileImage;
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;
    if (!baseUrl) return null;
    return `${baseUrl}${profileImage.startsWith('/') ? '' : '/'}${profileImage}`;
  };

  if (loading) {
    return <LoadingState message="Loading team members..." />;
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'onLeave':
        return 'warning';
      case 'inactive':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'onLeave':
        return 'On Leave';
      case 'inactive':
        return 'Inactive';
      default:
        return status;
    }
  };

  return (
    <View style={styles.container}>
      {/* View Toggle */}
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, view === 'team' && styles.tabActive]}
            onPress={() => setView('team')}
          >
            <Text style={[styles.tabText, view === 'team' && styles.tabTextActive]}>
              My Team
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, view === 'directory' && styles.tabActive]}
            onPress={() => setView('directory')}
          >
            <Text style={[styles.tabText, view === 'directory' && styles.tabTextActive]}>
              Directory
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employees..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredEmployees.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No employees found"
            description={
              searchQuery
                ? 'Try adjusting your search'
                : view === 'team'
                ? 'Your team members will appear here'
                : 'No employees in directory'
            }
          />
        ) : (
          filteredEmployees.map((employee) => (
            <Card key={employee.id}>
              <View style={styles.employeeCard}>
                <View style={styles.employeeLeft}>
                  {getAvatarUrl(employee.profileImage) ? (
                    <Image source={{ uri: getAvatarUrl(employee.profileImage)! }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {getInitials(employee.firstName, employee.lastName)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>
                      {employee.firstName} {employee.lastName}
                    </Text>
                    {employee.jobTitle && (
                      <Text style={styles.employeeTitle}>{employee.jobTitle}</Text>
                    )}
                    {employee.department && (
                      <View style={styles.employeeDepartment}>
                        <Ionicons name="briefcase-outline" size={14} color="#64748b" />
                        <Text style={styles.employeeDepartmentText}>{employee.department}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.employeeRight}>
                  <Badge
                    text={getStatusLabel(employee.status)}
                    variant={getStatusVariant(employee.status)}
                    size="small"
                  />
                </View>
              </View>

              {/* Contact Actions */}
              <View style={styles.contactActions}>
                {employee.email && (
                  <TouchableOpacity 
                    style={styles.contactButton}
                    onPress={() => handleEmail(employee.email!)}
                  >
                    <Ionicons name="mail-outline" size={20} color="#3b82f6" />
                    <Text style={styles.contactButtonText}>Email</Text>
                  </TouchableOpacity>
                )}
                {employee.phone && (
                  <TouchableOpacity 
                    style={styles.contactButton}
                    onPress={() => handleCall(employee.phone!)}
                  >
                    <Ionicons name="call-outline" size={20} color="#3b82f6" />
                    <Text style={styles.contactButtonText}>Call</Text>
                  </TouchableOpacity>
                )}
                {employee.phone && (
                  <TouchableOpacity 
                    style={styles.contactButton}
                    onPress={() => handleMessage(employee.phone!)}
                  >
                    <Ionicons name="chatbubble-outline" size={20} color="#3b82f6" />
                    <Text style={styles.contactButtonText}>Message</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
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
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#0f172a',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  employeeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  employeeLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  employeeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  employeeTitle: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  employeeDepartment: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeDepartmentText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 4,
  },
  employeeRight: {
    marginLeft: 8,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 6,
  },
});
