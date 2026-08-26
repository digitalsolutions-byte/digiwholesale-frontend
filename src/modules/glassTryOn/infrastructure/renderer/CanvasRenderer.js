import { RendererInterface } from './RendererInterface';

/**
 * CanvasRenderer.js
 * 
 * HTML5 2D Canvas rendering engine for Virtual Glass Try-On.
 * Implements RendererInterface with high-DPI scaling, smooth transformations,
 * realistic lighting/shadow overlays, and snapshot export.
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
     * Render the face image with overlayed glass frame.
     * @param {HTMLImageElement|HTMLVideoElement|ImageBitmap} faceElement 
     * @param {HTMLImageElement|ImageBitmap} glassImage 
     * @param {Object} transformParams { x, y, width, height, rotation, opacity, shadow }
     */
    render(faceElement, glassImage, transformParams = {}) {
        if (!this.ctx || !this.canvas) return;

        this.ctx.save();
        this.clear();

        // 1. Draw Face / Video Feed
        if (faceElement) {
            this._drawFace(faceElement);
        } else {
            // Placeholder background if no face loaded yet
            this.ctx.fillStyle = '#0F172A';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // 2. Draw Glass Frame Overlay
        if (glassImage && transformParams.x !== undefined && transformParams.y !== undefined) {
            this._drawGlass(glassImage, transformParams);
        }

        this.ctx.restore();
    }

    _drawFace(faceElement) {
        const cw = this.width;
        const ch = this.height;

        let iw = faceElement.videoWidth || faceElement.naturalWidth || faceElement.width || cw;
        let ih = faceElement.videoHeight || faceElement.naturalHeight || faceElement.height || ch;

        // Cover fit
        const scale = Math.max(cw / iw, ch / ih);
        const nw = iw * scale;
        const nh = ih * scale;
        const ox = (cw - nw) / 2;
        const oy = (ch - nh) / 2;

        this.ctx.drawImage(faceElement, ox, oy, nw, nh);
    }

    _drawGlass(glassImage, {
        x = 0,
        y = 0,
        width = 200,
        height = 80,
        rotation = 0,
        opacity = 1.0,
        shadow = true,
    }) {
        this.ctx.save();

        // Translate to frame anchor center and rotate
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation);
        this.ctx.globalAlpha = opacity;

        // Subtle realistic drop shadow onto nose bridge / cheeks
        if (shadow) {
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
            this.ctx.shadowBlur = 8;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 4;
        }

        // Draw glass centered at (0, 0)
        const drawX = -width / 2;
        const drawY = -height / 2;

        this.ctx.drawImage(glassImage, drawX, drawY, width, height);

        // Optional specular lighting / lens reflection sheen
        this._drawLensReflection(drawX, drawY, width, height);

        this.ctx.restore();
    }

    _drawLensReflection(x, y, w, h) {
        const lensW = w * 0.38;
        const lensH = h * 0.7;

        // Left lens highlight
        const gradL = this.ctx.createLinearGradient(x + 5, y + 5, x + lensW, y + lensH);
        gradL.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
        gradL.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
        gradL.addColorStop(1, 'rgba(255, 255, 255, 0)');

        this.ctx.fillStyle = gradL;
        this.ctx.fillRect(x + 5, y + 5, lensW, lensH);

        // Right lens highlight
        const rx = x + w - lensW - 5;
        const gradR = this.ctx.createLinearGradient(rx, y + 5, rx + lensW, y + lensH);
        gradR.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
        gradR.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
        gradR.addColorStop(1, 'rgba(255, 255, 255, 0)');

        this.ctx.fillStyle = gradR;
        this.ctx.fillRect(rx, y + 5, lensW, lensH);
    }

    toDataURL(format = 'image/png', quality = 0.92) {
        if (!this.canvas) return null;
        return this.canvas.toDataURL(format, quality);
    }

    destroy() {
        this.clear();
        this.canvas = null;
        this.ctx = null;
    }
}
