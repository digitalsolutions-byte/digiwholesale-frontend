import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import mascotGif from '../../assets/login-mascot.gif';
import { playMascotSound } from './soundEffects';

export default function WalkthroughTour({
    isOpen,
    onClose,
    steps = [],
    isMuted,
    onFinish
}) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const tourCardRef = useRef(null);

    const step = steps[currentStepIndex];
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === steps.length - 1;

    // Recalculate target position whenever step changes or window resizes
    const updateTargetPosition = () => {
        if (!isOpen || !step) return;

        let el = document.querySelector(step.targetSelector);
        if (!el && step.fallbackSelector) {
            el = document.querySelector(step.fallbackSelector);
        }

        if (el) {
            const rect = el.getBoundingClientRect();
            // Scroll target element smoothly into view if needed
            if (rect.top < 50 || rect.bottom > window.innerHeight - 50) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            // Small padding around spotlight
            const pad = 8;
            setTargetRect({
                top: Math.max(0, rect.top - pad),
                left: Math.max(0, rect.left - pad),
                width: rect.width + pad * 2,
                height: rect.height + pad * 2,
            });
        } else {
            setTargetRect(null);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setCurrentStepIndex(0);
            setTargetRect(null);
            return;
        }

        // Check if step requires route change
        if (step?.route && location.pathname !== step.route) {
            navigate(step.route);
        }

        const timer = setTimeout(() => {
            updateTargetPosition();
            playMascotSound('pop', isMuted);
        }, 150);

        window.addEventListener('resize', updateTargetPosition);
        window.addEventListener('scroll', updateTargetPosition, true);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateTargetPosition);
            window.removeEventListener('scroll', updateTargetPosition, true);
        };
    }, [isOpen, currentStepIndex, location.pathname]);

    // Handle Keyboard shortcuts (Esc to close, Left/Right arrows to step)
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowRight') {
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                handlePrev();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentStepIndex]);

    const handleNext = () => {
        if (isLastStep) {
            playMascotSound('chime', isMuted);
            if (onFinish) onFinish();
            onClose();
        } else {
            playMascotSound('pop', isMuted);
            setCurrentStepIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (!isFirstStep) {
            playMascotSound('pop', isMuted);
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    if (!isOpen || !step) return null;

    // Card placement calculation
    let cardStyle = {};
    if (targetRect) {
        const spaceBelow = window.innerHeight - (targetRect.top + targetRect.height);
        const spaceAbove = targetRect.top;

        if (spaceBelow > 320 || spaceBelow > spaceAbove) {
            // Place below target
            cardStyle = {
                top: Math.min(window.innerHeight - 340, targetRect.top + targetRect.height + 16),
                left: Math.max(20, Math.min(window.innerWidth - 440, targetRect.left)),
            };
        } else {
            // Place above target
            cardStyle = {
                top: Math.max(20, targetRect.top - 320),
                left: Math.max(20, Math.min(window.innerWidth - 440, targetRect.left)),
            };
        }
    } else {
        // Center of screen fallback
        cardStyle = {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
        };
    }

    return (
        <div className="fixed inset-0 z-[99999] pointer-events-auto">
            {/* Dark Spotlight Backdrop with cutout */}
            {targetRect ? (
                <div
                    style={{
                        position: 'absolute',
                        top: targetRect.top,
                        left: targetRect.left,
                        width: targetRect.width,
                        height: targetRect.height,
                        borderRadius: '16px',
                        boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.75)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    className="border-2 border-indigo-400/80 animate-pulse pointer-events-none ring-4 ring-indigo-500/20"
                />
            ) : (
                <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-xs transition-opacity duration-300" />
            )}

            {/* Tour Dialog Card with Dr. Specs */}
            <div
                ref={tourCardRef}
                style={cardStyle}
                className="absolute w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border border-indigo-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100000]"
            >
                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 h-full transition-all duration-300"
                        style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                    />
                </div>

                {/* Header with Dr. Specs Avatar */}
                <div className="p-4 sm:p-5 bg-gradient-to-b from-indigo-50/80 to-white flex items-start gap-3.5 border-b border-indigo-50">
                    <div className="relative flex-shrink-0">
                        <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl overflow-hidden bg-white shadow-md border-2 border-indigo-200 p-0.5">
                            <img src={mascotGif} alt="Dr. Specs" className="w-full h-full object-cover scale-115" />
                        </div>
                        <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-indigo-600 text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-2xs">
                            Guide
                        </span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider">
                                <Icon icon={step.icon || 'lucide:sparkles'} className="text-xs" />
                                <span>{step.badge}</span>
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                                {currentStepIndex + 1} / {steps.length}
                            </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                            {step.title}
                        </h4>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        title="Skip Tour"
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <Icon icon="lucide:x" className="text-base" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="p-4 sm:p-5 space-y-3">
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                        {step.content}
                    </p>

                    {/* Pro Tip Box */}
                    {step.proTip && (
                        <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/70 text-xs text-amber-900 font-semibold flex items-start gap-2 shadow-2xs">
                            <Icon icon="lucide:sparkles" className="text-amber-600 text-base flex-shrink-0 mt-0.5" />
                            <span>{step.proTip}</span>
                        </div>
                    )}

                    {/* Optional Deep Dive CTA */}
                    {step.actionText && step.actionRoute && (
                        <button
                            type="button"
                            onClick={() => {
                                navigate(step.actionRoute);
                                setTimeout(updateTargetPosition, 300);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline pt-1"
                        >
                            <span>{step.actionText}</span>
                            <Icon icon="lucide:arrow-right" />
                        </button>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors px-2 py-1"
                    >
                        Skip Tour
                    </button>

                    <div className="flex items-center gap-2">
                        {!isFirstStep && (
                            <button
                                type="button"
                                onClick={handlePrev}
                                className="px-3 py-1.5 rounded-xl border border-gray-300 text-slate-700 hover:bg-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shadow-2xs"
                            >
                                <Icon icon="lucide:chevron-left" />
                                <span>Back</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleNext}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
                        >
                            <span>{isLastStep ? 'Got It! Finish 🎉' : 'Next Step'}</span>
                            <Icon icon={isLastStep ? 'lucide:check' : 'lucide:chevron-right'} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
