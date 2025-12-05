import { getSeriesById, getVolumes, toggleVolume } from '@/components/database';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ProgressBar, Text, useTheme } from 'react-native-paper';

export default function SeriesDetailScreen() {
    const { id } = useLocalSearchParams();
    const theme = useTheme();
    const navigation = useNavigation();
    const [series, setSeries] = useState<any>(null);
    const [volumes, setVolumes] = useState<any[]>([]);
    const [ownedCount, setOwnedCount] = useState(0);

    const loadData = () => {
        if (id) {
            const seriesData = getSeriesById(Number(id));
            setSeries(seriesData);
            if (seriesData) {
                navigation.setOptions({ title: seriesData.title });

                const volData = getVolumes(Number(id));
                setVolumes(volData);

                // Calculate owned count
                const owned = volData.filter((v: any) => v.isOwned === 1).length;
                setOwnedCount(owned);
            }
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

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
                <Image source={{ uri: series.coverImage }} style={styles.banner} blurRadius={5} />
                <Image source={{ uri: series.coverImage }} style={styles.poster} />
            </View>

            <View style={styles.content}>
                <Text variant="headlineSmall" style={styles.title}>{series.title}</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.secondary }}>{series.author}</Text>
                <Text variant="bodyMedium" style={{ marginTop: 5 }}>Status: {series.status}</Text>

                <View style={styles.progressContainer}>
                    <Text variant="labelMedium">Collection Progress ({ownedCount}/{series.totalVolumes || '?'})</Text>
                    <ProgressBar progress={series.totalVolumes ? ownedCount / series.totalVolumes : 0} color={theme.colors.primary} style={styles.progress} />
                </View>

                <Text variant="titleMedium" style={{ marginTop: 20, marginBottom: 10 }}>Volumes</Text>
                <View style={styles.grid}>
                    {grid.map(volNum => {
                        const isOwned = volumes.find(v => v.volumeNumber === volNum && v.isOwned === 1);
                        return (
                            <TouchableOpacity
                                key={volNum}
                                style={[
                                    styles.volBadge,
                                    {
                                        backgroundColor: isOwned ? theme.colors.primary : theme.colors.surfaceVariant,
                                        borderColor: isOwned ? theme.colors.primary : theme.colors.outline
                                    }
                                ]}
                                onPress={() => handleToggleVolume(volNum)}
                            >
                                <Text style={{ color: isOwned ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }}>{volNum}</Text>
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
        height: 250,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    banner: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.4,
    },
    poster: {
        width: 120,
        height: 180,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5,
    },
    content: {
        padding: 20,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 5,
    },
    progressContainer: {
        marginTop: 20,
    },
    progress: {
        height: 10,
        borderRadius: 5,
        marginTop: 5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    volBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    }
});
