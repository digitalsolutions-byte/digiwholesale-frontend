import { useState, useEffect, useMemo } from 'react';
import { useGlassTryOn } from '../../application/hooks/useGlassTryOn';
import { useCamera } from '../../application/hooks/useCamera';
import { TRYON_TABS } from '../../constants';
import { SAMPLE_MODELS } from '../../constants/sampleModels';
import FacePreview from '../components/FacePreview';
import UploadImage from '../components/UploadImage';
import TryOnToolbar from '../components/TryOnToolbar';
import GlassCarousel from '../components/GlassCarousel';
import FaceShapeBadge from '../components/FaceShapeBadge';
import SaveDialog from '../dialogs/SaveDialog';
import UploadGlassDialog from '../dialogs/UploadGlassDialog';

export default function GlassTryOnPage({ apiAdapter }) {
    const [glasses, setGlasses] = useState([]);
    const [isLoadingGlasses, setIsLoadingGlasses] = useState(true);
    const [activeTab, setActiveTab] = useState(TRYON_TABS.MODELS);
    const [savedSnapshotUrl, setSavedSnapshotUrl] = useState(null);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [recommendedFilter, setRecommendedFilter] = useState(null);

    // Upgraded 2.5D Try-On Coordinator Hook
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
        showFaceMesh,
        setShowFaceMesh,
        faceShapeInfo,
        poseInfo,
        processLiveVideoFrame,
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

    // Handle adding custom uploaded glasses (Single or 3-Angles)
    const handleAddCustomGlass = (newGlass) => {
        setGlasses((prev) => [newGlass, ...prev]);
        setSelectedGlass(newGlass);
    };

    // Filter glasses by recommended face shape styles if applied
    const displayedGlasses = useMemo(() => {
        if (!recommendedFilter || recommendedFilter.length === 0) {
            return glasses;
        }
        return glasses.filter((g) => recommendedFilter.includes(g.shape));
    }, [glasses, recommendedFilter]);

    const handleToggleRecommendedFilter = (styles) => {
        if (recommendedFilter) {
            setRecommendedFilter(null);
        } else {
            setRecommendedFilter(styles);
        }
    };

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

    // When Camera is active, continuously run 60 FPS real-time MediaPipe AI face tracking
    useEffect(() => {
        if (!isCameraActive || !cameraVideoRef.current) return;

        let animationFrameId;
        const trackingLoop = () => {
            if (cameraVideoRef.current && cameraVideoRef.current.readyState >= 2) {
                processLiveVideoFrame(cameraVideoRef.current);
            }
            animationFrameId = requestAnimationFrame(trackingLoop);
        };

        animationFrameId = requestAnimationFrame(trackingLoop);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isCameraActive, cameraVideoRef, processLiveVideoFrame]);

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
                            Virtual Glass Try-On Studio 2.5D
                        </h1>
                    </div>
                    <p className="text-xs font-medium text-gray-500 mt-1">
                        Real-time face mapping, AI face shape classification & 2.5D head pose tracking
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsUploadModalOpen(true)}
                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-indigo-200/80"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Upload Glasses
                    </button>
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
                {/* Left Column: Interactive 2.5D Viewport & Calibration Controls */}
                <div className="lg:col-span-7 space-y-4">
                    {/* 2.5D Viewport Canvas */}
                    <FacePreview
                        canvasRef={canvasRef}
                        canvasEvents={canvasEvents}
                        selectedGlass={selectedGlass}
                        isCameraActive={isCameraActive}
                        cameraVideoRef={cameraVideoRef}
                        onStopCamera={stopCamera}
                        isDragging={isDragging}
                    />

                    {/* Calibration & 2.5D Tracking Toolbar */}
                    <TryOnToolbar
                        transforms={transforms}
                        updateTransform={updateTransform}
                        resetTransforms={resetTransforms}
                        hideGlasses={hideGlasses}
                        setHideGlasses={setHideGlasses}
                        showFaceMesh={showFaceMesh}
                        setShowFaceMesh={setShowFaceMesh}
                        poseInfo={poseInfo}
                        onSaveSnapshot={handleOpenSaveDialog}
                    />
                </div>

                {/* Right Column: AI Face Shape, Photo Selector & Frame Catalog */}
                <div className="lg:col-span-5 space-y-4">
                    {/* AI Face Shape Detection Badge & Recommendation */}
                    {faceShapeInfo && (
                        <FaceShapeBadge
                            faceShapeInfo={faceShapeInfo}
                            onApplyFilter={handleToggleRecommendedFilter}
                            isFilterActive={Boolean(recommendedFilter)}
                        />
                    )}

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
                        glasses={displayedGlasses}
                        selectedGlass={selectedGlass}
                        onSelectGlass={setSelectedGlass}
                        isLoading={isLoadingGlasses}
                        onOpenUploadModal={() => setIsUploadModalOpen(true)}
                    />
                </div>
            </div>

            {/* Upload Custom Glasses Modal */}
            <UploadGlassDialog
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onAddGlass={handleAddCustomGlass}
            />

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
