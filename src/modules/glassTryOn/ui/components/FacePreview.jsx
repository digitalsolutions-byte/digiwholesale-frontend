import { useRef } from 'react';

export default function FacePreview({
    canvasRef,
    canvasEvents,
    selectedGlass,
    isCameraActive,
    cameraVideoRef,
    onStopCamera,
    isDragging,
}) {
    const containerRef = useRef(null);

    return (
        <div
            ref={containerRef}
            className="relative bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center min-h-[460px] max-h-[580px] w-full select-none"
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
                }`}
            />

            {/* Active Eyewear Floating Badge */}
            {selectedGlass && (
                <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md border border-slate-800 text-white px-3 py-2 rounded-xl shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-8 h-8 rounded-lg bg-white/10 p-1 flex items-center justify-center">
                        <img
                            src={selectedGlass.imageUrl || selectedGlass.svg}
                            alt=""
                            className="max-h-full max-w-full object-contain"
                        />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            {selectedGlass.brand || 'Trying On'}
                        </p>
                        <p className="text-xs font-bold text-white leading-none">
                            {selectedGlass.name}
                        </p>
                    </div>
                </div>
            )}

            {/* Live Camera Active Indicator & Stop Button */}
            {isCameraActive && (
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 bg-red-500/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full animate-pulse shadow-md">
                        <span className="w-2 h-2 rounded-full bg-white" />
                        REC LIVE
                    </span>
                    <button
                        type="button"
                        onClick={onStopCamera}
                        className="bg-slate-900/80 hover:bg-slate-800 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                    >
                        Stop
                    </button>
                </div>
            )}

            {/* Drag & Zoom Interaction Hint */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/70 backdrop-blur-sm border border-slate-800/80 text-slate-300 text-[11px] font-medium px-3 py-1 rounded-full pointer-events-none flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
                Drag to adjust position • Scroll to resize
            </div>
        </div>
    );
}
