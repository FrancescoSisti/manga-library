import { getSeries } from '@/components/database';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export default function HomeScreen() {
  const theme = useTheme();
  const [series, setSeries] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const data = getSeries();
      setSeries(data);
    }, [])
  );

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => router.push(`/series/${item.id}`)}
    >
      <Image source={{ uri: item.coverImage }} style={styles.cover} resizeMode="cover" />
      <View style={styles.info}>
        <Text variant="titleSmall" numberOfLines={1} style={{ textAlign: 'center' }}>{item.title}</Text>
        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
          Vol: {item.totalVolumes || '?'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={styles.header}>My Collection</Text>

      <FlatList
        data={series}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text>No manga yet. Go to Search to add some!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 10,
  },
  header: {
    marginBottom: 20,
    fontWeight: 'bold',
  },
  list: {
    paddingBottom: 80,
  },
  item: {
    flex: 1 / 3,
    margin: 5,
    marginBottom: 15,
    alignItems: 'center',
  },
  cover: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: 8,
    marginBottom: 5,
  },
  info: {
    alignItems: 'center',
    width: '100%',
  },
  empty: {
    marginTop: 50,
    alignItems: 'center',
  }
});
