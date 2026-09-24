import React from 'react';
import { Icon } from '@iconify/react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectCurrentTenant } from '../../store/slices/authSlice';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';

/**
 * DemoWatermark Component
 * 
 * Displays dynamic security watermark overlay across the app containing user details:
 * User Name, Shop/Store Name, Mobile/Phone Number, Demo ID & Security Evaluation Message.
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

    // Retrieve active Unique Demo ID & User Details
    const demoId = user?.demoId || user?.demo_id || user?.uniqueDemoId ||
                   tenant?.demoId || tenant?.demo_id || tenant?.uniqueDemoId ||
                   localStorage.getItem('digioptics_unique_demo_id') ||
                   'DEMO-DIGI-ACCESS';

    const userName = (user?.ownerName || user?.name || user?.employeeName || user?.username || tenant?.owner?.ownerName || 'Demo User').trim();
    const shopName = (tenant?.storeInformation?.storeName || tenant?.storeName || tenant?.businessName || user?.shopName || 'Demo Shop').trim();
    const userMobile = (user?.mobile || user?.phone || user?.phoneNumber || tenant?.owner?.mobile || tenant?.mobile || 'N/A').trim();

    const watermarkText = `DIGIOPTICS DEMO • SHOP: ${shopName.toUpperCase()} • USER: ${userName.toUpperCase()} • MOB: ${userMobile} • CONFIDENTIAL EVALUATION ONLY • ID: ${demoId} • `;

    return (
        <>
            {/* 1. Fullscreen Diagonal Background Watermark Grid Overlay */}
            <div className="fixed inset-0 pointer-events-none select-none z-[9990] overflow-hidden opacity-[0.22] flex flex-col justify-between p-6 space-y-20">
                {Array.from({ length: 12 }).map((_, rowIdx) => (
                    <div
                        key={rowIdx}
                        className="whitespace-nowrap font-mono font-black text-lg sm:text-2xl text-slate-900 uppercase tracking-[0.2em] -rotate-[18deg] transform origin-center transition-transform"
                        style={{
                            marginLeft: rowIdx % 2 === 0 ? '-10%' : '-25%',
                            textShadow: '0 0 1px rgba(0,0,0,0.1)'
                        }}
                    >
                        {watermarkText.repeat(8)}
                    </div>
                ))}
            </div>

            {/* 2. Floating Interactive Corner Demo Badge & Details Overlay */}
            <div className="fixed bottom-4 right-4 z-[9991] flex items-center gap-2 group">
                <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('open-demo-modal'))}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#2980B9] to-blue-700 text-white shadow-2xl hover:shadow-2xl border border-white/30 backdrop-blur-md transition-all duration-200 hover:scale-105 cursor-pointer"
                    title="DigiOptics Demo Active - Click to view NDA Agreement"
                >
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
                    </span>

                    <div className="flex flex-col text-left space-y-0.5">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">DEMO MODE ACTIVE</span>
                            <span className="text-[9px] font-mono opacity-75">[{demoId}]</span>
                        </div>
                        <div className="text-[11px] font-bold text-white leading-tight flex items-center gap-1.5 flex-wrap">
                            <span className="text-amber-200">{shopName}</span>
                            <span className="opacity-50">&bull;</span>
                            <span>{userName}</span>
                            <span className="opacity-50">&bull;</span>
                            <span className="font-mono text-[10px] text-blue-200">{userMobile}</span>
                        </div>
                    </div>

                    <Icon icon="mdi:information-outline" className="text-base opacity-75 group-hover:opacity-100 shrink-0 ml-1" />
                </button>
            </div>
        </>
    );
};

export default DemoWatermark;
