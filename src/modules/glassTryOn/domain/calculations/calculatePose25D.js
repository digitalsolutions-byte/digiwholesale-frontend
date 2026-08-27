import { LANDMARKS } from './landmarkMap';

/**
 * calculatePose25D.js
 * 
 * Computes 3D head orientation (Yaw, Pitch, Roll) and 2.5D/3D perspective projection
 * parameters from face landmarks with pinpoint anatomical precision.
 * 
 * @param {Array<Object>|Object} landmarks 
 * @param {Object} userOffsets { offsetX, offsetY, userScale, rotationDeg }
 * @returns {Object} Pose parameters and anchor coordinates
 */
export function calculatePose25D(landmarks, userOffsets = {}) {
    if (!landmarks) {
        return {
            rollRad: 0,
            rollDeg: 0,
            yawRad: 0,
            yawDeg: 0,
            pitchRad: 0,
            pitchDeg: 0,
            scaleX: 1.0,
            scaleY: 1.0,
            perspectiveSkewY: 0,
            occludedTemple: null,
            anchorX: userOffsets.offsetX || 0,
            anchorY: userOffsets.offsetY || 0,
            eyeDistance: 130,
            leftEye: { x: 260, y: 230 },
            rightEye: { x: 380, y: 230 },
            noseBridge: { x: 320, y: 230 },
            leftEar: { x: 200, y: 230 },
            rightEar: { x: 440, y: 230 },
        };
    }

    const getPt = (idx, fallbackName) => {
        if (Array.isArray(landmarks)) return landmarks[idx];
        return landmarks[fallbackName] || landmarks[idx];
    };

    // 1. Precise Optical Eye & Pupil Centers
    // Use MediaPipe Iris pupils (468, 473) or eye corner midpoints (33/133, 263/362)
    const leftPupil = getPt(LANDMARKS.LEFT_PUPIL, 'leftEye');
    const rightPupil = getPt(LANDMARKS.RIGHT_PUPIL, 'rightEye');
    const leftEyeOuter = getPt(LANDMARKS.LEFT_EYE_OUTER, 'leftEye');
    const leftEyeInner = getPt(LANDMARKS.LEFT_EYE_INNER, 'leftEye');
    const rightEyeInner = getPt(LANDMARKS.RIGHT_EYE_INNER, 'rightEye');
    const rightEyeOuter = getPt(LANDMARKS.RIGHT_EYE_OUTER, 'rightEye');

    const leftEye = leftPupil || (leftEyeOuter && leftEyeInner ? {
        x: (leftEyeOuter.x + leftEyeInner.x) / 2,
        y: (leftEyeOuter.y + leftEyeInner.y) / 2,
    } : { x: 260, y: 230 });

    const rightEye = rightPupil || (rightEyeOuter && rightEyeInner ? {
        x: (rightEyeOuter.x + rightEyeInner.x) / 2,
        y: (rightEyeOuter.y + rightEyeInner.y) / 2,
    } : { x: 380, y: 230 });

    // 2. Nose Bridge Apex (Anatomical Saddle Point where glasses sit)
    // Landmark 168 is top of nasal bridge; Landmark 6 is midpoint
    const nasion = getPt(LANDMARKS.NOSE_BRIDGE_TOP, 'noseBridge');
    const midBridge = getPt(LANDMARKS.NOSE_BRIDGE_MID, 'noseBridge');
    const noseTip = getPt(LANDMARKS.NOSE_TIP, 'noseTip') || { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 + 40 };
    const chin = getPt(LANDMARKS.CHIN_BOTTOM, 'chin') || { x: noseTip.x, y: noseTip.y + 75 };

    const noseBridge = nasion || midBridge || {
        x: (leftEye.x + rightEye.x) / 2,
        y: (leftEye.y + rightEye.y) / 2 + 2,
    };

    // 3. Cheeks, Temples & Ear Coordinates
    const leftCheek = getPt(LANDMARKS.LEFT_CHEEK_OUTER, 'leftCheek') || { x: leftEye.x - 45, y: leftEye.y + 35 };
    const rightCheek = getPt(LANDMARKS.RIGHT_CHEEK_OUTER, 'rightCheek') || { x: rightEye.x + 45, y: rightEye.y + 35 };
    const leftEar = getPt(LANDMARKS.LEFT_TEMPLE, 'leftEar') || { x: leftEye.x - 70, y: leftEye.y - 10 };
    const rightEar = getPt(LANDMARKS.RIGHT_TEMPLE, 'rightEar') || { x: rightEye.x + 70, y: rightEye.y - 10 };

    // 4. Roll (Z-axis rotation / Head Tilt in Camera Plane)
    const dx = rightEye.x - leftEye.x;
    const dy = rightEye.y - leftEye.y;
    const eyeDistance = Math.sqrt(dx * dx + dy * dy);
    const baseRollRad = Math.atan2(dy, dx);
    const userRollRad = ((userOffsets.rotationDeg || 0) * Math.PI) / 180;
    const totalRollRad = baseRollRad + userRollRad;

    // 5. Yaw (Y-axis rotation / Turning Left or Right)
    const totalCheekWidth = Math.max(1, rightCheek.x - leftCheek.x);
    const noseFromLeft = Math.max(0, noseBridge.x - leftCheek.x);
    const yawRatio = noseFromLeft / totalCheekWidth; // 0.5 is centered
    const normalizedYaw = Math.max(-1.0, Math.min(1.0, (yawRatio - 0.5) * 2.2));
    const yawRad = normalizedYaw * (Math.PI / 4.2); // ~42 deg max
    const yawDeg = (yawRad * 180) / Math.PI;

    // 6. Pitch (X-axis rotation / Looking Up or Down)
    const eyeMidY = (leftEye.y + rightEye.y) / 2;
    const totalFaceHeight = Math.max(1, chin.y - eyeMidY);
    const noseFromEyes = Math.max(0, noseTip.y - eyeMidY);
    const pitchRatio = noseFromEyes / totalFaceHeight;
    const normalizedPitch = Math.max(-1.0, Math.min(1.0, (pitchRatio - 0.35) * 2.6));
    const pitchRad = normalizedPitch * (Math.PI / 6);
    const pitchDeg = (pitchRad * 180) / Math.PI;

    // 7. Perspective Factors (Perspective foreshortening is naturally handled by eye distance)
    const scaleX = 1.0;
    const scaleY = 1.0;
    const perspectiveSkewY = 0;

    // 8. Temple Occlusion Shading
    let occludedTemple = null;
    if (yawDeg > 14) {
        occludedTemple = 'LEFT';
    } else if (yawDeg < -14) {
        occludedTemple = 'RIGHT';
    }

    // 9. Exact Optical Anchor Point (Optical Inter-Pupillary Center)
    const anchorX = ((leftEye.x + rightEye.x) / 2) + (userOffsets.offsetX || 0);
    const anchorY = ((leftEye.y + rightEye.y) / 2) + (userOffsets.offsetY || 0);

    return {
        rollRad: totalRollRad,
        rollDeg: Number(((totalRollRad * 180) / Math.PI).toFixed(1)),
        yawRad,
        yawDeg: Number(yawDeg.toFixed(1)),
        pitchRad,
        pitchDeg: Number(pitchDeg.toFixed(1)),
        scaleX: Number(scaleX.toFixed(3)),
        scaleY: Number(scaleY.toFixed(3)),
        perspectiveSkewY: Number(perspectiveSkewY.toFixed(3)),
        occludedTemple,
        anchorX,
        anchorY,
        eyeDistance,
        leftEye,
        rightEye,
        noseBridge,
        leftEar,
        rightEar,
    };
}
