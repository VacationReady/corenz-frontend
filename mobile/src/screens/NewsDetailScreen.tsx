import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiClient } from '../api/client';
import LoadingState from '../components/LoadingState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NewsDetailPost {
  id: string;
  title: string;
  slug: string;
  content: any;
  coverImage?: string | null;
  videoEmbedUrl?: string | null;
  attachments: string[];
  author: {
    id: string;
    name: string | null;
    email: string;
    avatar?: string | null;
    role?: string;
  };
  tags: string[];
  pinned: boolean;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  readTime?: number;
  views?: number;
  reactions?: Record<string, number>;
  bookmarkCount?: number;
  isBookmarked?: boolean;
  userReaction?: string | null;
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  coverImage?: string | null;
  publishedAt: Date | string | null;
  tags: string[];
}

const reactionEmojis = [
  { id: 'like', emoji: '👍', label: 'Like' },
  { id: 'heart', emoji: '❤️', label: 'Love' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'clap', emoji: '👏', label: 'Clap' },
  { id: 'thinking', emoji: '🤔', label: 'Thinking' },
  { id: 'celebrate', emoji: '🎉', label: 'Celebrate' },
];

export default function NewsDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { slug } = route.params;

  const [post, setPost] = useState<NewsDetailPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const loadNewsDetail = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      const { data } = await apiClient.get(`/api/news/${slug}`);
      setPost(data.post);
      setRelatedPosts(data.relatedPosts || []);
    } catch (error) {
      console.error('Failed to load news detail:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNewsDetail();
  }, [slug]);

  const handleReaction = async (reactionId: string) => {
    if (!post) return;

    const previousReaction = post.userReaction;
    const isRemoving = previousReaction === reactionId;

    // Optimistic update
    const optimisticReactions = { ...post.reactions };
    if (previousReaction) {
      optimisticReactions[previousReaction] = Math.max(
        (optimisticReactions[previousReaction] ?? 1) - 1,
        0
      );
    }
    if (!isRemoving) {
      optimisticReactions[reactionId] = (optimisticReactions[reactionId] ?? 0) + 1;
    }

    setPost({
      ...post,
      userReaction: isRemoving ? null : reactionId,
      reactions: optimisticReactions,
    });
    setShowReactions(false);

    try {
      await apiClient({
        url: `/api/news/${slug}/reaction`,
        method: isRemoving ? 'DELETE' : 'POST',
        data: isRemoving ? undefined : { reaction: reactionId },
      });
    } catch (error) {
      // Revert on error
      setPost({
        ...post,
        userReaction: previousReaction,
        reactions: post.reactions,
      });
      console.error('Failed to update reaction:', error);
    }
  };

  const handleBookmark = async () => {
    if (!post) return;

    const previousState = post.isBookmarked;
    const previousCount = post.bookmarkCount ?? 0;

    // Optimistic update
    setPost({
      ...post,
      isBookmarked: !previousState,
      bookmarkCount: previousState ? Math.max(previousCount - 1, 0) : previousCount + 1,
    });

    try {
      await apiClient.post(`/api/news/${slug}/bookmark`);
    } catch (error) {
      // Revert on error
      setPost({
        ...post,
        isBookmarked: previousState,
        bookmarkCount: previousCount,
      });
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post?.title}\n\n${process.env.EXPO_PUBLIC_API_BASE_URL}/news/${slug}`,
        title: post?.title,
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleRelatedPostPress = (relatedSlug: string) => {
    navigation.push('NewsDetail', { slug: relatedSlug });
  };

  const handleAttachmentPress = (url: string) => {
    Linking.openURL(url).catch(err => {
      console.error('Failed to open attachment:', err);
    });
  };

  const renderContent = (content: any) => {
    if (!content) return null;

    // Handle TipTap JSON content
    if (typeof content === 'object' && content.type === 'doc' && Array.isArray(content.content)) {
      return content.content.map((node: any, index: number) => {
        if (node.type === 'paragraph') {
          const text = node.content?.map((c: any) => c.text).join('') || '';
          return (
            <Text key={index} style={styles.contentText}>
              {text}
            </Text>
          );
        }
        if (node.type === 'heading') {
          const text = node.content?.map((c: any) => c.text).join('') || '';
          const level = node.attrs?.level || 1;
          return (
            <Text
              key={index}
              style={[
                styles.contentHeading,
                level === 1 && styles.contentHeading1,
                level === 2 && styles.contentHeading2,
                level === 3 && styles.contentHeading3,
              ]}
            >
              {text}
            </Text>
          );
        }
        if (node.type === 'bulletList' || node.type === 'orderedList') {
          return (
            <View key={index} style={styles.listContainer}>
              {node.content?.map((listItem: any, liIndex: number) => {
                const text = listItem.content?.[0]?.content?.map((c: any) => c.text).join('') || '';
                return (
                  <View key={liIndex} style={styles.listItem}>
                    <Text style={styles.listBullet}>
                      {node.type === 'orderedList' ? `${liIndex + 1}.` : '•'}
                    </Text>
                    <Text style={styles.listText}>{text}</Text>
                  </View>
                );
              })}
            </View>
          );
        }
        return null;
      });
    }

    // Fallback for simple text
    return <Text style={styles.contentText}>{String(content)}</Text>;
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getAuthorName = () => {
    if (post?.author?.name) return post.author.name;
    if (post?.author?.email) return post.author.email.split('@')[0];
    return 'Unknown Author';
  };

  if (loading) {
    return <LoadingState message="Loading article..." />;
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#94a3b8" />
        <Text style={styles.errorTitle}>Article Not Found</Text>
        <Text style={styles.errorText}>This article may have been removed or is unavailable.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalReactions = Object.values(post.reactions || {}).reduce((a, b) => a + b, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadNewsDetail(true)} />
        }
      >
        {/* Hero Image */}
        {post.coverImage ? (
          <Image source={{ uri: post.coverImage }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={['#6366f1', '#8b5cf6', '#a855f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coverGradient}
          >
            <Ionicons name="newspaper-outline" size={64} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
        )}

        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Tags */}
          {(post.pinned || post.tags.length > 0) && (
            <View style={styles.tagsContainer}>
              {post.pinned && (
                <View style={styles.pinnedBadge}>
                  <Text style={styles.pinnedText}>📌 PINNED</Text>
                </View>
              )}
              {post.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Title */}
          <Text style={styles.title}>{post.title}</Text>

          {/* Meta Info */}
          <View style={styles.metaContainer}>
            <View style={styles.authorContainer}>
              {post.author.avatar ? (
                <Image source={{ uri: post.author.avatar }} style={styles.authorAvatar} />
              ) : (
                <View style={styles.authorAvatarPlaceholder}>
                  <Ionicons name="person" size={16} color="#64748b" />
                </View>
              )}
              <View>
                <Text style={styles.authorName}>{getAuthorName()}</Text>
                {post.author.role && <Text style={styles.authorRole}>{post.author.role}</Text>}
              </View>
            </View>
            <View style={styles.metaStats}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color="#64748b" />
                <Text style={styles.metaText}>{formatDate(post.publishedAt)}</Text>
              </View>
              {post.readTime && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color="#64748b" />
                  <Text style={styles.metaText}>{post.readTime} min</Text>
                </View>
              )}
              <View style={styles.metaItem}>
                <Ionicons name="eye-outline" size={14} color="#64748b" />
                <Text style={styles.metaText}>{post.views?.toLocaleString() || 0}</Text>
              </View>
            </View>
          </View>

          {/* Action Bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={[styles.actionButton, post.userReaction && styles.actionButtonActive]}
              onPress={() => setShowReactions(!showReactions)}
            >
              {post.userReaction ? (
                <Text style={styles.reactionEmoji}>
                  {reactionEmojis.find(r => r.id === post.userReaction)?.emoji}
                </Text>
              ) : (
                <Ionicons name="heart-outline" size={20} color="#64748b" />
              )}
              <Text style={styles.actionText}>{totalReactions || 'React'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color="#64748b" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, post.isBookmarked && styles.actionButtonActive]}
              onPress={handleBookmark}
            >
              <Ionicons
                name={post.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={post.isBookmarked ? '#f59e0b' : '#64748b'}
              />
              <Text style={styles.actionText}>{post.isBookmarked ? 'Saved' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          {/* Reactions Picker */}
          {showReactions && (
            <View style={styles.reactionsPicker}>
              {reactionEmojis.map(reaction => (
                <TouchableOpacity
                  key={reaction.id}
                  style={[
                    styles.reactionButton,
                    post.userReaction === reaction.id && styles.reactionButtonActive,
                  ]}
                  onPress={() => handleReaction(reaction.id)}
                >
                  <Text style={styles.reactionButtonEmoji}>{reaction.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Article Content */}
          <View style={styles.articleContent}>{renderContent(post.content)}</View>

          {/* Video Embed */}
          {post.videoEmbedUrl && (
            <View style={styles.videoSection}>
              <Text style={styles.sectionTitle}>📹 Video Content</Text>
              <TouchableOpacity
                style={styles.videoPlaceholder}
                onPress={() => Linking.openURL(post.videoEmbedUrl!)}
              >
                <Ionicons name="play-circle" size={64} color="#fff" />
                <Text style={styles.videoText}>Tap to watch video</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Attachments */}
          {post.attachments.length > 0 && (
            <View style={styles.attachmentsSection}>
              <Text style={styles.sectionTitle}>📎 Attachments ({post.attachments.length})</Text>
              {post.attachments.map((url, index) => {
                const filename = url.split('/').pop() || `Attachment ${index + 1}`;
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.attachmentItem}
                    onPress={() => handleAttachmentPress(url)}
                  >
                    <Ionicons name="document-outline" size={24} color="#3b82f6" />
                    <Text style={styles.attachmentText} numberOfLines={1}>
                      {filename}
                    </Text>
                    <Ionicons name="download-outline" size={20} color="#64748b" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionTitle}>Related Articles</Text>
              {relatedPosts.map(related => (
                <TouchableOpacity
                  key={related.id}
                  style={styles.relatedItem}
                  onPress={() => handleRelatedPostPress(related.slug)}
                >
                  {related.coverImage ? (
                    <Image
                      source={{ uri: related.coverImage }}
                      style={styles.relatedImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={['#6366f1', '#8b5cf6']}
                      style={styles.relatedImagePlaceholder}
                    >
                      <Ionicons name="newspaper-outline" size={20} color="rgba(255,255,255,0.5)" />
                    </LinearGradient>
                  )}
                  <View style={styles.relatedContent}>
                    <Text style={styles.relatedTitle} numberOfLines={2}>
                      {related.title}
                    </Text>
                    <Text style={styles.relatedDate}>{formatDate(related.publishedAt)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  coverImage: {
    width: SCREEN_WIDTH,
    height: 250,
  },
  coverGradient: {
    width: SCREEN_WIDTH,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    padding: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pinnedBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pinnedText: {
    color: '#78350f',
    fontSize: 11,
    fontWeight: '700',
  },
  tag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 36,
    marginBottom: 16,
  },
  metaContainer: {
    marginBottom: 20,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  authorRole: {
    fontSize: 12,
    color: '#64748b',
  },
  metaStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  actionButtonActive: {
    backgroundColor: '#eff6ff',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  reactionEmoji: {
    fontSize: 18,
  },
  reactionsPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reactionButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  reactionButtonActive: {
    backgroundColor: '#eff6ff',
  },
  reactionButtonEmoji: {
    fontSize: 28,
  },
  articleContent: {
    marginBottom: 24,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#334155',
    marginBottom: 16,
  },
  contentHeading: {
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 24,
    marginBottom: 12,
  },
  contentHeading1: {
    fontSize: 24,
    lineHeight: 32,
  },
  contentHeading2: {
    fontSize: 20,
    lineHeight: 28,
  },
  contentHeading3: {
    fontSize: 18,
    lineHeight: 24,
  },
  listContainer: {
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  listBullet: {
    fontSize: 16,
    color: '#64748b',
    marginRight: 8,
    width: 24,
  },
  listText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#334155',
  },
  videoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  videoPlaceholder: {
    height: 200,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  attachmentsSection: {
    marginBottom: 24,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  attachmentText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  relatedSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  relatedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  relatedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  relatedImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  relatedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 19,
    marginBottom: 4,
  },
  relatedDate: {
    fontSize: 12,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
