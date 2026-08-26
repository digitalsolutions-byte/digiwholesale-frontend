/**
 * Face.js
 * 
 * Domain Entity representing detected face geometry & landmarks.
 */

export class Face {
    constructor({
        leftEye = { x: 0, y: 0 },
        rightEye = { x: 0, y: 0 },
        noseTip = { x: 0, y: 0 },
        jawline = [],
        confidence = 1.0,
        bounds = { x: 0, y: 0, width: 0, height: 0 },
    }) {
        this.leftEye = leftEye;
        this.rightEye = rightEye;
        this.noseTip = noseTip;
        this.jawline = jawline;
        this.confidence = confidence;
        this.bounds = bounds;
    }

    get eyeDistance() {
        const dx = this.rightEye.x - this.leftEye.x;
        const dy = this.rightEye.y - this.leftEye.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    get center() {
        return {
            x: (this.leftEye.x + this.rightEye.x) / 2,
            y: (this.leftEye.y + this.rightEye.y) / 2,
        };
    }
}
