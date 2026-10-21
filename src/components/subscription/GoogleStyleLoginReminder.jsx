import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useSubscriptionExpiry } from '../../hooks/useSubscriptionExpiry';

const DISMISS_KEY = 'digioptics_login_expiry_dismissed';

export default function GoogleStyleLoginReminder({ onOpenRenew }) {
    const expiryMeta = useSubscriptionExpiry();
    const [isDismissed, setIsDismissed] = useState(true);

    useEffect(() => {
        // Only show if subscription is within 15 days of expiry (or expired)
        // and has not been dismissed for the current session
        const dismissedInSession = sessionStorage.getItem(DISMISS_KEY) === 'true';
        if (expiryMeta?.showBanner && !dismissedInSession) {
            setIsDismissed(false);
        } else {
            setIsDismissed(true);
        }
    }, [expiryMeta?.showBanner]);

    const handleDismiss = () => {
        sessionStorage.setItem(DISMISS_KEY, 'true');
        setIsDismissed(true);
    };

    if (isDismissed || !expiryMeta || !expiryMeta.showBanner) {
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

    const absDays = Math.abs(daysRemaining);

    // CRITICAL / EXPIRED (<= 7 days or past due) - Red Accent
    if (isCritical || isExpired) {
        return (
            <div className="w-full bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs z-50 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                        <Icon icon="lucide:alert-circle" className="text-sm" />
                    </span>
                    <p className="font-medium text-rose-50 truncate sm:whitespace-normal">
                        <strong className="font-black text-white mr-1.5 uppercase tracking-wide">
                            {isExpired ? 'Account Past Due:' : 'Urgent Expiry Notice:'}
                        </strong>
                        {isExpired
                            ? `Your DigiOptics plan expired ${absDays} day${absDays === 1 ? '' : 's'} ago (${formattedDate}). Renew immediately to keep services active.`
                            : `Your DigiOptics plan expires on ${formattedDate} (${daysRemaining === 0 ? 'today' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`}). Please renew immediately.`}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={onOpenRenew}
                        className="px-3.5 py-1.5 font-black text-[11px] uppercase tracking-wider text-rose-950 bg-white hover:bg-rose-50 rounded-lg shadow-xs transition-all flex items-center gap-1"
                    >
                        <Icon icon="lucide:refresh-cw" className="text-xs" />
                        Renew Now
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="px-2 py-1 text-[11px] font-bold text-rose-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Dismiss for this session"
                    >
                        Remind me later
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="w-6 h-6 rounded-md hover:bg-white/15 flex items-center justify-center text-rose-300 hover:text-white transition-colors"
                        aria-label="Dismiss"
                    >
                        <Icon icon="lucide:x" className="text-sm" />
                    </button>
                </div>
            </div>
        );
    }

    // YELLOW WARNING (15 days till 8 days remaining) - Google Amber Accent
    return (
        <div className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white px-4 py-2.5 shadow-sm flex items-center justify-between gap-3 text-xs z-50 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="w-6 h-6 rounded-lg bg-white/20 text-white flex items-center justify-center flex-shrink-0">
                    <Icon icon="lucide:clock" className="text-sm" />
                </span>
                <p className="font-medium text-amber-50 truncate sm:whitespace-normal">
                    <strong className="font-black text-white mr-1.5 uppercase tracking-wide">
                        Subscription Reminder:
                    </strong>
                    Your DigiOptics {planType} plan is about to expire in {daysRemaining} days on {formattedDate}. Please renew for an uninterrupted experience.
                </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                <button
                    onClick={onOpenRenew}
                    className="px-3.5 py-1.5 font-black text-[11px] uppercase tracking-wider text-amber-900 bg-white hover:bg-amber-50 rounded-lg shadow-xs transition-all flex items-center gap-1"
                >
                    <Icon icon="lucide:arrow-up-right" className="text-xs" />
                    Renew Plan
                </button>
                <button
                    onClick={handleDismiss}
                    className="px-2 py-1 text-[11px] font-bold text-amber-100 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                    title="Dismiss for this session"
                >
                    Remind me later
                </button>
                <button
                    onClick={handleDismiss}
                    className="w-6 h-6 rounded-md hover:bg-white/15 flex items-center justify-center text-amber-100 hover:text-white transition-colors"
                    aria-label="Dismiss"
                >
                    <Icon icon="lucide:x" className="text-sm" />
                </button>
            </div>
        </div>
    );
}
