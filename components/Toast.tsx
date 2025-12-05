import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
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
    const progressWidth = useSharedValue(100);

    useEffect(() => {
        if (visible) {
            // Reset
            progressWidth.value = 100;

            // Simple slide in and fade
            translateY.value = withTiming(50, { duration: 250, easing: Easing.out(Easing.ease) });
            opacity.value = withTiming(1, { duration: 200 });

            // Animate progress bar
            progressWidth.value = withTiming(0, { duration: duration, easing: Easing.linear });

            const timeout = setTimeout(() => {
                // Simple slide out and fade
                translateY.value = withTiming(-100, { duration: 250, easing: Easing.in(Easing.ease) });
                opacity.value = withTiming(0, { duration: 200 }, () => {
                    runOnJS(onHide)();
                });
            }, duration);

            return () => clearTimeout(timeout);
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    if (!visible) return null;

    const glowColor = colors[type];

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <View style={[
                styles.glowWrapper,
                {
                    shadowColor: glowColor,
                    ...(Platform.OS === 'ios' ? {
                        shadowOpacity: 0.4,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 4 },
                    } : {
                        elevation: 6,
                    }),
                }
            ]}>
                <View style={[styles.blur, { borderColor: glowColor, backgroundColor: 'rgba(20, 20, 30, 0.98)' }]}>
                    <View style={[styles.iconContainer, { backgroundColor: glowColor }]}>
                        <Ionicons name={icons[type]} size={20} color="#fff" />
                    </View>
                    <View style={styles.contentContainer}>
                        <Text style={styles.message} numberOfLines={2}>{message}</Text>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressContainer}>
                        <Animated.View style={[styles.progressBar, { backgroundColor: glowColor }, progressStyle]} />
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 16,
        right: 16,
        zIndex: 9999,
        alignItems: 'center',
    },
    glowWrapper: {
        borderRadius: 16,
        width: width - 32,
    },
    blur: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 16,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
        overflow: 'hidden',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        flex: 1,
    },
    message: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    progressContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 2,
    },
});
