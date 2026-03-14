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
    const [batchMode, setBatchMode] = useState(false);
    const [batchCount, setBatchCount] = useState(0);
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, message: '', type: 'success' });

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ visible: true, message, type });
    };

    if (!permission) return <View />;

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ marginBottom: 20, color: '#FFF' }}>Camera permission required</Text>
                <Button mode="contained" onPress={requestPermission}>Grant Permission</Button>
            </View>
        );
    }

    const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
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
        } catch {
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

            const existingSeries = getSeriesByTitle(result.seriesTitle);
            if (existingSeries) {
                seriesId = existingSeries.id;
            } else {
                const volumes = await getBestVolumeCount(result.seriesTitle, null);
                const ins = await addSeries(
                    result.seriesTitle,
                    result.authors?.[0] || 'Unknown',
                    volumes, 'Unknown',
                    result.coverUrl || '',
                    result.description,
                    result.genres
                );
                seriesId = ins.lastInsertRowId;
                wasNewSeries = true;
            }

            if (seriesId && result.volumeNumber) {
                await toggleVolume(seriesId, result.volumeNumber, true, result.price);
                if (wasNewSeries) {
                    showToast(`${result.seriesTitle} added · Vol. ${result.volumeNumber}`, 'success');
                } else {
                    showToast(`Vol. ${result.volumeNumber} → ${result.seriesTitle}`, 'success');
                }
            } else if (wasNewSeries) {
                showToast(`${result.seriesTitle} added!`, 'success');
            } else {
                showToast(`Already in library`, 'info');
            }

            if (batchMode) {
                // In batch mode: immediately reset for next scan
                setBatchCount(c => c + 1);
                setResult(null);
                setScanned(false);
            } else {
                setTimeout(() => {
                    setResult(null);
                    setScanned(false);
                }, 1500);
            }
        } catch (error) {
            console.error(error);
            showToast('Error adding to library', 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleBatchMode = () => {
        setBatchMode(b => !b);
        setBatchCount(0);
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
                        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8'] }}
                    />
                    <View style={styles.overlay}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.title}>Scan ISBN</Text>
                            <TouchableOpacity onPress={toggleBatchMode} style={[styles.batchToggle, batchMode && styles.batchToggleActive]}>
                                <Ionicons name="layers" size={18} color={batchMode ? Colors.neon.primary : '#aaa'} />
                                <Text style={[styles.batchToggleText, batchMode && { color: Colors.neon.primary }]}>
                                    Batch
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.scanArea}>
                            <View style={[styles.scanFrame, batchMode && styles.scanFrameBatch]} />
                            <Text style={styles.scanText}>Point at the barcode</Text>
                            {batchMode && (
                                <View style={styles.batchCounter}>
                                    <Ionicons name="checkmark-circle" size={16} color={Colors.neon.primary} />
                                    <Text style={styles.batchCounterText}>{batchCount} added this session</Text>
                                </View>
                            )}
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
                        <Text style={styles.resultPrice}>€{result.price.toFixed(2)}</Text>
                    )}
                    {batchMode && (
                        <View style={styles.batchBadge}>
                            <Ionicons name="layers" size={14} color={Colors.neon.primary} />
                            <Text style={styles.batchBadgeText}>Batch mode · {batchCount} added</Text>
                        </View>
                    )}
                    <View style={styles.actions}>
                        <Button mode="contained" onPress={handleAddToLibrary} style={styles.confirmButton} buttonColor={Colors.neon.primary}>
                            Add to Library
                        </Button>
                        <Button mode="outlined" onPress={() => { setResult(null); setScanned(false); }} style={styles.cancelButton} textColor="#FFF">
                            Cancel
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
    container: { flex: 1, backgroundColor: '#000' },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: 20,
    },
    iconBtn: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    title: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    batchToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    batchToggleActive: {
        borderColor: Colors.neon.primary,
        backgroundColor: 'rgba(217,70,239,0.15)',
    },
    batchToggleText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
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
    scanFrameBatch: {
        borderColor: Colors.neon.accent,
        shadowColor: Colors.neon.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
    },
    scanText: { color: '#FFF', marginTop: 20, opacity: 0.8 },
    batchCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 16,
        backgroundColor: 'rgba(217,70,239,0.2)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.neon.primary + '60',
    },
    batchCounterText: { color: Colors.neon.primary, fontWeight: '700', fontSize: 14 },
    resultContainer: {
        flex: 1,
        backgroundColor: '#000',
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    coverImage: { width: 200, height: 300, borderRadius: 10, marginBottom: 20 },
    resultTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
    resultSeries: { color: Colors.neon.primary, fontSize: 16, marginBottom: 4 },
    resultAuthor: { color: '#AAA', fontSize: 14, marginBottom: 16 },
    resultPrice: { color: Colors.neon.accent, fontSize: 16, marginBottom: 16, fontWeight: 'bold' },
    batchBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(217,70,239,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.neon.primary + '40',
    },
    batchBadgeText: { color: Colors.neon.primary, fontSize: 13, fontWeight: '600' },
    actions: { width: '100%', gap: 10 },
    confirmButton: { paddingVertical: 6 },
    cancelButton: { borderColor: '#333' },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
