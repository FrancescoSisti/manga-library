/**
 * NeonTabBar — "Sliding Color Pill" design
 *
 * A single gradient pill slides horizontally between tab positions.
 * The pill's color transitions between each tab's accent color as it moves.
 * Active icons turn white (sitting on top of the pill); inactive icons are near-invisible.
 * The scanner floats above the center gap as an elevated gradient button.
 */

import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

// ─── Layout constants ─────────────────────────────────────────────────────────

const SW = Dimensions.get('window').width;
const BAR_MARGIN  = 16;
const BAR_W       = SW - BAR_MARGIN * 2;
const BAR_H       = 64;
const BOTTOM      = 20;
const N_SLOTS     = 5;            // 4 tabs + 1 scanner gap
const SLOT_W      = BAR_W / N_SLOTS;
const PILL_W      = SLOT_W - 10;  // 5 px gap on each side
const PILL_H      = BAR_H - 16;   // 8 px top/bottom

const SPRING = { damping: 24, stiffness: 260, mass: 0.45 };

// ─── Per-tab config ───────────────────────────────────────────────────────────

const ROUTE_SLOT: Record<string, number> = {
    index:    0,
    search:   1,
    stats:    3,
    wishlist: 4,
};

const ROUTE_COLOR: Record<string, string> = {
    index:    Colors.neon.primary,
    search:   Colors.neon.secondary,
    stats:    Colors.neon.accent,
    wishlist: '#F43F5E',
};

const ROUTE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
    index:    'home',
    search:   'search',
    stats:    'bar-chart',
    wishlist: 'heart',
};

const ROUTE_LABEL: Record<string, string> = {
    index:    'Library',
    search:   'Search',
    stats:    'Stats',
    wishlist: 'Wishlist',
};

const TAB_ROUTES = ['index', 'search', 'stats', 'wishlist'] as const;

/** Leftmost X of the pill when centered in a given slot */
function pillX(route: string) {
    return ROUTE_SLOT[route] * SLOT_W + 5;
}

// Ordered x-positions & colors for interpolateColor
const INTERP_X      = TAB_ROUTES.map(pillX);          // [x0, x1, x2, x3]
const INTERP_COLORS = TAB_ROUTES.map(r => ROUTE_COLOR[r]); // matching colors

// ─── Tab item (stateless — pill handles the "active" visual) ──────────────────

