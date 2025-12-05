import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';

export default function WishlistScreen() {
    const theme = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.text, { color: theme.colors.onBackground }]}>Wishlist</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>Missing volumes will appear here.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
});
