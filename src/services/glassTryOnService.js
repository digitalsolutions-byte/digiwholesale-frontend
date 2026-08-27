import apiInstance from './apiInstance';

// SVG Vector Data URIs for Optical Grade Try-On Frames
const SVG_FRAMES = {
    WAYFARER_BLACK: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 180" width="500" height="180"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e293b"/><stop offset="100%" stop-color="%230f172a"/></linearGradient><linearGradient id="lensL" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="rgba(255,255,255,0.18)"/><stop offset="60%" stop-color="rgba(255,255,255,0.03)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></linearGradient></defs><path d="M40 40 Q70 32 210 42 Q230 43 250 52 Q270 43 290 42 Q430 32 460 40 Q475 75 455 125 Q420 155 315 150 Q285 148 275 105 Q265 92 250 92 Q235 92 225 105 Q215 148 185 150 Q80 155 45 125 Q25 75 40 40 Z" fill="url(%23g1)" stroke="%23334155" stroke-width="4"/><path d="M60 55 Q120 48 195 54 Q205 95 190 130 Q140 136 75 122 Q50 90 60 55 Z" fill="rgba(224,242,254,0.12)" stroke="%23475569" stroke-width="3"/><path d="M60 55 Q120 48 195 54 Q205 95 190 130 Q140 136 75 122 Q50 90 60 55 Z" fill="url(%23lensL)"/><path d="M440 55 Q380 48 305 54 Q295 95 310 130 Q360 136 425 122 Q450 90 440 55 Z" fill="rgba(224,242,254,0.12)" stroke="%23475569" stroke-width="3"/><path d="M440 55 Q380 48 305 54 Q295 95 310 130 Q360 136 425 122 Q450 90 440 55 Z" fill="url(%23lensL)"/><circle cx="48" cy="46" r="3" fill="%23cbd5e1"/><circle cx="452" cy="46" r="3" fill="%23cbd5e1"/></svg>`,
    
    AVIATOR_GOLD: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 190" width="500" height="190"><defs><linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23fbbf24"/><stop offset="50%" stop-color="%23d97706"/><stop offset="100%" stop-color="%2392400e"/></linearGradient><linearGradient id="sunL" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="rgba(15,23,42,0.88)"/><stop offset="65%" stop-color="rgba(30,41,59,0.80)"/><stop offset="100%" stop-color="rgba(71,85,105,0.60)"/></linearGradient></defs><line x1="80" y1="40" x2="420" y2="40" stroke="url(%23gold)" stroke-width="5" stroke-linecap="round"/><path d="M225 58 Q250 50 275 58" fill="none" stroke="url(%23gold)" stroke-width="4"/><path d="M60 48 Q130 42 215 50 Q235 90 220 145 Q160 180 95 155 Q50 115 60 48 Z" fill="url(%23sunL)" stroke="url(%23gold)" stroke-width="5"/><path d="M440 48 Q370 42 285 50 Q265 90 280 145 Q340 180 405 155 Q450 115 440 48 Z" fill="url(%23sunL)" stroke="url(%23gold)" stroke-width="5"/><path d="M80 65 L170 145" stroke="rgba(255,255,255,0.22)" stroke-width="8" stroke-linecap="round"/><path d="M300 65 L390 145" stroke="rgba(255,255,255,0.22)" stroke-width="8" stroke-linecap="round"/></svg>`,

    ROUND_TORTOISE: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 190" width="500" height="190"><defs><linearGradient id="tortoise" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2378350f"/><stop offset="30%" stop-color="%23b45309"/><stop offset="70%" stop-color="%23451a03"/><stop offset="100%" stop-color="%2392400e"/></linearGradient></defs><path d="M210 82 Q250 65 290 82" fill="none" stroke="url(%23tortoise)" stroke-width="7" stroke-linecap="round"/><circle cx="140" cy="95" r="72" fill="rgba(255,255,255,0.10)" stroke="url(%23tortoise)" stroke-width="12"/><circle cx="360" cy="95" r="72" fill="rgba(255,255,255,0.10)" stroke="url(%23tortoise)" stroke-width="12"/><ellipse cx="120" cy="75" rx="35" ry="20" fill="rgba(255,255,255,0.16)" transform="rotate(-25 120 75)"/><ellipse cx="340" cy="75" rx="35" ry="20" fill="rgba(255,255,255,0.16)" transform="rotate(-25 340 75)"/></svg>`,

    CAT_EYE_ROSE: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 170" width="500" height="170"><defs><linearGradient id="rose" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23be123c"/><stop offset="100%" stop-color="%23881337"/></linearGradient></defs><path d="M30 35 Q120 40 215 50 Q235 55 250 62 Q265 55 285 50 Q380 40 470 35 Q450 100 410 135 Q340 155 285 130 Q270 95 250 95 Q230 95 215 130 Q160 155 90 135 Q50 100 30 35 Z" fill="url(%23rose)" stroke="%23e11d48" stroke-width="3"/><path d="M55 52 Q125 50 195 62 Q185 115 135 125 Q75 118 55 52 Z" fill="rgba(255,255,255,0.12)" stroke="%23f43f5e" stroke-width="2"/><path d="M445 52 Q375 50 305 62 Q315 115 365 125 Q425 118 445 52 Z" fill="rgba(255,255,255,0.12)" stroke="%23f43f5e" stroke-width="2"/></svg>`,

    GEOMETRIC_HEX: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 180" width="500" height="180"><defs><linearGradient id="silver" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23f8fafc"/><stop offset="50%" stop-color="%2394a3b8"/><stop offset="100%" stop-color="%23475569"/></linearGradient></defs><path d="M210 75 Q250 62 290 75" fill="none" stroke="url(%23silver)" stroke-width="5"/><polygon points="90,40 185,40 220,95 185,150 90,150 55,95" fill="rgba(240,249,255,0.14)" stroke="url(%23silver)" stroke-width="6"/><polygon points="315,40 410,40 445,95 410,150 315,150 280,95" fill="rgba(240,249,255,0.14)" stroke="url(%23silver)" stroke-width="6"/></svg>`,
};

