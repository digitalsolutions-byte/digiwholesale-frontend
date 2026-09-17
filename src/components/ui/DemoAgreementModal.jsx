import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectCurrentTenant } from '../../store/slices/authSlice';

/**
 * DemoAgreementModal Component
 * 
 * Displays mandatory Confidential Demo Access & NDA Agreement for DigiOptics.
 * Styled 100% with brand theme colors (erp-accent / #2980b9 / blue-600). No dark background elements.
 * Appears before the Welcome screen or any dashboard access until accepted.
 */
const DemoAgreementModal = ({ forceOpen = false, onClose }) => {
    const user = useSelector(selectCurrentUser);
    const tenant = useSelector(selectCurrentTenant);

    // Track acceptance state in localStorage
    const [accepted, setAccepted] = useState(() => {
        return localStorage.getItem('digioptics_demo_acknowledged') === 'true';
    });

    const [modalOpen, setModalOpen] = useState(forceOpen || !accepted);
    const [isChecked, setIsChecked] = useState(false);

    // Synchronize forceOpen prop & window custom event
    useEffect(() => {
        if (forceOpen) {
            setModalOpen(true);
        }
        const handleCustomOpen = () => setModalOpen(true);
        window.addEventListener('open-demo-modal', handleCustomOpen);
        return () => window.removeEventListener('open-demo-modal', handleCustomOpen);
    }, [forceOpen]);

    // Live Date & Time formatting
    const [currentDateTime, setCurrentDateTime] = useState('');
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const formatted = now.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
            setCurrentDateTime(formatted);
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    // Unique Demo ID resolution (backend -> localStorage -> URL param -> env -> auto-generated)
    const [demoId] = useState(() => {
        if (user?.demoId || user?.demo_id || user?.uniqueDemoId) return user.demoId || user.demo_id || user.uniqueDemoId;
        if (tenant?.demoId || tenant?.demo_id || tenant?.uniqueDemoId) return tenant.demoId || tenant.demo_id || tenant.uniqueDemoId;

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('demoId')) {
            const idFromUrl = urlParams.get('demoId');
            localStorage.setItem('digioptics_unique_demo_id', idFromUrl);
            return idFromUrl;
        }

        if (import.meta.env.VITE_DEMO_ID) return import.meta.env.VITE_DEMO_ID;

        const stored = localStorage.getItem('digioptics_unique_demo_id');
        if (stored) return stored;

        const generated = `DEMO-DIGI-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        localStorage.setItem('digioptics_unique_demo_id', generated);
        return generated;
    });

    // Dynamic User Data Fields
    const [repName, setRepName] = useState(
        user?.employeeName || user?.name || user?.fullName || tenant?.contactPerson || 'Authorized Representative'
    );
    const [orgName, setOrgName] = useState(
        tenant?.companyName || tenant?.name || tenant?.organizationName || user?.companyName || 'Partner Organisation'
    );
    const [orgAddress, setOrgAddress] = useState(
        tenant?.address || (tenant?.city ? `${tenant.address || ''} ${tenant.city || ''}, ${tenant.state || ''}`.trim() : 'Registered Address')
    );
    const userEmail = user?.email || tenant?.email || 'demo.user@digioptics.com';

    const [isEditingData, setIsEditingData] = useState(false);

    const handleAccept = () => {
        if (!isChecked) return;
        localStorage.setItem('digioptics_demo_acknowledged', 'true');
        localStorage.setItem('digioptics_demo_ack_time', new Date().toISOString());
        localStorage.setItem('digioptics_demo_ack_name', repName);
        localStorage.setItem('digioptics_demo_ack_org', orgName);
        setAccepted(true);
        setModalOpen(false);
        if (onClose) onClose();
    };

    if (!modalOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
            <div className="relative w-full max-w-3xl my-auto bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* ── Modal Header Banner (Theme Colors) ───────────────────────── */}
                <div className="bg-gradient-to-r from-erp-accent via-[#2980b9] to-blue-600 text-white px-6 py-5 flex items-center justify-between shrink-0 shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-inner">
                            <Icon icon="mdi:shield-lock-outline" className="text-2xl" />
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-widest border border-white/30 mb-0.5">
                                <Icon icon="mdi:lock-check" className="text-xs" /> Strictly Confidential
                            </div>
                            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white leading-tight">
                                DIGIOPTICS – CONFIDENTIAL DEMO ACCESS
                            </h2>
                        </div>
                    </div>
                    {forceOpen && (
                        <button
                            onClick={() => { setModalOpen(false); if (onClose) onClose(); }}
                            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition cursor-pointer"
                            title="Close"
                        >
                            <Icon icon="mdi:close" className="text-xl" />
                        </button>
                    )}
                </div>

                {/* ── Modal Scrollable Body Content ───────────────────────────────── */}
                <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6 text-gray-800 text-xs sm:text-sm bg-white">
                    
                    {/* Declaration Box */}
                    <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/50 rounded-2xl border border-blue-200 shadow-xs relative">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-erp-accent uppercase tracking-wider flex items-center gap-1">
                                <Icon icon="mdi:file-certificate-outline" className="text-sm" /> Authorized Demo Declaration
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsEditingData(!isEditingData)}
                                className="text-[11px] font-semibold text-erp-accent hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <Icon icon={isEditingData ? "mdi:check-bold" : "mdi:pencil-outline"} />
                                {isEditingData ? "Done Editing" : "Edit Details"}
                            </button>
                        </div>

                        {isEditingData ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2 p-3 bg-white rounded-xl border border-blue-200">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Representative Name</label>
                                    <input
                                        type="text"
                                        value={repName}
                                        onChange={e => setRepName(e.target.value)}
                                        className="w-full text-xs p-1.5 border border-gray-300 rounded-lg outline-none focus:border-erp-accent"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Organisation Name</label>
                                    <input
                                        type="text"
                                        value={orgName}
                                        onChange={e => setOrgName(e.target.value)}
                                        className="w-full text-xs p-1.5 border border-gray-300 rounded-lg outline-none focus:border-erp-accent"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Address</label>
                                    <input
                                        type="text"
                                        value={orgAddress}
                                        onChange={e => setOrgAddress(e.target.value)}
                                        className="w-full text-xs p-1.5 border border-gray-300 rounded-lg outline-none focus:border-erp-accent"
                                    />
                                </div>
                            </div>
                        ) : null}

                        <p className="leading-relaxed text-gray-700 font-medium">
                            I, <span className="font-black text-gray-900 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200">{repName || '___________'}</span>, Business Owner/Manager/Authorised Representative of <span className="font-black text-gray-900 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200">{orgName || '__________ [Organisation Name]'}</span>, Address <span className="font-black text-gray-900 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200">{orgAddress || '_____'}</span> hereby acknowledge and agree that this DigiOptics demo is being provided solely for the purpose of evaluating and understanding the DigiOptics software.
                        </p>
                    </div>

                    {/* Terms Checklist */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Icon icon="mdi:gavel" className="text-erp-accent text-base" /> I agree that:
                        </h4>
                        <div className="space-y-2.5">
                            {[
                                "The demo link and the information, features, screens and functionality demonstrated through it are confidential and proprietary to DigiOptics.",
                                "The demo link will not be shared, forwarded or made accessible to anyone outside the above-named organisation.",
                                "The demo, or any part thereof, will not be downloaded, recorded, screen-recorded, photographed or reproduced in any form.",
                                "No screenshots or copies of the demo or its contents will be taken or retained.",
                                "The demo and the information contained therein will not be disclosed, copied, reproduced or distributed to any third party without prior written permission from DigiOptics."
                            ].map((term, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/40 hover:bg-blue-50/80 border border-blue-100 transition">
                                    <div className="w-5 h-5 rounded-full bg-erp-accent text-white shrink-0 flex items-center justify-center font-bold text-xs mt-0.5 shadow-2xs">
                                        {idx + 1}
                                    </div>
                                    <p className="text-xs font-semibold text-gray-700 leading-snug">{term}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Agreed and Accepted Receipt Card (Theme Light Colors) */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50 via-white to-blue-50/60 border border-blue-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-blue-200/80 pb-2">
                            <span className="text-xs font-black uppercase tracking-widest text-erp-accent flex items-center gap-1.5">
                                <Icon icon="mdi:check-decagram" className="text-base text-emerald-600" /> Agreed and Accepted
                            </span>
                            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-semibold">
                                Audit Record
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                            <div>
                                <span className="text-gray-500 text-[10px] uppercase font-bold block">Name:</span>
                                <span className="font-bold text-gray-900">{repName || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 text-[10px] uppercase font-bold block">Organisation:</span>
                                <span className="font-bold text-gray-900">{orgName || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 text-[10px] uppercase font-bold block">Email address:</span>
                                <span className="font-bold text-gray-900">{userEmail}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 text-[10px] uppercase font-bold block">Date & exact time:</span>
                                <span className="font-bold text-erp-accent font-mono">{currentDateTime}</span>
                            </div>
                            <div className="sm:col-span-2 pt-2 border-t border-blue-200/80 flex items-center justify-between flex-wrap gap-2">
                                <span className="text-gray-500 text-[10px] uppercase font-bold">Unique Demo ID:</span>
                                <span className="font-mono text-xs bg-erp-accent/15 text-erp-accent px-3 py-1 rounded-lg border border-erp-accent/30 font-black tracking-wider">
                                    {demoId}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Modal Footer Controls ────────────────────────────────────── */}
                <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 shrink-0 space-y-3">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => setIsChecked(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-erp-accent focus:ring-erp-accent cursor-pointer"
                        />
                        <span className="text-xs font-bold text-gray-800 leading-snug">
                            I confirm that I am authorized to bind my organisation and I accept all terms of this Confidential Demo Access Agreement.
                        </span>
                    </label>

                    <div className="flex items-center justify-end gap-3 pt-1">
                        <button
                            type="button"
                            onClick={handleAccept}
                            disabled={!isChecked}
                            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md ${
                                isChecked
                                    ? 'bg-erp-accent hover:bg-erp-accent/90 text-white cursor-pointer ring-2 ring-erp-accent/30'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            <Icon icon="mdi:shield-check" className="text-base" />
                            Accept & Proceed to Demo
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DemoAgreementModal;
