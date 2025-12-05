import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Dimensions, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

// Screen width for calculations
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Constants for layout
const TAB_BAR_MARGIN = 20;
const TAB_BAR_WIDTH = SCREEN_WIDTH - (TAB_BAR_MARGIN * 2);
const TAB_BAR_HEIGHT = 72;
const BOTTOM_OFFSET = 20;

// Animation Config
const SPRING_CONFIG = {
    damping: 15,
    stiffness: 150,
    mass: 0.6,
};

// --- Subcomponents ---

function TabIcon({
    name,
    focused,
    label
}: {
    name: keyof typeof Ionicons.glyphMap;
    focused: boolean;
    label: string
}) {
    const animation = useSharedValue(0);

    useEffect(() => {
        animation.value = withSpring(focused ? 1 : 0, SPRING_CONFIG);
    }, [focused]);

    const animatedStyle = useAnimatedStyle(() => {
        const translateY = interpolate(animation.value, [0, 1], [0, -3]);
        const scale = interpolate(animation.value, [0, 1], [1, 1.1]);
        return {
            transform: [{ translateY }, { scale }],
        };
    });

    const dotStyle = useAnimatedStyle(() => ({
        opacity: animation.value,
        transform: [{ scale: animation.value }],
    }));

    return (
        <View style={styles.tabInner}>
            <Animated.View style={animatedStyle}>
                <Ionicons
                    name={focused ? name : (`${name}-outline` as any)}
                    size={24}
                    color={focused ? Colors.neon.primary : 'rgba(255, 255, 255, 0.4)'}
                />
            </Animated.View>
            <Animated.View style={[styles.activeDot, dotStyle]} />
        </View>
    );
}

function ScannerButton({ onPress }: { onPress: () => void }) {
    const scale = useSharedValue(1);

    const handlePressIn = () => {
        scale.value = withSpring(0.9, { damping: 10 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 10 });
        onPress();
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <View style={styles.scannerContainer}>
            <TouchableOpacity
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                style={styles.scannerTouch}
            >
                <Animated.View style={[styles.scannerCircle, animatedStyle]}>
                    <LinearGradient
                        colors={[Colors.neon.primary, Colors.neon.secondary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.scannerGradient}
                    >
                        <Ionicons name="scan" size={30} color="#FFF" />
                    </LinearGradient>
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
}


// --- Main Component ---

export function NeonTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const router = useRouter();

    const handleTabPress = (routeName: string, routeKey: string, isFocused: boolean) => {
        if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
        }

        const event = navigation.emit({
            type: 'tabPress',
            target: routeKey,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(routeName);
        }
    };

    const handleScannerPress = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        router.push('/scanner');
    };

    return (
        <View style={styles.rootContainer}>
            {/* The Glass Bar Background */}
            <View style={styles.glassBar}>
                <LinearGradient
                    colors={['rgba(20, 20, 23, 0.95)', 'rgba(30, 30, 35, 0.98)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.glassGradient}
                />

                {/* 1px Top highlight simulates glass edge */}
                <View style={styles.glassHighlight} />

                {/* Grid Layout Container */}
                <View style={styles.gridContainer}>
                    {/* Slot 1: HOME */}
                    <TouchableOpacity
                        style={styles.gridItem}
                        onPress={() => handleTabPress('index', state.routes[0].key, state.index === 0)}
                    >
                        <TabIcon name="home" label="Home" focused={state.index === 0} />
                    </TouchableOpacity>

                    {/* Slot 2: SEARCH */}
                    <TouchableOpacity
                        style={styles.gridItem}
                        onPress={() => handleTabPress('search', state.routes[1].key, state.index === 1)}
                    >
                        <TabIcon name="search" label="Cerca" focused={state.index === 1} />
                    </TouchableOpacity>

                    {/* Slot 3: EMPTY (Gap for Scanner) */}
                    <View style={styles.gridItem} pointerEvents="none" />

                    {/* Slot 4: STATS */}
                    <TouchableOpacity
                        style={styles.gridItem}
                        onPress={() => handleTabPress('stats', state.routes[state.routes.findIndex(r => r.name === 'stats')].key, state.index === state.routes.findIndex(r => r.name === 'stats'))}
                    >
                        <TabIcon name="bar-chart" label="Stats" focused={state.index === state.routes.findIndex(r => r.name === 'stats')} />
                    </TouchableOpacity>

                    {/* Slot 5: WISHLIST (Moved to end for symmetry) */}
                    <TouchableOpacity
                        style={styles.gridItem}
                        onPress={() => handleTabPress('wishlist', state.routes[state.routes.findIndex(r => r.name === 'wishlist')].key, state.index === state.routes.findIndex(r => r.name === 'wishlist'))}
                    >
                        <TabIcon name="heart" label="Wishlist" focused={state.index === state.routes.findIndex(r => r.name === 'wishlist')} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Floating Scanner Button - Absolutely Positioned in Center */}
            <View style={styles.scannerPositioner} pointerEvents="box-none">
                <ScannerButton onPress={handleScannerPress} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    rootContainer: {
        position: 'absolute',
        bottom: BOTTOM_OFFSET,
        left: TAB_BAR_MARGIN,
        right: TAB_BAR_MARGIN,
        height: TAB_BAR_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glassBar: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
        backgroundColor: 'rgba(20, 20, 23, 0.95)', // Fallback
    },
    glassGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    glassHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    gridContainer: {
        flexDirection: 'row',
        width: '100%',
        height: '100%',
    },
    gridItem: {
        flex: 1, // Divide width by 5 completely equally
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabInner: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        width: 50,
    },
    activeDot: {
        position: 'absolute',
        bottom: 5,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.neon.primary,
        shadowColor: Colors.neon.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
    },
    scannerPositioner: {
        position: 'absolute',
        bottom: 25, // Push it up so it floats above the bar
        left: 0,
        right: 0,
        alignItems: 'center', // This centers it horizontally in the rootContainer
        justifyContent: 'center',
        zIndex: 50,
    },
    scannerContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#09090B', // Gap fill (matches app background)
        alignItems: 'center',
        justifyContent: 'center',
        // Optional border to cut out the bar
        borderWidth: 4,
        borderColor: '#09090B', // Same as background to simulate "cutout"
    },
    scannerTouch: {
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scannerCircle: {
        width: 58,
        height: 58,
        borderRadius: 29,
        overflow: 'hidden',
        shadowColor: Colors.neon.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    },
    scannerGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
