import { addSeries, getWishlistCount, getWishlistPaginated, removeFromWishlist, WishlistItem as WishlistItemType } from '@/components/database';
import { CoverImage } from '@/components/CoverImage';
import { Toast } from '@/components/Toast';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Dimensions, FlatList, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeIn, Layout, SlideOutRight } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;
const PAGE_SIZE = 20;

type SortOption = 'recent' | 'az' | 'za' | 'volumes';

const SORT_OPTIONS: { key: SortOption; label: string; icon: string }[] = [
    { key: 'recent',  label: 'Recent',  icon: 'time-outline' },
    { key: 'az',      label: 'A → Z',   icon: 'text-outline' },
    { key: 'za',      label: 'Z → A',   icon: 'text-outline' },
    { key: 'volumes', label: 'Volumes', icon: 'library-outline' },
];

export default function WishlistScreen() {
    const theme = useTheme();
    const [wishlist, setWishlist] = useState<WishlistItemType[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'wishlist' }>({ visible: false, message: '', type: 'success' });

    useFocusEffect(
        useCallback(() => {
            loadWishlist();
        }, [sortBy])
    );

    const loadWishlist = () => {
        const items = getWishlistPaginated(PAGE_SIZE, 0, sortBy);
        setWishlist(items);
        setHasMore(items.length < getWishlistCount());
    };

    const loadMore = () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        const more = getWishlistPaginated(PAGE_SIZE, wishlist.length, sortBy);
        setWishlist(prev => [...prev, ...more]);
        setHasMore(wishlist.length + more.length < getWishlistCount());
        setLoadingMore(false);
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadWishlist();
        setRefreshing(false);
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' | 'wishlist' = 'success') => {
        setToast({ visible: true, message, type });
    };

    const handleRemove = (mangadexId: string, title: string) => {
        removeFromWishlist(mangadexId);
        loadWishlist();
        showToast(`${title} removed from wishlist`, 'info');
    };

    const handleAddToLibrary = (item: WishlistItemType) => {
        try {
            addSeries(item.title, item.author, item.totalVolumes, item.status, item.coverImage);
            removeFromWishlist(item.mangadexId);
            loadWishlist();
            showToast(`${item.title} added to library!`, 'success');
        } catch (error) {
            showToast('Could not add to library', 'error');
        }
    };

    const renderItem = ({ item, index }: { item: WishlistItemType; index: number }) => (
        <Animated.View
            entering={FadeIn.delay(index * 80).duration(400)}
            exiting={SlideOutRight.duration(300)}
            layout={Layout.springify()}
            style={styles.cardContainer}
        >
            <CoverImage uri={item.coverImage} style={styles.cardImage} resizeMode="cover" />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.95)']} style={styles.cardGradient} />

            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemove(item.mangadexId, item.title)}
                >
                    <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.cardMeta}>
                    <Text style={styles.cardMetaText}>
                        {item.totalVolumes ? `${item.totalVolumes} vols` : 'Ongoing'}
                    </Text>
                    <View style={[styles.statusPill,
                        item.status === 'Publishing' || item.status === 'Ongoing'
                            ? styles.statusOngoing : styles.statusFinished
                    ]}>
                        <Text style={styles.statusPillText}>
                            {item.status === 'Publishing' ? 'ONGOING' : item.status?.toUpperCase?.() || ''}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.addLibBtn}
                    onPress={() => handleAddToLibrary(item)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addLibText}>Add to Library</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />

            <LinearGradient
                colors={[Colors.neon.wishlistGradient, Colors.neon.background]}
                style={styles.headerGradient}
            />

            {/* Header */}
            <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text variant="displaySmall" style={styles.headerTitle}>Wishlist</Text>
                    <Text variant="bodyLarge" style={styles.headerSub}>
                        {wishlist.length} manga waiting for you
                    </Text>
                </View>
                <View style={styles.headerIcon}>
                    <Ionicons name="heart" size={24} color="#F43F5E" />
                </View>
            </Animated.View>

            {/* Sort Bar */}
            {wishlist.length > 0 && (
                <View style={styles.sortSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
                        {SORT_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.key}
                                style={[styles.sortChip, sortBy === opt.key && styles.sortChipActive]}
                                onPress={() => { Haptics.selectionAsync(); setSortBy(opt.key); }}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={opt.icon as any}
                                    size={12}
                                    color={sortBy === opt.key ? '#F43F5E' : '#555'}
                                />
                                <Text style={[styles.sortChipText, sortBy === opt.key && styles.sortChipTextActive]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {wishlist.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconWrapper}>
                        <Ionicons name="heart-outline" size={48} color="#F43F5E" />
                    </View>
                    <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
                    <Text style={styles.emptySubtitle}>
                        Search for manga and tap the{'\n'}heart icon to save them here
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={wishlist}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    contentContainerStyle={styles.list}
                    columnWrapperStyle={styles.columnWrapper}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="#F43F5E"
                            colors={["#F43F5E"]}
                        />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.3}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerGradient: {
        position: 'absolute', top: 0, left: 0, right: 0, height: 300,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    headerLeft: { flex: 1 },
    headerTitle: { fontWeight: 'bold', color: '#fff' },
    headerSub: { color: 'rgba(255,255,255,0.6)', marginTop: 4 },
    headerIcon: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: 'rgba(244, 63, 94, 0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    sortSection: { marginBottom: 10 },
    sortRow: {
        paddingHorizontal: 15, gap: 8, alignItems: 'center',
    },
    sortChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    sortChipActive: {
        backgroundColor: 'rgba(244, 63, 94, 0.12)', borderColor: '#F43F5E',
    },
    sortChipText: { color: '#555', fontSize: 12, fontWeight: '600' },
    sortChipTextActive: { color: '#F43F5E' },
    list: { paddingHorizontal: 20, paddingBottom: 120 },
    columnWrapper: { gap: 20 },
    emptyState: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingBottom: 100, paddingHorizontal: 40,
    },
    emptyIconWrapper: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
    emptySubtitle: { color: '#555', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
    cardContainer: {
        width: CARD_WIDTH, height: CARD_WIDTH * 1.5,
        borderRadius: 12, overflow: 'hidden', marginBottom: 20, backgroundColor: '#111',
    },
    cardImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    cardGradient: { ...StyleSheet.absoluteFillObject },
    cardActions: { position: 'absolute', top: 8, right: 8 },
    removeBtn: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center', justifyContent: 'center',
    },
    cardContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
    cardTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14, lineHeight: 18 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
    cardMetaText: { color: Colors.neon.accent, fontSize: 11 },
    statusPill: {
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    },
    statusOngoing: { backgroundColor: 'rgba(34,211,238,0.2)' },
    statusFinished: { backgroundColor: 'rgba(34,197,94,0.2)' },
    statusPillText: { color: '#fff', fontSize: 9, fontWeight: '700' },
    addLibBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.neon.primary,
        borderRadius: 8, paddingVertical: 8, marginTop: 10, gap: 4,
    },
    addLibText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