/**
 * Curated optical and sunglass frame models with 3D multi-angle & auto-bg removal capabilities
 */
const DEFAULT_FRAME_CATALOG = [
    {
        id: 'glass-opt-1',
        name: 'Classic Urban Wayfarer 3D',
        brand: 'VisualEyes',
        sku: 'VE-OPT-101',
        category: 'FRAME',
        shape: 'RECTANGLE',
        frameColor: '#1E293B',
        lensColor: 'rgba(255, 255, 255, 0.08)',
        imageUrl: SVG_FRAMES.WAYFARER_BLACK,
        images: {
            front: SVG_FRAMES.WAYFARER_BLACK,
            left15: SVG_FRAMES.WAYFARER_BLACK,
            right15: SVG_FRAMES.WAYFARER_BLACK,
        },
        aspectRatio: 2.75,
        frameWidthMm: 138,
        bridgeWidthMm: 18,
        price: 1899,
        tags: ['3D Multi-Angle', 'Acetate', 'Unisex'],
    },
    {
        id: 'glass-sun-1',
        name: 'Aviator Gold Polarized 3D',
        brand: 'AeroShades',
        sku: 'AS-AV-880',
        category: 'SUNGLASS',
        shape: 'AVIATOR',
        frameColor: '#D97706',
        lensColor: 'rgba(15, 23, 42, 0.85)',
        imageUrl: SVG_FRAMES.AVIATOR_GOLD,
        aspectRatio: 2.65,
        frameWidthMm: 142,
        bridgeWidthMm: 16,
        price: 3299,
        tags: ['Polarized', 'UV400', '3D Gold Metal'],
    },
    {
        id: 'glass-opt-2',
        name: 'Vintage Round Tortoise',
        brand: 'RetroSpec',
        sku: 'RS-RND-204',
        category: 'FRAME',
        shape: 'ROUND',
        frameColor: '#78350F',
        lensColor: 'rgba(255, 255, 255, 0.08)',
        imageUrl: SVG_FRAMES.ROUND_TORTOISE,
        aspectRatio: 2.63,
        frameWidthMm: 135,
        bridgeWidthMm: 20,
        price: 2499,
        tags: ['Vintage', 'Titanium', 'Round Fit'],
    },
    {
        id: 'glass-opt-3',
        name: 'Modern Cat-Eye Ruby',
        brand: 'Elegance',
        sku: 'EL-CAT-502',
        category: 'FRAME',
        shape: 'CAT_EYE',
        frameColor: '#831843',
        lensColor: 'rgba(255, 255, 255, 0.08)',
        imageUrl: SVG_FRAMES.CAT_EYE_ROSE,
        aspectRatio: 2.94,
        frameWidthMm: 136,
        bridgeWidthMm: 17,
        price: 2199,
        tags: ['Fashion', 'Cat-Eye', 'Designer'],
    },
    {
        id: 'glass-opt-4',
        name: 'Hexagonal Geometric Silver',
        brand: 'PrismCraft',
        sku: 'PC-HEX-308',
        category: 'FRAME',
        shape: 'GEOMETRIC',
        frameColor: '#94A3B8',
        lensColor: 'rgba(255, 255, 255, 0.08)',
        imageUrl: SVG_FRAMES.GEOMETRIC_HEX,
        aspectRatio: 2.78,
        frameWidthMm: 140,
        bridgeWidthMm: 19,
        price: 2799,
        tags: ['Geometric', 'Ultra-Light'],
    },
];

/**
 * Get available frames & sunglasses catalog for Try-On.
 */
export const getGlasses = async (params = {}) => {
    try {
        const res = await apiInstance.get('/api/ecommerce/catalog', { params });
        if (res?.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
            return res.data;
        }
    } catch {
        // Fallback gracefully to default catalog
    }

    return {
        success: true,
        data: DEFAULT_FRAME_CATALOG,
        total: DEFAULT_FRAME_CATALOG.length,
    };
};

export const getGlassById = async (id) => {
    const found = DEFAULT_FRAME_CATALOG.find((g) => g.id === id);
    return {
        success: Boolean(found),
        data: found || null,
    };
};

export const glassTryOnService = {
    getGlasses,
    getGlassById,
};

export default glassTryOnService;
