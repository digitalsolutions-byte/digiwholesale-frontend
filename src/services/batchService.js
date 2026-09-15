import api, { handleServiceError } from './apiInstance';

export const getBatchesForProduct = async (productId, status = 'OPEN') => {
    try {
        const response = await api.get(`/api/v1/batches/product/${productId}?status=${status}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch batches for product');
    }
};

export const getAllBatches = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams(params);
        const response = await api.get(`/api/v1/batches?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch batches');
    }
};

export const getBatchById = async (batchId) => {
    try {
        const response = await api.get(`/api/v1/batches/${batchId}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch batch details');
    }
};

export const allocateManualBatch = async (batchData) => {
    try {
        const response = await api.post('/api/v1/batches/allocate', batchData);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to allocate batch');
    }
};
