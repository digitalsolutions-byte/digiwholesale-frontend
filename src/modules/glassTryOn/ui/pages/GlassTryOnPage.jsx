import { useState, useEffect } from 'react';
import { useGlassTryOn } from '../../application/hooks/useGlassTryOn';
import { useCamera } from '../../application/hooks/useCamera';
import { TRYON_TABS } from '../../constants';
import { SAMPLE_MODELS } from '../../constants/sampleModels';
import FacePreview from '../components/FacePreview';
import UploadImage from '../components/UploadImage';
import TryOnToolbar from '../components/TryOnToolbar';
import GlassCarousel from '../components/GlassCarousel';
import SaveDialog from '../dialogs/SaveDialog';

export default function GlassTryOnPage({ apiAdapter }) {
    const [glasses, setGlasses] = useState([]);
    const [isLoadingGlasses, setIsLoadingGlasses] = useState(true);
    const [activeTab, setActiveTab] = useState(TRYON_TABS.MODELS);
    const [savedSnapshotUrl, setSavedSnapshotUrl] = useState(null);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

    // Main Try-On Coordinator Hook
    const {
        canvasRef,
        selectedGlass,
        setSelectedGlass,
        faceSourceUrl,
        setFaceSourceUrl,
        transforms,
        updateTransform,
        resetTransforms,
        hideGlasses,
        setHideGlasses,
        getSnapshotDataUrl,
        canvasEvents,
        isDragging,
    } = useGlassTryOn({
        initialFaceUrl: SAMPLE_MODELS[0]?.imageUrl,
    });

    // Camera Hook
    const {
        videoRef: cameraVideoRef,
        isStreaming: isCameraActive,
        startCamera,
        stopCamera,
        captureSnapshot,
    } = useCamera();

    // Fetch Glasses via API adapter on mount
    useEffect(() => {
        let isMounted = true;
        const fetchCatalog = async () => {
            setIsLoadingGlasses(true);
            try {
                if (apiAdapter?.getGlasses) {
                    const res = await apiAdapter.getGlasses();
                    if (isMounted && res?.data) {
                        setGlasses(res.data);
                        if (res.data.length > 0) {
                            setSelectedGlass((current) => current || res.data[0]);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load glasses catalog:', err);
            } finally {
                if (isMounted) setIsLoadingGlasses(false);
            }
        };

        fetchCatalog();
        return () => {
            isMounted = false;
        };
    }, [apiAdapter, setSelectedGlass]);

    // Handle Camera Snapshot to Face Source
    const handleStartCamera = async () => {
        await startCamera();
    };

    const handleSelectFace = (faceUrl) => {
        if (isCameraActive) {
            stopCamera();
        }
        setFaceSourceUrl(faceUrl);
    };

    // When Camera is active, continuously capture frame or set snapshot
    useEffect(() => {
        if (!isCameraActive) return;

        const interval = setInterval(() => {
            const snap = captureSnapshot();
            if (snap) {
                setFaceSourceUrl(snap);
            }
        }, 120);

        return () => clearInterval(interval);
    }, [isCameraActive, captureSnapshot, setFaceSourceUrl]);

    // Save & Download Action
    const handleOpenSaveDialog = () => {
        const snapshot = getSnapshotDataUrl();
        if (snapshot) {
            setSavedSnapshotUrl(snapshot);
            setIsSaveModalOpen(true);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </span>
                        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                            Virtual Glass Try-On Studio
                        </h1>
                    </div>
                    <p className="text-xs font-medium text-gray-500 mt-1">
                        Select a model or upload a photo to preview optical frames & sunglasses in real-time
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={resetTransforms}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                    >
                        Reset Alignment
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenSaveDialog}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Export Look
                    </button>
                </div>
            </div>

            {/* Main Studio Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Interactive Canvas & Calibration Controls */}
                <div className="lg:col-span-7 space-y-4">
                    {/* Viewport Canvas */}
                    <FacePreview
                        canvasRef={canvasRef}
                        canvasEvents={canvasEvents}
                        selectedGlass={selectedGlass}
                        isCameraActive={isCameraActive}
                        cameraVideoRef={cameraVideoRef}
                        onStopCamera={stopCamera}
                        isDragging={isDragging}
                    />

                    {/* Calibration & Micro-Fit Toolbar */}
                    <TryOnToolbar
                        transforms={transforms}
                        updateTransform={updateTransform}
                        resetTransforms={resetTransforms}
                        hideGlasses={hideGlasses}
                        setHideGlasses={setHideGlasses}
                        onSaveSnapshot={handleOpenSaveDialog}
                    />
                </div>

                {/* Right Column: Face Selection & Frame Catalog */}
                <div className="lg:col-span-5 space-y-4">
                    {/* Model & Photo Selector */}
                    <UploadImage
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        currentFaceUrl={faceSourceUrl}
                        onSelectFace={handleSelectFace}
                        onStartCamera={handleStartCamera}
                        isCameraActive={isCameraActive}
                    />

                    {/* Frame Catalog & Selector */}
                    <GlassCarousel
                        glasses={glasses}
                        selectedGlass={selectedGlass}
                        onSelectGlass={setSelectedGlass}
                        isLoading={isLoadingGlasses}
                    />
                </div>
            </div>

            {/* Save & Download Modal */}
            <SaveDialog
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                snapshotUrl={savedSnapshotUrl}
                selectedGlass={selectedGlass}
            />
        </div>
    );
}
