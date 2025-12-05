import { deleteSeries, getLibraryStats, getSeries, LibraryStats, Series } from '@/components/database';
import { Toast } from '@/components/Toast';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Dimensions, FlatList, Image, Pressable, Modal as RNModal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeIn, FadeInDown, Layout, SlideOutLeft } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - 50) / COLUMN_COUNT;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function HomeScreen() {
  const theme = useTheme();
  const [series, setSeries] = useState<Series[]>([]);
  const [stats, setStats] = useState<LibraryStats>({ totalOwnedVolumes: 0, totalVolumes: 0, completedSeries: 0, totalSeries: 0 });
  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; item: Series | null }>({ visible: false, item: null });
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'wishlist' }>({ visible: false, message: '', type: 'success' });

  useFocusEffect(
    useCallback(() => {
      loadSeries();
    }, [])
  );

  const loadSeries = () => {
    const data = getSeries();
    setSeries(data);
    setStats(getLibraryStats());
  };

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
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                activeOpacity={0.8}
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
              <Text style={styles.statLabel}>Volumi</Text>
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

      <FlatList
        data={series}
        keyExtractor={(item) => item.id.toString()}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="library-outline" size={60} color="#333" />
            <Text style={styles.emptyTitle}>No manga yet</Text>
            <Text style={styles.emptySubtitle}>Go to Search to start your collection!</Text>
          </View>
        }
      />
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
    marginTop: 100,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#555',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
  },
  emptySubtitle: {
    color: '#444',
    fontSize: 14,
    marginTop: 5,
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
