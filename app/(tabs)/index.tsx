import { getSeries } from '@/components/database';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - 40) / COLUMN_COUNT;

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
      style={[styles.item, { backgroundColor: theme.colors.surface }]}
      onPress={() => router.push(`/series/${item.id}`)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.coverImage }} style={styles.cover} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.gradientOverlay}
      />
      <View style={styles.info}>
        <Text variant="titleMedium" numberOfLines={1} style={styles.title}>{item.title}</Text>
        <Text variant="labelSmall" style={{ color: Colors.neon.accent }}>
          {item.totalVolumes ? `${item.totalVolumes} VOLS` : 'ONGOING'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[Colors.neon.gradientStart, Colors.neon.background]}
        style={styles.backgroundGradient}
      />

      <View style={styles.headerContainer}>
        <Text variant="displaySmall" style={{ fontWeight: 'bold', color: '#fff' }}>My Library</Text>
        <Text variant="bodyLarge" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {series.length} Series Collected
        </Text>
      </View>

      <FlatList
        data={series}
        keyExtractor={(item) => item.id.toString()}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: '#fff', opacity: 0.5 }}>No manga yet.</Text>
            <Text style={{ color: Colors.neon.accent, marginTop: 10 }}>Go to Search to start your collection!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  list: {
    paddingHorizontal: 15,
    paddingBottom: 100,
  },
  item: {
    width: ITEM_WIDTH,
    margin: 5,
    borderRadius: 12,
    overflow: 'hidden',
    height: ITEM_WIDTH * 1.5,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  empty: {
    marginTop: 100,
    alignItems: 'center',
  }
});
