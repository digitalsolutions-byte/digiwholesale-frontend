/**
 * featureConfig.js
 * 
 * Reusable navigation descriptor and capability switches.
 */

export const glassTryOnNavigation = {
    key: 'GLASS_TRYON',
    label: 'Virtual Try-On',
    icon: 'tabler:glasses',
    description: 'Interactive Virtual Eyewear & Sunglasses Fitting Studio',
};

export const defaultFeatureConfig = {
    allowCamera: true,
    allowUpload: true,
    allowSave: true,
    allowShare: true,
    allowMicroAdjust: true,
    enable3D: false,
};
