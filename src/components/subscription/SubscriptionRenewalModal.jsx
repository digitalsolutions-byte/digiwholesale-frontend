import React from 'react';
import { Icon } from '@iconify/react';

const SUPPORT_PHONE = '+91 98765 43210';
const SUPPORT_PHONE_RAW = '+919876543210';
const SUPPORT_EMAIL = 'billing@digibysr.com';
const SUPPORT_WHATSAPP = '919876543210';

export default function SubscriptionRenewalModal({ isOpen, onClose, expiryMeta }) {
    if (!isOpen) return null;

    const {
        storeName = 'DigiOptics Wholesaler',
        tenantId = '',
        planType = 'PRO',
        formattedDate = '',
        daysRemaining = 0,
        isExpired = false,
        isCritical = false
    } = expiryMeta || {};

    const whatsappMessage = encodeURIComponent(
        `Hi DigiBySR Accounts & Support, I would like to renew the subscription plan for my wholesaler store:\n\nStore: ${storeName}\nTenant ID: ${tenantId}\nCurrent Plan: ${planType}\nExpiry Date: ${formattedDate} (${daysRemaining < 0 ? `Expired ${Math.abs(daysRemaining)} days ago` : `${daysRemaining} days left`})\n\nPlease provide payment details and proforma invoice.`
    );

    const emailSubject = encodeURIComponent(`Subscription Renewal Request - ${storeName} [${tenantId}]`);
    const emailBody = encodeURIComponent(
        `Dear DigiBySR Billing Team,\n\nPlease process the subscription renewal for our wholesaler account:\n- Store Name: ${storeName}\n- Workspace ID: ${tenantId}\n- Current Plan: ${planType}\n- Expiry Date: ${formattedDate}\n\nPlease share the payment link and tax invoice.\n\nThank you!`
    );

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with DigiOptics Oceanic Gradient */}
                <div className="p-6 bg-gradient-to-r from-[#1F618D] via-[#2980B9] to-[#0284C7] text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                        aria-label="Close"
                    >
                        <Icon icon="lucide:x" className="text-lg" />
                    </button>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-white">
                            DigiOptics Subscription Desk
                        </span>
                    </div>
                    <h3 className="text-xl font-black tracking-tight">Renew Workspace Subscription</h3>
                    <p className="text-xs text-white/80 mt-1 font-medium">
                        Keep your wholesaler orders, catalog, inventory, and accounting running without interruption.
                    </p>
                </div>

                {/* Workspace Plan Snapshot */}
                <div className="p-6 space-y-5">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">Workspace</span>
                            <h4 className="text-sm font-extrabold text-slate-800">{storeName}</h4>
                            <span className="text-[11px] font-mono text-slate-500 font-semibold">{tenantId}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">Status</span>
                            <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full border ${
                                isExpired
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : isCritical
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                                <Icon icon={isExpired || isCritical ? 'lucide:alert-triangle' : 'lucide:clock'} className="text-sm" />
                                {isExpired
                                    ? `Expired ${Math.abs(daysRemaining)}d ago`
                                    : `${daysRemaining} days remaining`}
                            </span>
                            <span className="block text-[11px] text-slate-400 mt-1">Expiry: {formattedDate}</span>
                        </div>
                    </div>

                    {/* Fast Renewal Contact Channels */}
                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                            Instant Renewal Assistance
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* WhatsApp Fast Track */}
                            <a
                                href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${whatsappMessage}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-300 text-emerald-900 transition-all group shadow-2xs"
                            >
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                    <Icon icon="lucide:message-circle" className="text-xl" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-xs font-extrabold block text-emerald-800">WhatsApp Renew</span>
                                    <span className="text-[10px] text-emerald-600 font-medium truncate block">Instant chat confirmation</span>
                                </div>
                            </a>

                            {/* Direct Phone Call */}
                            <a
                                href={`tel:${SUPPORT_PHONE_RAW}`}
                                className="flex items-center gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 text-blue-900 transition-all group shadow-2xs"
                            >
                                <div className="w-10 h-10 rounded-xl bg-[#2980B9] text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                    <Icon icon="lucide:phone-call" className="text-xl" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-xs font-extrabold block text-blue-800">Call Accounts Desk</span>
                                    <span className="text-[10px] text-blue-600 font-medium truncate block">{SUPPORT_PHONE}</span>
                                </div>
                            </a>

                            {/* Email Desk */}
                            <a
                                href={`mailto:${SUPPORT_EMAIL}?subject=${emailSubject}&body=${emailBody}`}
                                className="sm:col-span-2 flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-800 transition-all group shadow-2xs"
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                    <Icon icon="lucide:mail" className="text-xl" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-xs font-extrabold block text-slate-800">Email DigiBySR Billing</span>
                                    <span className="text-[10px] text-slate-500 font-medium truncate block">{SUPPORT_EMAIL} (official tax invoices & receipt)</span>
                                </div>
                                <Icon icon="lucide:chevron-right" className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                            </a>
                        </div>
                    </div>

                    <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3 flex items-start gap-2.5">
                        <Icon icon="lucide:info" className="text-amber-600 text-base mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                            Once payment is initiated, DigiBySR generates your official GST Tax Invoice and your subscription expiry date is immediately extended in real time.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-2xs"
                    >
                        Remind Me Later
                    </button>
                    <a
                        href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${whatsappMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-[#2980B9] to-[#0284C7] hover:brightness-105 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                    >
                        <Icon icon="lucide:check" className="text-sm" />
                        Proceed to Renew
                    </a>
                </div>
            </div>
        </div>
    );
}
