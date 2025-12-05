import { getSeriesById, getVolumes, Series, toggleVolume, Volume } from '@/components/database';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ProgressBar, Text, useTheme } from 'react-native-paper';

import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

export default function SeriesDetailScreen() {
    const { id } = useLocalSearchParams();
    const theme = useTheme();
    const navigation = useNavigation();
    const [series, setSeries] = useState<Series | null>(null);
    const [volumes, setVolumes] = useState<Volume[]>([]);
    const [ownedCount, setOwnedCount] = useState(0);

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

    if (!series) {
        return <View style={styles.container}><Text>Loading...</Text></View>;
    }

    // Generate volume grid (assuming max 100 or totalVolumes)
    const totalVols = series.totalVolumes || 20; // Default to 20 if unknown for now
    const grid = Array.from({ length: totalVols }, (_, i) => i + 1);

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <Image source={{ uri: series.coverImage }} style={styles.banner} blurRadius={10} />
                <LinearGradient
                    colors={['transparent', theme.colors.background]}
                    style={styles.headerGradient}
                />
                <View style={styles.headerContent}>
                    <Image source={{ uri: series.coverImage }} style={styles.poster} />
                    <View style={styles.headerText}>
                        <Text variant="headlineSmall" style={styles.title} numberOfLines={2}>{series.title}</Text>
                        <Text variant="titleMedium" style={{ color: Colors.neon.accent }}>{series.author}</Text>
                        <View style={styles.badgeContainer}>
                            <Text variant="labelSmall" style={styles.badge}>{series.status}</Text>
                            <Text variant="labelSmall" style={[styles.badge, { backgroundColor: Colors.neon.secondary }]}>
                                {ownedCount}/{series.totalVolumes || '?'}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.progressContainer}>
                    <Text variant="labelMedium" style={{ marginBottom: 5 }}>Collection Progress</Text>
                    <ProgressBar
                        progress={series.totalVolumes ? ownedCount / series.totalVolumes : 0}
                        color={Colors.neon.primary}
                        style={styles.progress}
                    />
                </View>

                <Text variant="titleMedium" style={styles.sectionTitle}>Volumes</Text>
                <View style={styles.grid}>
                    {grid.map(volNum => {
                        const isOwned = volumes.find(v => v.volumeNumber === volNum && v.isOwned === 1);
                        return (
                            <TouchableOpacity
                                key={volNum}
                                activeOpacity={0.7}
                                style={[
                                    styles.volBadge,
                                    {
                                        backgroundColor: isOwned ? Colors.neon.primary : theme.colors.surface,
                                        borderColor: isOwned ? Colors.neon.primary : theme.colors.outline
                                    }
                                ]}
                                onPress={() => handleToggleVolume(volNum)}
                            >
                                <Text style={{
                                    color: isOwned ? '#fff' : theme.colors.onSurface,
                                    fontWeight: isOwned ? 'bold' : 'normal'
                                }}>{volNum}</Text>
                            </TouchableOpacity>
                        )
                    })}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 350,
        position: 'relative',
        justifyContent: 'flex-end',
    },
    banner: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.6,
    },
    headerGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    headerContent: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'flex-end',
    },
    poster: {
        width: 120,
        height: 180,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
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
        marginTop: 10,
        gap: 8,
    },
    badge: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: '#fff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    content: {
        padding: 20,
    },
    progressContainer: {
        marginBottom: 30,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 15,
        borderRadius: 12,
    },
    progress: {
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    sectionTitle: {
        marginBottom: 15,
        fontWeight: 'bold',
        color: Colors.neon.accent,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    volBadge: {
        width: 45,
        height: 45,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    }
});
