import { addSeries } from '@/components/database';
import axios from 'axios';
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
                />
            </View>

            {loading && <ActivityIndicator animating={true} size="large" style={styles.loader} />}

            <FlatList
                data={results}
                keyExtractor={(item) => item.mal_id.toString()}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <Card style={styles.card} mode="elevated">
                        <Card.Cover source={{ uri: item.images?.jpg?.image_url }} />
                        <Card.Title
                            title={item.title}
                            subtitle={item.authors?.[0]?.name}
                            titleStyle={{ fontWeight: 'bold' }}
                        />
                        <Card.Content>
                            <Text variant="bodyMedium" numberOfLines={3}>{item.synopsis}</Text>
                            <View style={styles.stats}>
                                <Text variant="labelSmall">Volumes: {item.volumes || '?'}</Text>
                                <Text variant="labelSmall">Status: {item.status}</Text>
                            </View>
                        </Card.Content>
                        <Card.Actions>
                            <Button mode="contained" onPress={() => handleAddSeries(item)}>Add to Library</Button>
                        </Card.Actions>
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
    },
    searchContainer: {
        marginBottom: 10,
    },
    input: {
        backgroundColor: 'transparent',
    },
    loader: {
        marginTop: 20,
    },
    list: {
        paddingBottom: 20,
    },
    card: {
        marginBottom: 15,
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    }
});
