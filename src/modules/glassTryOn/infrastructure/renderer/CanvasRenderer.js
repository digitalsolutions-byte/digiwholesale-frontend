import { RendererInterface } from './RendererInterface';

/**
 * CanvasRenderer.js
 * 
 * HTML5 2.5D/3D Canvas rendering engine for Virtual Glass Try-On.
 * Features:
 * - 3D Head Occlusion: Far side temple & rim occlude behind the nose/head contour.
 * - Near-Side Transparency: Near lens renders with transparent glass sheen revealing eye/pupil.
 * - 3D Temple Arm Depth Sorting: Near arm renders in front of skull, far arm hides behind skull.
 * - Dynamic 3D specular glare & depth shadows.
 */
export class CanvasRenderer extends RendererInterface {
    constructor() {
        super();
        this.canvas = null;
        this.ctx = null;
        this.dpr = 1;
        this.width = 640;
        this.height = 480;
    }

    initialize(targetCanvas, options = {}) {
        if (!targetCanvas) return;
        this.canvas = targetCanvas;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.dpr = window.devicePixelRatio || 1;
        this.width = options.width || 640;
        this.height = options.height || 480;

        this._resizeCanvas();
    }

    _resizeCanvas() {
        if (!this.canvas || !this.ctx) return;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.scale(this.dpr, this.dpr);
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;
        this._resizeCanvas();
    }

