import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectCurrentTenant } from '../../store/slices/authSlice';

/**
 * DemoWatermark Component
 * 
 * Displays a non-obtrusive, highly visible security watermark overlay across the app.
 * Includes diagonal background text + floating interactive corner badge.
 */
const DemoWatermark = () => {
    const user = useSelector(selectCurrentUser);
    const tenant = useSelector(selectCurrentTenant);

    // Retrieve active Unique Demo ID
    const [demoId] = useState(() => {
        if (user?.demoId || user?.demo_id || user?.uniqueDemoId) return user.demoId || user.demo_id || user.uniqueDemoId;
        if (tenant?.demoId || tenant?.demo_id || tenant?.uniqueDemoId) return tenant.demoId || tenant.demo_id || tenant.uniqueDemoId;

        const stored = localStorage.getItem('digioptics_unique_demo_id');
        if (stored) return stored;

        return 'DEMO-DIGI-ACCESS';
    });

    const watermarkText = `DIGIOPTICS DEMO • CONFIDENTIAL EVALUATION ONLY • ID: ${demoId} • `;

    return (
        <>
            {/* ── 1. Fullscreen Diagonal Background Watermark Grid ───────────────── */}
            <div className="fixed inset-0 pointer-events-none select-none z-[9990] overflow-hidden opacity-[0.06] flex flex-col justify-between p-8 space-y-24">
                {Array.from({ length: 12 }).map((_, rowIdx) => (
                    <div
                        key={rowIdx}
                        className="whitespace-nowrap font-mono font-black text-2xl sm:text-3xl text-slate-900 uppercase tracking-[0.25em] -rotate-[22deg] transform origin-center transition-transform"
                        style={{
                            marginLeft: rowIdx % 2 === 0 ? '-10%' : '-25%',
                            textShadow: '0 0 1px rgba(0,0,0,0.1)'
                        }}
                    >
                        {watermarkText.repeat(8)}
                    </div>
                ))}
            </div>

            {/* ── 2. Floating Interactive Corner Demo Badge ────────────────────── */}
            <div className="fixed bottom-4 right-4 z-[9991] flex items-center gap-2 group animate-pulse hover:animate-none">
                <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('open-demo-modal'))}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-erp-accent to-blue-600 text-white shadow-xl hover:shadow-2xl border border-white/40 backdrop-blur-md transition-all duration-200 hover:scale-105 cursor-pointer"
                    title="DigiOptics Demo Active - Click to view Confidential NDA Agreement"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                    </span>

                    <Icon icon="mdi:shield-lock" className="text-base text-amber-300" />
                    
                    <span className="text-[11px] font-black uppercase tracking-wider">
                        DIGIOPTICS DEMO <span className="opacity-75 font-mono text-[10px] hidden sm:inline">[{demoId}]</span>
                    </span>

                    <Icon icon="mdi:information-outline" className="text-xs opacity-75 group-hover:opacity-100" />
                </button>
            </div>
        </>
    );
};

export default DemoWatermark;
