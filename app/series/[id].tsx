import { deleteSeries, getSeriesById, getVolumes, Series, toggleVolume, updateSeriesInfo, updateSeriesVolumes, Volume } from '@/components/database';
import { getBestVolumeCount, getVolumesWithCovers, VolumeInfo } from '@/components/googlebooks';
import { Toast } from '@/components/Toast';
import axios from 'axios';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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
    const [volumes, setVolumes] = useState<Volume[]>([]);
    const [volumeCovers, setVolumeCovers] = useState<VolumeInfo[]>([]);
    const [loadingCovers, setLoadingCovers] = useState(false);
    const [ownedCount, setOwnedCount] = useState(0);
    const [editModal, setEditModal] = useState(false);
    const [newVolumeCount, setNewVolumeCount] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [expandedSynopsis, setExpandedSynopsis] = useState(false);
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
        const isOwned = volumes.find(v => v.volumeNumber === volNum)?.isOwned === 1;
        toggleVolume(Number(id), volNum, !isOwned);
        loadData(); // Reload to refresh UI
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
                showToast('Informazioni aggiornate!', 'success');
            } else {
                showToast('Manga non trovato', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Errore di aggiornamento', 'error');
        } finally {
            setIsRefreshing(false);
        }
    };

    // Delete series
    const handleDelete = () => {
        Alert.alert(
            'Elimina Serie',
            `Sei sicuro di voler eliminare "${series?.title}"? Questa azione non può essere annullata.`,
            [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Elimina',
                    style: 'destructive',
                    onPress: () => {
                        if (series) {
                            deleteSeries(series.id);
                            router.back();
                        }
                    },
                },
            ]
        );
    };

    if (!series) {
        return <View style={styles.container}><Text>Loading...</Text></View>;
    }

    // Generate volume grid (assuming max 100 or totalVolumes)
    const totalVols = series.totalVolumes || 20; // Default to 20 if unknown for now
    const grid = Array.from({ length: totalVols }, (_, i) => i + 1);
    const progress = series.totalVolumes ? ownedCount / series.totalVolumes : 0;
    const isComplete = ownedCount === totalVols;

    return (
        <>
            <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
                            <Text variant="titleLarge" style={styles.modalTitle}>Modifica Volumi</Text>
                            <Text variant="bodyMedium" style={styles.modalSubtitle}>
                                Inserisci il numero totale di volumi
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
                                <Text style={styles.saveBtnText}>Salva</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

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
                    <Image source={{ uri: series.coverImage }} style={styles.banner} blurRadius={15} />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)', theme.colors.background]}
                        locations={[0, 0.5, 1]}
                        style={styles.headerGradient}
                    />
                    <View style={styles.headerContent}>
                        {/* Cover with glow effect */}
                        <View style={styles.posterWrapper}>
                            <View style={styles.posterGlow} />
                            <Image source={{ uri: series.coverImage }} style={styles.poster} resizeMode="cover" />
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
                                        <Text variant="labelSmall" style={{ color: '#fff' }}>Completa</Text>
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
                                    {expandedSynopsis ? 'Leggi meno' : 'Leggi di più'}
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
                            <Text style={[styles.actionBtnText, { color: '#22C55E' }]}>Segna tutti</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444' }]}
                            onPress={() => handleMarkAll(false)}
                        >
                            <Ionicons name="close" size={18} color="#EF4444" />
                            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Deseleziona</Text>
                        </TouchableOpacity>
                    </View>

                    <Text variant="titleMedium" style={styles.sectionTitle}>Volumi</Text>

                    {loadingCovers && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={Colors.neon.primary} />
                            <Text style={styles.loadingText}>Caricamento cover...</Text>
                        </View>
                    )}

                    <View style={styles.grid}>
                        {grid.map(volNum => {
                            const isOwned = volumes.find(v => v.volumeNumber === volNum && v.isOwned === 1);
                            const coverInfo = volumeCovers.find(c => c.volumeNumber === volNum);

                            return (
                                <TouchableOpacity
                                    key={volNum}
                                    activeOpacity={0.7}
                                    style={[
                                        styles.volumeCard,
                                        isOwned && styles.volumeCardOwned,
                                    ]}
                                    onPress={() => handleToggleVolume(volNum)}
                                >
                                    {coverInfo?.coverUrl ? (
                                        <Image
                                            source={{ uri: coverInfo.coverUrl }}
                                            style={styles.volumeCover}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={[styles.volumeCover, styles.volumePlaceholder]}>
                                            <Text style={styles.volumePlaceholderText}>{volNum}</Text>
                                        </View>
                                    )}

                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.9)']}
                                        style={styles.volumeGradient}
                                    />

                                    <View style={styles.volumeInfo}>
                                        <Text style={styles.volumeNumber}>Vol. {volNum}</Text>
                                        {isOwned && (
                                            <View style={styles.ownedBadge}>
                                                <Ionicons name="checkmark" size={10} color="#fff" />
                                            </View>
                                        )}
                                    </View>

                                    {isOwned && <View style={styles.volumeGlow} />}
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>
            </ScrollView>

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
        marginBottom: 15,
        fontWeight: 'bold',
        color: Colors.neon.accent,
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

