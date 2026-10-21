import React, { useState } from 'react';
import { Icon } from '@iconify/react';

export default function SubscriptionExpiryBanner({ expiryMeta, onOpenRenew }) {
    const [isDismissed, setIsDismissed] = useState(false);

    if (!expiryMeta || !expiryMeta.showBanner || isDismissed) {
        return null;
    }

    const {
        daysRemaining = 0,
        formattedDate = '',
        isExpired = false,
        isCritical = false,
        isWarningYellow = false,
        planType = 'PRO'
    } = expiryMeta;

    // 1. YELLOW WARNING STATE (15 days till 8 days remaining)
    if (isWarningYellow) {
        return (
            <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50/70 to-amber-50 p-4 sm:p-5 shadow-xs transition-all animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5 sm:mt-0">
                            <Icon icon="lucide:clock" className="text-xl" />
                        </div>
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 border border-amber-300/60">
                                    Subscription Notice • {planType} Tier
                                </span>
                                <span className="text-xs font-bold text-amber-800">
                                    {daysRemaining} days remaining
                                </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-extrabold text-amber-950 tracking-tight">
                                Plan is about to expire in {daysRemaining} days ({formattedDate})
                            </h3>
                            <p className="text-xs text-amber-800/90 font-medium leading-relaxed">
                                Please renew for an uninterrupted experience. All order processing, catalog, and inventory sync will continue without disruption.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0 justify-end">
                        <button
                            onClick={() => setIsDismissed(true)}
                            className="px-3 py-2 text-xs font-bold text-amber-800 hover:text-amber-950 hover:bg-amber-100/60 rounded-xl transition-all"
                            title="Dismiss for now"
                        >
                            Dismiss
                        </button>
                        <button
                            onClick={onOpenRenew}
                            className="flex-1 sm:flex-none px-4 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                        >
                            <Icon icon="lucide:refresh-cw" className="text-sm" />
                            Renew Plan
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 2. RED CRITICAL ALERT STATE (<= 7 days remaining OR already expired)
    const absDays = Math.abs(daysRemaining);

    return (
        <div className="relative overflow-hidden rounded-2xl border-2 border-rose-400 bg-gradient-to-r from-rose-50 via-red-50/80 to-rose-50 p-4 sm:p-5 shadow-xs transition-all animate-in fade-in slide-in-from-top-2 duration-300 ring-4 ring-rose-400/10">
            {/* Subtle alert glowing stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-rose-600" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-rose-600/20 animate-pulse mt-0.5 sm:mt-0">
                        <Icon icon="lucide:alert-triangle" className="text-2xl" />
                    </div>
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                                {isExpired ? 'Account Past Due' : 'Critical Expiry Alert'} • {planType}
                            </span>
                            <span className="text-xs font-bold text-rose-800">
                                {isExpired ? `Expired ${absDays} day${absDays === 1 ? '' : 's'} ago` : `${daysRemaining === 0 ? 'Expires today' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`}`}
                            </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-rose-950 tracking-tight">
                            {isExpired
                                ? `Subscription Expired on ${formattedDate} (${absDays} days ago)`
                                : `Subscription Expiring in ${daysRemaining === 0 ? 'Hours' : `${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}`} (${formattedDate})`}
                        </h3>
                        <p className="text-xs text-rose-800/90 font-medium leading-relaxed">
                            {isExpired
                                ? 'Immediate renewal required. Service suspension and restricted order access will take effect unless renewed immediately.'
                                : 'Immediate renewal required according to time to prevent service cutoff, order dispatch disruptions, and portal downtime.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0 justify-end">
                    <button
                        onClick={onOpenRenew}
                        className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-700 rounded-xl shadow-sm shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5"
                    >
                        <Icon icon="lucide:shield-alert" className="text-base" />
                        {isExpired ? 'Renew Now to Restore Access' : 'Renew Plan Immediately'}
                    </button>
                </div>
            </div>
        </div>
    );
}