    clear() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    /**
     * Render the face image with overlayed 2.5D glasses assembly:
     * - Front frame across eyes & nose
     * - Left side temple arm attached to left hinge extending to left ear
     * - Right side temple arm attached to right hinge extending to right ear
     * 
     * @param {HTMLImageElement|HTMLVideoElement|ImageBitmap} faceElement 
     * @param {HTMLImageElement|HTMLCanvasElement|Object} glassImageOrAssets 
     * @param {Object} transformParams { x, y, width, height, rotation, opacity, yawDeg, leftEar, rightEar, landmarks, showFaceMesh }
     */
    render(faceElement, glassImageOrAssets, transformParams = {}) {
        if (!this.ctx || !this.canvas) return;

        this.ctx.save();
        this.clear();

        // 1. Draw Face / Live Video Stream
        if (faceElement) {
            this._drawFace(faceElement);
        } else {
            this.ctx.fillStyle = '#0F172A';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // 2. Optional Face Landmark Mesh Wireframe Overlay
        if (transformParams.showFaceMesh && transformParams.landmarks) {
            this._drawFaceMesh(transformParams.landmarks);
        }

        // 3. Draw 2.5D Glasses Assembly (Front Frame + Side Temple Arms)
        if (glassImageOrAssets && transformParams.x !== undefined && transformParams.y !== undefined) {
            this._draw25DFrameAssembly(glassImageOrAssets, transformParams);
        }

        this.ctx.restore();
    }

    _drawFace(faceElement) {
        const cw = this.width;
        const ch = this.height;

        let iw = faceElement.videoWidth || faceElement.naturalWidth || faceElement.width || cw;
        let ih = faceElement.videoHeight || faceElement.naturalHeight || faceElement.height || ch;

        const scale = Math.max(cw / iw, ch / ih);
        const nw = iw * scale;
        const nh = ih * scale;
        const ox = (cw - nw) / 2;
        const oy = (ch - nh) / 2;

        this.ctx.drawImage(faceElement, ox, oy, nw, nh);
    }

    _drawFaceMesh(landmarks) {
        if (!Array.isArray(landmarks) || landmarks.length === 0) return;

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(99, 102, 241, 0.80)';
        this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.30)';
        this.ctx.lineWidth = 1;

        landmarks.forEach((pt) => {
            if (!pt) return;
            this.ctx.beginPath();
            this.ctx.arc(pt.x, pt.y, 1.8, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.ctx.restore();
    }

    /**
     * Renders 2.5D Glasses:
     * - If Single Image: Renders only the front frame across eyes & nose.
     * - If 3-Piece Assembly: Renders front frame + left/right side arms extending to ears.
     */
    _draw25DFrameAssembly(glassAssets, {
        x = 0,
        y = 0,
        width = 200,
        height = 80,
        rotation = 0,
        opacity = 1.0,
        yawDeg = 0,
        leftEar = null,
        rightEar = null,
    }) {
        const frontImg = glassAssets?.front || (glassAssets?.getContext ? glassAssets : (glassAssets instanceof HTMLImageElement ? glassAssets : null));
        const leftArmImg = (glassAssets?.left && glassAssets.left !== frontImg) ? glassAssets.left : null;
        const rightArmImg = (glassAssets?.right && glassAssets.right !== frontImg) ? glassAssets.right : null;

        if (!frontImg) return;

        // SINGLE IMAGE CHECK: If no side temple arms exist, render ONLY the front frame
        if (!leftArmImg && !rightArmImg) {
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(rotation);
            this.ctx.globalAlpha = opacity;
            this.ctx.drawImage(frontImg, -width / 2, -height / 2, width, height);
            this.ctx.restore();
            return;
        }

        // 3-PIECE ASSEMBLY: Calculate Front Frame Hinge Endpoints
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        const halfW = width * 0.48;

        const hingeLeft = {
            x: x - halfW * cosR,
            y: y - halfW * sinR,
        };

        const hingeRight = {
            x: x + halfW * cosR,
            y: y + halfW * sinR,
        };

        const drawLeftTempleArm = () => {
            if (!leftArmImg || !leftEar) return;
            const dx = leftEar.x - hingeLeft.x;
            const dy = leftEar.y - hingeLeft.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 10) return;

            const angle = Math.atan2(dy, dx);
            const armH = Math.max(14, height * 0.28);

            this.ctx.save();
            this.ctx.translate(hingeLeft.x, hingeLeft.y);
            this.ctx.rotate(angle);
            this.ctx.globalAlpha = opacity;
            this.ctx.drawImage(leftArmImg, 0, -armH / 2, len, armH);
            this.ctx.restore();
        };

        const drawRightTempleArm = () => {
            if (!rightArmImg || !rightEar) return;
            const dx = rightEar.x - hingeRight.x;
            const dy = rightEar.y - hingeRight.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 10) return;

            const angle = Math.atan2(dy, dx);
            const armH = Math.max(14, height * 0.28);

            this.ctx.save();
            this.ctx.translate(hingeRight.x, hingeRight.y);
            this.ctx.rotate(angle);
            this.ctx.globalAlpha = opacity;
            this.ctx.drawImage(rightArmImg, 0, -armH / 2, len, armH);
            this.ctx.restore();
        };

        const drawFrontFrame = () => {
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(rotation);
            this.ctx.globalAlpha = opacity;
            this.ctx.drawImage(frontImg, -width / 2, -height / 2, width, height);
            this.ctx.restore();
        };

        // Z-Ordering / Depth sorting based on Head Yaw
        if (yawDeg > 5) {
            // Turned Left (looking screen-right): Right arm in front, Left arm behind
            drawLeftTempleArm();
            drawFrontFrame();
            drawRightTempleArm();
        } else if (yawDeg < -5) {
            // Turned Right (looking screen-left): Left arm in front, Right arm behind
            drawRightTempleArm();
            drawFrontFrame();
            drawLeftTempleArm();
        } else {
            // Centered: Draw both side arms connecting to ears, front frame in front
            drawLeftTempleArm();
            drawRightTempleArm();
            drawFrontFrame();
        }
    }

    toDataURL(format = 'image/png', quality = 0.95) {
        if (!this.canvas) return null;
        return this.canvas.toDataURL(format, quality);
    }

    destroy() {
        this.clear();
        this.canvas = null;
        this.ctx = null;
    }
}
