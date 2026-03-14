import { getLibraryStats, getSeries, getWishlist, LibraryStats, updateSeriesInfo, updateSeriesMangadexId } from '@/components/database';
import { exportLibrary, importLibrary } from '@/components/libraryExport';
import { getMangaDetails, searchManga } from '@/components/mangadex';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const GENRE_COLORS = [Colors.neon.primary, Colors.neon.secondary, Colors.neon.accent, '#F43F5E', '#10B981'];

interface UpdateResult {
    title: string;
    oldCount: number | null;
    newCount: number | null;
    updated: boolean;
}

function StatCard({ title, value, icon, color, delay }: {
    title: string; value: string | number; icon: string; color: string; delay: number;
}) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.cardContainer}>
            <View style={[styles.cardIconWrapper, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon as any} size={22} color={color} />
            </View>
            <Text style={styles.cardValue}>{value}</Text>
            <Text style={styles.cardTitle}>{title}</Text>
        </Animated.View>
    );
}

function ProgressBar({ label, percent, count, color, delay }: {
    label: string; percent: number; count: number; color: string; delay: number;
}) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.progressRow}>
            <View style={styles.progressLabelRow}>
                <View style={[styles.progressDot, { backgroundColor: color }]} />
                <Text style={styles.progressLabel}>{label}</Text>
                <Text style={[styles.progressCount, { color }]}>{count} ({percent}%)</Text>
            </View>
            <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${percent}%`, backgroundColor: color }]} />
            </View>
        </Animated.View>
    );
}

export default function StatsScreen() {
    const [stats, setStats] = useState<LibraryStats>({
        totalOwnedVolumes: 0, totalVolumes: 0, completedSeries: 0,
        totalSeries: 0, totalValue: 0, topGenres: [],
    });
    const [wishlistCount, setWishlistCount] = useState(0);
    const [completionRate, setCompletionRate] = useState(0);
    const [checkingUpdates, setCheckingUpdates] = useState(false);
    const [updateResults, setUpdateResults] = useState<UpdateResult[]>([]);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [toast, setToast] = useState('');

    useFocusEffect(
        useCallback(() => {
            const libStats = getLibraryStats();
            const wishlist = getWishlist();
            setStats(libStats);
            setWishlistCount(wishlist.length);
            setCompletionRate(
                libStats.totalVolumes > 0
                    ? Math.round((libStats.totalOwnedVolumes / libStats.totalVolumes) * 100)
                    : 0
            );
        }, [])
    );

    const handleCheckUpdates = async () => {
        setCheckingUpdates(true);
        const allSeries = getSeries().filter(s => s.status === 'Publishing' || s.status === 'Ongoing');
        const results: UpdateResult[] = [];

        for (const series of allSeries) {
            try {
                let newVolumes: number | null = null;
                let mangadexId = series.mangadexId;

                // If we have a stored MangaDex ID, use it directly
                if (mangadexId) {
                    const details = await getMangaDetails(mangadexId);
                    newVolumes = details?.volumes ?? null;
                } else {
                    // Search by title
                    const searchResults = await searchManga(series.title, 1);
                    if (searchResults.length > 0) {
                        const found = searchResults[0];
                        mangadexId = found.id;
                        if (!found.id.startsWith('anilist-') && !found.id.startsWith('jikan-')) {
                            const details = await getMangaDetails(found.id);
                            newVolumes = details?.volumes ?? found.volumes;
                            // Persist the MangaDex ID for future checks
                            updateSeriesMangadexId(series.id, found.id);
                        } else {
                            newVolumes = found.volumes;
                        }
                    }
                }

                const updated = newVolumes !== null && newVolumes > (series.totalVolumes ?? 0);
                if (updated && newVolumes !== null) {
                    updateSeriesInfo(series.id, newVolumes, series.description ?? null);
                }

                results.push({
                    title: series.title,
                    oldCount: series.totalVolumes,
                    newCount: newVolumes,
                    updated,
                });
            } catch (e) {
                results.push({ title: series.title, oldCount: series.totalVolumes, newCount: null, updated: false });
            }
        }

        setUpdateResults(results);
        setShowUpdateModal(true);
        setCheckingUpdates(false);
    };

    const handleExport = async () => {
        setExportLoading(true);
        try {
            await exportLibrary();
        } catch (e) {
            setToast('Export failed');
            setTimeout(() => setToast(''), 3000);
        } finally {
            setExportLoading(false);
        }
    };

    const handleImport = async () => {
        setImportLoading(true);
        try {
            const { imported, skipped } = await importLibrary();
            setToast(`Imported ${imported} series (${skipped} skipped)`);
            setTimeout(() => setToast(''), 4000);
        } catch (e: any) {
            if (e.message !== 'cancelled') {
                setToast('Import failed — invalid file');
                setTimeout(() => setToast(''), 3000);
            }
        } finally {
            setImportLoading(false);
        }
    };

    const updatedCount = updateResults.filter(r => r.updated).length;

    return (
        <View style={styles.container}>
            <LinearGradient colors={[Colors.neon.statsGradient, Colors.neon.background]} style={styles.backgroundGradient} />

            {/* Header */}
            <Animated.View entering={FadeIn.duration(600)} style={styles.headerContainer}>
                <View style={styles.headerTop}>
                    <View>
                        <Text variant="displaySmall" style={styles.headerTitle}>Statistics</Text>
                        <Text variant="bodyLarge" style={styles.headerSub}>Your library in numbers</Text>
                    </View>
                    <View style={styles.headerIcon}>
                        <Ionicons name="bar-chart" size={24} color={Colors.neon.primary} />
                    </View>
                </View>
            </Animated.View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Stat Cards Grid */}
                <View style={styles.grid}>
                    <StatCard title="Volumes Owned" value={stats.totalOwnedVolumes} icon="library" color={Colors.neon.primary} delay={100} />
                    <StatCard title="Series" value={stats.totalSeries} icon="albums" color={Colors.neon.secondary} delay={180} />
                    <StatCard title="Completed" value={stats.completedSeries} icon="checkmark-circle" color="#22C55E" delay={260} />
                    <StatCard title="Wishlist" value={wishlistCount} icon="heart" color="#F43F5E" delay={340} />
                    <StatCard title="Total Value" value={`€${stats.totalValue.toFixed(2)}`} icon="wallet" color={Colors.neon.accent} delay={420} />
                    <StatCard title="Progress" value={`${completionRate}%`} icon="trending-up" color="#F59E0B" delay={500} />
                </View>

                {/* Collection Progress */}
                <Animated.View entering={FadeInDown.delay(580).springify()} style={styles.section}>
                    <Text variant="titleLarge" style={styles.sectionTitle}>Collection Progress</Text>
                    <View style={styles.sectionCard}>
                        <View style={styles.progressSummaryRow}>
                            <View style={styles.progressSummaryItem}>
                                <Text style={styles.progressSummaryNumber}>{stats.totalOwnedVolumes}</Text>
                                <Text style={styles.progressSummaryLabel}>Owned</Text>
                            </View>
                            <View style={styles.progressSummaryDivider} />
                            <View style={styles.progressSummaryItem}>
                                <Text style={styles.progressSummaryNumber}>{stats.totalVolumes}</Text>
                                <Text style={styles.progressSummaryLabel}>Total</Text>
                            </View>
                            <View style={styles.progressSummaryDivider} />
                            <View style={styles.progressSummaryItem}>
                                <Text style={[styles.progressSummaryNumber, { color: Colors.neon.accent }]}>
                                    {completionRate}%
                                </Text>
                                <Text style={styles.progressSummaryLabel}>Complete</Text>
                            </View>
                        </View>
                        <View style={styles.bigProgressTrack}>
                            <LinearGradient
                                colors={[Colors.neon.accent, Colors.neon.secondary]}
                                style={[styles.bigProgressBar, { width: `${Math.min(completionRate, 100)}%` }]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            />
                        </View>
                    </View>
                </Animated.View>

                {/* Top Genres */}
                {stats.topGenres.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(660).springify()} style={styles.section}>
                        <Text variant="titleLarge" style={styles.sectionTitle}>Top Genres</Text>
                        <View style={styles.sectionCard}>
                            {stats.topGenres.map((g, i) => (
                                <ProgressBar
                                    key={g.name}
                                    label={g.name}
                                    percent={g.percent}
                                    count={g.count}
                                    color={GENRE_COLORS[i % GENRE_COLORS.length]}
                                    delay={740 + i * 80}
                                />
                            ))}
                        </View>
                    </Animated.View>
                )}

                {/* Actions: Check Updates + Export/Import */}
                <Animated.View entering={FadeInDown.delay(740).springify()} style={styles.section}>
                    <Text variant="titleLarge" style={styles.sectionTitle}>Library Tools</Text>
                    <View style={styles.toolsGrid}>
                        <TouchableOpacity
                            style={[styles.toolBtn, { borderColor: Colors.neon.accent + '60' }]}
                            onPress={handleCheckUpdates}
                            disabled={checkingUpdates}
                            activeOpacity={0.8}
                        >
                            {checkingUpdates
                                ? <ActivityIndicator size="small" color={Colors.neon.accent} />
                                : <Ionicons name="refresh-circle" size={28} color={Colors.neon.accent} />
                            }
                            <Text style={[styles.toolBtnTitle, { color: Colors.neon.accent }]}>
                                {checkingUpdates ? 'Checking...' : 'Check Updates'}
                            </Text>
                            <Text style={styles.toolBtnSub}>New volumes for Publishing series</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.toolBtn, { borderColor: Colors.neon.secondary + '60' }]}
                            onPress={handleExport}
                            disabled={exportLoading}
                            activeOpacity={0.8}
                        >
                            {exportLoading
                                ? <ActivityIndicator size="small" color={Colors.neon.secondary} />
                                : <Ionicons name="share-outline" size={28} color={Colors.neon.secondary} />
                            }
                            <Text style={[styles.toolBtnTitle, { color: Colors.neon.secondary }]}>Export</Text>
                            <Text style={styles.toolBtnSub}>Save library as JSON</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.toolBtn, { borderColor: Colors.neon.primary + '60' }]}
                            onPress={handleImport}
                            disabled={importLoading}
                            activeOpacity={0.8}
                        >
                            {importLoading
                                ? <ActivityIndicator size="small" color={Colors.neon.primary} />
                                : <Ionicons name="download-outline" size={28} color={Colors.neon.primary} />
                            }
                            <Text style={[styles.toolBtnTitle, { color: Colors.neon.primary }]}>Import</Text>
                            <Text style={styles.toolBtnSub}>Restore from JSON backup</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Toast */}
                {toast.length > 0 && (
                    <View style={styles.inlineToast}>
                        <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                        <Text style={styles.inlineToastText}>{toast}</Text>
                    </View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Update Results Modal */}
            <Modal visible={showUpdateModal} animationType="slide" transparent onRequestClose={() => setShowUpdateModal(false)}>
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setShowUpdateModal(false)} />
                    <View style={styles.modalBox}>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowUpdateModal(false)}>
                            <Ionicons name="close" size={20} color="#888" />
                        </TouchableOpacity>
                        <Ionicons
                            name={updatedCount > 0 ? 'sparkles' : 'checkmark-circle'}
                            size={36}
                            color={updatedCount > 0 ? Colors.neon.accent : '#22C55E'}
                        />
                        <Text style={styles.modalTitle}>
                            {updatedCount > 0 ? `${updatedCount} series updated!` : 'Everything up to date'}
                        </Text>
                        <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
                            {updateResults.map((r, i) => (
                                <View key={i} style={styles.resultRow}>
                                    <Ionicons
                                        name={r.updated ? 'arrow-up-circle' : 'checkmark-circle-outline'}
                                        size={16}
                                        color={r.updated ? Colors.neon.accent : '#444'}
                                    />
                                    <Text style={styles.resultTitle} numberOfLines={1}>{r.title}</Text>
                                    {r.updated && (
                                        <Text style={styles.resultBadge}>
                                            {r.oldCount ?? '?'} → {r.newCount}
                                        </Text>
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.neon.background },
    backgroundGradient: { position: 'absolute', left: 0, right: 0, top: 0, height: 300 },
    headerContainer: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    headerTitle: { fontWeight: 'bold', color: '#fff' },
    headerSub: { color: 'rgba(255,255,255,0.6)', marginTop: 4 },
    headerIcon: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: 'rgba(217, 70, 239, 0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    scrollContent: { paddingHorizontal: 15, paddingBottom: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    cardContainer: {
        width: (width - 50) / 3,
        backgroundColor: '#111', borderRadius: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
        padding: 14, alignItems: 'flex-start',
    },
    cardIconWrapper: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    cardValue: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 3 },
    cardTitle: { fontSize: 11, color: '#555', fontWeight: '500' },
    section: { marginBottom: 20 },
    sectionTitle: { fontWeight: '700', color: '#fff', marginBottom: 12, marginLeft: 2 },
    sectionCard: {
        backgroundColor: '#111', borderRadius: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 20,
    },
    progressSummaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
    progressSummaryItem: { alignItems: 'center', flex: 1 },
    progressSummaryNumber: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
    progressSummaryLabel: { color: '#555', fontSize: 12, fontWeight: '500' },
    progressSummaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 4 },
    bigProgressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' },
    bigProgressBar: { height: '100%', borderRadius: 4 },
    progressRow: { marginBottom: 16 },
    progressLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    progressDot: { width: 8, height: 8, borderRadius: 4 },
    progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, flex: 1, fontWeight: '500' },
    progressCount: { fontSize: 13, fontWeight: '700' },
    progressTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginLeft: 16 },
    progressBar: { height: '100%', borderRadius: 3 },
    toolsGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    toolBtn: {
        flex: 1, minWidth: (width - 50) / 3 - 5,
        backgroundColor: '#111', borderRadius: 16,
        borderWidth: 1, padding: 16,
        alignItems: 'center', gap: 6,
    },
    toolBtnTitle: { fontWeight: '700', fontSize: 13, textAlign: 'center' },
    toolBtnSub: { color: '#444', fontSize: 10, textAlign: 'center', lineHeight: 14 },
    inlineToast: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 12,
        padding: 12, marginHorizontal: 2,
    },
    inlineToastText: { color: '#22C55E', fontSize: 13, flex: 1 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
    modalBox: {
        backgroundColor: '#18181B', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: 40,
        borderTopWidth: 1, borderColor: '#2a2a35',
        alignItems: 'center', maxHeight: '70%',
    },
    modalCloseBtn: {
        position: 'absolute', top: 16, right: 16,
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center', justifyContent: 'center',
    },
    modalTitle: { color: '#fff', fontWeight: '700', fontSize: 18, marginTop: 12, marginBottom: 16 },
    resultsList: { width: '100%', maxHeight: 300 },
    resultRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    resultTitle: { flex: 1, color: '#ccc', fontSize: 13 },
    resultBadge: {
        color: Colors.neon.accent, fontSize: 12, fontWeight: '700',
        backgroundColor: 'rgba(34,211,238,0.1)',
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    },
});
