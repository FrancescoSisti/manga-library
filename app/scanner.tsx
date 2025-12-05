import { addSeries, getSeriesByTitle, toggleVolume } from '@/components/database';
import { getBestVolumeCount, ISBNLookupResult, lookupByISBN } from '@/components/googlebooks';
import { Toast } from '@/components/Toast';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';

export default function ScannerScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ISBNLookupResult | null>(null);
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, message: '', type: 'success' });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ visible: true, message, type });
    };

    const handleBarcodeScanned = async ({ data }: { data: string }) => {
        if (scanned || loading) return;

        setScanned(true);
        setLoading(true);

        try {
            const lookupResult = await lookupByISBN(data);
            setResult(lookupResult);

            if (!lookupResult.found) {
                showToast('Volume non trovato', 'error');
            }
        } catch (error) {
            showToast('Errore di ricerca', 'error');
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
                // addSeries returns the InsertResult which has lastInsertRowId
                const insertResult = await addSeries(
                    result.seriesTitle,
                    result.authors?.[0] || 'Unknown',
                    volumes,
                    'Unknown',
                    result.coverUrl || '',
                    result.description
                );
                seriesId = insertResult.lastInsertRowId;
                wasNewSeries = true;
            }

            // 3. Mark volume as owned
            if (seriesId && result.volumeNumber) {
                await toggleVolume(seriesId, result.volumeNumber, true);

                if (wasNewSeries) {
                    showToast(`${result.seriesTitle} aggiunta con Vol. ${result.volumeNumber}!`, 'success');
                } else {
                    showToast(`Vol. ${result.volumeNumber} aggiunto a ${result.seriesTitle}!`, 'success');
                }
            } else if (wasNewSeries) {
                showToast(`${result.seriesTitle} aggiunta!`, 'success');
            } else {
                showToast(`${result.seriesTitle} è già in libreria`, 'info');
            }

            // Reset for next scan
            setTimeout(() => {
                setResult(null);
                setScanned(false);
            }, 1500);
        } catch (error) {
            console.error(error);
            showToast('Errore durante l\'aggiunta', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleScanAgain = () => {
        setResult(null);
        setScanned(false);
    };

    // Permission handling
    if (!permission) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={Colors.neon.primary} />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Ionicons name="camera-outline" size={80} color={Colors.neon.primary} />
                <Text style={styles.permissionTitle}>Permesso Camera</Text>
                <Text style={styles.permissionText}>
                    Abbiamo bisogno del permesso per scansionare i codici a barre dei tuoi manga
                </Text>
                <Button mode="contained" onPress={requestPermission} style={styles.permissionBtn}>
                    Concedi Permesso
                </Button>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Back Button */}
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Camera */}
            <CameraView
                style={styles.camera}
                barcodeScannerSettings={{
                    barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Scanner Frame Overlay - Positioned absolutely on top of camera */}
            <View style={styles.scannerOverlay} pointerEvents="none">
                <View style={styles.scannerFrame}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <Text style={styles.scannerHint}>
                    Inquadra il codice a barre del volume
                </Text>
            </View>

            {/* Loading Overlay */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={Colors.neon.primary} />
                    <Text style={styles.loadingText}>Ricerca in corso...</Text>
                </View>
            )}

            {/* Result Card */}
            {result && result.found && !loading && (
                <View style={styles.resultCard}>
                    {result.coverUrl && (
                        <Image source={{ uri: result.coverUrl }} style={styles.resultCover} />
                    )}
                    <View style={styles.resultInfo}>
                        <Text style={styles.resultTitle} numberOfLines={2}>
                            {result.fullTitle}
                        </Text>
                        {result.authors && (
                            <Text style={styles.resultAuthor}>{result.authors[0]}</Text>
                        )}
                        {result.volumeNumber && (
                            <View style={styles.volumeBadge}>
                                <Text style={styles.volumeBadgeText}>Vol. {result.volumeNumber}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.resultActions}>
                        <TouchableOpacity style={styles.addBtn} onPress={handleAddToLibrary}>
                            <Ionicons name="add" size={20} color="#fff" />
                            <Text style={styles.addBtnText}>Aggiungi</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.scanAgainBtn} onPress={handleScanAgain}>
                            <Ionicons name="scan" size={18} color={Colors.neon.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Not Found Card */}
            {result && !result.found && !loading && (
                <View style={styles.notFoundCard}>
                    <Ionicons name="alert-circle" size={40} color="#EF4444" />
                    <Text style={styles.notFoundText}>Volume non trovato</Text>
                    <TouchableOpacity style={styles.scanAgainBtn} onPress={handleScanAgain}>
                        <Text style={styles.scanAgainText}>Scansiona di nuovo</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backBtn: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 100,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    camera: {
        flex: 1,
    },
    scannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    scannerFrame: {
        width: 280,
        height: 150,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: Colors.neon.primary,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 3,
        borderLeftWidth: 3,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 3,
        borderRightWidth: 3,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 3,
        borderRightWidth: 3,
    },
    scannerHint: {
        color: '#fff',
        marginTop: 30,
        fontSize: 14,
        textAlign: 'center',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 15,
        fontSize: 16,
    },
    resultCard: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        backgroundColor: Colors.neon.surface,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: Colors.neon.primary,
    },
    resultCover: {
        width: 60,
        height: 90,
        borderRadius: 8,
    },
    resultInfo: {
        flex: 1,
    },
    resultTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    resultAuthor: {
        color: '#888',
        fontSize: 13,
        marginTop: 4,
    },
    volumeBadge: {
        backgroundColor: Colors.neon.primary,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    volumeBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    resultActions: {
        flexDirection: 'column',
        gap: 8,
    },
    addBtn: {
        backgroundColor: Colors.neon.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        gap: 4,
    },
    addBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
    scanAgainBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    scanAgainText: {
        color: Colors.neon.primary,
        fontWeight: '600',
    },
    notFoundCard: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        backgroundColor: Colors.neon.surface,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    notFoundText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    permissionContainer: {
        flex: 1,
        backgroundColor: Colors.neon.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    permissionTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
    },
    permissionText: {
        color: '#888',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 22,
    },
    permissionBtn: {
        marginTop: 30,
        backgroundColor: Colors.neon.primary,
    },
});
