import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, ImageStyle, StyleSheet, View } from 'react-native';

interface Props {
    uri: string | null | undefined;
    style?: ImageStyle | ImageStyle[];
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
    iconSize?: number;
    blurRadius?: number;
}

export function CoverImage({ uri, style, resizeMode = 'cover', iconSize = 32, blurRadius }: Props) {
    const [error, setError] = useState(false);

    if (!uri || error) {
        return (
            <View style={[styles.placeholder, style as any]}>
                <Ionicons name="book-outline" size={iconSize} color="#444" />
            </View>
        );
    }

    return (
        <Image
            source={{ uri }}
            style={style}
            resizeMode={resizeMode}
            blurRadius={blurRadius}
            onError={() => setError(true)}
        />
    );
}

const styles = StyleSheet.create({
    placeholder: {
        backgroundColor: '#1a1a1a',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
