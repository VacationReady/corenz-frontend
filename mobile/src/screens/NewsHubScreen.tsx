import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getNewsPosts, NewsPost } from '../api/news';
import NewsCard from '../components/NewsCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export default function NewsHubScreen() {
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadNews = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum > 1) {
        setLoadingMore(true);
      }

      const response = await getNewsPosts(10, pageNum);
      
      if (refresh || pageNum === 1) {
        setPosts(response.posts);
      } else {
        setPosts(prev => [...prev, ...response.posts]);
      }
      
      setHasMore(response.pagination.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadNews(1);
  }, [loadNews]);

  const onRefresh = useCallback(() => {
    loadNews(1, true);
  }, [loadNews]);

  const onLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadNews(page + 1);
    }
  }, [loadNews, loadingMore, hasMore, page]);

  const handlePostPress = (post: NewsPost) => {
    // Navigate to the news detail screen within the app
    navigation.navigate('NewsDetail', { slug: post.slug });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerIcon}>
          <Ionicons name="newspaper" size={24} color="#3b82f6" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Company News</Text>
          <Text style={styles.headerSubtitle}>
            Stay updated with the latest announcements
          </Text>
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item, index }: { item: NewsPost; index: number }) => (
    <View style={styles.cardContainer}>
      <NewsCard
        post={item}
        onPress={() => handlePostPress(item)}
        variant={index === 0 && item.pinned ? 'featured' : 'list'}
      />
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <EmptyState
      icon="newspaper-outline"
      title="No News Yet"
      description="Check back later for company updates and announcements"
    />
  );

  if (loading) {
    return <LoadingState message="Loading news..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    paddingBottom: 24,
  },
  header: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  cardContainer: {
    paddingHorizontal: 16,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#64748b',
  },
});
