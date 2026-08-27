import { LANDMARKS } from './landmarkMap';

/**
 * Helper to calculate Euclidean 2D distance between two landmark points
 */
function getDistance(p1, p2) {
    if (!p1 || !p2) return 0;
    const dx = (p2.x || 0) - (p1.x || 0);
    const dy = (p2.y || 0) - (p1.y || 0);
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Recommendations and styling advice per face shape
 */
export const FACE_SHAPE_PROFILES = {
    OVAL: {
        id: 'OVAL',
        label: 'Oval Face Shape',
        description: 'Balanced proportions with a softly curved jawline and cheekbones slightly wider than forehead.',
        recommendedStyles: ['RECTANGLE', 'GEOMETRIC', 'AVIATOR', 'SQUARE'],
        stylesToAvoid: ['OVERSIZED_ROUND'],
        tip: 'Most versatile face shape! Rectangular and geometric frames add stylish contrast to soft curves.',
        color: '#6366F1', // Indigo
    },
    ROUND: {
        id: 'ROUND',
        label: 'Round Face Shape',
        description: 'Equal face width and length with soft rounded cheeks and a gentle curved jawline.',
        recommendedStyles: ['RECTANGLE', 'SQUARE', 'CAT_EYE', 'GEOMETRIC'],
        stylesToAvoid: ['ROUND', 'SMALL_OVAL'],
        tip: 'Angular frames (rectangular or square) visually elongate the face and add sharp definition.',
        color: '#EC4899', // Pink
    },
    SQUARE: {
        id: 'SQUARE',
        label: 'Square Face Shape',
        description: 'Strong, well-defined angular jawline with forehead and jaw having similar widths.',
        recommendedStyles: ['ROUND', 'AVIATOR', 'CAT_EYE'],
        stylesToAvoid: ['SQUARE', 'BOX_RECTANGLE'],
        tip: 'Round, oval, or thin metal frames soften angular facial features and balance jawline strength.',
        color: '#3B82F6', // Blue
    },
    HEART: {
        id: 'HEART',
        label: 'Heart Face Shape',
        description: 'Wider forehead tapering down to high cheekbones and a delicate, pointed chin.',
        recommendedStyles: ['CAT_EYE', 'ROUND', 'AVIATOR'],
        stylesToAvoid: ['TOP_HEAVY', 'DEEP_SQUARE'],
        tip: 'Frames that are slightly wider at the bottom or delicate rimless styles balance a wider forehead.',
        color: '#EF4444', // Red/Rose
    },
    DIAMOND: {
        id: 'DIAMOND',
        label: 'Diamond Face Shape',
        description: 'High, dramatic cheekbones with narrow forehead and pointed angular chin.',
        recommendedStyles: ['CAT_EYE', 'ROUND', 'GEOMETRIC'],
        stylesToAvoid: ['NARROW_RECTANGLE'],
        tip: 'Cat-eye and curved browline frames highlight high cheekbones while softening angles.',
        color: '#8B5CF6', // Purple
    },
    OBLONG: {
        id: 'OBLONG',
        label: 'Oblong / Rectangle Face',
        description: 'Face length is noticeably greater than width, with a straight cheek line.',
        recommendedStyles: ['AVIATOR', 'SQUARE', 'GEOMETRIC'],
        stylesToAvoid: ['NARROW_SMALL'],
        tip: 'Tall, oversized frames break up face length and add horizontal width.',
        color: '#10B981', // Emerald
    },
};

/**
 * detectFaceShape.js
 * 
 * Classifies face shape using biometric ratios calculated from 3D/2D face landmarks.
 * 
 * @param {Array<Object>|Object} landmarks - Array of normalized {x, y, z} landmarks or keypoint object
 * @returns {Object} { shape, label, confidence, metrics, recommendedStyles, tip }
 */
export function detectFaceShape(landmarks) {
    if (!landmarks) {
        // Fallback default
        return {
            ...FACE_SHAPE_PROFILES.OVAL,
            confidence: 0.85,
            metrics: { lengthToWidthRatio: 1.45, jawToCheekRatio: 0.82 },
        };
    }

    // Support both indexed array (MediaPipe) and named landmark object
    const getPt = (idx, fallbackName) => {
        if (Array.isArray(landmarks)) return landmarks[idx];
        return landmarks[fallbackName] || landmarks[idx];
    };

    const forehead = getPt(LANDMARKS.FOREHEAD_TOP, 'forehead');
    const chin = getPt(LANDMARKS.CHIN_BOTTOM, 'chin');
    const leftCheek = getPt(LANDMARKS.LEFT_CHEEK_OUTER, 'leftCheek');
    const rightCheek = getPt(LANDMARKS.RIGHT_CHEEK_OUTER, 'rightCheek');
    const leftTemple = getPt(LANDMARKS.LEFT_TEMPLE, 'leftTemple');
    const rightTemple = getPt(LANDMARKS.RIGHT_TEMPLE, 'rightTemple');
    const leftJaw = getPt(LANDMARKS.LEFT_JAW_CORNER, 'leftJaw');
    const rightJaw = getPt(LANDMARKS.RIGHT_JAW_CORNER, 'rightJaw');

    const faceLength = getDistance(forehead, chin);
    const cheekWidth = getDistance(leftCheek, rightCheek);
    const foreheadWidth = getDistance(leftTemple, rightTemple);
    const jawWidth = getDistance(leftJaw, rightJaw);

    if (!faceLength || !cheekWidth || cheekWidth === 0) {
        return {
            ...FACE_SHAPE_PROFILES.OVAL,
            confidence: 0.80,
            metrics: { lengthToWidthRatio: 1.45, jawToCheekRatio: 0.82 },
        };
    }

    const lengthToWidthRatio = faceLength / cheekWidth;
    const jawToCheekRatio = jawWidth > 0 ? jawWidth / cheekWidth : 0.80;
    const foreheadToCheekRatio = foreheadWidth > 0 ? foreheadWidth / cheekWidth : 0.85;

    let shape = 'OVAL';
    let confidence = 0.90;

    // Classification Rules based on biometric ratios
    if (lengthToWidthRatio > 1.65) {
        shape = 'OBLONG';
        confidence = Math.min(0.96, 0.75 + (lengthToWidthRatio - 1.65) * 0.5);
    } else if (lengthToWidthRatio < 1.30) {
        if (jawToCheekRatio > 0.88) {
            shape = 'SQUARE';
            confidence = Math.min(0.95, 0.80 + (jawToCheekRatio - 0.88) * 0.8);
        } else {
            shape = 'ROUND';
            confidence = Math.min(0.95, 0.80 + (1.30 - lengthToWidthRatio) * 0.7);
        }
    } else if (foreheadToCheekRatio > 0.92 && jawToCheekRatio < 0.76) {
        shape = 'HEART';
        confidence = Math.min(0.94, 0.80 + (foreheadToCheekRatio - jawToCheekRatio) * 0.4);
    } else if (foreheadToCheekRatio < 0.84 && jawToCheekRatio < 0.78) {
        shape = 'DIAMOND';
        confidence = Math.min(0.93, 0.80 + (1.0 - foreheadToCheekRatio) * 0.5);
    } else {
        shape = 'OVAL';
        confidence = 0.92;
    }

    const profile = FACE_SHAPE_PROFILES[shape] || FACE_SHAPE_PROFILES.OVAL;

    return {
        ...profile,
        confidence: Number(confidence.toFixed(2)),
        metrics: {
            lengthToWidthRatio: Number(lengthToWidthRatio.toFixed(2)),
            jawToCheekRatio: Number(jawToCheekRatio.toFixed(2)),
            foreheadToCheekRatio: Number(foreheadToCheekRatio.toFixed(2)),
        },
    };
}
