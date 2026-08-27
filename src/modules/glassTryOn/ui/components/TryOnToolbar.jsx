import { useState } from 'react';
import { ADJUSTMENT_LIMITS } from '../../config/defaults';

export default function TryOnToolbar({
    transforms,
    updateTransform,
    resetTransforms,
    hideGlasses,
    setHideGlasses,
    showFaceMesh,
    setShowFaceMesh,
    poseInfo,
    onSaveSnapshot,
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white/85 backdrop-blur-md border border-gray-200/80 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        2.5D Tracking & Calibration
                    </h4>
                </div>

                <div className="flex items-center gap-2">
                    {/* Face Mesh Wireframe Toggle */}
                    <button
                        type="button"
                        onClick={() => setShowFaceMesh(!showFaceMesh)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                            showFaceMesh
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200'
                        }`}
                    >
                        <span>🕸️</span>
                        Mesh {showFaceMesh ? 'ON' : 'OFF'}
                    </button>

                    <button
                        type="button"
                        onClick={resetTransforms}
                        className="text-[11px] font-semibold text-gray-500 hover:text-indigo-600 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                        Reset Fit
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                        {isExpanded ? 'Fewer Controls' : 'Fine Tune'}
                        <svg
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Live 2.5D Pose Telemetry HUD */}
            {poseInfo && (
                <div className="flex items-center justify-between bg-slate-900 text-white px-3.5 py-2 rounded-xl text-[11px] font-mono shadow-inner">
                    <div className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>Pose 2.5D:</span>
                    </div>
                    <div className="flex items-center gap-3 font-semibold">
                        <span title="Head Yaw (Left / Right)">
                            Yaw: <span className="text-indigo-400">{poseInfo.yawDeg || 0}°</span>
                        </span>
                        <span title="Head Pitch (Up / Down)">
                            Pitch: <span className="text-emerald-400">{poseInfo.pitchDeg || 0}°</span>
                        </span>
                        <span title="Head Roll (Tilt)">
                            Roll: <span className="text-amber-400">{poseInfo.rollDeg || 0}°</span>
                        </span>
                    </div>
                </div>
            )}

            {/* Core Sliders (Always Visible) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Scale / Frame Size */}
                <div className="space-y-1.5 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                    <div className="flex justify-between text-xs font-medium text-gray-700">
                        <span>Frame Size</span>
                        <span className="font-mono text-indigo-600 font-semibold">{transforms.userScale.toFixed(2)}x</span>
                    </div>
                    <input
                        type="range"
                        min={ADJUSTMENT_LIMITS.scale.min}
                        max={ADJUSTMENT_LIMITS.scale.max}
                        step={ADJUSTMENT_LIMITS.scale.step}
                        value={transforms.userScale}
                        onChange={(e) => updateTransform('userScale', e.target.value)}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                </div>

                {/* Vertical Bridge Height */}
                <div className="space-y-1.5 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                    <div className="flex justify-between text-xs font-medium text-gray-700">
                        <span>Bridge Height</span>
                        <span className="font-mono text-indigo-600 font-semibold">{transforms.offsetY}px</span>
                    </div>
                    <input
                        type="range"
                        min={ADJUSTMENT_LIMITS.offsetY.min}
                        max={ADJUSTMENT_LIMITS.offsetY.max}
                        step={ADJUSTMENT_LIMITS.offsetY.step}
                        value={transforms.offsetY}
                        onChange={(e) => updateTransform('offsetY', e.target.value)}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                </div>
            </div>

            {/* Advanced Fine Tune Controls (Expandable) */}
            {isExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
                    {/* Horizontal Shift */}
                    <div className="space-y-1.5 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                        <div className="flex justify-between text-xs font-medium text-gray-700">
                            <span>Center Alignment</span>
                            <span className="font-mono text-indigo-600 font-semibold">{transforms.offsetX}px</span>
                        </div>
                        <input
                            type="range"
                            min={ADJUSTMENT_LIMITS.offsetX.min}
                            max={ADJUSTMENT_LIMITS.offsetX.max}
                            step={ADJUSTMENT_LIMITS.offsetX.step}
                            value={transforms.offsetX}
                            onChange={(e) => updateTransform('offsetX', e.target.value)}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>

                    {/* Rotation Tilt */}
                    <div className="space-y-1.5 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                        <div className="flex justify-between text-xs font-medium text-gray-700">
                            <span>Angle / Tilt</span>
                            <span className="font-mono text-indigo-600 font-semibold">{transforms.rotationDeg}°</span>
                        </div>
                        <input
                            type="range"
                            min={ADJUSTMENT_LIMITS.rotationDeg.min}
                            max={ADJUSTMENT_LIMITS.rotationDeg.max}
                            step={ADJUSTMENT_LIMITS.rotationDeg.step}
                            value={transforms.rotationDeg}
                            onChange={(e) => updateTransform('rotationDeg', e.target.value)}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>

                    {/* Shadow Toggle */}
                    <div className="flex items-center justify-between bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                        <span className="text-xs font-medium text-gray-700">Drop Shadow</span>
                        <button
                            type="button"
                            onClick={() => updateTransform('showShadow', !transforms.showShadow)}
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                                transforms.showShadow ? 'bg-indigo-600' : 'bg-gray-300'
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
            )}

            {/* Actions Bar */}
            <div className="flex items-center gap-2 pt-1">
                {/* Hold to Compare Before/After */}
                <button
                    type="button"
                    onMouseDown={() => setHideGlasses(true)}
                    onMouseUp={() => setHideGlasses(false)}
                    onTouchStart={() => setHideGlasses(true)}
                    onTouchEnd={() => setHideGlasses(false)}
                    className="flex-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 active:bg-indigo-50 active:text-indigo-600 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 select-none"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {hideGlasses ? 'Showing Original' : 'Hold to Compare'}
                </button>

                {/* Save Snapshot Button */}
                <button
                    type="button"
                    onClick={onSaveSnapshot}
                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Save & Download Look
                </button>
            </div>
        </div>
    );
}
