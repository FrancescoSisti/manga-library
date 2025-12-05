import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Icon mapping for tabs
const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    index: 'home',
    search: 'search',
    wishlist: 'heart',
};

function TabBarIcon({ name, focused, color }: { name: keyof typeof Ionicons.glyphMap, focused: boolean, color: string }) {
    const scale = useSharedValue(1);

    useEffect(() => {
        scale.value = withSpring(focused ? 1.15 : 1, { damping: 10, stiffness: 100 });
    }, [focused]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={animatedStyle}>
            <Ionicons name={focused ? name : `${name}-outline` as any} size={22} color={color} />
        </Animated.View>
    );
}

export function NeonTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const router = useRouter();

    const handleScannerPress = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        router.push('/scanner');
    };

    const handleTabPress = (routeName: string, routeKey: string, isFocused: boolean) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

    return (
        <View style={styles.container}>
            {/* Dark background */}
            <View style={styles.background} />
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />

            <View style={styles.content}>
                {/* Home Tab */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => handleTabPress('index', state.routes[0].key, state.index === 0)}
                >
                    <TabBarIcon
                        name="home"
                        focused={state.index === 0}
                        color={state.index === 0 ? Colors.neon.primary : 'rgba(255,255,255,0.5)'}
                    />
                    <Text style={[styles.tabLabel, state.index === 0 && styles.tabLabelActive]}>Home</Text>
                </TouchableOpacity>

                {/* Search Tab */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => handleTabPress('search', state.routes[1].key, state.index === 1)}
                >
                    <TabBarIcon
                        name="search"
                        focused={state.index === 1}
                        color={state.index === 1 ? Colors.neon.primary : 'rgba(255,255,255,0.5)'}
                    />
                    <Text style={[styles.tabLabel, state.index === 1 && styles.tabLabelActive]}>Search</Text>
                </TouchableOpacity>

                {/* Scanner Button - Center */}
                <TouchableOpacity
                    style={styles.scannerBtn}
                    onPress={handleScannerPress}
                    activeOpacity={0.8}
                >
                    <Ionicons name="scan-outline" size={26} color="#fff" />
                </TouchableOpacity>

                {/* Wishlist Tab */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => handleTabPress('wishlist', state.routes[2].key, state.index === 2)}
                >
                    <TabBarIcon
                        name="heart"
                        focused={state.index === 2}
                        color={state.index === 2 ? Colors.neon.primary : 'rgba(255,255,255,0.5)'}
                    />
                    <Text style={[styles.tabLabel, state.index === 2 && styles.tabLabelActive]}>Wishlist</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        height: 70,
        borderRadius: 35,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(12, 12, 16, 0.95)',
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 10,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    tabLabel: {
        fontSize: 10,
        marginTop: 4,
        color: 'rgba(255,255,255,0.5)',
    },
    tabLabelActive: {
        color: Colors.neon.primary,
        fontWeight: '600',
    },
    scannerBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.neon.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
        shadowColor: Colors.neon.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    },
});
