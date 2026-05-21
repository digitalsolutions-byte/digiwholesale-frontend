import React from 'react';
import { Icon } from '@iconify/react';
import Input from '../ui/Input';
import Button from '../ui/Button';

const isPDF = (url) => {
    if (!url) return false;
    return url.toLowerCase().includes('.pdf') || url.startsWith('data:application/pdf');
};

export const FileUploadField = ({ label, name, placeholder, fileRef: externalFileRef, onFileChange, uploading, currentValue, formik, wrapInput, imgFieldName, isReadOnlyMode, hideInput, enableCamera }) => {
    const internalRef = React.useRef(null);
    const cameraRef = React.useRef(null);
    const ref = externalFileRef || internalRef;

    return (
        <div className="flex flex-col gap-4 p-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
            {(!hideInput || label) && (
                <div className="flex flex-col gap-2">
                    <span className="text-gray-400 text-[10px] uppercase font-bold  ml-1">{label}</span>
                    {!hideInput && wrapInput(Input, { label: '', name, placeholder, className: "bg-white" })}
                </div>
            )}

            <div className="flex flex-col gap-4">
                <input type="file" accept="image/*,application/pdf" hidden ref={ref} onChange={onFileChange} />

                {enableCamera ? (
                    <>
                        <input type="file" accept="image/*" capture="environment" hidden ref={cameraRef} onChange={onFileChange} />
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={() => ref.current?.click()}
                                disabled={uploading || isReadOnlyMode}
                                type="button"
                                className={(uploading || isReadOnlyMode) ? "bg-gray-400 text-white rounded-xl h-[52px] px-2 flex items-center justify-center gap-2 cursor-not-allowed opacity-50 text-center" : "bg-erp-accent text-white rounded-xl h-[52px] px-2 flex items-center justify-center gap-2 transition-all hover:bg-erp-accent/80 shadow-sm font-bold uppercase tracking-tighter text-[10px] text-center"}
                            >
                                <Icon icon={uploading ? "mdi:loading" : "mdi:folder-upload"} className={uploading ? "animate-spin text-lg" : "text-lg"} />
                                {uploading ? '...' : 'Files/Gallery'}
                            </Button>
                            <Button
                                onClick={() => cameraRef.current?.click()}
                                disabled={uploading || isReadOnlyMode}
                                type="button"
                                className={(uploading || isReadOnlyMode) ? "bg-gray-400 text-white rounded-xl h-[52px] px-2 flex items-center justify-center gap-2 cursor-not-allowed opacity-50 text-center" : "bg-erp-primary text-white rounded-xl h-[52px] px-2 flex items-center justify-center gap-2 transition-all hover:bg-erp-primary/80 shadow-sm font-bold uppercase tracking-tighter text-[10px] text-center"}
                            >
                                <Icon icon={uploading ? "mdi:loading" : "mdi:camera"} className={uploading ? "animate-spin text-lg" : "text-lg"} />
                                {uploading ? '...' : 'Take Photo'}
                            </Button>
                        </div>
                    </>
                ) : (
                    <Button
                        onClick={() => ref.current?.click()}
                        disabled={uploading || isReadOnlyMode}
                        type="button"
                        className={(uploading || isReadOnlyMode) ? "bg-gray-400 text-white rounded-xl h-[52px] px-6 flex items-center justify-center gap-2 cursor-not-allowed opacity-50" : "bg-erp-accent text-white rounded-xl h-[52px] px-6 flex items-center justify-center gap-2 transition-all hover:bg-erp-accent/80 shadow-sm font-bold uppercase tracking-tighter text-xs"}
                    >
                        <Icon icon={uploading ? "mdi:loading" : "mdi:cloud-upload"} className={uploading ? "animate-spin text-xl" : "text-xl"} />
                        {uploading ? 'Uploading...' : 'Upload Document'}
                    </Button>
                )}

                {currentValue && (
                    <div className="relative group rounded-2xl overflow-hidden border border-gray-100 aspect-video bg-white flex items-center justify-center shadow-inner">
                        {isPDF(currentValue) ? (
                            <div className="flex flex-col items-center gap-2">
                                <Icon icon="mdi:file-pdf-box" className="text-5xl text-red-500" />
                                <span className="text-[10px] font-black uppercase text-gray-400">PDF Document</span>
                            </div>
                        ) : (
                            <img src={currentValue} alt={label} className="w-full h-full object-contain" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <a href={currentValue} target="_blank" rel="noopener noreferrer" className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 text-white hover:bg-white/30 transition-all scale-90 group-hover:scale-100 duration-300">
                                <Icon icon="mdi:eye" className="text-2xl" />
                            </a>
                            {!isReadOnlyMode && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (imgFieldName) formik.setFieldValue(imgFieldName, '');
                                    }}
                                    className="bg-red-500/20 backdrop-blur-md p-3 rounded-full border border-red-500/30 text-red-500 hover:bg-red-500/30 transition-all scale-90 group-hover:scale-100 duration-300"
                                >
                                    <Icon icon="mdi:trash-can-outline" className="text-2xl" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const DetailItem = ({ label, value }) => (
    <div className="flex flex-col gap-1">
        <span className="text-gray-400 text-[10px] uppercase font-bold ">{label}</span>
        <span className="text-gray-700 font-semibold">{value || '---'}</span>
    </div>
);

export const SummaryCard = ({ title, icon, color = "var(--color-erp-accent)", children }) => (
    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-sm border border-gray-100/50 hover:shadow-md transition-all">
        <div className="flex items-center gap-3 mb-4 md:mb-8">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: color }}>
                <Icon icon={icon} className="text-lg md:text-xl" />
            </div>
            <h3 className="font-bold text-gray-800 text-sm md:text-base lg:text-lg uppercase tracking-tight">{title}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 md:gap-x-8 gap-y-4 md:gap-y-6">
            {children}
        </div>
    </div>
);

export const DocPreview = ({ label, src }) => (
    <div className="flex flex-col gap-2">
        <span className="text-gray-400 text-[10px] uppercase font-bold ">{label}</span>
        {src ? (
            <div className="relative group overflow-hidden rounded-2xl border border-gray-100 aspect-video bg-gray-50 flex items-center justify-center">
                {isPDF(src) ? (
                    <div className="flex flex-col items-center gap-2">
                        <Icon icon="mdi:file-pdf-box" className="text-5xl text-red-500" />
                        <span className="text-[10px] font-black uppercase text-gray-400">View PDF</span>
                    </div>
                ) : (
                    <img
                        src={src}
                        alt={label}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a href={src} target="_blank" rel="noopener noreferrer" className="bg-white/20 backdrop-blur-md p-2 rounded-full border border-white/30 text-white">
                        <Icon icon="mdi:eye" className="text-xl" />
                    </a>
                </div>
            </div>
        ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 aspect-video bg-gray-50/50 flex flex-col items-center justify-center text-gray-300">
                <Icon icon="mdi:image-off" className="text-2xl mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">No Document</span>
            </div>
        )}
    </div>
);


