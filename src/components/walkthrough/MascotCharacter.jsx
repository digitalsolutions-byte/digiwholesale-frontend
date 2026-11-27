import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import mascotGif from '../../assets/login-mascot.gif';
import { playMascotSound } from './soundEffects';

export default function MascotCharacter({
    speechBubble,
    onDismissBubble,
    onOpenHub,
    onStartTour,
    isTourActive,
    isMuted,
    onToggleMute,
    mood = 'waving',
}) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 }); // offset from default
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const moodBadges = {
        waving: { icon: 'lucide:sparkles', color: 'bg-amber-400 text-amber-950', label: 'Guide Online' },
        glasses: { icon: 'lucide:glasses', color: 'bg-indigo-500 text-white', label: 'Specs Guru' },
        excited: { icon: 'lucide:rocket', color: 'bg-emerald-500 text-white', label: 'Pro Feature' },
        idea: { icon: 'lucide:lightbulb', color: 'bg-yellow-400 text-yellow-950', label: 'Smart Tip' },
        explaining: { icon: 'lucide:graduation-cap', color: 'bg-blue-500 text-white', label: 'Explaining' },
    };

    const currentBadge = moodBadges[mood] || moodBadges.waving;

    // Dragging handlers
    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('a')) return;
        setIsDragging(true);
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleMascotClick = (e) => {
        e.stopPropagation();
        playMascotSound('wobble', isMuted);
        if (onOpenHub) onOpenHub();
    };

    return (
        <div
            data-tour="dr-specs-widget"
            style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                cursor: isDragging ? 'grabbing' : 'default',
            }}
            className={`fixed z-[9990] transition-all duration-200 select-none ${
                isMinimized
                    ? 'bottom-24 right-5'
                    : 'bottom-28 right-6 md:bottom-28 md:right-8'
            }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Minimized Pill View */}
            {isMinimized ? (
                <div
                    onClick={() => {
                        setIsMinimized(false);
                        playMascotSound('pop', isMuted);
                    }}
                    className="flex items-center gap-2.5 px-3.5 py-2 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white rounded-full shadow-xl hover:shadow-2xl border-2 border-white/50 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 transition-all group"
                >
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/80 bg-white/20 flex items-center justify-center">
                        <img src={mascotGif} alt="Dr. Specs" className="w-full h-full object-cover scale-125" />
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-blue-900 animate-ping" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-black tracking-wide flex items-center gap-1">
                            Dr. Specs <Icon icon="lucide:glasses" className="text-sm text-yellow-300" />
                        </span>
                        <span className="text-[10px] text-white/80 font-medium">Click to Open Guide</span>
                    </div>
                </div>
            ) : (
                /* Full Floating Character & Speech Bubble */
                <div className="relative flex flex-col items-end">
                    {/* Speech Bubble (when present or on first visit) */}
                    {speechBubble && !isTourActive && (
                        <div
                            className="mb-3 max-w-xs sm:max-w-sm bg-white/95 backdrop-blur-lg border border-indigo-100 rounded-2xl p-4 shadow-2xl relative animate-in fade-in slide-in-from-bottom-3 duration-300 border-t-4 border-t-indigo-600"
                        >
                            {/* Speech arrow pointing to mascot */}
                            <div className="absolute -bottom-2 right-10 w-4 h-4 bg-white border-r border-b border-indigo-100 rotate-45 transform" />

                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-black text-indigo-900 flex items-center gap-1">
                                        <Icon icon="lucide:glasses" className="text-indigo-600 text-sm" />
                                        Dr. Specs Says:
                                    </span>
                                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${currentBadge.color}`}>
                                        <Icon icon={currentBadge.icon} className="text-xs" />
                                        {currentBadge.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={onToggleMute}
                                        title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                                        className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 text-xs transition-colors"
                                    >
                                        <Icon icon={isMuted ? 'lucide:volume-x' : 'lucide:volume-2'} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onDismissBubble}
                                        title="Dismiss tip"
                                        className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 text-xs transition-colors"
                                    >
                                        <Icon icon="lucide:x" />
                                    </button>
                                </div>
                            </div>

                            <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                {speechBubble.text}
                            </p>

                            {speechBubble.proTip && (
                                <div className="mt-2 p-2 bg-amber-50/80 rounded-lg border border-amber-200/60 text-[11px] text-amber-900 font-semibold flex items-start gap-1.5">
                                    <Icon icon="lucide:sparkles" className="text-amber-600 text-sm flex-shrink-0 mt-0.5" />
                                    <span>{speechBubble.proTip}</span>
                                </div>
                            )}

                            {/* Bubble Action Buttons */}
                            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
                                {speechBubble.showTourBtn && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (onStartTour) onStartTour();
                                            if (onDismissBubble) onDismissBubble();
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-xs hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95 flex items-center gap-1.5"
                                    >
                                        <Icon icon="lucide:play" className="text-xs" />
                                        <span>Start 2-Min Tour</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onOpenHub}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1"
                                >
                                    <Icon icon="lucide:help-circle" className="text-xs text-indigo-600" />
                                    <span>Feature Guide</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={onDismissBubble}
                                    className="ml-auto text-[11px] text-gray-400 hover:text-gray-600 font-medium"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Mascot Avatar Widget */}
                    <div
                        onMouseDown={handleMouseDown}
                        className="group relative flex items-center gap-2 cursor-pointer"
                        title="Click to talk to Dr. Specs (Drag to move)"
                    >
                        {/* Drag Handle Indicator */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800/80 text-white p-1 rounded-md text-[10px] flex items-center gap-0.5 shadow-sm backdrop-blur-xs">
                            <Icon icon="lucide:grip-vertical" />
                            <span>Drag</span>
                        </div>

                        {/* Interactive Mascot Body */}
                        <div
                            onClick={handleMascotClick}
                            className={`relative rounded-full p-1 bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-400 shadow-2xl transition-all duration-300 ${
                                isHovered ? 'scale-110 -translate-y-1' : 'scale-100'
                            }`}
                        >
                            {/* Outer animated ring */}
                            <div className="absolute inset-0 rounded-full border-2 border-indigo-400/40 animate-ping pointer-events-none" />

                            {/* Inner Mascot Circle */}
                            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-white/95 shadow-inner border-2 border-white flex items-center justify-center">
                                <img
                                    src={mascotGif}
                                    alt="Dr. Specs Mascot"
                                    className="w-full h-full object-cover scale-110 transition-transform duration-300 group-hover:scale-125"
                                />

                                {/* Glassmorphic specs shine overlay */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-indigo-900/10 pointer-events-none" />
                            </div>

                            {/* Status Online Pulse */}
                            <div
                                className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center"
                                title="Dr. Specs is Active"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            </div>

                            {/* Top Badge (Mood / Tour Active) */}
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-900/90 text-yellow-300 border border-yellow-400/30 text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 whitespace-nowrap">
                                <Icon icon="lucide:glasses" className="text-yellow-400" />
                                <span>Dr. Specs</span>
                            </div>
                        </div>

                        {/* Quick Action Mini Bar */}
                        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 -ml-1">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMinimized(true);
                                    playMascotSound('pop', isMuted);
                                }}
                                title="Minimize Dr. Specs"
                                className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-gray-600 hover:text-black shadow-md border border-gray-200 flex items-center justify-center text-xs transition-all active:scale-95"
                            >
                                <Icon icon="lucide:minimize-2" />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleMute();
                                }}
                                title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                                className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-gray-600 hover:text-black shadow-md border border-gray-200 flex items-center justify-center text-xs transition-all active:scale-95"
                            >
                                <Icon icon={isMuted ? 'lucide:volume-x' : 'lucide:volume-2'} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
