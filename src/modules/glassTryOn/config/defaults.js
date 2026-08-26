/**
 * defaults.js
 * 
 * Default parameters and calibration ranges for glass try-on positioning.
 */

export const DEFAULT_TRYON_TRANSFORMS = {
    userScale: 1.0,          // Multiplier (0.7x to 1.4x)
    offsetX: 0,              // Horizontal pixel adjustment (-80 to +80)
    offsetY: 0,              // Vertical pixel adjustment (-80 to +80)
    rotationDeg: 0,          // Manual rotation tweak (-20 deg to +20 deg)
    opacity: 1.0,            // Opacity (0.2 to 1.0)
    showShadow: true,        // Toggle drop shadow
};

export const ADJUSTMENT_LIMITS = {
    scale: { min: 0.65, max: 1.45, step: 0.01 },
    offsetX: { min: -100, max: 100, step: 1 },
    offsetY: { min: -100, max: 100, step: 1 },
    rotationDeg: { min: -25, max: 25, step: 0.5 },
    opacity: { min: 0.3, max: 1.0, step: 0.05 },
};
