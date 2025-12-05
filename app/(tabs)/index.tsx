import { getSeries, Series } from '@/components/database';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - 50) / COLUMN_COUNT;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function HomeScreen() {
  const theme = useTheme();
  const [series, setSeries] = useState<Series[]>([]);

  useFocusEffect(
    useCallback(() => {
      const data = getSeries();
      setSeries(data);
    }, [])
  );

  const renderItem = ({ item, index }: { item: Series; index: number }) => (
    <AnimatedTouchable
      entering={FadeInDown.delay(index * 80).duration(400).springify()}
      layout={Layout.springify()}
      style={[styles.item, { backgroundColor: '#111' }]}
      onPress={() => router.push(`/series/${item.id}`)}
      activeOpacity={0.85}
    >
      <Image source={{ uri: item.coverImage }} style={styles.cover} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.gradientOverlay}
      />
      <View style={styles.info}>
        <Text variant="titleSmall" numberOfLines={2} style={styles.title}>{item.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.totalVolumes || '?'}</Text>
          </View>
          <Text variant="labelSmall" style={styles.statusText}>
            {item.status === 'Publishing' ? 'ONGOING' : item.status?.toUpperCase() || ''}
          </Text>
        </View>
      </View>
    </AnimatedTouchable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[Colors.neon.gradientStart, Colors.neon.background]}
        style={styles.backgroundGradient}
      />

      <Animated.View entering={FadeIn.duration(600)} style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <View>
            <Text variant="displaySmall" style={styles.headerTitle}>My Library</Text>
            <Text variant="bodyLarge" style={styles.headerSub}>
              {series.length} {series.length === 1 ? 'Series' : 'Series'} Collected
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="library" size={24} color={Colors.neon.primary} />
          </View>
        </View>
      </Animated.View>

      <FlatList
        data={series}
        keyExtractor={(item) => item.id.toString()}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="library-outline" size={60} color="#333" />
            <Text style={styles.emptyTitle}>No manga yet</Text>
            <Text style={styles.emptySubtitle}>Go to Search to start your collection!</Text>
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
  list: {
    paddingHorizontal: 15,
    paddingBottom: 120,
  },
  columnWrapper: {
    gap: 10,
    marginBottom: 10,
  },
  item: {
    width: ITEM_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    height: ITEM_WIDTH * 1.55,
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
    height: '60%',
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
    lineHeight: 18,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: Colors.neon.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusText: {
    color: Colors.neon.accent,
    fontSize: 10,
  },
  empty: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#555',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
  },
  emptySubtitle: {
    color: '#444',
    fontSize: 14,
    marginTop: 5,
  },
});
