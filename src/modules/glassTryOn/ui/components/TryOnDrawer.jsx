import { useState } from 'react';
import { FRAME_CATEGORIES, FRAME_SHAPES, TRYON_TABS } from '../../constants';
import { SAMPLE_MODELS } from '../../constants/sampleModels';
import { ADJUSTMENT_LIMITS } from '../../config/defaults';

export default function TryOnDrawer({
    isOpen,
    onClose,
    // Glasses data & selection
    glasses = [],
    selectedGlass,
    onSelectGlass,
    isLoadingGlasses = false,
    recommendedFilter,
    onToggleRecommendedFilter,
    onOpenUploadGlassModal,
    // Models & Camera
    activeTab,
    setActiveTab,
    faceSourceUrl,
    onSelectFace,
    onStartCamera,
    onStopCamera,
    isCameraActive,
    // Transforms & Calibration
    transforms,
    updateTransform,
    resetTransforms,
    hideGlasses,
    setHideGlasses,
    showFaceMesh,
    setShowFaceMesh,
    poseInfo,
    // AI Face Shape
    faceShapeInfo,
    // Save snapshot
    onSaveSnapshot,
}) {
    const [drawerTab, setDrawerTab] = useState('FRAMES'); // 'FRAMES' | 'FACE_CAM' | 'CALIBRATION' | 'AI_SHAPE'
    const [frameCategory, setFrameCategory] = useState('ALL');
    const [frameShape, setFrameShape] = useState('ALL');

    if (!isOpen) return null;

    // Filter glasses
    const filteredGlasses = glasses.filter((glass) => {
        const matchesCategory = frameCategory === 'ALL' || glass.category === frameCategory;
        const matchesShape = frameShape === 'ALL' || glass.shape === frameShape;
        const matchesRecommended = !recommendedFilter || recommendedFilter.length === 0 || recommendedFilter.includes(glass.shape);
        return matchesCategory && matchesShape && matchesRecommended;
    });

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file (JPG, PNG, WebP).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                onSelectFace(event.target.result);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
            {/* Backdrop overlay (dismiss on click) */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                onClick={onClose}
            />

            {/* Slide-over Drawer Panel */}
            <div className="relative w-full sm:w-[450px] md:w-[500px] lg:w-[540px] h-full bg-slate-900/95 backdrop-blur-2xl text-slate-100 border-l border-slate-800 shadow-2xl flex flex-col z-10 transition-transform transform duration-300">
                {/* Drawer Header */}
                <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-sm shadow-inner">
                            🎛️
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                                Studio Controls
                                {faceShapeInfo && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        {faceShapeInfo.label}
                                    </span>
                                )}
                            </h2>
                            <p className="text-[11px] text-slate-400">
                                Fullscreen Eyewear Studio & Customization
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-slate-700 cursor-pointer"
                            title="Close Drawer"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Drawer Top Navigation Tabs */}
                <div className="grid grid-cols-4 p-2 bg-slate-950/80 border-b border-slate-800 text-xs font-semibold">
                    <button
                        type="button"
                        onClick={() => setDrawerTab('FRAMES')}
                        className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                            drawerTab === 'FRAMES'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                    >
                        <span>👓</span>
                        <span className="truncate">Frames</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setDrawerTab('FACE_CAM')}
                        className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                            drawerTab === 'FACE_CAM'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                    >
                        <span>👤</span>
                        <span className="truncate">Face & Cam</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setDrawerTab('CALIBRATION')}
                        className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                            drawerTab === 'CALIBRATION'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                    >
                        <span>⚙️</span>
                        <span className="truncate">Tune Fit</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setDrawerTab('AI_SHAPE')}
                        className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                            drawerTab === 'AI_SHAPE'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                    >
                        <span>🧠</span>
                        <span className="truncate">AI Shape</span>
                    </button>
                </div>

                {/* Drawer Tab Content (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                    {/* ===================== TAB 1: FRAMES CATALOG ===================== */}
                    {drawerTab === 'FRAMES' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* Category Filter Pills & Upload Button */}
                            <div className="flex flex-col gap-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-300">
                                        Categories ({filteredGlasses.length} frames)
                                    </span>
                                    {onOpenUploadGlassModal && (
                                        <button
                                            type="button"
                                            onClick={onOpenUploadGlassModal}
                                            className="text-[11px] font-bold px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            + Upload Custom
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                                    {FRAME_CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setFrameCategory(cat.id)}
                                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                                                frameCategory === cat.id
                                                    ? 'bg-indigo-600 text-white shadow-xs'
                                                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                                            }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Shape Filter Pills */}
                            <div className="space-y-1.5">
                                <span className="text-[11px] font-semibold text-slate-400">Filter by Shape:</span>
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                                    {FRAME_SHAPES.map((shape) => (
                                        <button
                                            key={shape.id}
                                            type="button"
                                            onClick={() => setFrameShape(shape.id)}
                                            className={`text-[11px] font-medium px-2 py-0.5 rounded-md transition-all shrink-0 border cursor-pointer ${
                                                frameShape === shape.id
                                                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 font-bold'
                                                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                                            }`}
                                        >
                                            {shape.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* AI Recommendation Filter Active Banner */}
                            {recommendedFilter && recommendedFilter.length > 0 && (
                                <div className="p-2.5 bg-indigo-950/40 border border-indigo-800/50 rounded-xl flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5 text-indigo-300">
                                        <span>✨</span>
                                        <span>Showing AI recommended styles</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onToggleRecommendedFilter(null)}
                                        className="text-[11px] text-indigo-400 hover:text-indigo-200 underline font-semibold cursor-pointer"
                                    >
                                        Show All
                                    </button>
                                </div>
                            )}

                            {/* Frame Grid */}
                            {isLoadingGlasses ? (
                                <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
                                    Loading frame catalog...
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2.5">
                                    {/* Upload Custom Frame Tile */}
                                    {onOpenUploadGlassModal && (
                                        <button
                                            type="button"
                                            onClick={onOpenUploadGlassModal}
                                            className="group relative bg-indigo-950/20 hover:bg-indigo-900/30 rounded-xl p-3 border-2 border-dashed border-indigo-700/50 hover:border-indigo-500 transition-all text-center flex flex-col items-center justify-center min-h-[130px] cursor-pointer"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </div>
                                            <p className="text-xs font-bold text-indigo-300">+ Upload Frame</p>
                                            <p className="text-[10px] text-slate-500">1 or 3 Angles</p>
                                        </button>
                                    )}

                                    {filteredGlasses.map((glass) => {
                                        const isSelected = selectedGlass?.id === glass.id;
                                        return (
                                            <button
                                                key={glass.id}
                                                type="button"
                                                onClick={() => onSelectGlass(glass)}
                                                className={`group relative bg-slate-800/80 hover:bg-slate-800 rounded-xl p-2.5 border-2 transition-all text-left flex flex-col justify-between cursor-pointer ${
                                                    isSelected
                                                        ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-950/30 shadow-lg'
                                                        : 'border-slate-700/80 hover:border-slate-600'
                                                }`}
                                            >
                                                {/* Active Status Badge */}
                                                <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                                                    {glass.isCustom && (
                                                        <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                                            Custom
                                                        </span>
                                                    )}
                                                    {isSelected && (
                                                        <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                                            Active
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Frame Thumbnail */}
                                                <div className="h-14 flex items-center justify-center p-1 my-1">
                                                    <img
                                                        src={glass.imageUrl || glass.svg}
                                                        alt={glass.name}
                                                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform drop-shadow-md"
                                                    />
                                                </div>

                                                {/* Frame Info */}
                                                <div className="pt-1.5 border-t border-slate-700/60 mt-1">
                                                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                                                        {glass.brand || 'Optical'} • {glass.shape}
                                                    </p>
                                                    <p className="text-xs font-bold text-white truncate">
                                                        {glass.name}
                                                    </p>
                                                    {glass.price > 0 ? (
                                                        <p className="text-xs font-mono font-bold text-indigo-400 mt-0.5">
                                                            ₹{glass.price}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                                                            {glass.images ? '3D 3-Angles' : '2.5D Ready'}
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===================== TAB 2: FACE & CAMERA ===================== */}
                    {drawerTab === 'FACE_CAM' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* Subtabs: Models / Upload / Live Camera */}
                            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab(TRYON_TABS.MODELS)}
                                    className={`flex-1 py-2 px-2 rounded-lg transition-all text-center cursor-pointer ${
                                        activeTab === TRYON_TABS.MODELS
                                            ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Models
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab(TRYON_TABS.UPLOAD)}
                                    className={`flex-1 py-2 px-2 rounded-lg transition-all text-center cursor-pointer ${
                                        activeTab === TRYON_TABS.UPLOAD
                                            ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Upload Photo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(TRYON_TABS.CAMERA);
                                        onStartCamera();
                                    }}
                                    className={`flex-1 py-2 px-2 rounded-lg transition-all text-center cursor-pointer ${
                                        activeTab === TRYON_TABS.CAMERA
                                            ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Live Cam
                                </button>
                            </div>

                            {/* Sample Models Selection */}
                            {activeTab === TRYON_TABS.MODELS && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-300">Choose a Virtual Model:</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {SAMPLE_MODELS.map((model) => {
                                            const isSelected = faceSourceUrl === model.imageUrl;
                                            return (
                                                <button
                                                    key={model.id}
                                                    type="button"
                                                    onClick={() => onSelectFace(model.imageUrl)}
                                                    className={`group relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'border-indigo-500 ring-2 ring-indigo-500/40 scale-[0.98]'
                                                            : 'border-slate-700 hover:border-slate-500'
                                                    }`}
                                                >
                                                    <img
                                                        src={model.imageUrl}
                                                        alt={model.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1">
                                                        <span className="text-[10px] font-semibold text-white truncate">
                                                            {model.name.split(' ')[0]}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Upload Photo Mode */}
                            {activeTab === TRYON_TABS.UPLOAD && (
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-slate-300">Upload Your Own Photo:</p>
                                    <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-slate-800/50 transition-all rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                        </div>
                                        <span className="text-xs font-bold text-slate-200">Click to Select Photo</span>
                                        <span className="text-[10px] text-slate-400">Front-facing, high-contrast photo</span>
                                    </label>
                                </div>
                            )}

                            {/* Live Camera Mode */}
                            {activeTab === TRYON_TABS.CAMERA && (
                                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-center">
                                    <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl">
                                        📹
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white">
                                            {isCameraActive ? 'Live Webcam Streaming (60 FPS)' : 'Webcam Standby'}
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            Real-time 478 MediaPipe AI facial tracking & 2.5D head rotation
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-center gap-2 pt-2">
                                        {isCameraActive ? (
                                            <button
                                                type="button"
                                                onClick={onStopCamera}
                                                className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                                            >
                                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                Stop Camera
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={onStartCamera}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                                            >
                                                Start Camera
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===================== TAB 3: CALIBRATION & 2.5D TUNING ===================== */}
                    {drawerTab === 'CALIBRATION' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* Live 2.5D Pose Telemetry HUD */}
                            {poseInfo && (
                                <div className="bg-slate-950 border border-slate-800 text-white px-3.5 py-2.5 rounded-xl text-[11px] font-mono shadow-inner flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-slate-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                        <span>2.5D Pose:</span>
                                    </div>
                                    <div className="flex items-center gap-3 font-semibold">
                                        <span>Yaw: <span className="text-indigo-400">{poseInfo.yawDeg || 0}°</span></span>
                                        <span>Pitch: <span className="text-emerald-400">{poseInfo.pitchDeg || 0}°</span></span>
                                        <span>Roll: <span className="text-amber-400">{poseInfo.rollDeg || 0}°</span></span>
                                    </div>
                                </div>
                            )}

                            {/* Face Mesh Wireframe & Reset */}
                            <div className="flex items-center justify-between gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowFaceMesh(!showFaceMesh)}
                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                                        showFaceMesh
                                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                    }`}
                                >
                                    <span>🕸️</span>
                                    Face Mesh {showFaceMesh ? 'ON' : 'OFF'}
                                </button>

                                <button
                                    type="button"
                                    onClick={resetTransforms}
                                    className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors border border-slate-700 cursor-pointer"
                                >
                                    Reset Fit
                                </button>
                            </div>

                            {/* Calibration Sliders */}
                            <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                                {/* Frame Size / Scale */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                                        <span>Frame Size (Scale)</span>
                                        <span className="font-mono text-indigo-400 font-bold">{Number(transforms.userScale ?? 1).toFixed(2)}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={ADJUSTMENT_LIMITS.scale.min}
                                        max={ADJUSTMENT_LIMITS.scale.max}
                                        step={ADJUSTMENT_LIMITS.scale.step}
                                        value={Number(transforms.userScale ?? 1)}
                                        onChange={(e) => updateTransform('userScale', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>

                                {/* Bridge Height (offsetY) */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                                        <span>Bridge Height (Y)</span>
                                        <span className="font-mono text-indigo-400 font-bold">{Number(transforms.offsetY ?? 0)}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={ADJUSTMENT_LIMITS.offsetY.min}
                                        max={ADJUSTMENT_LIMITS.offsetY.max}
                                        step={ADJUSTMENT_LIMITS.offsetY.step}
                                        value={Number(transforms.offsetY ?? 0)}
                                        onChange={(e) => updateTransform('offsetY', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>

                                {/* Center Alignment (offsetX) */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                                        <span>Center Alignment (X)</span>
                                        <span className="font-mono text-indigo-400 font-bold">{Number(transforms.offsetX ?? 0)}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={ADJUSTMENT_LIMITS.offsetX.min}
                                        max={ADJUSTMENT_LIMITS.offsetX.max}
                                        step={ADJUSTMENT_LIMITS.offsetX.step}
                                        value={Number(transforms.offsetX ?? 0)}
                                        onChange={(e) => updateTransform('offsetX', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>

                                {/* Angle / Tilt (rotationDeg) */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                                        <span>Angle / Tilt (Roll)</span>
                                        <span className="font-mono text-indigo-400 font-bold">{Number(transforms.rotationDeg ?? 0)}°</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={ADJUSTMENT_LIMITS.rotationDeg.min}
                                        max={ADJUSTMENT_LIMITS.rotationDeg.max}
                                        step={ADJUSTMENT_LIMITS.rotationDeg.step}
                                        value={Number(transforms.rotationDeg ?? 0)}
                                        onChange={(e) => updateTransform('rotationDeg', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>

                                {/* Drop Shadow Toggle */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                                    <span className="text-xs font-medium text-slate-300">Realistic Drop Shadow</span>
                                    <button
                                        type="button"
                                        onClick={() => updateTransform('showShadow', !transforms.showShadow)}
                                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                            transforms.showShadow ? 'bg-indigo-600' : 'bg-slate-700'
                                        }`}
                                    >
                                        <div
                                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                                transforms.showShadow ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===================== TAB 4: AI FACE SHAPE ===================== */}
                    {drawerTab === 'AI_SHAPE' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {faceShapeInfo ? (
                                <div className="space-y-3">
                                    {/* Face Shape Hero Card */}
                                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md"
                                                    style={{ backgroundColor: faceShapeInfo.color || '#6366F1' }}
                                                >
                                                    AI
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                                        {faceShapeInfo.label}
                                                    </h3>
                                                    <span className="text-[10px] font-bold text-indigo-400">
                                                        {Math.round((faceShapeInfo.confidence || 0.9) * 100)}% Biometric Match
                                                    </span>
                                                </div>
                                            </div>

                                            {faceShapeInfo.recommendedStyles && (
                                                <button
                                                    type="button"
                                                    onClick={() => onToggleRecommendedFilter(faceShapeInfo.recommendedStyles)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer ${
                                                        recommendedFilter
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30'
                                                    }`}
                                                >
                                                    <span>✨</span>
                                                    {recommendedFilter ? 'Filtered' : 'Filter Recommendations'}
                                                </button>
                                            )}
                                        </div>

                                        <p className="text-xs text-slate-300 leading-relaxed">
                                            {faceShapeInfo.description}
                                        </p>
                                    </div>

                                    {/* Recommended Styles List */}
                                    {faceShapeInfo.recommendedStyles && (
                                        <div className="space-y-1.5">
                                            <span className="text-xs font-bold text-slate-300">Best Matching Styles:</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {faceShapeInfo.recommendedStyles.map((style) => (
                                                    <span
                                                        key={style}
                                                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-indigo-300 border border-slate-700"
                                                    >
                                                        ✓ {style}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Styling Tip */}
                                    {faceShapeInfo.tip && (
                                        <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl flex items-start gap-2.5 text-xs text-indigo-200">
                                            <span className="text-base leading-none">💡</span>
                                            <p className="leading-relaxed text-[11px]">{faceShapeInfo.tip}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="py-12 text-center text-slate-400 text-xs">
                                    Detecting face shape... Look directly at the camera or select a clear model photo.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Drawer Sticky Footer Actions */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
                    {/* Hold to Compare */}
                    <button
                        type="button"
                        onMouseDown={() => setHideGlasses(true)}
                        onMouseUp={() => setHideGlasses(false)}
                        onTouchStart={() => setHideGlasses(true)}
                        onTouchEnd={() => setHideGlasses(false)}
                        className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 active:bg-indigo-950 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-700 select-none cursor-pointer"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {hideGlasses ? 'Original' : 'Compare'}
                    </button>

                    {/* Save & Export Look */}
                    <button
                        type="button"
                        onClick={onSaveSnapshot}
                        className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Save Look
                    </button>
                </div>
            </div>
        </div>
    );
}
