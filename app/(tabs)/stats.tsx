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

const GENRE_GRADIENTS: [string, string][] = [
    [Colors.neon.primary, '#8B5CF6'],
    [Colors.neon.secondary, Colors.neon.accent],
    [Colors.neon.accent, '#10B981'],
    ['#F43F5E', '#F97316'],
    ['#10B981', '#22D3EE'],
];

interface UpdateResult {
    title: string;
    oldCount: number | null;
    newCount: number | null;
    updated: boolean;
}

function RingBadge({ percent }: { percent: number }) {
    return (
        <LinearGradient
            colors={[Colors.neon.accent, Colors.neon.secondary, Colors.neon.primary]}
            style={styles.ringOuter}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
            <View style={styles.ringInner}>
                <Text style={styles.ringPercent}>{percent}%</Text>
                <Text style={styles.ringLabel}>COMPLETE</Text>
            </View>
        </LinearGradient>
    );
}

function StatCard({ title, value, icon, color, delay }: {
    title: string; value: string | number; icon: string; color: string; delay: number;
}) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).springify()} style={{ width: (width - 50) / 3 }}>
            <LinearGradient
                colors={[color + '35', color + '08']}
                style={styles.cardGradientBorder}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
                <View style={styles.cardInner}>
                    <View style={[styles.cardIconWrapper, { backgroundColor: color + '20' }]}>
                        <Ionicons name={icon as any} size={20} color={color} />
                    </View>
                    <Text style={styles.cardValue}>{value}</Text>
                    <Text style={styles.cardTitle}>{title}</Text>
                </View>
            </LinearGradient>
        </Animated.View>
    );
}

