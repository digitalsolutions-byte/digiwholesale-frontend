import api, { handleServiceError } from './apiInstance';

/**
 * Fetch Damaged Items
 * GET /api/purchase-return/damaged-items?page=1&limit=20
 */
export const getDamagedItems = async (page = 1, limit = 20) => {
    try {
        const response = await api.get(`/api/purchase-return/damaged-items?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch damaged items');
    }
};

/**
 * Fetch Shrinkage Items
 * GET /api/purchase-return/shrinkage-items?page=1&limit=20
 */
export const getShrinkageItems = async (page = 1, limit = 20) => {
    try {
        const response = await api.get(`/api/purchase-return/shrinkage-items?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch shrinkage items');
    }
};
