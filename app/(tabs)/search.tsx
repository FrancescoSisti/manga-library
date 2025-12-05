import { addSeries, addToWishlist, isInLibrary, isInWishlist } from '@/components/database';
import { Toast } from '@/components/Toast';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Dimensions, FlatList, Image, Keyboard, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Divider, IconButton, Modal, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = 220;

export default function SearchScreen() {
    const theme = useTheme();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'wishlist' }>({ visible: false, message: '', type: 'success' });
    const [previewModal, setPreviewModal] = useState<{ visible: boolean; manga: any | null }>({ visible: false, manga: null });

    const searchManga = async () => {
        if (!query.trim()) return;
        setLoading(true);
        Keyboard.dismiss();
        try {
            const response = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=15`);
            setResults(response.data.data);
        } catch (error) {
            console.error(error);
            showToast('Failed to fetch manga', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' | 'wishlist' = 'success') => {
        setToast({ visible: true, message, type });
    };

    const handleOpenPreview = (manga: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPreviewModal({ visible: true, manga });
    };

    const handleAddSeries = async (manga: any, closeModal = false) => {
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
            if (closeModal) setPreviewModal({ visible: false, manga: null });
        } catch (error) {
            console.error(error);
            showToast('Could not add series', 'error');
        }
    };

    const handleAddToWishlist = async (manga: any, closeModal = false) => {
        try {
            if (isInWishlist(manga.mal_id)) {
                showToast('Already in wishlist!', 'info');
                return;
            }
            const cover = manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url;
            const author = manga.authors?.[0]?.name || 'Unknown';

            await addToWishlist(manga.mal_id, manga.title, author, manga.volumes, manga.status, cover);
            showToast(`Added to wishlist!`, 'wishlist');
            if (closeModal) setPreviewModal({ visible: false, manga: null });
        } catch (error) {
            console.error(error);
            showToast('Could not add to wishlist', 'error');
        }
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const coverUrl = item.images?.jpg?.large_image_url || item.images?.jpg?.image_url;

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handleOpenPreview(item)}
            >
                <Animated.View
                    entering={FadeIn.delay(index * 50).duration(400)}
                    layout={Layout.springify()}
                    style={styles.cardContainer}
                >
                    <Image source={{ uri: coverUrl }} style={styles.cardImage} resizeMode="cover" />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
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
                                <View style={[styles.badge, { backgroundColor: 'rgba(139, 92, 246, 0.3)' }]}>
                                    <Text style={[styles.badgeText, { color: Colors.neon.secondary }]}>{item.status}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.cardActions}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.wishlistBtn]}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleAddToWishlist(item);
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="heart-outline" size={20} color={Colors.neon.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.addBtn]}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleAddSeries(item);
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="add" size={22} color="#fff" />
                                <Text style={styles.addBtnText}>Library</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const manga = previewModal.manga;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />

            {/* Manga Preview Modal */}
            <Portal>
                <Modal
                    visible={previewModal.visible}
                    onDismiss={() => setPreviewModal({ visible: false, manga: null })}
                    contentContainerStyle={styles.modalContainer}
                >
                    {manga && (
                        <ScrollView showsVerticalScrollIndicator={false}>
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
                                        <Ionicons name="book" size={18} color={Colors.neon.accent} />
                                        <Text style={styles.statText}>{manga.volumes || '?'} Volumes</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Ionicons name="star" size={18} color="#FFD700" />
                                        <Text style={styles.statText}>{manga.score || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <View style={[styles.statusDot, { backgroundColor: manga.status === 'Publishing' ? '#22C55E' : Colors.neon.secondary }]} />
                                        <Text style={styles.statText}>{manga.status}</Text>
                                    </View>
                                </View>

                                <Divider style={styles.divider} />

                                <Text variant="titleSmall" style={styles.sectionTitle}>Synopsis</Text>
                                <Text variant="bodySmall" style={styles.synopsis} numberOfLines={8}>
                                    {manga.synopsis || 'No synopsis available.'}
                                </Text>

                                {manga.genres && manga.genres.length > 0 && (
                                    <>
                                        <Text variant="titleSmall" style={[styles.sectionTitle, { marginTop: 16 }]}>Genres</Text>
                                        <View style={styles.genreContainer}>
                                            {manga.genres.slice(0, 5).map((g: any) => (
                                                <View key={g.mal_id} style={styles.genreTag}>
                                                    <Text style={styles.genreText}>{g.name}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </>
                                )}

                                <View style={styles.modalActions}>
                                    <Button
                                        mode="outlined"
                                        icon="heart-outline"
                                        onPress={() => handleAddToWishlist(manga, true)}
                                        textColor={Colors.neon.primary}
                                        style={styles.modalBtn}
                                    >
                                        Wishlist
                                    </Button>
                                    <Button
                                        mode="contained"
                                        icon="plus"
                                        onPress={() => handleAddSeries(manga, true)}
                                        buttonColor={Colors.neon.primary}
                                        style={styles.modalBtn}
                                    >
                                        Add to Library
                                    </Button>
                                </View>
                            </View>
                        </ScrollView>
                    )}
                </Modal>
            </Portal>

            <LinearGradient
                colors={[Colors.neon.gradientStart, 'transparent']}
                style={styles.headerGradient}
            />

            <View style={styles.header}>
                <Text variant="headlineMedium" style={styles.headerTitle}>Discover</Text>
                <Text variant="bodyMedium" style={styles.headerSub}>Search for your next obsession</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                    <TextInput
                        mode="flat"
                        placeholder="Search manga..."
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={searchManga}
                        style={styles.input}
                        textColor="#fff"
                        placeholderTextColor="#666"
                        underlineColor="transparent"
                        activeUnderlineColor="transparent"
                    />
                    {query.length > 0 && (
                        <IconButton
                            icon="close"
                            size={18}
                            onPress={() => setQuery('')}
                            iconColor="#666"
                        />
                    )}
                </View>
                <TouchableOpacity style={styles.searchBtn} onPress={searchManga} activeOpacity={0.8}>
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
                    <Ionicons name="library-outline" size={60} color="#333" />
                    <Text style={styles.emptyTitle}>Find Your Next Read</Text>
                    <Text style={styles.emptySubtitle}>Search by title, author, or genre</Text>
                </View>
            )}

            <FlatList
                data={results}
                keyExtractor={(item) => item.mal_id.toString()}
                contentContainerStyle={styles.list}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSub: {
        color: 'rgba(255,255,255,0.6)',
        marginTop: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 10,
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        backgroundColor: 'transparent',
        height: 48,
    },
    searchBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: Colors.neon.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loaderContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    loaderText: {
        color: '#666',
        marginTop: 10,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 100,
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
    list: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    cardContainer: {
        height: CARD_HEIGHT,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        backgroundColor: '#111',
    },
    cardImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    cardGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    cardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 16,
    },
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        color: '#fff',
        fontWeight: 'bold',
        lineHeight: 22,
    },
    cardAuthor: {
        color: Colors.neon.accent,
        marginTop: 2,
    },
    metaRow: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 8,
    },
    badge: {
        backgroundColor: 'rgba(34, 211, 238, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        color: Colors.neon.accent,
        fontSize: 11,
        fontWeight: '600',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    wishlistBtn: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(217, 70, 239, 0.15)',
        borderWidth: 1,
        borderColor: Colors.neon.primary,
    },
    addBtn: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        height: 44,
        backgroundColor: Colors.neon.primary,
        gap: 6,
    },
    addBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
    // Modal styles
    modalContainer: {
        margin: 20,
        backgroundColor: Colors.neon.surface,
        borderRadius: 24,
        overflow: 'hidden',
        maxHeight: height * 0.85,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalHeader: {
        height: 200,
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
        height: 100,
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
        gap: 20,
        marginTop: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        color: '#aaa',
        fontSize: 13,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    divider: {
        marginVertical: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    sectionTitle: {
        color: '#888',
        marginBottom: 8,
    },
    synopsis: {
        color: '#bbb',
        lineHeight: 20,
    },
    genreContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    genreTag: {
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        paddingHorizontal: 10,
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
    },
    modalBtn: {
        flex: 1,
    },
});
