/**
 * calculateRotation.js
 * 
 * Computes face roll/tilt angle in radians and degrees from eye coordinates.
 */

export function calculateRotation(leftEye, rightEye, userAngleOffsetDeg = 0) {
    if (!leftEye || !rightEye) {
        return {
            radians: (userAngleOffsetDeg * Math.PI) / 180,
            degrees: userAngleOffsetDeg,
        };
    }

    const dx = rightEye.x - leftEye.x;
    const dy = rightEye.y - leftEye.y;
    const baseRadians = Math.atan2(dy, dx);
    const baseDegrees = (baseRadians * 180) / Math.PI;

    const totalDegrees = baseDegrees + (userAngleOffsetDeg || 0);
    const totalRadians = (totalDegrees * Math.PI) / 180;

    return {
        radians: totalRadians,
        degrees: totalDegrees,
        baseDegrees,
    };
}
