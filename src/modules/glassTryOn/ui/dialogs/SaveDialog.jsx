export default function SaveDialog({
    isOpen,
    onClose,
    snapshotUrl,
    selectedGlass,
}) {
    if (!isOpen || !snapshotUrl) return null;

    const handleDownload = () => {
        const link = document.createElement('a');
        link.download = `tryon-${selectedGlass?.name?.toLowerCase().replace(/\s+/g, '-') || 'look'}.png`;
        link.href = snapshotUrl;
        link.click();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Your Try-On Look</h3>
                        <p className="text-xs text-gray-500">Preview and save your fitted eyewear photo</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Captured Image Preview */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-[4/3] flex items-center justify-center shadow-inner">
                    <img
                        src={snapshotUrl}
                        alt="Try-On Result"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>

                {/* Selected Frame Details */}
                {selectedGlass && (
                    <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100/80 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                                {selectedGlass.brand || 'Selected Frame'}
                            </p>
                            <p className="text-sm font-bold text-gray-900">{selectedGlass.name}</p>
                            <p className="text-xs text-gray-500">
                                Shape: <span className="font-semibold text-gray-700">{selectedGlass.shape}</span>
                                {selectedGlass.frameWidthMm ? ` • Width: ${selectedGlass.frameWidthMm}mm` : ''}
                            </p>
                        </div>
                        {selectedGlass.price > 0 && (
                            <div className="text-right">
                                <p className="text-sm font-black font-mono text-indigo-700">₹{selectedGlass.price}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all text-center"
                    >
                        Done
                    </button>
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Image
                    </button>
                </div>
            </div>
        </div>
    );
}
