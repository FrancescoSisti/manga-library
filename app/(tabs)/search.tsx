import { addSeries } from '@/components/database';
import { Colors } from '@/constants/Colors';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, FlatList, Keyboard, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Text, TextInput, useTheme } from 'react-native-paper';

export default function SearchScreen() {
    const theme = useTheme();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    const searchManga = async () => {
        if (!query) return;
        setLoading(true);
        Keyboard.dismiss();
        try {
            const response = await axios.get(`https://api.jikan.moe/v4/manga?q=${query}&limit=10`);
            setResults(response.data.data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch manga');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSeries = async (manga: any) => {
        try {
            // images.jpg.image_url is standard for Jikan
            const cover = manga.images?.jpg?.image_url;
            const author = manga.authors?.[0]?.name || 'Unknown';
            const status = manga.status || 'Unknown';

            await addSeries(manga.title, author, manga.volumes, status, cover);
            Alert.alert('Success', `${manga.title} added to library!`);
            // Optional: Navigate to home or stay
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Could not add series. It might already exist.');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.searchContainer}>
                <TextInput
                    mode="outlined"
                    placeholder="Search Manga (e.g. One Piece)"
                    value={query}
                    onChangeText={setQuery}
                    right={<TextInput.Icon icon="magnify" onPress={searchManga} />}
                    onSubmitEditing={searchManga}
                    style={styles.input}
                    textColor="#fff"
                    placeholderTextColor="gray"
                    theme={{ colors: { primary: Colors.neon.primary, outline: Colors.neon.outline } }}
                />
            </View>

            {loading && <ActivityIndicator animating={true} size="large" color={Colors.neon.primary} style={styles.loader} />}

            <FlatList
                data={results}
                keyExtractor={(item) => item.mal_id.toString()}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} mode="elevated">
                        <Card.Cover source={{ uri: item.images?.jpg?.image_url }} style={styles.cardCover} />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.95)']}
                            style={styles.cardGradient}
                        />
                        <View style={styles.cardContentOverlay}>
                            <View style={{ flex: 1 }}>
                                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#fff' }} numberOfLines={1}>{item.title}</Text>
                                <Text variant="bodySmall" style={{ color: Colors.neon.accent }}>{item.authors?.[0]?.name}</Text>
                                <View style={styles.stats}>
                                    <Text variant="labelSmall" style={{ color: '#ccc' }}>Vol: {item.volumes || '?'}</Text>
                                    <View style={styles.dot} />
                                    <Text variant="labelSmall" style={{ color: '#ccc' }}>{item.status}</Text>
                                </View>
                            </View>
                            <Button
                                mode="contained"
                                buttonColor={Colors.neon.primary}
                                onPress={() => handleAddSeries(item)}
                                compact
                                labelStyle={{ fontSize: 12 }}
                            >
                                Add
                            </Button>
                        </View>
                    </Card>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        paddingTop: 50,
    },
    searchContainer: {
        marginBottom: 10,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    loader: {
        marginTop: 20,
    },
    list: {
        paddingBottom: 20,
    },
    card: {
        marginBottom: 15,
        overflow: 'hidden',
        height: 200,
        borderRadius: 12,
        justifyContent: 'flex-end',
    },
    cardCover: {
        ...StyleSheet.absoluteFillObject,
        height: 200,
    },
    cardGradient: {
        ...StyleSheet.absoluteFillObject,
        height: 200,
    },
    cardContentOverlay: {
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#666',
        marginHorizontal: 6,
    }
});
