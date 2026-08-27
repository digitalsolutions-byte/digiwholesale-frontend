export default function FaceShapeBadge({
    faceShapeInfo,
    onApplyFilter,
    isFilterActive = false,
}) {
    if (!faceShapeInfo) return null;

    const { label, description, recommendedStyles, tip, confidence, color } = faceShapeInfo;

    return (
        <div className="bg-white/90 backdrop-blur-md border border-indigo-100 rounded-2xl p-4 shadow-sm relative overflow-hidden space-y-3">
            {/* Top Accent Gradient Bar */}
            <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: color || '#6366F1' }}
            />

            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-xs"
                        style={{ backgroundColor: color || '#6366F1' }}
                    >
                        AI
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                                {label}
                            </h4>
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full">
                                {Math.round((confidence || 0.9) * 100)}% Match
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{description}</p>
                    </div>
                </div>

                {/* 1-Click Apply Recommended Filter Button */}
                {recommendedStyles && recommendedStyles.length > 0 && (
                    <button
                        type="button"
                        onClick={() => onApplyFilter && onApplyFilter(recommendedStyles)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-xs ${
                            isFilterActive
                                ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {isFilterActive ? 'Filtered' : 'Filter Recommendations'}
                    </button>
                )}
            </div>

            {/* Styling Tip Card */}
            {tip && (
                <div className="p-2.5 bg-gray-50/80 rounded-xl border border-gray-100 flex items-center gap-2 text-xs text-gray-700">
                    <span className="text-sm">💡</span>
                    <p className="text-[11px] font-medium leading-relaxed">{tip}</p>
                </div>
            )}
        </div>
    );
}
