/**
 * calculateScale.js
 * 
 * Pure mathematical calculation for frame scale relative to face landmarks.
 * Calculates frame pixel width and height from interpupillary distance (IPD) or face bounds.
 */

export function calculateScale(faceEyeDistance, frameWidthToIPDRatio = 2.15, userScale = 1.0, aspectRatio = 2.4) {
    if (!faceEyeDistance || faceEyeDistance <= 0) {
        return {
            scale: 1.0,
            width: 240,
            height: 100,
            baseWidth: 240,
        };
    }

    const baseWidth = faceEyeDistance * frameWidthToIPDRatio;
    const finalWidth = baseWidth * (userScale || 1.0);
    const finalHeight = finalWidth / (aspectRatio || 2.4);

    return {
        scale: userScale,
        width: Math.round(finalWidth),
        height: Math.round(finalHeight),
        baseWidth: Math.round(baseWidth),
    };
}