function TabItem({
    route,
    focused,
    onPress,
}: {
    route: string;
    focused: boolean;
    onPress: () => void;
}) {
    const icon      = ROUTE_ICON[route];
    const label     = ROUTE_LABEL[route];
    const accentCol = ROUTE_COLOR[route];

    return (
        <TouchableOpacity
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
        >
            <Ionicons
                name={focused ? icon : (`${icon}-outline` as any)}
                size={22}
                color={focused ? '#fff' : 'rgba(255,255,255,0.18)'}
            />
            <Text
                style={[
                    styles.tabLabel,
                    { color: focused ? accentCol : 'rgba(255,255,255,0.15)' },
                ]}
                numberOfLines={1}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}

// ─── Scanner button ───────────────────────────────────────────────────────────

function ScannerButton({ onPress }: { onPress: () => void }) {
    const scale = useSharedValue(1);

    const pressIn  = () => { scale.value = withSpring(0.86, { damping: 10 }); };
    const pressOut = () => { scale.value = withSpring(1.0, { damping: 10 }); onPress(); };

    const anim = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <View style={styles.scannerWrap}>
            {/* Pulsing outer ring */}
            <View style={styles.scannerRing} />
            <TouchableOpacity onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1}>
                <Animated.View style={[styles.scannerBtn, anim]}>
                    <LinearGradient
                        colors={[Colors.neon.primary, Colors.neon.secondary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.scannerGrad}
                    >
                        <Ionicons name="scan-outline" size={22} color="#fff" />
                    </LinearGradient>
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NeonTabBar({ state, navigation }: BottomTabBarProps) {
    const router      = useRouter();
    const activeRoute = state.routes[state.index].name;

    // Shared value drives both position AND color of the pill
    const px = useSharedValue(pillX(activeRoute));

    useEffect(() => {
        px.value = withSpring(pillX(activeRoute), SPRING);
    }, [activeRoute]);

    const pillStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: px.value }],
        backgroundColor: interpolateColor(px.value, INTERP_X, INTERP_COLORS),
    }));

    // Subtle glow beneath the pill — same color, blurred/opaque
    const glowStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: px.value }],
        shadowColor: interpolateColor(px.value, INTERP_X, INTERP_COLORS),
    }));

    const press = (name: string, key: string, focused: boolean) => {
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        const evt = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
        if (!focused && !evt.defaultPrevented) navigation.navigate(name);
    };

    const idx = (name: string) => state.routes.findIndex(r => r.name === name);

    return (
        <View style={styles.root}>
            {/* ── Bar ─────────────────────────────────── */}
            <View style={styles.bar}>
                {/* Background */}
                <LinearGradient
                    colors={['rgba(13,13,17,0.97)', 'rgba(7,7,10,0.99)']}
                    style={StyleSheet.absoluteFill}
                />
                {/* 1-px top highlight */}
                <View style={styles.topEdge} />

                {/* Sliding pill — behind icons via z-order */}
                <View style={styles.pillLayer} pointerEvents="none">
                    {/* Glow shadow beneath pill */}
                    <Animated.View style={[styles.pillGlow, glowStyle]} />
                    {/* The pill itself */}
                    <Animated.View style={[styles.pill, pillStyle]} />
                </View>

                {/* Tab grid */}
                <View style={styles.grid}>
                    <TabItem route="index"    focused={state.index === 0}            onPress={() => press('index',    state.routes[0].key,            state.index === 0)} />
                    <TabItem route="search"   focused={state.index === 1}            onPress={() => press('search',   state.routes[1].key,            state.index === 1)} />
                    {/* Scanner gap */}
                    <View style={styles.scannerGap} />
                    <TabItem route="stats"    focused={state.index === idx('stats')}    onPress={() => press('stats',    state.routes[idx('stats')].key,    state.index === idx('stats'))} />
                    <TabItem route="wishlist" focused={state.index === idx('wishlist')} onPress={() => press('wishlist', state.routes[idx('wishlist')].key, state.index === idx('wishlist'))} />
                </View>
            </View>

            {/* ── Floating scanner ─────────────────────── */}
            <View style={styles.scannerPositioner} pointerEvents="box-none">
                <ScannerButton onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/scanner');
                }} />
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        position: 'absolute',
        bottom: BOTTOM,
        left: BAR_MARGIN,
        right: BAR_MARGIN,
        height: BAR_H,
        alignItems: 'center',
    },

    // Bar shell
    bar: {
        width: '100%',
        height: '100%',
        borderRadius: 34,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.6,
        shadowRadius: 28,
        elevation: 18,
    },
    topEdge: {
        position: 'absolute',
        top: 0, left: 20, right: 20,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderRadius: 1,
    },

    // Sliding pill layer (sits between bar BG and icons)
    pillLayer: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0,
        // width not needed — children are absolutely positioned
    },
    pillGlow: {
        position: 'absolute',
        top: (BAR_H - PILL_H) / 2 + 2,
        width: PILL_W,
        height: PILL_H,
        borderRadius: PILL_H / 2,
        opacity: 0.35,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 16,
        elevation: 0,
    },
    pill: {
        position: 'absolute',
        top: (BAR_H - PILL_H) / 2,
        width: PILL_W,
        height: PILL_H,
        borderRadius: PILL_H / 2,
        opacity: 0.88,
    },

    // Tab grid
    grid: {
        flex: 1,
        flexDirection: 'row',
        zIndex: 1,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        paddingVertical: 6,
    },
    tabLabel: {
        fontSize: 10,
        fontFamily: 'SpaceGrotesk_600SemiBold',
        letterSpacing: 0.2,
    },
    scannerGap: {
        flex: 1,
    },

    // Scanner button
    scannerPositioner: {
        position: 'absolute',
        bottom: 8,
        left: 0, right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    scannerWrap: {
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scannerRing: {
        position: 'absolute',
        width: 56, height: 56,
        borderRadius: 28,
        borderWidth: 1.5,
        borderColor: Colors.neon.primary + '40',
        shadowColor: Colors.neon.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
    },
    scannerBtn: {
        width: 46, height: 46,
        borderRadius: 23,
        overflow: 'hidden',
        shadowColor: Colors.neon.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.7,
        shadowRadius: 12,
        elevation: 10,
    },
    scannerGrad: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
