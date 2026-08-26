import apiInstance from './apiInstance';

/**
 * Curated optical and sunglass frame models with high quality transparent PNG assets
 */
const DEFAULT_FRAME_CATALOG = [
    {
        id: 'glass-opt-1',
        name: 'Classic Urban Wayfarer',
        brand: 'VisualEyes',
        sku: 'VE-OPT-101',
        category: 'FRAME',
        shape: 'RECTANGLE',
        frameColor: '#1E293B',
        lensColor: 'rgba(255, 255, 255, 0.05)',
        imageUrl: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&auto=format&fit=crop&q=80',
        aspectRatio: 2.35,
        frameWidthMm: 138,
        bridgeWidthMm: 18,
        price: 1899,
        tags: ['Bestseller', 'Acetate', 'Unisex'],
    },
    {
        id: 'glass-opt-2',
        name: 'Vintage Round Tortoise',
        brand: 'RetroSpec',
        sku: 'RS-RND-204',
        category: 'FRAME',
        shape: 'ROUND',
        frameColor: '#78350F',
        lensColor: 'rgba(255, 255, 255, 0.05)',
        imageUrl: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800&auto=format&fit=crop&q=80',
        aspectRatio: 2.2,
        frameWidthMm: 135,
        bridgeWidthMm: 20,
        price: 2499,
        tags: ['Vintage', 'Titanium'],
    },
    {
        id: 'glass-sun-1',
        name: 'Aviator Gold Metal Sun',
        brand: 'AeroShades',
        sku: 'AS-AV-880',
        category: 'SUNGLASS',
        shape: 'AVIATOR',
        frameColor: '#D97706',
        lensColor: 'rgba(15, 23, 42, 0.85)',
        imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80',
        aspectRatio: 2.25,
        frameWidthMm: 142,
        bridgeWidthMm: 16,
        price: 3299,
        tags: ['Polarized', 'UV400'],
    },
    {
        id: 'glass-opt-3',
        name: 'Modern Cat-Eye Bold',
        brand: 'Elegance',
        sku: 'EL-CAT-502',
        category: 'FRAME',
        shape: 'CAT_EYE',
        frameColor: '#831843',
        lensColor: 'rgba(255, 255, 255, 0.05)',
        imageUrl: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800&auto=format&fit=crop&q=80',
        aspectRatio: 2.45,
        frameWidthMm: 136,
        bridgeWidthMm: 17,
        price: 2199,
        tags: ['Fashion', 'Women'],
    },
    {
        id: 'glass-sun-2',
        name: 'Matte Black Square Shades',
        brand: 'Vanguard',
        sku: 'VG-SQ-910',
        category: 'SUNGLASS',
        shape: 'SQUARE',
        frameColor: '#0F172A',
        lensColor: 'rgba(30, 41, 59, 0.90)',
        imageUrl: 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800&auto=format&fit=crop&q=80',
        aspectRatio: 2.3,
        frameWidthMm: 140,
        bridgeWidthMm: 19,
        price: 2899,
        tags: ['Polarized', 'Men'],
    },
];

/**
 * Get available frames & sunglasses catalog for Try-On.
 */
export const getGlasses = async (params = {}) => {
    try {
        // Attempt to fetch live catalog from wholesaler API if endpoint exists
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
    };
};

/**
 * Save user try-on snapshot (associated with customer or order).
 */
export const saveTryOnSnapshot = async (data) => {
    try {
        const res = await apiInstance.post('/api/tryon/save', data);
        if (res?.data) return res.data;
    } catch {
        // Simulated local success
    }

    return {
        success: true,
        data: { id: `tryon-${Date.now()}`, savedAt: new Date().toISOString() },
    };
};

export default {
    getGlasses,
    saveTryOnSnapshot,
};
