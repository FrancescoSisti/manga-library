import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'info' | 'wishlist';

interface ToastProps {
    visible: boolean;
    message: string;
    type?: ToastType;
    duration?: number;
    onHide: () => void;
}

const icons: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
    success: 'checkmark-circle',
    error: 'close-circle',
    info: 'information-circle',
    wishlist: 'heart',
};

const colors: Record<ToastType, string> = {
    success: '#22C55E',
    error: '#EF4444',
    info: Colors.neon.accent,
    wishlist: Colors.neon.primary,
};

export function Toast({ visible, message, type = 'success', duration = 2500, onHide }: ToastProps) {
    const translateY = useSharedValue(-100);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);

    useEffect(() => {
        if (visible) {
            translateY.value = withSpring(60, { damping: 15, stiffness: 120 });
            opacity.value = withTiming(1, { duration: 200 });
            scale.value = withSpring(1, { damping: 12 });

            const timeout = setTimeout(() => {
                translateY.value = withTiming(-100, { duration: 300, easing: Easing.inOut(Easing.ease) });
                opacity.value = withTiming(0, { duration: 300 }, () => {
                    runOnJS(onHide)();
                });
                scale.value = withTiming(0.8, { duration: 300 });
            }, duration);

            return () => clearTimeout(timeout);
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }, { scale: scale.value }],
        opacity: opacity.value,
    }));

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <BlurView intensity={80} tint="dark" style={styles.blur}>
                <View style={[styles.iconContainer, { backgroundColor: colors[type] }]}>
                    <Ionicons name={icons[type]} size={20} color="#fff" />
                </View>
                <Text style={styles.message} numberOfLines={2}>{message}</Text>
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        zIndex: 9999,
        alignItems: 'center',
    },
    blur: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        gap: 12,
        overflow: 'hidden',
        width: width - 40,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    message: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
});
