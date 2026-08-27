/**
 * selectAngleImage.js
 * 
 * Selects the optimal 3D perspective angle sprite for a glass frame
 * based on the real-time MediaPipe head yaw rotation degree.
 * 
 * @param {Object} glassOrAngles Glass entity or preloaded { front, left, right } map
 * @param {number} yawDeg Head turn angle in degrees (-45° to +45°)
 * @returns {HTMLCanvasElement|HTMLImageElement|string|null} Active angle image/canvas
 */
export function selectAngleImage(glassOrAngles, yawDeg = 0) {
    if (!glassOrAngles) return null;

    // Handle either a Glass entity or a direct angles object { front, left, right }
    const multi = glassOrAngles.images || glassOrAngles.angles || glassOrAngles;
    const fallback = multi.front || glassOrAngles.front || glassOrAngles.imageUrl || glassOrAngles.svg || null;

    if (!multi) {
        return fallback;
    }

    // Direct centered view (±8°): ALWAYS use FRONT view
    if (Math.abs(yawDeg) <= 8) {
        return multi.front || fallback;
    }

    // Head turned Left (yawDeg > 8°): Show Left Angle View
    if (yawDeg > 8) {
        return multi.left || multi.left30 || multi.left15 || multi.front || fallback;
    }

    // Head turned Right (yawDeg < -8°): Show Right Angle View
    if (yawDeg < -8) {
        return multi.right || multi.right30 || multi.right15 || multi.front || fallback;
    }

    return multi.front || fallback;
}

