import { useRef } from 'react';

export default function FacePreview({
    canvasRef,
    canvasEvents,
    selectedGlass,
    isCameraActive,
    cameraVideoRef,
    onStopCamera,
    isDragging,
    // Fullscreen and Drawer Controls
    isFullscreen = false,
    onToggleFullscreen,
    isDrawerOpen = false,
    onToggleDrawer,
    showFaceMesh = false,
    onToggleFaceMesh,
    hideGlasses = false,
    setHideGlasses,
    onSaveSnapshot,
}) {
    const containerRef = useRef(null);

    return (
        <div
            ref={containerRef}
            className={`select-none transition-all duration-300 flex items-center justify-center ${
                isFullscreen
                    ? 'fixed inset-0 z-40 bg-slate-950 w-screen h-screen overflow-hidden'
                    : 'relative bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl min-h-[460px] max-h-[580px] w-full'
            }`}
        >
            {/* Background Hidden Video element for Camera Stream */}
            <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className="hidden"
            />

            {/* Interactive HTML5 2D Canvas */}
            <canvas
                ref={canvasRef}
                {...canvasEvents}
                className={`max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing transition-opacity duration-300 ${
                    isDragging ? 'cursor-grabbing' : 'cursor-grab'
                } ${isFullscreen ? 'w-auto h-full max-h-screen' : ''}`}
            />

            {/* Active Eyewear Floating Badge */}
            {selectedGlass && (
                <div
                    className={`absolute left-4 bg-slate-950/85 backdrop-blur-md border border-slate-800 text-white px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 transition-all duration-300 ${
                        isFullscreen ? 'top-4' : 'top-4'
                    }`}
                >
                    <div className="w-9 h-9 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/10">
                        <img
                            src={selectedGlass.imageUrl || selectedGlass.svg}
                            alt=""
                            className="max-h-full max-w-full object-contain"
                        />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                            {selectedGlass.brand || 'Currently Trying'}
                        </p>
                        <p className="text-xs sm:text-sm font-bold text-white leading-tight">
                            {selectedGlass.name}
                        </p>
                        {selectedGlass.price > 0 && (
                            <p className="text-[11px] font-mono font-bold text-emerald-400">
                                ₹{selectedGlass.price}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Top Right Floating Toolbar Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2 flex-wrap justify-end">
                {/* Live Camera Active Indicator & Stop Button */}
                {isCameraActive && (
                    <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-lg">
                        <span className="flex items-center gap-1 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            REC LIVE
                        </span>
                        {onStopCamera && (
                            <button
                                type="button"
                                onClick={onStopCamera}
                                className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                            >
                                Stop
                            </button>
                        )}
                    </div>
                )}

                {/* In Fullscreen: Mesh Toggle Button */}
                {isFullscreen && onToggleFaceMesh && (
                    <button
                        type="button"
                        onClick={onToggleFaceMesh}
                        className={`text-xs font-bold px-3 py-2 rounded-xl backdrop-blur-md border transition-all flex items-center gap-1.5 shadow-lg cursor-pointer ${
                            showFaceMesh
                                ? 'bg-indigo-600/90 text-white border-indigo-500'
                                : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                        title="Toggle Face Mesh Wireframe"
                    >
                        <span>🕸️</span>
                        <span className="hidden sm:inline">Mesh</span>
                    </button>
                )}

                {/* In Fullscreen: Hold to Compare */}
                {isFullscreen && setHideGlasses && (
                    <button
                        type="button"
                        onMouseDown={() => setHideGlasses(true)}
                        onMouseUp={() => setHideGlasses(false)}
                        onTouchStart={() => setHideGlasses(true)}
                        onTouchEnd={() => setHideGlasses(false)}
                        className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-200 backdrop-blur-md border border-slate-800 transition-all flex items-center gap-1.5 shadow-lg select-none cursor-pointer"
                        title="Hold to Compare Original Face"
                    >
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="hidden sm:inline">{hideGlasses ? 'Original' : 'Compare'}</span>
                    </button>
                )}

                {/* In Fullscreen: Quick Save Snapshot */}
                {isFullscreen && onSaveSnapshot && (
                    <button
                        type="button"
                        onClick={onSaveSnapshot}
                        className="text-xs font-bold px-3 py-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white backdrop-blur-md border border-indigo-500/50 transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
                        title="Save & Download Snapshot"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span className="hidden sm:inline">Export</span>
                    </button>
                )}

                {/* In Fullscreen: Drawer Toggle Button */}
                {isFullscreen && onToggleDrawer && (
                    <button
                        type="button"
                        onClick={onToggleDrawer}
                        className={`text-xs font-bold px-3.5 py-2 rounded-xl backdrop-blur-md border transition-all flex items-center gap-1.5 shadow-lg cursor-pointer ${
                            isDrawerOpen
                                ? 'bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-500/40'
                                : 'bg-slate-950/85 hover:bg-slate-800 text-indigo-300 border-indigo-500/40'
                        }`}
                        title="Toggle Studio Controls Drawer"
                    >
                        <span className="text-sm">🎛️</span>
                        <span>{isDrawerOpen ? 'Close Controls' : 'Studio Drawer'}</span>
                    </button>
                )}

                {/* Fullscreen Toggle Button */}
                {onToggleFullscreen && (
                    <button
                        type="button"
                        onClick={onToggleFullscreen}
                        className={`text-xs font-bold px-3 py-2 rounded-xl backdrop-blur-md border transition-all flex items-center gap-1.5 shadow-lg cursor-pointer ${
                            isFullscreen
                                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/40'
                                : 'bg-slate-950/80 hover:bg-slate-800 text-white border-slate-700'
                        }`}
                        title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen'}
                    >
                        {isFullscreen ? (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Exit</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0 0l-5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                                <span>Fullscreen</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* In Fullscreen: Floating Drawer Side Trigger Pill (when drawer is closed) */}
            {isFullscreen && !isDrawerOpen && onToggleDrawer && (
                <button
                    type="button"
                    onClick={onToggleDrawer}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-950/90 hover:bg-indigo-900/90 text-white border-2 border-indigo-500/60 hover:border-indigo-400 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-2 group transition-all cursor-pointer animate-in fade-in slide-in-from-right-4 duration-300"
                >
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
                    <span className="text-xs font-extrabold text-indigo-200 group-hover:text-white">
                        Open Studio Controls
                    </span>
                    <span className="text-indigo-400 group-hover:translate-x-1 transition-transform">➔</span>
                </button>
            )}

            {/* Drag & Zoom Interaction Hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 text-slate-300 text-[11px] font-medium px-4 py-1.5 rounded-full pointer-events-none flex items-center gap-2 shadow-lg">
                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
                <span>Drag to reposition • Scroll/Pinch to resize {isFullscreen ? '• [ESC] Exit' : ''}</span>
            </div>
        </div>
    );
}
