import { addSeries, addToWishlist, isInLibrary, isInWishlist } from '@/components/database';
import { Toast } from '@/components/Toast';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    Pressable,
    Modal as RNModal,
    TextInput as RNTextInput,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { ActivityIndicator, Divider, Text, useTheme } from 'react-native-paper';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = 200;
const DEBOUNCE_DELAY = 400; // ms

export default function SearchScreen() {
    const theme = useTheme();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'wishlist' }>({ visible: false, message: '', type: 'success' });
    const [previewModal, setPreviewModal] = useState<{ visible: boolean; manga: any | null }>({ visible: false, manga: null });

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
                const response = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=15`);

                // Only update if this is still the latest request
                if (lastRequestRef.current === requestId) {
                    setResults(response.data.data || []);
                    setLoading(false);
                }
            } catch (error) {
                console.error(error);
                if (lastRequestRef.current === requestId) {
                    setLoading(false);
                    // Don't show error for aborted requests
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

    const handleAddSeries = async (manga: any, closeAfter = false) => {
        try {
            if (isInLibrary(manga.title)) {
                showToast('Already in your library!', 'info');
                return;
            }
            const cover = manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url;
            const author = manga.authors?.[0]?.name || 'Unknown';
            const status = manga.status || 'Unknown';

            await addSeries(manga.title, author, manga.volumes, status, cover);
            showToast(`${manga.title} added to library!`, 'success');
            if (closeAfter) closeModal();
        } catch (error) {
            console.error(error);
            showToast('Could not add series', 'error');
        }
    };

    const handleAddToWishlist = async (manga: any, closeAfter = false) => {
        try {
            if (isInWishlist(manga.mal_id)) {
                showToast('Already in wishlist!', 'info');
                return;
            }
            const cover = manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url;
            const author = manga.authors?.[0]?.name || 'Unknown';

            await addToWishlist(manga.mal_id, manga.title, author, manga.volumes, manga.status, cover);
            showToast(`Added to wishlist!`, 'wishlist');
            if (closeAfter) closeModal();
        } catch (error) {
            console.error(error);
            showToast('Could not add to wishlist', 'error');
        }
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const coverUrl = item.images?.jpg?.large_image_url || item.images?.jpg?.image_url;

        return (
            <TouchableOpacity activeOpacity={0.9} onPress={() => handleOpenPreview(item)}>
                <Animated.View
                    entering={FadeIn.delay(index * 50).duration(300)}
                    layout={Layout.springify()}
                    style={styles.cardContainer}
                >
                    <Image source={{ uri: coverUrl }} style={styles.cardImage} resizeMode="cover" />
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
                                {item.authors?.[0]?.name || 'Unknown Author'}
                            </Text>
                            <View style={styles.metaRow}>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{item.volumes || '?'} vols</Text>
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
                            >
                                <Ionicons name="heart-outline" size={20} color={Colors.neon.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.addBtn}
                                onPress={() => handleAddSeries(item)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="add" size={20} color="#fff" />
                                <Text style={styles.addBtnText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </TouchableOpacity>
        );
    };

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
                                    <Image
                                        source={{ uri: manga.images?.jpg?.large_image_url }}
                                        style={styles.modalCover}
                                        resizeMode="cover"
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
                                        {manga.authors?.map((a: any) => a.name).join(', ') || 'Unknown Author'}
                                    </Text>

                                    <View style={styles.modalStats}>
                                        <View style={styles.statItem}>
                                            <Ionicons name="book" size={16} color={Colors.neon.accent} />
                                            <Text style={styles.statText}>{manga.volumes || '?'} Volumes</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Ionicons name="star" size={16} color="#FFD700" />
                                            <Text style={styles.statText}>{manga.score || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <View style={[styles.statusDot, { backgroundColor: manga.status === 'Publishing' ? '#22C55E' : Colors.neon.secondary }]} />
                                            <Text style={styles.statText}>{manga.status}</Text>
                                        </View>
                                    </View>

                                    <Divider style={styles.divider} />

                                    <Text variant="labelLarge" style={styles.sectionTitle}>Synopsis</Text>
                                    <Text style={styles.synopsis} numberOfLines={6}>
                                        {manga.synopsis || 'No synopsis available.'}
                                    </Text>

                                    {manga.genres && manga.genres.length > 0 && (
                                        <View style={styles.genreSection}>
                                            <Text variant="labelLarge" style={styles.sectionTitle}>Genres</Text>
                                            <View style={styles.genreContainer}>
                                                {manga.genres.slice(0, 5).map((g: any) => (
                                                    <View key={g.mal_id} style={styles.genreTag}>
                                                        <Text style={styles.genreText}>{g.name}</Text>
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
                <View style={styles.loaderContainer}>
                    <ActivityIndicator animating={true} size="large" color={Colors.neon.primary} />
                    <Text style={styles.loaderText}>Searching...</Text>
                </View>
            )}

            {!loading && results.length === 0 && (
                <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={60} color="#333" />
                    <Text style={styles.emptyTitle}>Find Your Next Read</Text>
                    <Text style={styles.emptySubtitle}>Search by title or author</Text>
                </View>
            )}

            <FlatList
                data={results}
                keyExtractor={(item) => item.mal_id.toString()}
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
    loaderContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    loaderText: {
        color: '#555',
        marginTop: 12,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 120,
    },
    emptyTitle: {
        color: '#444',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtitle: {
        color: '#333',
        fontSize: 14,
        marginTop: 4,
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
