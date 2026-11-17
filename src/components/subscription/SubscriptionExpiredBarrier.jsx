import React from 'react';
import { Icon } from '@iconify/react';
import logo from '../../assets/logo.png';

// Official DigiBySR India Support Contacts
const SUPPORT_CONTACTS = {
    whatsapp: '919315806662',
    whatsappDisplay: '+91 93158 06662',
    phones: [
        { label: 'Support Desk 1', display: '+91 96505 60526', raw: '+919650560526' },
        { label: 'Support Desk 2', display: '+91 836 894 2780', raw: '+918368942780' },
        { label: 'Accounts & WhatsApp', display: '+91 93158 06662', raw: '+919315806662' }
    ],
    emails: [
        'sid@digibysr.com',
        'suryansh@digibysr.com'
    ]
};

export default function SubscriptionExpiredBarrier({ tenant, user, onLogout }) {
    const store = tenant?.storeInformation || {};
    const storeName = store.storeName || tenant?.storeName || 'DigiOptics Wholesaler';
    const tenantId = tenant?.tenantId || '';
    const rawExpiry = store.expiryDate || tenant?.subscription?.expiresAt;

    let formattedDate = 'Recently Expired';
    let daysAgo = 0;
    if (rawExpiry) {
        const d = new Date(rawExpiry);
        if (!isNaN(d.getTime())) {
            formattedDate = d.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            daysAgo = Math.max(1, Math.ceil((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
        }
    }

    const whatsappMessage = encodeURIComponent(
        `Hi DigiBySR Support, our wholesaler subscription has expired.\n\nStore: ${storeName}\nTenant ID: ${tenantId}\nExpiry Date: ${formattedDate}\n\nPlease help us renew our plan so we can access our management panel.`
    );

    const emailSubject = encodeURIComponent(`URGENT: Subscription Renewal & Access Restoration - ${storeName} [${tenantId}]`);
    const emailBody = encodeURIComponent(
        `Dear DigiBySR Billing & Support Team,\n\nOur workspace subscription expired on ${formattedDate}. All panel access is currently restricted.\nPlease share the renewal invoice and payment link to restore service access immediately.\n\nWorkspace ID: ${tenantId}\nStore Name: ${storeName}\n\nThank you!`
    );

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-rose-100/30 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header Strip */}
                <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 p-6 text-white text-center relative">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20">
                        <Icon icon="lucide:lock" className="text-3xl text-white animate-bounce" style={{ animationDuration: '2s' }} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/25 text-white inline-block mb-2">
                        Panel Access Restricted • India
                    </span>
                    <h1 className="text-2xl font-black tracking-tight">Subscription Expired</h1>
                    <p className="text-xs text-rose-100 font-medium mt-1 max-w-sm mx-auto leading-relaxed">
                        Your DigiOptics plan has expired. Access to your wholesaler operations panel is temporarily disabled.
                    </p>
                </div>

                {/* Workspace Details & Renewal Actions */}
                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    {/* Workspace Snapshot */}
                    <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-4 flex items-center justify-between">
                        <div className="min-w-0 pr-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">Workspace Account</span>
                            <h2 className="text-sm font-black text-slate-800 truncate">{storeName}</h2>
                            <span className="text-[11px] font-mono font-semibold text-slate-500">{tenantId}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-rose-600 text-white shadow-2xs">
                                <Icon icon="lucide:alert-triangle" className="text-xs" />
                                Expired {daysAgo}d ago
                            </span>
                            <span className="block text-[11px] text-slate-400 mt-1">Due: {formattedDate}</span>
                        </div>
                    </div>

                    <div className="text-center px-2">
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            To resume taking orders, managing inventory, issuing invoices, and staff access, please contact DigiBySR support to renew your subscription.
                        </p>
                    </div>

                    {/* Instant Renewal Channels */}
                    <div className="space-y-3 pt-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block text-center">
                            Fast Renewal Assistance (India Support)
                        </span>

                        {/* WhatsApp + Phone Row 1 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* WhatsApp Direct */}
                            <a
                                href={`https://wa.me/${SUPPORT_CONTACTS.whatsapp}?text=${whatsappMessage}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 hover:border-emerald-300 text-emerald-900 transition-all group shadow-2xs"
                            >
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                    <Icon icon="lucide:message-circle" className="text-xl" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-xs font-black block text-emerald-800">WhatsApp Support</span>
                                    <span className="text-[10px] text-emerald-600 font-medium truncate block">{SUPPORT_CONTACTS.whatsappDisplay}</span>
                                </div>
                            </a>

                            {/* Direct Phone Call 1 */}
                            <a
                                href={`tel:${SUPPORT_CONTACTS.phones[0].raw}`}
                                className="flex items-center gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-50 hover:border-blue-300 text-blue-900 transition-all group shadow-2xs"
                            >
                                <div className="w-10 h-10 rounded-xl bg-[#2980B9] text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                    <Icon icon="lucide:phone-call" className="text-xl" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-xs font-black block text-blue-800">{SUPPORT_CONTACTS.phones[0].label}</span>
                                    <span className="text-[10px] text-blue-600 font-medium truncate block">{SUPPORT_CONTACTS.phones[0].display}</span>
                                </div>
                            </a>
                        </div>

                        {/* Phone Row 2 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <a
                                href={`tel:${SUPPORT_CONTACTS.phones[1].raw}`}
                                className="flex items-center gap-3 p-3 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-300 text-indigo-900 transition-all group shadow-2xs"
                            >
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                    <Icon icon="lucide:phone" className="text-xl" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-xs font-black block text-indigo-900">{SUPPORT_CONTACTS.phones[1].label}</span>
                                    <span className="text-[10px] text-indigo-600 font-medium truncate block">{SUPPORT_CONTACTS.phones[1].display}</span>
                                </div>
                            </a>

                            <a
                                href={`tel:${SUPPORT_CONTACTS.phones[2].raw}`}
                                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-all group shadow-2xs"
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                    <Icon icon="lucide:phone-call" className="text-xl" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-xs font-black block text-slate-800">{SUPPORT_CONTACTS.phones[2].label}</span>
                                    <span className="text-[10px] text-slate-500 font-medium truncate block">{SUPPORT_CONTACTS.phones[2].display}</span>
                                </div>
                            </a>
                        </div>

                        {/* Support Emails */}
                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                            <div className="flex items-center gap-2 text-slate-600">
                                <Icon icon="lucide:mail" className="text-sm text-slate-500" />
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Official Support Emails</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <a
                                    href={`mailto:${SUPPORT_CONTACTS.emails[0]}?subject=${emailSubject}&body=${emailBody}`}
                                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 hover:border-blue-400 hover:text-blue-700 text-xs font-bold text-slate-700 transition-all group"
                                >
                                    <span className="truncate">{SUPPORT_CONTACTS.emails[0]}</span>
                                    <Icon icon="lucide:external-link" className="text-xs text-slate-400 group-hover:text-blue-600 flex-shrink-0" />
                                </a>
                                <a
                                    href={`mailto:${SUPPORT_CONTACTS.emails[1]}?subject=${emailSubject}&body=${emailBody}`}
                                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 hover:border-blue-400 hover:text-blue-700 text-xs font-bold text-slate-700 transition-all group"
                                >
                                    <span className="truncate">{SUPPORT_CONTACTS.emails[1]}</span>
                                    <Icon icon="lucide:external-link" className="text-xs text-slate-400 group-hover:text-blue-600 flex-shrink-0" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Sign Out Button */}
                    <div className="pt-2">
                        <button
                            onClick={onLogout}
                            className="w-full py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <Icon icon="lucide:log-out" className="text-sm" />
                            Sign Out of DigiOptics
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
