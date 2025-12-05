import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable, Text } from '@react-navigation/elements';
import { useLinkBuilder } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Icon mapping
const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    index: 'home',
    search: 'search',
    wishlist: 'heart',
};

function TabBarIcon({ name, focused, color }: { name: keyof typeof Ionicons.glyphMap, focused: boolean, color: string }) {
    const scale = useSharedValue(1);

    useEffect(() => {
        scale.value = withSpring(focused ? 1.2 : 1, { damping: 10, stiffness: 100 });
    }, [focused]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    return (
        <Animated.View style={animatedStyle}>
            <Ionicons name={focused ? name : `${name}-outline` as any} size={24} color={color} />
        </Animated.View>
    );
}

export function NeonTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { buildHref } = useLinkBuilder();

    return (
        <View style={styles.container}>
            {/* Solid dark background for opacity */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(9, 9, 11, 0.92)' }]} />
            <BlurView
                intensity={100}
                tint="dark"
                style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.content}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label =
                        options.tabBarLabel !== undefined
                            ? options.tabBarLabel
                            : options.title !== undefined
                                ? options.title
                                : route.name;

                    const isFocused = state.index === index;

                    const onPress = () => {
                        if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }

                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params);
                        }
                    };

                    const onLongPress = () => {
                        navigation.emit({
                            type: 'tabLongPress',
                            target: route.key,
                        });
                    };

                    const color = isFocused ? Colors.neon.primary : 'rgba(255,255,255,0.5)';
                    const iconName = icons[route.name] || 'help';

                    return (
                        <PlatformPressable
                            key={route.key}
                            href={buildHref(route.name, route.params)}
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            testID={options.tabBarButtonTestID}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            style={styles.item}
                        >
                            <TabBarIcon name={iconName} focused={isFocused} color={color} />
                            <Text style={{ color, fontSize: 10, marginTop: 4, fontWeight: isFocused ? '600' : '400' }}>
                                {typeof label === 'string' ? label : ''}
                            </Text>
                        </PlatformPressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10, // Android shadow
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 15,
    },
    item: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
    }
});