function GenreBar({ label, percent, count, gradientColors, delay }: {
    label: string; percent: number; count: number; gradientColors: [string, string]; delay: number;
}) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.progressRow}>
            <View style={styles.progressLabelRow}>
                <LinearGradient
                    colors={gradientColors}
                    style={styles.progressDot}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <Text style={styles.progressLabel}>{label}</Text>
                <View style={[styles.progressCountBadge, { backgroundColor: gradientColors[0] + '20' }]}>
                    <Text style={[styles.progressCount, { color: gradientColors[0] }]}>{count} · {percent}%</Text>
                </View>
            </View>
            <View style={styles.progressTrack}>
                <LinearGradient
                    colors={gradientColors}
                    style={[styles.progressBar, { width: `${percent}%` as any }]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
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

                if (mangadexId) {
                    const details = await getMangaDetails(mangadexId);
                    newVolumes = details?.volumes ?? null;
                } else {
                    const searchResults = await searchManga(series.title, 1);
                    if (searchResults.length > 0) {
                        const found = searchResults[0];
                        mangadexId = found.id;
                        if (!found.id.startsWith('anilist-') && !found.id.startsWith('jikan-')) {
                            const details = await getMangaDetails(found.id);
                            newVolumes = details?.volumes ?? found.volumes;
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

                results.push({ title: series.title, oldCount: series.totalVolumes, newCount: newVolumes, updated });
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
            <LinearGradient
                colors={[Colors.neon.statsGradient, Colors.neon.background]}
                style={styles.backgroundGradient}
            />
            {/* Decorative glow orbs */}
            <View style={[styles.glowOrb, { top: 40, right: -50, backgroundColor: Colors.neon.accent + '14' }]} />
            <View style={[styles.glowOrb, { top: 220, left: -70, backgroundColor: Colors.neon.primary + '0F', width: 200, height: 200, borderRadius: 100 }]} />
            <View style={[styles.glowOrb, { top: 480, right: -60, backgroundColor: Colors.neon.secondary + '12', width: 180, height: 180, borderRadius: 90 }]} />
            <View style={[styles.glowOrb, { top: 700, left: -40, backgroundColor: Colors.neon.accent + '0A', width: 160, height: 160, borderRadius: 80 }]} />

            {/* Header */}
            <Animated.View entering={FadeIn.duration(600)} style={styles.headerContainer}>
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerEyebrow}>YOUR LIBRARY</Text>
                        <Text style={styles.headerTitle}>Statistics</Text>
                    </View>
                    <View style={styles.headerBadge}>
                        <Ionicons name="analytics" size={20} color={Colors.neon.accent} />
                    </View>
                </View>
            </Animated.View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Hero Completion Card */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.heroSection}>
                    <LinearGradient
                        colors={['rgba(34,211,238,0.09)', 'rgba(139,92,246,0.05)', 'transparent']}
                        style={styles.heroCard}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.heroTop}>
                            <RingBadge percent={completionRate} />
                            <View style={styles.heroStats}>
                                <View style={styles.heroStatItem}>
                                    <Text style={styles.heroStatNumber}>{stats.totalOwnedVolumes}</Text>
                                    <Text style={styles.heroStatLabel}>Owned</Text>
                                </View>
                                <View style={styles.heroStatDivider} />
                                <View style={styles.heroStatItem}>
                                    <Text style={styles.heroStatNumber}>{stats.totalVolumes}</Text>
                                    <Text style={styles.heroStatLabel}>Total</Text>
                                </View>
                                <View style={styles.heroStatDivider} />
                                <View style={styles.heroStatItem}>
                                    <Text style={[styles.heroStatNumber, { color: '#22C55E' }]}>{stats.completedSeries}</Text>
                                    <Text style={styles.heroStatLabel}>Finished</Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Stat Cards Grid */}
                <View style={styles.grid}>
                    <StatCard title="Volumes" value={stats.totalOwnedVolumes} icon="library" color={Colors.neon.primary} delay={200} />
                    <StatCard title="Series" value={stats.totalSeries} icon="albums" color={Colors.neon.secondary} delay={260} />
                    <StatCard title="Completed" value={stats.completedSeries} icon="checkmark-circle" color="#22C55E" delay={320} />
                    <StatCard title="Wishlist" value={wishlistCount} icon="heart" color="#F43F5E" delay={380} />
                    <StatCard title="Value" value={`€${stats.totalValue.toFixed(0)}`} icon="wallet" color={Colors.neon.accent} delay={440} />
                    <StatCard title="Progress" value={`${completionRate}%`} icon="trending-up" color="#F59E0B" delay={500} />
                </View>

                {/* Top Genres */}
                {stats.topGenres.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(560).springify()} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Top Genres</Text>
                            <View style={styles.sectionPill}>
                                <Text style={styles.sectionPillText}>{stats.topGenres.length} genres</Text>
                            </View>
                        </View>
                        <View style={styles.sectionCard}>
                            {stats.topGenres.map((g, i) => (
                                <GenreBar
                                    key={g.name}
                                    label={g.name}
                                    percent={g.percent}
                                    count={g.count}
                                    gradientColors={GENRE_GRADIENTS[i % GENRE_GRADIENTS.length]}
                                    delay={640 + i * 80}
                                />
                            ))}
                        </View>
                    </Animated.View>
                )}

                {/* Library Tools */}
                <Animated.View entering={FadeInDown.delay(640).springify()} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Library Tools</Text>
                    </View>
                    <View style={styles.toolsGrid}>
                        <TouchableOpacity style={styles.toolBtnWrap} onPress={handleCheckUpdates} disabled={checkingUpdates} activeOpacity={0.8}>
                            <LinearGradient colors={[Colors.neon.accent + '28', Colors.neon.accent + '08']} style={styles.toolBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                <View style={[styles.toolIconWrap, { backgroundColor: Colors.neon.accent + '20' }]}>
                                    {checkingUpdates
                                        ? <ActivityIndicator size="small" color={Colors.neon.accent} />
                                        : <Ionicons name="refresh-circle" size={24} color={Colors.neon.accent} />
                                    }
                                </View>
                                <Text style={[styles.toolBtnTitle, { color: Colors.neon.accent }]}>
                                    {checkingUpdates ? 'Checking...' : 'Updates'}
                                </Text>
                                <Text style={styles.toolBtnSub}>New volumes</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.toolBtnWrap} onPress={handleExport} disabled={exportLoading} activeOpacity={0.8}>
                            <LinearGradient colors={[Colors.neon.secondary + '28', Colors.neon.secondary + '08']} style={styles.toolBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                <View style={[styles.toolIconWrap, { backgroundColor: Colors.neon.secondary + '20' }]}>
                                    {exportLoading
                                        ? <ActivityIndicator size="small" color={Colors.neon.secondary} />
                                        : <Ionicons name="share-outline" size={24} color={Colors.neon.secondary} />
                                    }
                                </View>
                                <Text style={[styles.toolBtnTitle, { color: Colors.neon.secondary }]}>Export</Text>
                                <Text style={styles.toolBtnSub}>Save as JSON</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.toolBtnWrap} onPress={handleImport} disabled={importLoading} activeOpacity={0.8}>
                            <LinearGradient colors={[Colors.neon.primary + '28', Colors.neon.primary + '08']} style={styles.toolBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                <View style={[styles.toolIconWrap, { backgroundColor: Colors.neon.primary + '20' }]}>
                                    {importLoading
                                        ? <ActivityIndicator size="small" color={Colors.neon.primary} />
                                        : <Ionicons name="download-outline" size={24} color={Colors.neon.primary} />
                                    }
                                </View>
                                <Text style={[styles.toolBtnTitle, { color: Colors.neon.primary }]}>Import</Text>
                                <Text style={styles.toolBtnSub}>Restore backup</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Toast */}
                {toast.length > 0 && (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.inlineToast}>
                        <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                        <Text style={styles.inlineToastText}>{toast}</Text>
                    </Animated.View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Update Results Modal */}
            <Modal visible={showUpdateModal} animationType="slide" transparent onRequestClose={() => setShowUpdateModal(false)}>
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setShowUpdateModal(false)} />
                    <View style={styles.modalBox}>
                        <LinearGradient
                            colors={[updatedCount > 0 ? Colors.neon.accent + '18' : '#22C55E18', 'transparent']}
                            style={styles.modalHeaderGradient}
                            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                        />
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowUpdateModal(false)}>
                            <Ionicons name="close" size={20} color="#888" />
                        </TouchableOpacity>
                        <View style={[styles.modalIconWrap, { backgroundColor: (updatedCount > 0 ? Colors.neon.accent : '#22C55E') + '20' }]}>
                            <Ionicons
                                name={updatedCount > 0 ? 'sparkles' : 'checkmark-circle'}
                                size={28}
                                color={updatedCount > 0 ? Colors.neon.accent : '#22C55E'}
                            />
                        </View>
                        <Text style={styles.modalTitle}>
                            {updatedCount > 0 ? `${updatedCount} series updated!` : 'Everything up to date'}
                        </Text>
                        <Text style={styles.modalSubtitle}>{updateResults.length} series checked</Text>
                        <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
                            {updateResults.map((r, i) => (
                                <View key={i} style={styles.resultRow}>
                                    <View style={[styles.resultIconWrap, { backgroundColor: r.updated ? Colors.neon.accent + '20' : '#ffffff08' }]}>
                                        <Ionicons
                                            name={r.updated ? 'arrow-up-circle' : 'checkmark-circle-outline'}
                                            size={15}
                                            color={r.updated ? Colors.neon.accent : '#444'}
                                        />
                                    </View>
                                    <Text style={styles.resultTitle} numberOfLines={1}>{r.title}</Text>
                                    {r.updated && (
                                        <View style={styles.resultBadgeWrap}>
                                            <Text style={styles.resultBadge}>{r.oldCount ?? '?'} → {r.newCount}</Text>
                                        </View>
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
    backgroundGradient: { position: 'absolute', left: 0, right: 0, top: 0, height: 340 },
    glowOrb: { position: 'absolute', width: 220, height: 220, borderRadius: 110 },

    // Header
    headerContainer: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerEyebrow: { color: Colors.neon.accent, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 4, opacity: 0.8 },
    headerTitle: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
    headerBadge: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.neon.accent + '15',
        borderWidth: 1, borderColor: Colors.neon.accent + '30',
        alignItems: 'center', justifyContent: 'center',
    },

    scrollContent: { paddingHorizontal: 15, paddingBottom: 20 },

    // Hero
    heroSection: { marginBottom: 20 },
    heroCard: {
        borderRadius: 24, padding: 20,
        borderWidth: 1, borderColor: 'rgba(34,211,238,0.18)',
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 20 },
    ringOuter: { width: 120, height: 120, borderRadius: 60, padding: 5, alignItems: 'center', justifyContent: 'center' },
    ringInner: {
        flex: 1, width: '100%', borderRadius: 55,
        backgroundColor: '#0c0f14',
        alignItems: 'center', justifyContent: 'center',
    },
    ringPercent: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    ringLabel: { color: '#555', fontSize: 8, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
    heroStats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    heroStatItem: { alignItems: 'center', gap: 4 },
    heroStatNumber: { color: '#fff', fontSize: 22, fontWeight: '800' },
    heroStatLabel: { color: '#555', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    heroStatDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.07)' },

    // Stat Cards
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    cardGradientBorder: { borderRadius: 18, padding: 1 },
    cardInner: { backgroundColor: '#0f0f12', borderRadius: 17, padding: 14, alignItems: 'flex-start' },
    cardIconWrapper: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    cardValue: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 3 },
    cardTitle: { fontSize: 11, color: '#555', fontWeight: '500' },

    // Sections
    section: { marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginLeft: 2 },
    sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },
    sectionPill: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    sectionPillText: { color: '#666', fontSize: 11, fontWeight: '600' },
    sectionCard: { backgroundColor: '#0f0f12', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 20 },

    // Genre bars
    progressRow: { marginBottom: 16 },
    progressLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    progressDot: { width: 10, height: 10, borderRadius: 5 },
    progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1, fontWeight: '500' },
    progressCountBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    progressCount: { fontSize: 12, fontWeight: '700' },
    progressTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginLeft: 18 },
    progressBar: { height: '100%', borderRadius: 3 },

    // Tools
    toolsGrid: { flexDirection: 'row', gap: 10 },
    toolBtnWrap: { flex: 1 },
    toolBtn: { borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 16, alignItems: 'center', gap: 6 },
    toolIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    toolBtnTitle: { fontWeight: '700', fontSize: 13, textAlign: 'center' },
    toolBtnSub: { color: '#444', fontSize: 10, textAlign: 'center', lineHeight: 14 },

    // Toast
    inlineToast: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 12,
        borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
        padding: 12, marginHorizontal: 2, marginBottom: 12,
    },
    inlineToastText: { color: '#22C55E', fontSize: 13, flex: 1 },

    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)' },
    modalBox: {
        backgroundColor: '#18181B', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: 40,
        borderTopWidth: 1, borderColor: '#2a2a35',
        alignItems: 'center', maxHeight: '70%', overflow: 'hidden',
    },
    modalHeaderGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
    modalCloseBtn: {
        position: 'absolute', top: 16, right: 16,
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center', justifyContent: 'center',
    },
    modalIconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    modalTitle: { color: '#fff', fontWeight: '700', fontSize: 18, marginTop: 12, marginBottom: 4 },
    modalSubtitle: { color: '#555', fontSize: 13, marginBottom: 16 },
    resultsList: { width: '100%', maxHeight: 300 },
    resultRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    resultIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    resultTitle: { flex: 1, color: '#ccc', fontSize: 13 },
    resultBadgeWrap: { backgroundColor: 'rgba(34,211,238,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    resultBadge: { color: Colors.neon.accent, fontSize: 12, fontWeight: '700' },
});
