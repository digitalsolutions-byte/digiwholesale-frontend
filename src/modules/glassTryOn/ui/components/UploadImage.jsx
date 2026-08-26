import { useRef } from 'react';
import { TRYON_TABS } from '../../constants';
import { SAMPLE_MODELS } from '../../constants/sampleModels';

export default function UploadImage({
    activeTab,
    setActiveTab,
    currentFaceUrl,
    onSelectFace,
    onStartCamera,
    isCameraActive,
}) {
    const fileInputRef = useRef(null);

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
        <div className="bg-white/80 backdrop-blur-md border border-gray-200/80 rounded-2xl p-4 shadow-sm">
            {/* Tab Selection */}
            <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl mb-4 text-xs font-semibold text-gray-600">
                <button
                    type="button"
                    onClick={() => setActiveTab(TRYON_TABS.MODELS)}
                    className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === TRYON_TABS.MODELS
                            ? 'bg-white text-gray-900 shadow-xs font-bold'
                            : 'hover:text-gray-900'
                    }`}
                >
                    <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Sample Models
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab(TRYON_TABS.UPLOAD)}
                    className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === TRYON_TABS.UPLOAD
                            ? 'bg-white text-gray-900 shadow-xs font-bold'
                            : 'hover:text-gray-900'
                    }`}
                >
                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Upload Photo
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setActiveTab(TRYON_TABS.CAMERA);
                        onStartCamera();
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === TRYON_TABS.CAMERA
                            ? 'bg-white text-gray-900 shadow-xs font-bold'
                            : 'hover:text-gray-900'
                    }`}
                >
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Live Camera
                </button>
            </div>

            {/* Models Tab */}
            {activeTab === TRYON_TABS.MODELS && (
                <div className="grid grid-cols-4 gap-2.5">
                    {SAMPLE_MODELS.map((model) => {
                        const isSelected = currentFaceUrl === model.imageUrl;
                        return (
                            <button
                                key={model.id}
                                type="button"
                                onClick={() => onSelectFace(model.imageUrl)}
                                className={`group relative rounded-xl overflow-hidden aspect-square border-2 transition-all text-left ${
                                    isSelected
                                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 scale-[0.98]'
                                        : 'border-transparent hover:border-gray-300'
                                }`}
                            >
                                <img
                                    src={model.imageUrl}
                                    alt={model.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-1.5">
                                    <span className="text-[10px] font-medium text-white/95 leading-tight truncate">
                                        {model.name.split(' ')[0]}
                                    </span>
                                </div>
                                {isSelected && (
                                    <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-sm">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Upload Tab */}
            {activeTab === TRYON_TABS.UPLOAD && (
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2"
                    >
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-800">Click to upload face photo</p>
                            <p className="text-[11px] text-gray-500">Front-facing, well-lit photo works best</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera Tab Note */}
            {activeTab === TRYON_TABS.CAMERA && (
                <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-center">
                    <p className="text-xs font-medium text-emerald-800">
                        {isCameraActive
                            ? '🟢 Live camera active. Look straight into the camera.'
                            : 'Click Start Camera below to activate your webcam.'}
                    </p>
                </div>
            )}
        </div>
    );
}
