import { addSeries, getWishlist, removeFromWishlist, WishlistItem as WishlistItemType } from '@/components/database';
import { Toast } from '@/components/Toast';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeIn, Layout, SlideOutRight } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function WishlistScreen() {
    const theme = useTheme();
    const [wishlist, setWishlist] = useState<WishlistItemType[]>([]);
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'wishlist' }>({ visible: false, message: '', type: 'success' });

    useFocusEffect(
        useCallback(() => {
            loadWishlist();
        }, [])
    );

    const loadWishlist = () => {
        const items = getWishlist();
        setWishlist(items);
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' | 'wishlist' = 'success') => {
        setToast({ visible: true, message, type });
    };

    const handleRemove = (malId: number, title: string) => {
        removeFromWishlist(malId);
        loadWishlist();
        showToast(`${title} removed from wishlist`, 'info');
    };

    const handleAddToLibrary = (item: WishlistItemType) => {
        try {
            addSeries(item.title, item.author, item.totalVolumes, item.status, item.coverImage);
            removeFromWishlist(item.malId);
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
            <Image source={{ uri: item.coverImage }} style={styles.cardImage} resizeMode="cover" />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.95)']}
                style={styles.cardGradient}
            />

            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemove(item.malId, item.title)}
                >
                    <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.cardMeta}>{item.totalVolumes || '?'} volumes</Text>

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
                colors={[Colors.neon.gradientEnd, 'transparent']}
                style={styles.headerGradient}
            />

            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Ionicons name="heart" size={24} color={Colors.neon.primary} />
                </View>
                <View>
                    <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: '#fff' }}>Wishlist</Text>
                    <Text variant="bodyMedium" style={{ color: Colors.neon.accent }}>
                        {wishlist.length} manga waiting for you
                    </Text>
                </View>
            </View>

            {wishlist.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="heart-outline" size={80} color="#333" />
                    <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
                    <Text style={styles.emptySubtitle}>
                        Search for manga and tap the heart to save them here
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
                />
            )}
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 15,
    },
    headerIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(217, 70, 239, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    list: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    columnWrapper: {
        gap: 20,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 100,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        color: '#555',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 20,
    },
    emptySubtitle: {
        color: '#444',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    cardContainer: {
        width: CARD_WIDTH,
        height: CARD_WIDTH * 1.5,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
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
    cardActions: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    removeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 12,
    },
    cardTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        lineHeight: 18,
    },
    cardMeta: {
        color: Colors.neon.accent,
        fontSize: 11,
        marginTop: 4,
    },
    addLibBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.neon.primary,
        borderRadius: 8,
        paddingVertical: 8,
        marginTop: 10,
        gap: 4,
    },
    addLibText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
});
