import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - 50) / COLUMN_COUNT;

function SkeletonBox({ style }: { style?: object }) {
    const opacity = useSharedValue(0.4);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 700 }),
                withTiming(0.4, { duration: 700 })
            ),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return <Animated.View style={[{ backgroundColor: '#2a2a35', borderRadius: 8 }, style, animatedStyle]} />;
}

export function SkeletonLibraryCard() {
    return (
        <View style={styles.libraryCard}>
            <SkeletonBox style={StyleSheet.absoluteFillObject} />
            <View style={styles.libraryInfo}>
                <SkeletonBox style={styles.titleLine} />
                <SkeletonBox style={styles.subtitleLine} />
            </View>
        </View>
    );
}

export function SkeletonSearchCard() {
    return (
        <View style={styles.searchCard}>
            <SkeletonBox style={StyleSheet.absoluteFillObject} />
            <View style={styles.searchInfo}>
                <SkeletonBox style={styles.titleLine} />
                <SkeletonBox style={[styles.subtitleLine, { width: '50%' }]} />
                <SkeletonBox style={[styles.subtitleLine, { width: '30%', marginTop: 8 }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    libraryCard: {
        width: ITEM_WIDTH,
        height: ITEM_WIDTH * 1.55,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#111',
    },
    libraryInfo: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        gap: 6,
    },
    searchCard: {
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 14,
        backgroundColor: '#111',
    },
    searchInfo: {
        position: 'absolute',
        bottom: 14,
        left: 14,
        right: 14,
        gap: 6,
    },
    titleLine: {
        height: 14,
        borderRadius: 4,
        width: '80%',
    },
    subtitleLine: {
        height: 10,
        borderRadius: 4,
        width: '60%',
    },
});
