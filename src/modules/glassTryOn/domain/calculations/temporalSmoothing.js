/**
 * temporalSmoothing.js
 * 
 * Adaptive Exponential Moving Average (EMA) and low-pass filter to smooth 
 * face landmark tracking coordinates, eliminate micro-jitter when holding still,
 * and provide instantaneous zero-lag tracking during rapid head motion.
 */

export class TemporalSmoothingFilter {
    constructor({ baseAlpha = 0.40, baseAngleAlpha = 0.35, maxAlpha = 0.88 } = {}) {
        this.baseAlpha = baseAlpha;             // Static position/scale smoothing factor
        this.baseAngleAlpha = baseAngleAlpha;   // Static angular rotation smoothing factor
        this.maxAlpha = maxAlpha;               // Maximum fast-motion responsiveness
        this.previous = null;
    }

    /**
     * Smooths current pose parameters with previous frame state using adaptive velocity scaling.
     * @param {Object} currentPose { anchorX, anchorY, rollRad, yawRad, pitchRad, scaleX, scaleY, width, height, perspectiveSkewY }
     * @returns {Object} smoothedPose
     */
    filter(currentPose) {
        if (!currentPose) return null;

        if (!this.previous) {
            this.previous = { ...currentPose };
            return currentPose;
        }

        // Calculate motion delta to adapt filter responsiveness dynamically
        const dx = currentPose.anchorX - this.previous.anchorX;
        const dy = currentPose.anchorY - this.previous.anchorY;
        const dScale = Math.abs(currentPose.width - this.previous.width);
        const dist = Math.sqrt(dx * dx + dy * dy) + dScale * 0.5;

        const dRoll = Math.abs(currentPose.rollRad - this.previous.rollRad);
        const dYaw = Math.abs(currentPose.yawRad - this.previous.yawRad);
        const dPitch = Math.abs(currentPose.pitchRad - this.previous.pitchRad);
        const angleDist = dRoll + dYaw + dPitch;

        // Dynamic alpha: low when holding still (smooth), high when moving fast (zero lag)
        const motionFactor = Math.min(1.0, dist / 18.0);
        const angleFactor = Math.min(1.0, angleDist / 0.15);

        const a = this.baseAlpha + (this.maxAlpha - this.baseAlpha) * motionFactor;
        const aa = this.baseAngleAlpha + (this.maxAlpha - this.baseAngleAlpha) * angleFactor;

        const smoothed = {
            ...currentPose,
            anchorX: this.previous.anchorX * (1 - a) + currentPose.anchorX * a,
            anchorY: this.previous.anchorY * (1 - a) + currentPose.anchorY * a,
            rollRad: this.previous.rollRad * (1 - aa) + currentPose.rollRad * aa,
            yawRad: this.previous.yawRad * (1 - aa) + currentPose.yawRad * aa,
            pitchRad: this.previous.pitchRad * (1 - aa) + currentPose.pitchRad * aa,
            scaleX: this.previous.scaleX * (1 - a) + currentPose.scaleX * a,
            scaleY: this.previous.scaleY * (1 - a) + currentPose.scaleY * a,
            perspectiveSkewY: (this.previous.perspectiveSkewY || 0) * (1 - aa) + (currentPose.perspectiveSkewY || 0) * aa,
            width: this.previous.width * (1 - a) + currentPose.width * a,
            height: this.previous.height * (1 - a) + currentPose.height * a,
        };

        this.previous = smoothed;
        return smoothed;
    }

    reset() {
        this.previous = null;
    }
}
