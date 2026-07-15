import api, { handleServiceError } from './apiInstance';

/**
 * Fetches all return-refund items
 * GET /api/return-refund/get-all-return-items
 * @returns {Promise}
 */
export const getAllReturnRefunds = async () => {
    try {
        const response = await api.get('/api/return-refund/get-all-return-items');
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch return-refund requests');
    }
};

/**
 * Fetches a single return-refund request by ID
 * GET /api/return-refund/:id
 * @param {string} id 
 * @returns {Promise}
 */
export const getReturnRefundById = async (id) => {
    try {
        const response = await api.get(`/api/return-refund/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to fetch return-refund details');
    }
};

/**
 * Creates a new return-refund request
 * POST /api/return-refund/create
 * @param {Object} data - JSON payload
 * @returns {Promise}
 */
export const createReturnRefund = async (data) => {
    try {
        const response = await api.post('/api/return-refund/create', data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to create return-refund request');
    }
};

/**
 * Updates status of a return-refund request
 * PUT /api/return-refund/:id/status
 * @param {string} id 
 * @param {Object} statusData { status, remark }
 * @returns {Promise}
 */
export const updateReturnRefundStatus = async (id, statusData) => {
    try {
        const response = await api.put(`/api/return-refund/${id}/status`, statusData);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update status');
    }
};

/**
 * Updates a full return-refund record
 * PUT /api/return-refund/:id
 * @param {string} id 
 * @param {Object} data 
 * @returns {Promise}
 */
export const updateReturnRefund = async (id, data) => {
    try {
        const response = await api.put(`/api/return-refund/${id}`, data);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to update return-refund');
    }
};

/**
 * Deletes a return-refund record
 * DELETE /api/return-refund/:id
 * @param {string} id 
 * @returns {Promise}
 */
export const deleteReturnRefund = async (id) => {
    try {
        const response = await api.delete(`/api/return-refund/${id}`);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to delete return-refund');
    }
};

/**
 * Filters return-refund records using search criteria
 * POST /api/return-refund/get-all-return-items
 * @param {Object} searchParams { startDate, endDate, keyword }
 * @returns {Promise}
 */
export const searchReturnRefunds = async (searchParams) => {
    try {
        const response = await api.post('/api/return-refund/get-all-return-items', searchParams);
        return response.data;
    } catch (error) {
        throw handleServiceError(error, 'Failed to search return-refunds');
    }
};
