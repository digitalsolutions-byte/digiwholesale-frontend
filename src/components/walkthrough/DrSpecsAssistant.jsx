import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import MascotCharacter from './MascotCharacter';
import WalkthroughTour from './WalkthroughTour';
import MascotHubModal from './MascotHubModal';
import { TOUR_STEPS } from './tourSteps';
import { CONTEXTUAL_PAGE_TIPS } from './featureGuides';
import { playMascotSound } from './soundEffects';

export default function DrSpecsAssistant() {
    const [isTourActive, setIsTourActive] = useState(false);
    const [isHubOpen, setIsHubOpen] = useState(false);
    const [speechBubble, setSpeechBubble] = useState(null);
    const [mood, setMood] = useState('waving');
    const [isMuted, setIsMuted] = useState(() => {
        return localStorage.getItem('digioptics_mascot_muted') === 'true';
    });

    const location = useLocation();

    // Toggle mute
    const handleToggleMute = () => {
        setIsMuted(prev => {
            const next = !prev;
            localStorage.setItem('digioptics_mascot_muted', String(next));
            return next;
        });
    };

    // First-time user welcome prompt
    useEffect(() => {
        const hasPrompted = localStorage.getItem('digioptics_tour_prompted');
        if (!hasPrompted) {
            const timer = setTimeout(() => {
                setMood('waving');
                setSpeechBubble({
                    text: 'Namaste! 👋 Main hoon Dr. Specs! Kya aap is pure platform ka ek quick 2-minute walkthrough lena chahenge?',
                    proTip: 'Aapko live orders, smart matrix grid aur inventory ke sabhi features asani se samajh aa jayenge.',
                    showTourBtn: true,
                });
                playMascotSound('pop', isMuted);
                localStorage.setItem('digioptics_tour_prompted', 'true');
            }, 2500);

            return () => clearTimeout(timer);
        }
    }, []);

    // Contextual tip on page change
    useEffect(() => {
        const tipData = CONTEXTUAL_PAGE_TIPS[location.pathname];
        if (tipData && !isTourActive && !isHubOpen) {
            // Show subtle contextual tip
            setMood(location.pathname === '/new-order' ? 'idea' : 'glasses');
            setSpeechBubble({
                text: `${tipData.title}: ${tipData.tip}`,
                showTourBtn: false,
            });
        }
    }, [location.pathname, isTourActive, isHubOpen]);

    // Global custom event listeners so Topbar or any component can launch Dr. Specs
    useEffect(() => {
        const handleStartTourEvent = () => {
            setIsHubOpen(false);
            setSpeechBubble(null);
            setIsTourActive(true);
        };
        const handleOpenHubEvent = () => {
            setIsTourActive(false);
            setIsHubOpen(true);
        };

        window.addEventListener('open-dr-specs-tour', handleStartTourEvent);
        window.addEventListener('open-dr-specs-hub', handleOpenHubEvent);

        return () => {
            window.removeEventListener('open-dr-specs-tour', handleStartTourEvent);
            window.removeEventListener('open-dr-specs-hub', handleOpenHubEvent);
        };
    }, []);

    const handleStartTour = () => {
        setIsHubOpen(false);
        setSpeechBubble(null);
        setIsTourActive(true);
    };

    const handleTourFinish = () => {
        setIsTourActive(false);
        setMood('excited');
        setSpeechBubble({
            text: 'Shaandar! 🎉 Aapne pura walkthrough complete kar liya hai. Ab aap Digi-Optics ko bina kisi rukawat ke confidently use kar sakte hain!',
            showTourBtn: false,
        });
        localStorage.setItem('digioptics_tour_completed', 'true');
    };

    return (
        <>
            {/* The Floating Mascot & Speech Bubble */}
            <MascotCharacter
                speechBubble={speechBubble}
                onDismissBubble={() => setSpeechBubble(null)}
                onOpenHub={() => {
                    setSpeechBubble(null);
                    setIsHubOpen(true);
                }}
                onStartTour={handleStartTour}
                isTourActive={isTourActive}
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
                mood={mood}
            />

            {/* The Spotlight Guided Tour Overlay */}
            <WalkthroughTour
                isOpen={isTourActive}
                onClose={() => setIsTourActive(false)}
                steps={TOUR_STEPS}
                isMuted={isMuted}
                onFinish={handleTourFinish}
            />

            {/* The Feature Hub Modal */}
            <MascotHubModal
                isOpen={isHubOpen}
                onClose={() => setIsHubOpen(false)}
                onStartTour={handleStartTour}
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
            />
        </>
    );
}
