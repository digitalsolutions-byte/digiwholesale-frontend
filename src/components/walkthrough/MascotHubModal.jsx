import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import mascotGif from '../../assets/login-mascot.gif';
import { FEATURE_GUIDES, CONTEXTUAL_PAGE_TIPS } from './featureGuides';
import { playMascotSound } from './soundEffects';

export default function MascotHubModal({
    isOpen,
    onClose,
    onStartTour,
    isMuted,
    onToggleMute,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGuide, setSelectedGuide] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    if (!isOpen) return null;

    const currentTip = CONTEXTUAL_PAGE_TIPS[location.pathname];

    const filteredGuides = FEATURE_GUIDES.filter(g => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            g.title.toLowerCase().includes(q) ||
            g.shortDesc.toLowerCase().includes(q) ||
            g.keywords.some(k => k.toLowerCase().includes(q))
        );
    });

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-3xl shadow-2xl border border-indigo-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-5 sm:p-6 text-white flex items-center justify-between gap-4 relative overflow-hidden flex-shrink-0">
                    {/* Decorative background glow */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center gap-4 relative z-1">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 p-1 border-2 border-white/40 shadow-inner flex-shrink-0 flex items-center justify-center overflow-hidden">
                            <img src={mascotGif} alt="Dr. Specs" className="w-full h-full object-cover scale-110" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-1.5">
                                    <span>Dr. Specs Interactive Guide Center</span>
                                    <Icon icon="lucide:sparkles" className="text-yellow-300 text-base" />
                                </h3>
                                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-yellow-200 px-2 py-0.5 rounded-full border border-white/20">
                                    Optical Co-Pilot
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-blue-100 font-medium">
                                Digi-Optics platform ke sabhi features ko asani se samjhein aur master karein!
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 relative z-1">
                        <button
                            type="button"
                            onClick={onToggleMute}
                            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm transition-all"
                        >
                            <Icon icon={isMuted ? 'lucide:volume-x' : 'lucide:volume-2'} />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-base transition-all"
                        >
                            <Icon icon="lucide:x" />
                        </button>
                    </div>
                </div>

                {/* Quick Actions & Live Tip Bar */}
                <div className="bg-indigo-50/60 p-4 border-b border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
                    {/* Page Tip */}
                    <div className="flex items-center gap-2 text-xs text-indigo-900 font-semibold w-full sm:w-auto">
                        <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs flex-shrink-0">
                            <Icon icon="lucide:lightbulb" className="text-sm" />
                        </span>
                        <div className="line-clamp-1">
                            <span className="font-bold text-indigo-950">{currentTip?.title || 'Quick Tip'}: </span>
                            <span className="text-slate-600 font-normal">{currentTip?.tip || 'Dr. Specs hamesha aapki screen par available hai!'}</span>
                        </div>
                    </div>

                    {/* Launch Tour CTA */}
                    <button
                        type="button"
                        onClick={() => {
                            playMascotSound('pop', isMuted);
                            onClose();
                            if (onStartTour) onStartTour();
                        }}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 flex-shrink-0"
                    >
                        <Icon icon="lucide:play" className="text-sm" />
                        <span>Start Interactive Tour (2 Mins)</span>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 sm:p-5 border-b border-gray-100 flex-shrink-0">
                    <div className="relative">
                        <Icon icon="lucide:search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search any feature (e.g. Matrix Quick Order, Prescription, Bulk Excel, Ledger, Dispatch)..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm text-slate-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-2xs bg-slate-50/50"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                            >
                                <Icon icon="lucide:x" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Scrollable Content */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                    {/* If a guide is selected for detail view */}
                    {selectedGuide ? (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <button
                                type="button"
                                onClick={() => setSelectedGuide(null)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 mb-2"
                            >
                                <Icon icon="lucide:chevron-left" />
                                <span>Back to All Features</span>
                            </button>

                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
                                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                            <Icon icon={selectedGuide.icon} className="text-xl" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                                                {selectedGuide.category}
                                            </span>
                                            <h4 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                                                {selectedGuide.title}
                                            </h4>
                                        </div>
                                    </div>

                                    {selectedGuide.actionRoute && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigate(selectedGuide.actionRoute);
                                                onClose();
                                            }}
                                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                                        >
                                            <span>{selectedGuide.actionLabel || 'Try Now'}</span>
                                            <Icon icon="lucide:external-link" />
                                        </button>
                                    )}
                                </div>

                                <p className="text-xs sm:text-sm text-slate-600 font-medium mb-4">
                                    {selectedGuide.shortDesc}
                                </p>

                                <div className="space-y-2.5 pt-3 border-t border-slate-200">
                                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                                        Step-by-Step Guide:
                                    </h5>
                                    {selectedGuide.fullExplanation.map((line, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                                            <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                                                {idx + 1}
                                            </span>
                                            <span>{line.replace(/^\d+\.\s*/, '')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Feature Grid Cards */
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                                    Core Modules & Capabilities ({filteredGuides.length})
                                </h4>
                                <span className="text-xs text-slate-400 font-medium">Click any card to read walkthrough</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {filteredGuides.map((guide) => (
                                    <div
                                        key={guide.id}
                                        onClick={() => {
                                            playMascotSound('pop', isMuted);
                                            setSelectedGuide(guide);
                                        }}
                                        className="group p-4 rounded-2xl border border-gray-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/30 transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                        <Icon icon={guide.icon} className="text-base" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                                        {guide.category}
                                                    </span>
                                                </div>
                                                <Icon icon="lucide:chevron-right" className="text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                            </div>

                                            <h5 className="text-sm font-bold text-slate-900 group-hover:text-indigo-900 transition-colors mb-1">
                                                {guide.title}
                                            </h5>
                                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                {guide.shortDesc}
                                            </p>
                                        </div>

                                        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-indigo-600 font-bold">
                                            <span>Read full walkthrough</span>
                                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <Icon icon="lucide:glasses" className="text-indigo-600 text-base" />
                        <span>Powered by Digi-Optics Assistant</span>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
