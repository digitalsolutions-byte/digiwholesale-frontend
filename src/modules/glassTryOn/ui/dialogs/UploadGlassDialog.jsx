import { useState, useRef } from 'react';
import { FRAME_SHAPES, FRAME_CATEGORIES } from '../../constants';

export default function UploadGlassDialog({
    isOpen,
    onClose,
    onAddGlass,
}) {
    const [uploadMode, setUploadMode] = useState('SINGLE'); // 'SINGLE' | 'MULTI'
    const [frameName, setFrameName] = useState('');
    const [shape, setShape] = useState('RECTANGLE');
    const [category, setCategory] = useState('FRAME');
    const [autoRemoveBg, setAutoRemoveBg] = useState(true);

    // Image state
    const [frontImage, setFrontImage] = useState(null);
    const [leftImage, setLeftImage] = useState(null);
    const [rightImage, setRightImage] = useState(null);

    const frontInputRef = useRef(null);
    const leftInputRef = useRef(null);
    const rightInputRef = useRef(null);
    const singleInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileRead = (file, setter) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Please upload a valid image file (PNG, JPG, WebP).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                setter(e.target.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSwapAngles = () => {
        const temp = leftImage;
        setLeftImage(rightImage);
        setRightImage(temp);
    };

    const handleReset = () => {
        setFrontImage(null);
        setLeftImage(null);
        setRightImage(null);
        setFrameName('');
        onClose();
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const mainImage = uploadMode === 'SINGLE' ? frontImage : (frontImage || leftImage || rightImage);
        if (!mainImage) {
            alert('Please upload at least the Front view image of your glasses.');
            return;
        }

        const customGlass = {
            id: `custom-${Date.now()}`,
            name: frameName.trim() || 'Custom Upload Frame',
            brand: 'Custom Eyewear',
            sku: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
            category,
            shape,
            imageUrl: mainImage,
            images: uploadMode === 'MULTI' && (leftImage || rightImage) ? {
                front: frontImage || mainImage,
                left: leftImage || null,
                right: rightImage || null,
            } : null,
            aspectRatio: 2.5,
            frameWidthMm: 138,
            bridgeWidthMm: 18,
            price: 0,
            tags: uploadMode === 'MULTI' ? ['3-Piece 2.5D', 'Front + Arms'] : ['Custom Upload'],
            isCustom: true,
            autoRemoveBg,
        };

        onAddGlass(customGlass);
        handleReset();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Upload Custom Glasses</h3>
                            <p className="text-xs text-gray-500">Upload single front frame or 3-piece 2.5D assembly</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Upload Mode Switcher */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Upload Assembly Option</label>
                    <div className="grid grid-cols-2 gap-2 bg-gray-100/80 p-1 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => setUploadMode('SINGLE')}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                uploadMode === 'SINGLE'
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            1 Front Image
                        </button>

                        <button
                            type="button"
                            onClick={() => setUploadMode('MULTI')}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                uploadMode === 'MULTI'
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                            3 Images (Front + 2 Side Arms)
                        </button>
                    </div>
                    <p className="text-[11px] text-gray-400">
                        {uploadMode === 'SINGLE'
                            ? 'Upload 1 front-facing glasses photo. Stays centered across eyes and nose with auto-scaling.'
                            : 'Upload Front Frame + Left & Right Temple Arms. Arms attach to frame hinges and dynamically extend to ears in 3D!'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* SINGLE IMAGE MODE DROPZONE */}
                    {uploadMode === 'SINGLE' && (
                        <div className="space-y-2">
                            <input
                                type="file"
                                ref={singleInputRef}
                                accept="image/*"
                                onChange={(e) => handleFileRead(e.target.files?.[0], setFrontImage)}
                                className="hidden"
                            />
                            {frontImage ? (
                                <div className="relative border-2 border-indigo-200 bg-indigo-50/20 rounded-2xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-20 h-12 bg-white rounded-lg p-1 border border-gray-200 flex items-center justify-center">
                                            <img src={frontImage} alt="Front View" className="max-h-full max-w-full object-contain" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">Front View Image Loaded</p>
                                            <p className="text-[11px] text-emerald-600 font-medium">Ready for try-on</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => singleInputRef.current?.click()}
                                        className="text-xs font-semibold px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-colors"
                                    >
                                        Replace
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => singleInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">Click to upload front glasses image</p>
                                        <p className="text-[11px] text-gray-500">Supports transparent PNG, JPG with white background, or WebP</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3 MULTI-ANGLE DROPZONES */}
                    {uploadMode === 'MULTI' && (
                        <div className="space-y-2">
                            {(leftImage || rightImage) && (
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleSwapAngles}
                                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg"
                                    >
                                        ⇄ Swap Left & Right Arms
                                    </button>
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* 1. Front View */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-gray-700">1. Front Frame</label>
                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Eyes & Nose</span>
                                    </div>
                                    <input
                                        type="file"
                                        ref={frontInputRef}
                                        accept="image/*"
                                        onChange={(e) => handleFileRead(e.target.files?.[0], setFrontImage)}
                                        className="hidden"
                                    />
                                    <div
                                        onClick={() => frontInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-2xl p-3 h-28 text-center cursor-pointer flex flex-col items-center justify-center transition-all ${
                                            frontImage
                                                ? 'border-indigo-500 bg-indigo-50/20'
                                                : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                                        }`}
                                    >
                                        {frontImage ? (
                                            <img src={frontImage} alt="Front" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-bold text-gray-700">+ Front Frame</p>
                                                <p className="text-[9px] text-gray-400">Covers eyes & nose</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Left Side Temple Arm */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-gray-700">2. Left Side Arm</label>
                                        <span className="text-[10px] text-gray-400">Left Temple</span>
                                    </div>
                                    <input
                                        type="file"
                                        ref={leftInputRef}
                                        accept="image/*"
                                        onChange={(e) => handleFileRead(e.target.files?.[0], setLeftImage)}
                                        className="hidden"
                                    />
                                    <div
                                        onClick={() => leftInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-2xl p-3 h-28 text-center cursor-pointer flex flex-col items-center justify-center transition-all ${
                                            leftImage
                                                ? 'border-indigo-500 bg-indigo-50/20'
                                                : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                                        }`}
                                    >
                                        {leftImage ? (
                                            <img src={leftImage} alt="Left" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-bold text-gray-700">+ Left Temple Arm</p>
                                                <p className="text-[9px] text-gray-400">Attaches to left ear</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 3. Right Side Temple Arm */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-gray-700">3. Right Side Arm</label>
                                        <span className="text-[10px] text-gray-400">Right Temple</span>
                                    </div>
                                    <input
                                        type="file"
                                        ref={rightInputRef}
                                        accept="image/*"
                                        onChange={(e) => handleFileRead(e.target.files?.[0], setRightImage)}
                                        className="hidden"
                                    />
                                    <div
                                        onClick={() => rightInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-2xl p-3 h-28 text-center cursor-pointer flex flex-col items-center justify-center transition-all ${
                                            rightImage
                                                ? 'border-indigo-500 bg-indigo-50/20'
                                                : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                                        }`}
                                    >
                                        {rightImage ? (
                                            <img src={rightImage} alt="Right" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-bold text-gray-700">+ Right Temple Arm</p>
                                                <p className="text-[9px] text-gray-400">Attaches to right ear</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Metadata Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-gray-700">Frame Name</label>
                            <input
                                type="text"
                                value={frameName}
                                onChange={(e) => setFrameName(e.target.value)}
                                placeholder="e.g. My Aviator Pro"
                                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-700">Frame Shape</label>
                            <select
                                value={shape}
                                onChange={(e) => setShape(e.target.value)}
                                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium bg-white"
                            >
                                {FRAME_SHAPES.filter((s) => s.id !== 'ALL').map((s) => (
                                    <option key={s.id} value={s.id}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-700">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium bg-white"
                            >
                                {FRAME_CATEGORIES.filter((c) => c.id !== 'ALL').map((c) => (
                                    <option key={c.id} value={c.id}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Auto Background Removal Checkbox */}
                    <label className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200/80 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRemoveBg}
                            onChange={(e) => setAutoRemoveBg(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <div>
                            <span className="text-xs font-bold text-gray-800">Auto Background Removal</span>
                            <p className="text-[10px] text-gray-500">Automatically isolate frame and make background transparent</p>
                        </div>
                    </label>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all text-center"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!frontImage}
                            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Add & Try On Now
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
