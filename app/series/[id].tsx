import { deleteSeries, getSeriesById, getVolumes, Series, toggleVolume, toggleVolumeRead, updateSeriesCover, updateSeriesInfo, updateSeriesVolumes, Volume } from '@/components/database';
import { getBestVolumeCount, getVolumesWithCovers, VolumeInfo } from '@/components/googlebooks';
import { getAniListCover } from '@/components/anilist';
import { CoverImage } from '@/components/CoverImage';
import { Toast } from '@/components/Toast';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ProgressBar, Text, useTheme } from 'react-native-paper';

import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SeriesDetailScreen() {
    const { id } = useLocalSearchParams();
    const theme = useTheme();
    const navigation = useNavigation();
    const router = useRouter();
    const [series, setSeries] = useState<Series | null>(null);
    const [resolvedCover, setResolvedCover] = useState<string | null>(null);
    const [volumes, setVolumes] = useState<Volume[]>([]);
    const [volumeCovers, setVolumeCovers] = useState<VolumeInfo[]>([]);
    const [loadingCovers, setLoadingCovers] = useState(false);
    const [ownedCount, setOwnedCount] = useState(0);
    const [editModal, setEditModal] = useState(false);
    const [newVolumeCount, setNewVolumeCount] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [expandedSynopsis, setExpandedSynopsis] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, message: '', type: 'success' });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ visible: true, message, type });
    };

    const loadData = useCallback(() => {
        const seriesId = Array.isArray(id) ? Number(id[0]) : Number(id);
        if (seriesId) {
            const seriesData = getSeriesById(seriesId);
            setSeries(seriesData);
            if (seriesData) {
                navigation.setOptions({ title: seriesData.title });

                const volData = getVolumes(seriesId);
                setVolumes(volData);

                // Calculate owned count
                const owned = volData.filter((v: any) => v.isOwned === 1).length;
                setOwnedCount(owned);

                // If series has no cover, try to fetch one from AniList
                if (!seriesData.coverImage) {
                    getAniListCover(seriesData.title).then(url => {
                        if (url) {
                            setResolvedCover(url);
                            updateSeriesCover(seriesData.id, url);
                        }
                    });
                } else {
                    setResolvedCover(seriesData.coverImage);
                }

                // Load volume covers from Google Books
                setLoadingCovers(true);
                getVolumesWithCovers(seriesData.title, seriesData.totalVolumes || 50)
                    .then(covers => {
                        setVolumeCovers(covers);
                        setLoadingCovers(false);
                    })
                    .catch(() => setLoadingCovers(false));
            }
        }
    }, [id, navigation]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleToggleVolume = (volNum: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const isOwned = volumes.find(v => v.volumeNumber === volNum)?.isOwned === 1;
        toggleVolume(Number(id), volNum, !isOwned);
        loadData();
    };

    const handleToggleRead = (volNum: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const vol = volumes.find(v => v.volumeNumber === volNum);
        const isRead = vol?.isRead === 1;
        toggleVolumeRead(Number(id), volNum, !isRead);
        loadData();
    };

    const handleMarkAll = (owned: boolean) => {
        const totalVols = series?.totalVolumes || 20;
        for (let i = 1; i <= totalVols; i++) {
            toggleVolume(Number(id), i, owned);
        }
        loadData();
    };

    const handleUpdateVolumes = () => {
        const count = parseInt(newVolumeCount);
        if (count > 0 && series) {
            updateSeriesVolumes(series.id, count);
            setEditModal(false);
            setNewVolumeCount('');
            loadData();
        }
    };

    // Refresh manga info from Jikan API
    const handleRefreshInfo = async () => {
        if (!series) return;

        setIsRefreshing(true);
        try {
            // Search for the manga on Jikan
            const response = await axios.get(
                `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(series.title)}&limit=1`
            );

            const manga = response.data.data?.[0];
            if (manga) {
                // Get volume count from Google Books if Jikan doesn't have it
                const volumes = await getBestVolumeCount(manga.title, manga.volumes);

                // Update the database
                updateSeriesInfo(series.id, volumes, manga.synopsis || null);

                // Reload data
                loadData();
                showToast('Info updated!', 'success');
            } else {
                showToast('Manga not found', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Update error', 'error');
        } finally {
            setIsRefreshing(false);
        }
    };

    // Delete series
    const handleDelete = () => setDeleteModal(true);

    const confirmDelete = () => {
        if (series) {
            deleteSeries(series.id);
            setDeleteModal(false);
            router.back();
        }
    };

    if (!series) {
        return <View style={styles.container}><Text>Loading...</Text></View>;
    }

    // Generate volume grid (assuming max 100 or totalVolumes)
    const totalVols = series.totalVolumes || 20;
    const grid = Array.from({ length: totalVols }, (_, i) => i + 1);
    const progress = series.totalVolumes ? ownedCount / series.totalVolumes : 0;
    const isComplete = ownedCount === totalVols;
    const readCount = volumes.filter(v => v.isRead === 1).length;

    return (
        <>
            <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                {/* Floating Action Bar */}
                <View style={styles.floatingBar}>
                    <TouchableOpacity style={styles.floatingBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.floatingActions}>
                        <TouchableOpacity
                            style={styles.floatingBtn}
                            onPress={() => {
                                setNewVolumeCount(String(series.totalVolumes || 20));
                                setEditModal(true);
                            }}
                            disabled={isRefreshing}
                        >
                            <Ionicons name="pencil" size={20} color={Colors.neon.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.floatingBtn} onPress={handleRefreshInfo} disabled={isRefreshing}>
                            {isRefreshing ? (
                                <ActivityIndicator size="small" color={Colors.neon.primary} />
                            ) : (
                                <Ionicons name="refresh" size={20} color={Colors.neon.primary} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.floatingBtn} onPress={handleDelete} disabled={isRefreshing}>
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.header}>
                    <CoverImage uri={resolvedCover} style={styles.banner} blurRadius={15} />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)', theme.colors.background]}
                        locations={[0, 0.5, 1]}
                        style={styles.headerGradient}
                    />
                    <View style={styles.headerContent}>
                        {/* Cover with glow effect */}
                        <View style={styles.posterWrapper}>
                            <View style={styles.posterGlow} />
                            <CoverImage uri={resolvedCover} style={styles.poster} resizeMode="cover" iconSize={40} />
                        </View>
                        <View style={styles.headerText}>
                            <Text variant="headlineSmall" style={styles.title} numberOfLines={2}>{series.title}</Text>
                            <Text variant="titleMedium" style={{ color: Colors.neon.accent }}>{series.author}</Text>
                            <View style={styles.badgeContainer}>
                                <Text variant="labelSmall" style={styles.badge}>{series.status}</Text>
                                <Text variant="labelSmall" style={[styles.badge, { backgroundColor: Colors.neon.secondary }]}>
                                    {ownedCount}/{series.totalVolumes || '?'}
                                </Text>
                                {isComplete && (
                                    <View style={[styles.badge, { backgroundColor: '#22C55E', flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                                        <Ionicons name="checkmark-circle" size={12} color="#fff" />
                                        <Text variant="labelSmall" style={{ color: '#fff' }}>Complete</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.content}>
                    <View style={styles.progressContainer}>
                        <View style={styles.progressHeader}>
                            <Text variant="labelMedium" style={{ color: '#aaa' }}>Collection Progress</Text>
                            <Text variant="labelMedium" style={{ color: Colors.neon.primary, fontWeight: 'bold' }}>
                                {Math.round(progress * 100)}%
                            </Text>
                        </View>
                        <ProgressBar
                            progress={progress}
                            color={isComplete ? '#22C55E' : Colors.neon.primary}
                            style={styles.progress}
                        />
                        <View style={styles.progressStats}>
                            <Text style={styles.progressStatText}>
                                <Text style={{ color: Colors.neon.primary }}>{ownedCount}</Text> owned
                            </Text>
                            <Text style={styles.progressStatText}>
                                <Text style={{ color: '#22C55E' }}>{readCount}</Text> read
                            </Text>
                        </View>
                    </View>

                    {/* Synopsis Section */}
                    {series.description && (
                        <View style={styles.synopsisContainer}>
                            <Text variant="titleMedium" style={styles.sectionTitle}>Synopsis</Text>
                            <Text style={styles.synopsisText} numberOfLines={expandedSynopsis ? undefined : 4}>
                                {series.description}
                            </Text>
                            <TouchableOpacity onPress={() => setExpandedSynopsis(!expandedSynopsis)} style={styles.readMoreBtn}>
                                <Text style={styles.readMoreText}>
                                    {expandedSynopsis ? 'Read less' : 'Read more'}
                                </Text>
                                <Ionicons name={expandedSynopsis ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.neon.primary} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: '#22C55E' }]}
                            onPress={() => handleMarkAll(true)}
                        >
                            <Ionicons name="checkmark-done" size={18} color="#22C55E" />
                            <Text style={[styles.actionBtnText, { color: '#22C55E' }]}>Mark All</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444' }]}
                            onPress={() => handleMarkAll(false)}
                        >
                            <Ionicons name="close" size={18} color="#EF4444" />
                            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Deselect All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.volumesHeader}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Volumes</Text>
                        <Text style={styles.volumesHint}>tap = owned · hold = read</Text>
                    </View>

                    {loadingCovers && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={Colors.neon.primary} />
                            <Text style={styles.loadingText}>Loading covers...</Text>
                        </View>
                    )}

                    {!loadingCovers && (
                        <View style={styles.coverDisclaimer}>
                            <Ionicons name="information-circle-outline" size={13} color="#444" />
                            <Text style={styles.coverDisclaimerText}>
                                Covers are sourced from Google Books, AniList and MangaDex. If a cover is missing, it's not available on any of these sources.
                            </Text>
                        </View>
                    )}

                    <View style={styles.grid}>
                        {grid.map(volNum => {
                            const vol = volumes.find(v => v.volumeNumber === volNum);
                            const isOwned = vol?.isOwned === 1;
                            const isRead = vol?.isRead === 1;
                            const coverInfo = volumeCovers.find(c => c.volumeNumber === volNum);

                            return (
                                <TouchableOpacity
                                    key={volNum}
                                    activeOpacity={0.7}
                                    style={[
                                        styles.volumeCard,
                                        isOwned && styles.volumeCardOwned,
                                        isRead && styles.volumeCardRead,
                                    ]}
                                    onPress={() => handleToggleVolume(volNum)}
                                    onLongPress={() => handleToggleRead(volNum)}
                                    delayLongPress={400}
                                    accessibilityLabel={`Volume ${volNum}${isOwned ? ', owned' : ''}${isRead ? ', read' : ''}`}
                                    accessibilityHint="Tap to toggle owned, hold to toggle read"
                                    accessibilityRole="button"
                                >
                                    <CoverImage
                                        uri={coverInfo?.coverUrl}
                                        style={styles.volumeCover}
                                        resizeMode="cover"
                                        iconSize={20}
                                    />

                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.9)']}
                                        style={styles.volumeGradient}
                                    />

                                    <View style={styles.volumeInfo}>
                                        <Text style={styles.volumeNumber}>Vol. {volNum}</Text>
                                        <View style={styles.volumeBadges}>
                                            {isRead && (
                                                <View style={styles.readBadge}>
                                                    <Ionicons name="eye" size={9} color="#fff" />
                                                </View>
                                            )}
                                            {isOwned && (
                                                <View style={styles.ownedBadge}>
                                                    <Ionicons name="checkmark" size={10} color="#fff" />
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {isOwned && <View style={styles.volumeGlow} />}
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>
            </ScrollView>

            {/* Edit Modal */}
            <Modal
                visible={editModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setEditModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setEditModal(false)} />
                    <View style={styles.modalBox}>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setEditModal(false)}>
                            <Ionicons name="close" size={22} color="#888" />
                        </TouchableOpacity>

                        <Ionicons name="book" size={40} color={Colors.neon.accent} />
                        <Text variant="titleLarge" style={styles.modalTitle}>Edit Volumes</Text>
                        <Text variant="bodyMedium" style={styles.modalSubtitle}>
                            Enter the total number of volumes
                        </Text>

                        <TextInput
                            style={styles.volumeInput}
                            value={newVolumeCount}
                            onChangeText={setNewVolumeCount}
                            placeholder={String(series.totalVolumes || 20)}
                            placeholderTextColor="#555"
                            keyboardType="number-pad"
                            cursorColor={Colors.neon.primary}
                        />

                        <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateVolumes}>
                            <Text style={styles.saveBtnText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={deleteModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setDeleteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setDeleteModal(false)} />
                    <View style={styles.modalBox}>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setDeleteModal(false)}>
                            <Ionicons name="close" size={22} color="#888" />
                        </TouchableOpacity>

                        <View style={styles.deleteIconWrapper}>
                            <Ionicons name="trash-outline" size={32} color="#EF4444" />
                        </View>
                        <Text variant="titleLarge" style={styles.modalTitle}>Delete Series?</Text>
                        <Text variant="bodyMedium" style={styles.modalSubtitle}>
                            "{series.title}" and all its volume data will be permanently removed.
                        </Text>

                        <View style={styles.deleteActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteModal(false)} activeOpacity={0.8}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deleteConfirmBtn} onPress={confirmDelete} activeOpacity={0.8}>
                                <Ionicons name="trash" size={16} color="#fff" />
                                <Text style={styles.deleteConfirmText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    floatingBar: {
        position: 'absolute',
        top: 50,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
    },
    floatingBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingActions: {
        flexDirection: 'row',
        gap: 10,
    },
    header: {
        height: 380,
        position: 'relative',
        justifyContent: 'flex-end',
    },
    banner: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.5,
    },
    headerGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    headerContent: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'flex-end',
    },
    posterWrapper: {
        position: 'relative',
    },
    posterGlow: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: -10,
        bottom: -10,
        backgroundColor: Colors.neon.primary,
        borderRadius: 12,
        opacity: 0.3,
    },
    poster: {
        width: 130,
        height: 195,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    headerText: {
        flex: 1,
        marginLeft: 20,
        paddingBottom: 5,
    },
    title: {
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    badgeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 10,
        gap: 8,
    },
    badge: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        overflow: 'hidden',
    },
    content: {
        padding: 20,
    },
    progressContainer: {
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    progress: {
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    synopsisContainer: {
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    synopsisText: {
        color: '#aaa',
        fontSize: 14,
        lineHeight: 22,
    },
    readMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        gap: 4,
    },
    readMoreText: {
        color: Colors.neon.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 25,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    sectionTitle: {
        marginBottom: 0,
        fontWeight: 'bold',
        color: Colors.neon.accent,
    },
    volumesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    volumesHint: {
        color: '#444',
        fontSize: 11,
    },
    coverDisclaimer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        marginBottom: 12,
        paddingHorizontal: 2,
    },
    coverDisclaimerText: {
        flex: 1,
        color: '#444',
        fontSize: 11,
        lineHeight: 16,
    },
    progressStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    progressStatText: {
        color: '#888',
        fontSize: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingBottom: 40,
    },
    volBadge: {
        width: 48,
        height: 48,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
    },
    // Modal styles
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
        width: 300,
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
        lineHeight: 20,
    },
    deleteIconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
        width: '100%',
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
    cancelBtnText: {
        color: '#888',
        fontWeight: '600',
        fontSize: 15,
    },
    deleteConfirmBtn: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#EF4444',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    deleteConfirmText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    volumeInput: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1.5,
        borderColor: '#3a3a45',
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        width: '100%',
        marginTop: 20,
    },
    saveBtn: {
        backgroundColor: Colors.neon.primary,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 40,
        marginTop: 20,
        width: '100%',
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
    },
    // Volume covers styles
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 15,
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 10,
    },
    loadingText: {
        color: '#888',
        fontSize: 13,
    },
    volumeCard: {
        width: 100,
        height: 150,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: Colors.neon.surface,
        borderWidth: 2,
        borderColor: 'transparent',
        position: 'relative',
    },
    volumeCardOwned: {
        borderColor: Colors.neon.primary,
    },
    volumeCardRead: {
        borderColor: '#22C55E',
    },
    volumeCover: {
        width: '100%',
        height: '100%',
    },
    volumePlaceholder: {
        backgroundColor: '#1a1a25',
        justifyContent: 'center',
        alignItems: 'center',
    },
    volumePlaceholderText: {
        color: '#444',
        fontSize: 28,
        fontWeight: 'bold',
    },
    volumeGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 50,
    },
    volumeInfo: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        right: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    volumeBadges: {
        flexDirection: 'row',
        gap: 3,
    },
    readBadge: {
        backgroundColor: '#22C55E',
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    volumeNumber: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    ownedBadge: {
        backgroundColor: Colors.neon.primary,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    volumeGlow: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: Colors.neon.primary,
        opacity: 0.5,
    },
});

