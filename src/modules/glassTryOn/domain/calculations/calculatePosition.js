/**
 * calculatePosition.js
 * 
 * Computes frame anchor center (nose bridge position) from face landmarks and user offsets.
 */

export function calculatePosition(leftEye, rightEye, userOffsets = { x: 0, y: 0 }) {
    if (!leftEye || !rightEye) {
        return {
            x: userOffsets?.x || 0,
            y: userOffsets?.y || 0,
        };
    }

    // Midpoint between both eyes
    const midX = (leftEye.x + rightEye.x) / 2;
    const midY = (leftEye.y + rightEye.y) / 2;

    return {
        x: midX + (userOffsets?.x || 0),
        y: midY + (userOffsets?.y || 0),
        bridgeX: midX,
        bridgeY: midY,
    };
}
