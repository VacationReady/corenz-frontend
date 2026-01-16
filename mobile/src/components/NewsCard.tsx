import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NewsPost } from '../api/news';

interface NewsCardProps {
  post: NewsPost;
  onPress: () => void;
  variant?: 'featured' | 'compact' | 'list';
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function NewsCard({ post, onPress, variant = 'featured' }: NewsCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NZ', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  if (variant === 'featured') {
    return (
      <TouchableOpacity
        style={styles.featuredCard}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={styles.featuredImageContainer}>
          {post.coverImage ? (
            <Image
              source={{ uri: post.coverImage }}
              style={styles.featuredImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={['#6366f1', '#8b5cf6', '#a855f7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.featuredGradient}
            >
              <Ionicons name="newspaper-outline" size={48} color="rgba(255,255,255,0.3)" />
            </LinearGradient>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.featuredOverlay}
          />
          <View style={styles.featuredContent}>
            {post.pinned && (
              <View style={styles.pinnedBadge}>
                <Text style={styles.pinnedText}>📌 Pinned</Text>
              </View>
            )}
            <Text style={styles.featuredTitle} numberOfLines={2}>
              {post.title}
            </Text>
            {post.preview && (
              <Text style={styles.featuredPreview} numberOfLines={2}>
                {post.preview}
              </Text>
            )}
            <View style={styles.featuredMeta}>
              <Text style={styles.featuredDate}>
                {formatTimeAgo(post.publishedAt || post.createdAt)}
              </Text>
              <View style={styles.readMoreContainer}>
                <Text style={styles.readMoreText}>Read more</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {post.coverImage ? (
          <Image
            source={{ uri: post.coverImage }}
            style={styles.compactImage}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.compactImagePlaceholder}
          >
            <Ionicons name="newspaper-outline" size={20} color="rgba(255,255,255,0.5)" />
          </LinearGradient>
        )}
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={2}>
            {post.title}
          </Text>
          <Text style={styles.compactDate}>
            {formatTimeAgo(post.publishedAt || post.createdAt)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>
    );
  }

  // List variant
  return (
    <TouchableOpacity
      style={styles.listCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.listContent}>
        <View style={styles.listHeader}>
          {post.pinned && (
            <View style={styles.listPinnedBadge}>
              <Text style={styles.listPinnedText}>📌</Text>
            </View>
          )}
          <Text style={styles.listDate}>
            {formatTimeAgo(post.publishedAt || post.createdAt)}
          </Text>
        </View>
        <Text style={styles.listTitle} numberOfLines={2}>
          {post.title}
        </Text>
        {post.preview && (
          <Text style={styles.listPreview} numberOfLines={2}>
            {post.preview}
          </Text>
        )}
        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {post.tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {post.coverImage && (
        <Image
          source={{ uri: post.coverImage }}
          style={styles.listImage}
          resizeMode="cover"
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Featured variant styles
  featuredCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  featuredImageContainer: {
    height: 200,
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  featuredContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  pinnedBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  pinnedText: {
    color: '#78350f',
    fontSize: 11,
    fontWeight: '700',
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 26,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  featuredPreview: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
    marginBottom: 10,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readMoreText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },

  // Compact variant styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 10,
  },
  compactImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  compactImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 19,
    marginBottom: 4,
  },
  compactDate: {
    fontSize: 12,
    color: '#64748b',
  },

  // List variant styles
  listCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  listContent: {
    flex: 1,
    marginRight: 12,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  listPinnedBadge: {
    marginRight: 6,
  },
  listPinnedText: {
    fontSize: 12,
  },
  listDate: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 22,
    marginBottom: 6,
  },
  listPreview: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 8,
  },
  listImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '600',
  },
});
