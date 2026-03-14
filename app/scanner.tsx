import { addSeries, getSeriesByTitle, toggleVolume } from '@/components/database';
import { getBestVolumeCount, ISBNLookupResult, lookupByISBN } from '@/components/googlebooks';
import { CoverImage } from '@/components/CoverImage';
import { Toast } from '@/components/Toast';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';

export default function ScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const router = useRouter();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ISBNLookupResult | null>(null);
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, message: '', type: 'success' });

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ visible: true, message, type });
    };

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ marginBottom: 20, color: '#FFF' }}>Serve il permesso per usare la fotocamera</Text>
                <Button mode="contained" onPress={requestPermission}>Concedi Permesso</Button>
            </View>
        );
    }

    const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
        if (scanned || loading) return;

        setScanned(true);
        setLoading(true);
        try {
            const dataResult = await lookupByISBN(data);
            if (dataResult.found) {
                setResult(dataResult);
            } else {
                showToast('Manga not found', 'error');
                setTimeout(() => setScanned(false), 2000);
            }
        } catch (error) {
            showToast('Scan error', 'error');
            setScanned(false);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToLibrary = async () => {
        if (!result || !result.seriesTitle) return;

        setLoading(true);
        try {
            let seriesId: number | null = null;
            let wasNewSeries = false;

            // 1. Check if series exists
            const existingSeries = getSeriesByTitle(result.seriesTitle);

            if (existingSeries) {
                seriesId = existingSeries.id;
            } else {
                // 2. Add new series
                const volumes = await getBestVolumeCount(result.seriesTitle, null);
                const insertResult = await addSeries(
                    result.seriesTitle,
                    result.authors?.[0] || 'Unknown',
                    volumes,
                    'Unknown',
                    result.coverUrl || '',
                    result.description,
                    result.genres
                );
                seriesId = insertResult.lastInsertRowId;
                wasNewSeries = true;
            }

            // 3. Mark volume as owned
            if (seriesId && result.volumeNumber) {
                console.log('DEBUG: Saving volume', result.volumeNumber, 'with price:', result.price);
                await toggleVolume(seriesId, result.volumeNumber, true, result.price);

                if (wasNewSeries) {
                    showToast(`${result.seriesTitle} added with Vol. ${result.volumeNumber}!`, 'success');
                } else {
                    showToast(`Vol. ${result.volumeNumber} added to ${result.seriesTitle}!`, 'success');
                }
            } else if (wasNewSeries) {
                showToast(`${result.seriesTitle} added!`, 'success');
            } else {
                showToast(`${result.seriesTitle} is already in your library`, 'info');
            }

            // Reset for next scan
            setTimeout(() => {
                setResult(null);
                setScanned(false);
            }, 1500);
        } catch (error) {
            console.error(error);
            showToast('Error adding to library', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
            {!result ? (
                <>
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["ean13", "ean8"],
                        }}
                    />
                    <View style={styles.overlay}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.title}>Scansiona ISBN</Text>
                        </View>
                        <View style={styles.scanArea}>
                            <View style={styles.scanFrame} />
                            <Text style={styles.scanText}>Inquadra il codice a barre del manga</Text>
                        </View>
                    </View>
                </>
            ) : (
                <View style={styles.resultContainer}>
                    <CoverImage uri={result.coverUrl} style={styles.coverImage} resizeMode="contain" iconSize={48} />
                    <Text style={styles.resultTitle}>{result.fullTitle}</Text>
                    {result.seriesTitle && <Text style={styles.resultSeries}>{result.seriesTitle}</Text>}
                    {result.authors && <Text style={styles.resultAuthor}>{result.authors.join(', ')}</Text>}

                    {result.price && (
                        <Text style={styles.resultPrice}>Prezzo rilevato: €{result.price.toFixed(2)}</Text>
                    )}

                    <View style={styles.actions}>
                        <Button mode="contained" onPress={handleAddToLibrary} style={styles.confirmButton} buttonColor={Colors.neon.primary}>
                            Aggiungi alla Libreria
                        </Button>
                        <Button mode="outlined" onPress={() => { setResult(null); setScanned(false); }} style={styles.cancelButton} textColor="#FFF">
                            Annulla
                        </Button>
                    </View>
                </View>
            )}

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={Colors.neon.primary} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 20,
    },
    closeButton: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    title: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 20,
    },
    scanArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 280,
        height: 180,
        borderWidth: 2,
        borderColor: Colors.neon.primary,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    scanText: {
        color: '#FFF',
        marginTop: 20,
        opacity: 0.8,
    },
    resultContainer: {
        flex: 1,
        backgroundColor: '#000',
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    coverImage: {
        width: 200,
        height: 300,
        borderRadius: 10,
        marginBottom: 20,
    },
    resultTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    resultSeries: {
        color: Colors.neon.primary,
        fontSize: 16,
        marginBottom: 4,
    },
    resultAuthor: {
        color: '#AAA',
        fontSize: 14,
        marginBottom: 20,
    },
    resultPrice: {
        color: Colors.neon.accent,
        fontSize: 16,
        marginBottom: 20,
        fontWeight: 'bold',
    },
    actions: {
        width: '100%',
        gap: 10,
    },
    confirmButton: {
        paddingVertical: 6,
    },
    cancelButton: {
        borderColor: '#333',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
