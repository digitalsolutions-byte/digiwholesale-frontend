import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectCurrentTenant } from '../../store/slices/authSlice';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';

/**
 * DemoWatermark Component
 * 
 * Displays non-obtrusive, highly visible security watermark overlay across the app.
 * Dynamically driven by tenant/user demoMode flag or demo account identifier.
 */
const DemoWatermark = () => {
    const user = useSelector(selectCurrentUser);
    const tenant = useSelector(selectCurrentTenant);
    const { flags } = useFeatureFlags();

    const isDemoMode = Boolean(
        user?.demoMode ||
        user?.isDemo ||
        user?.EmployeeType === 'DEMO' ||
        tenant?.demoMode ||
        tenant?.featureFlags?.demoMode ||
        flags?.demoMode ||
        (user?.username && user.username.toLowerCase().includes('demo')) ||
        (user?.email && user.email.toLowerCase().includes('demo')) ||
        (tenant?.storeInformation?.storeName && tenant.storeInformation.storeName.toLowerCase().includes('demo')) ||
        localStorage.getItem('digioptics_demo_mode') === 'true'
    );

    const getExpiryDate = () => {
        const val = user?.demoExpiry || tenant?.demoExpiry || tenant?.featureFlags?.demoExpiry || flags?.demoExpiry;
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    };

    const expiryDate = getExpiryDate();
    const isExpired = expiryDate ? new Date() > expiryDate : false;

    // Do not show watermark if demo mode is off or demo period has expired
    if (!isDemoMode || isExpired) return null;

    // Retrieve active Unique Demo ID
    const demoId = user?.demoId || user?.demo_id || user?.uniqueDemoId ||
                   tenant?.demoId || tenant?.demo_id || tenant?.uniqueDemoId ||
                   localStorage.getItem('digioptics_unique_demo_id') ||
                   'DEMO-DIGI-ACCESS';

    const watermarkText = `DIGIOPTICS DEMO • CONFIDENTIAL EVALUATION ONLY • ID: ${demoId} • `;

    return (
        <>
            {/* ── 1. Fullscreen Diagonal Background Watermark Grid ───────────────── */}
            <div className="fixed inset-0 pointer-events-none select-none z-[9990] overflow-hidden opacity-[0.25] flex flex-col justify-between p-8 space-y-24">
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
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#2980B9] to-blue-600 text-white shadow-xl hover:shadow-2xl border border-white/40 backdrop-blur-md transition-all duration-200 hover:scale-105 cursor-pointer"
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
