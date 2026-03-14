import { getCached, setCached } from '@/components/apiCache';
import { CoverImage } from '@/components/CoverImage';
import { addSeries, addToWishlist, isInLibrary, isInWishlist } from '@/components/database';
import { getBestVolumeCount } from '@/components/googlebooks';
import { searchManga, SimplifiedManga } from '@/components/mangadex';
import { SkeletonSearchCard } from '@/components/SkeletonCard';
import { Toast } from '@/components/Toast';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Keyboard,
    Pressable,
    Modal as RNModal,
    TextInput as RNTextInput,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { Divider, Text, useTheme } from 'react-native-paper';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = 200;
const DEBOUNCE_DELAY = 400; // ms

export default function SearchScreen() {
    const theme = useTheme();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SimplifiedManga[]>([]);
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'wishlist' }>({ visible: false, message: '', type: 'success' });
    const [previewModal, setPreviewModal] = useState<{ visible: boolean; manga: SimplifiedManga | null }>({ visible: false, manga: null });

    // Ref to track the latest request to avoid race conditions
    const lastRequestRef = useRef<number>(0);

    // Debounced search effect
    useEffect(() => {
        // Don't search if query is too short
        if (query.trim().length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const requestId = Date.now();
        lastRequestRef.current = requestId;

        const timeoutId = setTimeout(async () => {
            try {
                const cacheKey = `mangadex:${query.trim().toLowerCase()}`;
                const cached = getCached<SimplifiedManga[]>(cacheKey);

                if (cached) {
                    if (lastRequestRef.current === requestId) {
                        setResults(cached);
                        setLoading(false);
                    }
                    return;
                }

                const data = await searchManga(query.trim(), 20);
                setCached(cacheKey, data);

                // Only update if this is still the latest request
                if (lastRequestRef.current === requestId) {
                    setResults(data);
                    setLoading(false);
                }
            } catch (error) {
                console.error(error);
                if (lastRequestRef.current === requestId) {
                    setLoading(false);
                }
            }
        }, DEBOUNCE_DELAY);

        return () => clearTimeout(timeoutId);
    }, [query]);

    // Manual search (for button press)
    const handleSearch = () => {
        Keyboard.dismiss();
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' | 'wishlist' = 'success') => {
        setToast({ visible: true, message, type });
    };

    const handleOpenPreview = (manga: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPreviewModal({ visible: true, manga });
    };

    const closeModal = () => {
        setPreviewModal({ visible: false, manga: null });
    };

    const handleAddSeries = async (manga: SimplifiedManga, closeAfter = false) => {
        try {
            if (isInLibrary(manga.title)) {
                showToast('Already in your library!', 'info');
                return;
            }

            showToast('Fetching volume info...', 'info');
            const volumes = await getBestVolumeCount(manga.title, manga.volumes);

            await addSeries(manga.title, manga.author, volumes, manga.status, manga.coverUrl, manga.description, manga.tags);
            showToast(`${manga.title} added to library!`, 'success');
            if (closeAfter) closeModal();
        } catch (error) {
            console.error(error);
            showToast('Could not add series', 'error');
        }
    };

    const handleAddToWishlist = async (manga: SimplifiedManga, closeAfter = false) => {
        try {
            if (isInWishlist(manga.id)) {
                showToast('Already in wishlist!', 'info');
                return;
            }

            const volumes = await getBestVolumeCount(manga.title, manga.volumes);

            await addToWishlist(manga.id, manga.title, manga.author, volumes, manga.status, manga.coverUrl);
            showToast(`Added to wishlist!`, 'wishlist');
            if (closeAfter) closeModal();
        } catch (error) {
            console.error(error);
            showToast('Could not add to wishlist', 'error');
        }
    };

    const renderItem = ({ item, index }: { item: SimplifiedManga; index: number }) => (
        <TouchableOpacity activeOpacity={0.9} onPress={() => handleOpenPreview(item)}>
            <Animated.View
                entering={FadeIn.delay(index * 50).duration(300)}
                layout={Layout.springify()}
                style={styles.cardContainer}
            >
                <CoverImage uri={item.coverUrl} style={styles.cardImage} resizeMode="cover" iconSize={40} />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.98)']}
                    locations={[0, 0.5, 1]}
                    style={styles.cardGradient}
                />

                <View style={styles.cardContent}>
                    <View style={styles.cardInfo}>
                        <Text variant="titleMedium" style={styles.cardTitle} numberOfLines={2}>
                            {item.title}
                        </Text>
                        <Text variant="bodySmall" style={styles.cardAuthor} numberOfLines={1}>
                            {item.author}
                        </Text>
                        <View style={styles.metaRow}>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {item.volumes ? `${item.volumes} vols` : 'Ongoing'}
                                </Text>
                            </View>
                            <View style={[styles.badge, styles.badgeSecondary]}>
                                <Text style={[styles.badgeText, { color: Colors.neon.secondary }]}>{item.status}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={styles.wishlistBtn}
                            onPress={() => handleAddToWishlist(item)}
                            activeOpacity={0.7}
                            accessibilityLabel={`Add ${item.title} to wishlist`}
                            accessibilityRole="button"
                        >
                            <Ionicons name="heart-outline" size={20} color={Colors.neon.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => handleAddSeries(item)}
                            activeOpacity={0.7}
                            accessibilityLabel={`Add ${item.title} to library`}
                            accessibilityRole="button"
                        >
                            <Ionicons name="add" size={20} color="#fff" />
                            <Text style={styles.addBtnText}>Add</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );

    const manga = previewModal.manga;

    return (
        <View style={styles.container}>
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />

            {/* Manga Preview Modal with DARK BACKDROP */}
            <RNModal
                visible={previewModal.visible}
                animationType="slide"
                transparent={true}
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={closeModal} />

                    <View style={styles.modalContainer}>
                        {/* Close Button */}
                        <TouchableOpacity style={styles.closeBtn} onPress={closeModal} activeOpacity={0.7}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>

                        {manga && (
                            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                                <View style={styles.modalHeader}>
                                    <CoverImage
                                        uri={manga.coverUrl}
                                        style={styles.modalCover}
                                        resizeMode="cover"
                                        iconSize={48}
                                    />
                                    <LinearGradient
                                        colors={['transparent', Colors.neon.surface]}
                                        style={styles.modalCoverGradient}
                                    />
                                </View>

                                <View style={styles.modalBody}>
                                    <Text variant="headlineSmall" style={styles.modalTitle}>
                                        {manga.title}
                                    </Text>
                                    <Text variant="bodyMedium" style={styles.modalAuthor}>
                                        {manga.author}
                                    </Text>

                                    <View style={styles.modalStats}>
                                        <View style={styles.statItem}>
                                            <Ionicons name="book" size={16} color={Colors.neon.accent} />
                                            <Text style={styles.statText}>
                                                {manga.volumes ? `${manga.volumes} Volumes` : 'Ongoing'}
                                            </Text>
                                        </View>
                                        {manga.year && (
                                            <View style={styles.statItem}>
                                                <Ionicons name="calendar" size={16} color="#888" />
                                                <Text style={styles.statText}>{manga.year}</Text>
                                            </View>
                                        )}
                                        <View style={styles.statItem}>
                                            <View style={[styles.statusDot, { backgroundColor: manga.status === 'Publishing' ? '#22C55E' : Colors.neon.secondary }]} />
                                            <Text style={styles.statText}>{manga.status}</Text>
                                        </View>
                                    </View>

                                    <Divider style={styles.divider} />

                                    <Text variant="labelLarge" style={styles.sectionTitle}>Synopsis</Text>
                                    <Text style={styles.synopsis} numberOfLines={6}>
                                        {manga.description || 'No synopsis available.'}
                                    </Text>

                                    {manga.tags && manga.tags.length > 0 && (
                                        <View style={styles.genreSection}>
                                            <Text variant="labelLarge" style={styles.sectionTitle}>Tags</Text>
                                            <View style={styles.genreContainer}>
                                                {manga.tags.slice(0, 6).map((tag) => (
                                                    <View key={tag} style={styles.genreTag}>
                                                        <Text style={styles.genreText}>{tag}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    )}

                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={styles.modalWishlistBtn}
                                            onPress={() => handleAddToWishlist(manga, true)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="heart-outline" size={20} color={Colors.neon.primary} />
                                            <Text style={styles.modalWishlistText}>Wishlist</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.modalAddBtn}
                                            onPress={() => handleAddSeries(manga, true)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="add" size={20} color="#fff" />
                                            <Text style={styles.modalAddText}>Add to Library</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </RNModal>

            <LinearGradient
                colors={[Colors.neon.gradientStart, Colors.neon.background]}
                style={styles.headerGradient}
            />

            <View style={styles.header}>
                <Text variant="headlineMedium" style={styles.headerTitle}>Discover</Text>
                <Text variant="bodyMedium" style={styles.headerSub}>Search for your next obsession</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <Ionicons name="search" size={20} color="#888" />
                    <RNTextInput
                        placeholder="Search manga..."
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                        style={styles.input}
                        placeholderTextColor="#555"
                        cursorColor={Colors.neon.primary}
                        selectionColor={Colors.neon.primary}
                        returnKeyType="search"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                            <Ionicons name="close-circle" size={20} color="#666" />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.8}>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading && (
                <View style={styles.list}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <SkeletonSearchCard key={i} />
                    ))}
                </View>
            )}

            {!loading && results.length === 0 && (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconWrapper}>
                        <Ionicons name={query.trim().length >= 2 ? 'alert-circle-outline' : 'search-outline'} size={48} color={Colors.neon.accent} />
                    </View>
                    <Text style={styles.emptyTitle}>
                        {query.trim().length >= 2 ? 'No results found' : 'Find Your Next Read'}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                        {query.trim().length >= 2
                            ? `No manga matching "${query}"\nTry a different title or author`
                            : 'Type at least 2 characters\nto start searching'}
                    </Text>
                </View>
            )}

            <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.neon.background,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 180,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSub: {
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 12,
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1f',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 50,
        borderWidth: 1.5,
        borderColor: '#2a2a35',
        gap: 10,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        height: 50,
    },
    clearBtn: {
        padding: 4,
    },
    searchBtn: {
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: Colors.neon.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 120,
        paddingHorizontal: 40,
    },
    emptyIconWrapper: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(34, 211, 238, 0.3)',
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
    list: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    cardContainer: {
        height: CARD_HEIGHT,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 14,
        backgroundColor: '#0a0a0a',
    },
    cardImage: {
        ...StyleSheet.absoluteFillObject,
    },
    cardGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    cardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 14,
    },
    cardInfo: {
        flex: 1,
        marginRight: 10,
    },
    cardTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        lineHeight: 20,
    },
    cardAuthor: {
        color: Colors.neon.accent,
        marginTop: 2,
        fontSize: 12,
    },
    metaRow: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 6,
    },
    badge: {
        backgroundColor: 'rgba(34, 211, 238, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeSecondary: {
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
    },
    badgeText: {
        color: Colors.neon.accent,
        fontSize: 10,
        fontWeight: '600',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 8,
    },
    wishlistBtn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: 'rgba(217, 70, 239, 0.1)',
        borderWidth: 1.5,
        borderColor: Colors.neon.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBtn: {
        flexDirection: 'row',
        paddingHorizontal: 14,
        height: 42,
        borderRadius: 12,
        backgroundColor: Colors.neon.primary,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    addBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
    },
    modalContainer: {
        backgroundColor: Colors.neon.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: height * 0.88,
        borderWidth: 1,
        borderColor: '#2a2a35',
        borderBottomWidth: 0,
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalHeader: {
        height: 220,
        position: 'relative',
    },
    modalCover: {
        width: '100%',
        height: '100%',
    },
    modalCoverGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
    },
    modalBody: {
        padding: 20,
    },
    modalTitle: {
        color: '#fff',
        fontWeight: 'bold',
    },
    modalAuthor: {
        color: Colors.neon.accent,
        marginTop: 4,
    },
    modalStats: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 14,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    statText: {
        color: '#888',
        fontSize: 13,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    divider: {
        marginVertical: 16,
        backgroundColor: '#2a2a35',
    },
    sectionTitle: {
        color: '#666',
        marginBottom: 8,
    },
    synopsis: {
        color: '#aaa',
        lineHeight: 20,
        fontSize: 13,
    },
    genreSection: {
        marginTop: 16,
    },
    genreContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    genreTag: {
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    genreText: {
        color: Colors.neon.secondary,
        fontSize: 12,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
        paddingBottom: 20,
    },
    modalWishlistBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: Colors.neon.primary,
        backgroundColor: 'rgba(217, 70, 239, 0.1)',
        gap: 6,
    },
    modalWishlistText: {
        color: Colors.neon.primary,
        fontWeight: '600',
    },
    modalAddBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: 14,
        backgroundColor: Colors.neon.primary,
        gap: 6,
    },
    modalAddText: {
        color: '#fff',
        fontWeight: '600',
    },
});
