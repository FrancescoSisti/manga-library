import { getLibraryStats, getWishlist, LibraryStats } from '@/components/database';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const GENRE_COLORS = [Colors.neon.primary, Colors.neon.secondary, Colors.neon.accent, '#F43F5E', '#10B981'];

function StatCard({ title, value, icon, color, delay }: {
    title: string;
    value: string | number;
    icon: string;
    color: string;
    delay: number;
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
    label: string;
    percent: number;
    count: number;
    color: string;
    delay: number;
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
        totalOwnedVolumes: 0,
        totalVolumes: 0,
        completedSeries: 0,
        totalSeries: 0,
        totalValue: 0,
        topGenres: [],
    });
    const [wishlistCount, setWishlistCount] = useState(0);
    const [completionRate, setCompletionRate] = useState(0);

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

    return (
        <View style={styles.container}>
            {/* Background gradient matching other pages */}
            <LinearGradient
                colors={[Colors.neon.gradientStart, Colors.neon.background]}
                style={styles.backgroundGradient}
            />

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

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Stat Cards Grid */}
                <View style={styles.grid}>
                    <StatCard
                        title="Volumes Owned"
                        value={stats.totalOwnedVolumes}
                        icon="library"
                        color={Colors.neon.primary}
                        delay={100}
                    />
                    <StatCard
                        title="Series"
                        value={stats.totalSeries}
                        icon="albums"
                        color={Colors.neon.secondary}
                        delay={180}
                    />
                    <StatCard
                        title="Completed"
                        value={stats.completedSeries}
                        icon="checkmark-circle"
                        color="#22C55E"
                        delay={260}
                    />
                    <StatCard
                        title="Wishlist"
                        value={wishlistCount}
                        icon="heart"
                        color="#F43F5E"
                        delay={340}
                    />
                    <StatCard
                        title="Total Value"
                        value={`€${stats.totalValue.toFixed(2)}`}
                        icon="wallet"
                        color={Colors.neon.accent}
                        delay={420}
                    />
                    <StatCard
                        title="Progress"
                        value={`${completionRate}%`}
                        icon="trending-up"
                        color="#F59E0B"
                        delay={500}
                    />
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
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
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

                <View style={{ height: 120 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.neon.background,
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
    scrollContent: {
        paddingHorizontal: 15,
        paddingBottom: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 24,
    },
    cardContainer: {
        width: (width - 50) / 3,
        backgroundColor: '#111',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        padding: 14,
        alignItems: 'flex-start',
    },
    cardIconWrapper: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    cardValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 3,
    },
    cardTitle: {
        fontSize: 11,
        color: '#555',
        fontWeight: '500',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontWeight: '700',
        color: '#fff',
        marginBottom: 12,
        marginLeft: 2,
    },
    sectionCard: {
        backgroundColor: '#111',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        padding: 20,
    },
    progressSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    progressSummaryItem: {
        alignItems: 'center',
        flex: 1,
    },
    progressSummaryNumber: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 4,
    },
    progressSummaryLabel: {
        color: '#555',
        fontSize: 12,
        fontWeight: '500',
    },
    progressSummaryDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.07)',
        marginVertical: 4,
    },
    bigProgressTrack: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    bigProgressBar: {
        height: '100%',
        borderRadius: 4,
    },
    progressRow: {
        marginBottom: 16,
    },
    progressLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    progressLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        flex: 1,
        fontWeight: '500',
    },
    progressCount: {
        fontSize: 13,
        fontWeight: '700',
    },
    progressTrack: {
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 3,
        overflow: 'hidden',
        marginLeft: 16,
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    },
});
