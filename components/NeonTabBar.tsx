/**
 * NeonTabBar — "Glassmorphism" style
 *
 * Bar trasparente con blur, FAB centrale a rounded-square.
 * Unica animazione: fade delicato sull'active state.
 */

import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

// ─── Costanti ─────────────────────────────────────────────────────────────────

const BAR_H    = 70;
const FAB_SIZE = 52;
const FADE_MS  = 180;

// ─── Config tab ───────────────────────────────────────────────────────────────

const ROUTE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
    index:    'book',
    search:   'search',
    stats:    'bar-chart',
    wishlist: 'heart',
};

const ROUTE_COLOR: Record<string, string> = {
    index:    Colors.neon.primary,
    search:   Colors.neon.secondary,
    stats:    Colors.neon.accent,
    wishlist: '#F43F5E',
};

// ─── Tab item ─────────────────────────────────────────────────────────────────

function TabItem({
    route,
    focused,
    onPress,
}: {
    route: string;
    focused: boolean;
    onPress: () => void;
}) {
    const opacity = useSharedValue(focused ? 1 : 0);

    // Aggiorna fade quando cambia focused
    opacity.value = withTiming(focused ? 1 : 0, { duration: FADE_MS });

    const activeStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const dimStyle = useAnimatedStyle(() => ({
        opacity: 1 - opacity.value * 0.65,
    }));

    return (
        <Pressable
            style={styles.tabItem}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
        >
            {/* Icona inattiva (sfuma fuori) */}
            <Animated.View style={[StyleSheet.absoluteFill, styles.tabInner, dimStyle]}>
                <Ionicons
                    name={`${ROUTE_ICON[route]}-outline` as any}
                    size={24}
                    color="rgba(255,255,255,0.35)"
                />
            </Animated.View>

            {/* Icona attiva (sfuma dentro) */}
            <Animated.View style={[StyleSheet.absoluteFill, styles.tabInner, activeStyle]}>
                <Ionicons
                    name={ROUTE_ICON[route]}
                    size={24}
                    color={ROUTE_COLOR[route]}
                />
            </Animated.View>
        </Pressable>
    );
}

// ─── FAB Scanner ──────────────────────────────────────────────────────────────

function ScannerFAB({ onPress }: { onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="Scan barcode"
            style={({ pressed }) => [styles.fabPressable, pressed && { opacity: 0.85, transform: [{ scale: 0.93 }] }]}
        >
            <LinearGradient
                colors={['#9F7AFF', Colors.neon.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fabGrad}
            >
                <Ionicons name="scan" size={26} color="#fff" />
            </LinearGradient>
        </Pressable>
    );
}

// ─── Componente principale ────────────────────────────────────────────────────

export function NeonTabBar({ state, navigation }: BottomTabBarProps) {
    const router = useRouter();

    const press = (name: string, key: string, focused: boolean) => {
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        const evt = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
        if (!focused && !evt.defaultPrevented) navigation.navigate(name);
    };

    const idx = (name: string) => state.routes.findIndex(r => r.name === name);

    const leftTabs  = ['index', 'search']   as const;
    const rightTabs = ['stats', 'wishlist']  as const;

    return (
        <View style={styles.root} pointerEvents="box-none">
            <BlurView intensity={60} tint="dark" style={styles.blurBar}>
                {/* Linea sottile in cima */}
                <View style={styles.topLine} />

                <View style={styles.row}>
                    {/* Tab sinistra */}
                    {leftTabs.map(route => (
                        <TabItem
                            key={route}
                            route={route}
                            focused={state.index === idx(route)}
                            onPress={() => press(route, state.routes[idx(route)].key, state.index === idx(route))}
                        />
                    ))}

                    {/* FAB centrale */}
                    <View style={styles.fabWrap}>
                        <ScannerFAB onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            router.push('/scanner');
                        }} />
                    </View>

                    {/* Tab destra */}
                    {rightTabs.map(route => (
                        <TabItem
                            key={route}
                            route={route}
                            focused={state.index === idx(route)}
                            onPress={() => press(route, state.routes[idx(route)].key, state.index === idx(route))}
                        />
                    ))}
                </View>
            </BlurView>
        </View>
    );
}

// ─── Stili ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },

    blurBar: {
        width: '100%',
        height: BAR_H + 20,
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(9,9,11,0.82)',
        overflow: 'hidden',
    },

    topLine: {
        position: 'absolute',
        top: 0,
        left: '15%',
        right: '15%',
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },

    row: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },

    tabItem: {
        flex: 1,
        height: '100%',
    },
    tabInner: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    // FAB
    fabWrap: {
        width: FAB_SIZE + 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fabPressable: {
        borderRadius: 18,
        shadowColor: Colors.neon.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.55,
        shadowRadius: 14,
        elevation: 12,
    },
    fabGrad: {
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
