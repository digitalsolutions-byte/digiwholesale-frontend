import { useState, useMemo } from 'react';
import { FRAME_CATEGORIES, FRAME_SHAPES } from '../../constants';

export default function GlassCarousel({
    glasses = [],
    selectedGlass,
    onSelectGlass,
    isLoading = false,
    onOpenUploadModal,
}) {
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [activeShape, setActiveShape] = useState('ALL');

    const filteredGlasses = useMemo(() => {
        return glasses.filter((glass) => {
            const matchesCategory = activeCategory === 'ALL' || glass.category === activeCategory;
            const matchesShape = activeShape === 'ALL' || glass.shape === activeShape;
            return matchesCategory && matchesShape;
        });
    }, [glasses, activeCategory, activeShape]);

    return (
        <div className="bg-white/85 backdrop-blur-md border border-gray-200/80 rounded-2xl p-4 shadow-sm space-y-3.5">
            {/* Header & Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900">Frame Catalog</h3>
                    <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                        {filteredGlasses.length} models
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {onOpenUploadModal && (
                        <button
                            type="button"
                            onClick={onOpenUploadModal}
                            className="text-xs font-bold px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-all flex items-center gap-1.5 shrink-0 border border-indigo-200/80"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Upload Frame
                        </button>
                    )}

                    {/* Category Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                        {FRAME_CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setActiveCategory(cat.id)}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all shrink-0 ${
                                    activeCategory === cat.id
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Shape Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {FRAME_SHAPES.map((shape) => (
                    <button
                        key={shape.id}
                        type="button"
                        onClick={() => setActiveShape(shape.id)}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md transition-all shrink-0 border ${
                            activeShape === shape.id
                                ? 'border-indigo-500 bg-indigo-50/60 text-indigo-700 font-bold'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                    >
                        {shape.label}
                    </button>
                ))}
            </div>

            {/* Frame List (Horizontal Carousel or Grid) */}
            {isLoading ? (
                <div className="py-12 text-center text-gray-400 text-xs animate-pulse">
                    Loading eyewear catalog...
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[360px] overflow-y-auto pr-1">
                    {/* + Upload Custom Frame Card */}
                    {onOpenUploadModal && (
                        <button
                            type="button"
                            onClick={onOpenUploadModal}
                            className="group relative bg-indigo-50/20 hover:bg-indigo-50/60 rounded-xl p-3 border-2 border-dashed border-indigo-200 hover:border-indigo-400 transition-all text-center flex flex-col items-center justify-center min-h-[140px]"
                        >
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <p className="text-xs font-bold text-indigo-900">+ Upload Frame</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">1 or 3 Angles</p>
                        </button>
                    )}

                    {filteredGlasses.map((glass) => {
                        const isSelected = selectedGlass?.id === glass.id;
                        return (
                            <button
                                key={glass.id}
                                type="button"
                                onClick={() => onSelectGlass(glass)}
                                className={`group relative bg-white rounded-xl p-3 border-2 transition-all text-left flex flex-col justify-between hover:shadow-md ${
                                    isSelected
                                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm bg-indigo-50/10'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                {/* Active Badge or Custom Badge */}
                                <div className="absolute top-2 right-2 flex items-center gap-1">
                                    {glass.isCustom && (
                                        <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                            Custom
                                        </span>
                                    )}
                                    {isSelected && (
                                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                            Active
                                        </span>
                                    )}
                                </div>

                                {/* Frame Thumbnail Preview */}
                                <div className="h-16 flex items-center justify-center p-1 my-1">
                                    <img
                                        src={glass.imageUrl || glass.svg}
                                        alt={glass.name}
                                        className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-200 drop-shadow-sm"
                                    />
                                </div>

                                {/* Frame Info */}
                                <div className="pt-2 border-t border-gray-100 mt-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 truncate">
                                        {glass.brand || 'Optical'} • {glass.shape}
                                    </p>
                                    <p className="text-xs font-bold text-gray-800 truncate">
                                        {glass.name}
                                    </p>
                                    {glass.price > 0 ? (
                                        <p className="text-xs font-mono font-semibold text-indigo-600 mt-0.5">
                                            ₹{glass.price}
                                        </p>
                                    ) : (
                                        <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
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
    );
}
