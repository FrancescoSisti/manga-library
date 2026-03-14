import { getLibraryStats, getWishlist, LibraryStats } from '@/components/database';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Dimensions, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

function StatCard({ title, value, icon, delay, isPrimary = false }: { title: string, value: string | number, icon: string, delay: number, isPrimary?: boolean }) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).springify()} style={[styles.cardContainer, isPrimary && styles.cardPrimary]}>
            <LinearGradient
                colors={isPrimary
                    ? [Colors.neon.primary + '20', Colors.neon.secondary + '20']
                    : ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.cardIcon}>
                    <Ionicons name={icon as any} size={20} color={isPrimary ? Colors.neon.primary : 'rgba(255,255,255,0.7)'} />
                </View>
                <Text style={styles.cardValue}>{value}</Text>
                <Text style={styles.cardTitle}>{title}</Text>
            </LinearGradient>
        </Animated.View>
    );
}

function ProgressBar({ label, percent, count, color, delay }: { label: string, percent: number, count: number, color: string, delay: number }) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.progressRow}>
            <View style={styles.progressLabelContainer}>
                <Text style={styles.progressLabel}>{label}</Text>
                <Text style={styles.progressPercent}>{count} ({percent}%)</Text>
            </View>
            <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${percent}%`, backgroundColor: color, shadowColor: color }]} />
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
        topGenres: []
    });
    const [wishlistCount, setWishlistCount] = useState(0);
    const [completionRate, setCompletionRate] = useState(0);

    useFocusEffect(
        useCallback(() => {
            const loadStats = () => {
                const libStats = getLibraryStats();
                const wishlist = getWishlist();

                setStats(libStats);
                setWishlistCount(wishlist.length);

                if (libStats.totalVolumes > 0) {
                    setCompletionRate(Math.round((libStats.totalOwnedVolumes / libStats.totalVolumes) * 100));
                } else {
                    setCompletionRate(0);
                }
            };

            loadStats();
        }, [])
    );

    // Genre colors for visualization
    const GENRE_COLORS = ['#D946EF', '#8B5CF6', '#22D3EE', '#F43F5E', '#10B981'];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={[Colors.neon.background, '#0f0f12']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Header */}
                    <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
                        <Text style={styles.headerTitle}>Statistiche</Text>
                        <Text style={styles.headerSubtitle}>La tua libreria in numeri</Text>
                    </Animated.View>

                    {/* Main Stats Grid */}
                    <View style={styles.grid}>
                        <StatCard title="Volumi Totali" value={stats.totalOwnedVolumes} icon="library" delay={200} isPrimary />
                        <StatCard title="Serie" value={stats.totalSeries} icon="albums" delay={300} />
                        <StatCard title="In Wishlist" value={wishlistCount} icon="heart" delay={400} />
                        <StatCard title="Valore Totale" value={`€${stats.totalValue.toFixed(2)}`} icon="wallet" delay={500} />
                    </View>

                    {/* Genre Distribution */}
                    {stats.topGenres.length > 0 && (
                        <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>Generi Preferiti</Text>
                            <View style={styles.glassSection}>
                                <LinearGradient
                                    colors={['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']}
                                    style={styles.sectionGradient}
                                >
                                    {stats.topGenres.map((g, i) => (
                                        <ProgressBar
                                            key={g.name}
                                            label={g.name}
                                            percent={g.percent}
                                            count={g.count}
                                            color={GENRE_COLORS[i % GENRE_COLORS.length]}
                                            delay={700 + (i * 100)}
                                        />
                                    ))}
                                </LinearGradient>
                            </View>
                        </Animated.View>
                    )}

                    {/* Reading Goal / Completion Status */}
                    <Animated.View entering={FadeInDown.delay(stats.topGenres.length > 0 ? 1000 : 600).springify()} style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Stato Collezione</Text>
                        <View style={styles.goalCard}>
                            <LinearGradient
                                colors={['rgba(139,92,246,0.15)', 'rgba(139,92,246,0.05)']}
                                style={styles.goalGradient}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                                <View style={styles.goalInfo}>
                                    <Text style={styles.goalText}>Hai collezionato il <Text style={{ color: Colors.neon.accent, fontWeight: 'bold' }}>{completionRate}%</Text> dei volumi totali previsti.</Text>
                                    <View style={styles.goalProgressTrack}>
                                        <LinearGradient
                                            colors={[Colors.neon.accent, Colors.neon.secondary]}
                                            style={[styles.goalProgressBar, { width: `${Math.min(completionRate, 100)}%` }]}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                        />
                                    </View>
                                </View>
                            </LinearGradient>
                        </View>
                    </Animated.View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.neon.background,
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    header: {
        marginBottom: 30,
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 30,
    },
    cardContainer: {
        width: (width - 52) / 2, // 2 columns with padding/gap
        height: 110,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#18181B', // Fallback
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    cardPrimary: {
        borderColor: Colors.neon.primary + '50',
    },
    cardGradient: {
        flex: 1,
        padding: 16,
        justifyContent: 'space-between',
    },
    cardIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: 8,
    },
    cardTitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '500',
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 12,
        marginLeft: 4,
    },
    glassSection: {
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    sectionGradient: {
        padding: 20,
    },
    progressRow: {
        marginBottom: 16,
    },
    progressLabelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '500',
    },
    progressPercent: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    progressTrack: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    goalCard: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(139,92,246,0.3)',
    },
    goalGradient: {
        padding: 24,
    },
    goalInfo: {
        width: '100%',
    },
    goalText: {
        color: '#E4E4E7',
        fontSize: 16,
        marginBottom: 16,
        lineHeight: 24,
    },
    goalProgressTrack: {
        height: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    goalProgressBar: {
        height: '100%',
        borderRadius: 4,
    }
});
