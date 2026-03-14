import { deleteSeries, getLibraryStats, getSeriesCount, getSeriesPaginated, getVolumes, LibraryStats, Series } from '@/components/database';
import { SkeletonLibraryCard } from '@/components/SkeletonCard';
import { Toast } from '@/components/Toast';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Dimensions, FlatList, Image, Pressable, Modal as RNModal, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeIn, FadeInDown, Layout, SlideOutLeft } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - 50) / COLUMN_COUNT;
const PAGE_SIZE = 20;

type SortOption = 'recent' | 'az' | 'za' | 'progress';
type FilterOption = 'all' | 'ongoing' | 'completed';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'az', label: 'A → Z' },
  { key: 'za', label: 'Z → A' },
  { key: 'progress', label: 'Progress' },
];

const FILTER_OPTIONS: { key: FilterOption; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function HomeScreen() {
  const theme = useTheme();
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [stats, setStats] = useState<LibraryStats>({ totalOwnedVolumes: 0, totalVolumes: 0, completedSeries: 0, totalSeries: 0 });
  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; item: Series | null }>({ visible: false, item: null });
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'wishlist' }>({ visible: false, message: '', type: 'success' });

  useFocusEffect(
    useCallback(() => {
      loadSeries();
    }, [])
  );

  const loadSeries = () => {
    setLoading(true);
    const data = getSeriesPaginated(PAGE_SIZE, 0);
    setSeries(data);
    setStats(getLibraryStats());
    const total = getSeriesCount();
    setHasMore(data.length < total);
    setLoading(false);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const data = getSeriesPaginated(PAGE_SIZE, series.length);
    setSeries(prev => [...prev, ...data]);
    const total = getSeriesCount();
    setHasMore(series.length + data.length < total);
    setLoadingMore(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSeries();
    setRefreshing(false);
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...series];

    // Filter
    if (filterBy === 'ongoing') {
      result = result.filter(s => s.status === 'Publishing' || s.status === 'Ongoing');
    } else if (filterBy === 'completed') {
      result = result.filter(s => s.status !== 'Publishing' && s.status !== 'Ongoing');
    }

    // Sort
    if (sortBy === 'az') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'za') {
      result.sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortBy === 'progress') {
      result.sort((a, b) => {
        const aOwned = getVolumes(a.id).filter(v => v.isOwned === 1).length;
        const bOwned = getVolumes(b.id).filter(v => v.isOwned === 1).length;
        const aProgress = a.totalVolumes ? aOwned / a.totalVolumes : 0;
        const bProgress = b.totalVolumes ? bOwned / b.totalVolumes : 0;
        return bProgress - aProgress;
      });
    }
    // 'recent' keeps default DESC order from DB

    return result;
  }, [series, sortBy, filterBy]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'wishlist' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const handleLongPress = (item: Series) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeleteModal({ visible: true, item });
  };

  const handleDelete = () => {
    if (deleteModal.item) {
      deleteSeries(deleteModal.item.id);
      setDeleteModal({ visible: false, item: null });
      loadSeries();
      showToast(`${deleteModal.item.title} removed from library`, 'info');
    }
  };

  const renderItem = ({ item, index }: { item: Series; index: number }) => (
    <AnimatedTouchable
      entering={FadeInDown.delay(index * 80).duration(400).springify()}
      exiting={SlideOutLeft.duration(300)}
      layout={Layout.springify()}
      style={[styles.item, { backgroundColor: '#111' }]}
      onPress={() => router.push(`/series/${item.id}`)}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={400}
      activeOpacity={0.85}
      accessibilityLabel={`${item.title}, ${item.totalVolumes || 'unknown'} volumes`}
      accessibilityHint="Tap to view details, hold to delete"
      accessibilityRole="button"
    >
      <Image source={{ uri: item.coverImage }} style={styles.cover} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.gradientOverlay}
      />
      <View style={styles.info}>
        <Text variant="titleSmall" numberOfLines={2} style={styles.title}>{item.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.totalVolumes || '∞'}</Text>
          </View>
          <Text variant="labelSmall" style={styles.statusText}>
            {item.status === 'Publishing' ? 'ONGOING' : item.status?.toUpperCase() || ''}
          </Text>
        </View>
      </View>
    </AnimatedTouchable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
      {/* Delete Confirmation Modal */}
      <RNModal
        visible={deleteModal.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteModal({ visible: false, item: null })}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setDeleteModal({ visible: false, item: null })}
          />
          <View style={styles.modalBox}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setDeleteModal({ visible: false, item: null })}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color="#888" />
            </TouchableOpacity>

            <Ionicons name="trash-outline" size={48} color={Colors.neon.error} />
            <Text variant="titleLarge" style={styles.modalTitle}>Remove from Library?</Text>
            <Text variant="bodyMedium" style={styles.modalSubtitle}>
              "{deleteModal.item?.title}" will be removed.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDeleteModal({ visible: false, item: null })}
                activeOpacity={0.8}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                activeOpacity={0.8}
                accessibilityLabel={`Confirm remove ${deleteModal.item?.title}`}
                accessibilityRole="button"
              >
                <Ionicons name="trash" size={18} color="#fff" />
                <Text style={styles.deleteText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </RNModal>

      <LinearGradient
        colors={[Colors.neon.gradientStart, Colors.neon.background]}
        style={styles.backgroundGradient}
      />

      <Animated.View entering={FadeIn.duration(600)} style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <View>
            <Text variant="displaySmall" style={styles.headerTitle}>My Library</Text>
            <Text variant="bodyLarge" style={styles.headerSub}>
              {series.length} {series.length === 1 ? 'Series' : 'Series'} Collected
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="library" size={24} color={Colors.neon.primary} />
          </View>
        </View>

        {/* Stats Section */}
        {series.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Ionicons name="book" size={20} color={Colors.neon.accent} />
              <Text style={styles.statNumber}>{stats.totalOwnedVolumes}</Text>
              <Text style={styles.statLabel}>Volumes</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              <Text style={styles.statNumber}>{stats.completedSeries}</Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="trending-up" size={20} color={Colors.neon.primary} />
              <Text style={styles.statNumber}>
                {stats.totalVolumes > 0 ? Math.round((stats.totalOwnedVolumes / stats.totalVolumes) * 100) : 0}%
              </Text>
              <Text style={styles.statLabel}>Progress</Text>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Filter & Sort Bar */}
      {!loading && series.length > 0 && (
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTER_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.filterChip, filterBy === opt.key && styles.filterChipActive]}
                onPress={() => { Haptics.selectionAsync(); setFilterBy(opt.key); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, filterBy === opt.key && styles.filterChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={styles.filterDivider} />
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortChip, sortBy === opt.key && styles.sortChipActive]}
                onPress={() => { Haptics.selectionAsync(); setSortBy(opt.key); }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={opt.key === 'recent' ? 'time-outline' : opt.key === 'progress' ? 'trending-up-outline' : 'text-outline'}
                  size={12}
                  color={sortBy === opt.key ? Colors.neon.accent : '#555'}
                />
                <Text style={[styles.filterChipText, sortBy === opt.key && { color: Colors.neon.accent }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={[styles.list, styles.skeletonGrid]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLibraryCard key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredAndSorted}
          keyExtractor={(item) => item.id.toString()}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.neon.primary}
              colors={[Colors.neon.primary]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="library-outline" size={48} color={Colors.neon.primary} />
              </View>
              <Text style={styles.emptyTitle}>Your library is empty</Text>
              <Text style={styles.emptySubtitle}>Search for your favourite manga{'\n'}and start building your collection!</Text>
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => router.push('/(tabs)/search')}
                activeOpacity={0.8}
              >
                <Ionicons name="search" size={16} color="#fff" />
                <Text style={styles.emptyActionText}>Browse Manga</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  headerContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(217, 70, 239, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 15,
    paddingBottom: 120,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  columnWrapper: {
    gap: 10,
    marginBottom: 10,
  },
  item: {
    width: ITEM_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    height: ITEM_WIDTH * 1.55,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 18,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: Colors.neon.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusText: {
    color: Colors.neon.accent,
    fontSize: 10,
  },
  empty: {
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(217, 70, 239, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(217, 70, 239, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#555',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.neon.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 24,
  },
  emptyActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  modalContainer: {
    margin: 20,
    backgroundColor: Colors.neon.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  // New modal styles for RNModal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  modalBox: {
    backgroundColor: Colors.neon.surface,
    borderRadius: 24,
    padding: 28,
    margin: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a35',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#3a3a45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#888',
    fontWeight: '600',
  },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.neon.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
  },
  filterSection: {
    marginBottom: 8,
  },
  filterRow: {
    paddingHorizontal: 15,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(217, 70, 239, 0.15)',
    borderColor: Colors.neon.primary,
  },
  filterChipText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: Colors.neon.primary,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 4,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sortChipActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderColor: Colors.neon.accent,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.neon.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.neon.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
